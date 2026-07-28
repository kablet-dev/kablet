import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { verifyWooCommerceSignature, translateWooOrder, type WooOrder } from '../woocommerce.js'
import { processTransactionEvent } from '../engine.js'

export async function wooCommerceRoutes(fastify: FastifyInstance) {

  // WooCommerce sends webhooks as application/x-www-form-urlencoded OR application/json
  // We need to handle both content types
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        ;(req as any).rawBody = body
        // WooCommerce actually sends JSON data even with this content-type
        // Try JSON parse first
        try {
          done(null, JSON.parse(body.toString()))
        } catch {
          const decoded = decodeURIComponent(body.toString())
          try {
            done(null, JSON.parse(decoded))
          } catch {
            done(null, Object.fromEntries(new URLSearchParams(body.toString())))
          }
        }
      } catch (err) {
        done(err as Error, undefined)
      }
    }
  )

  // ── POST /webhook/woocommerce/order ────────────────────────────────
  // WooCommerce fires this on order.created and order.updated events.
  // We register only order.created from the plugin, but handle both.
  fastify.post('/webhook/woocommerce/order', async (request, reply) => {

    // WooCommerce sends store URL in x-wc-webhook-source
    const storeUrl = (request.headers['x-wc-webhook-source'] as string | undefined)?.replace(/\/$/, '')
    const signatureHeader = request.headers['x-wc-webhook-signature'] as string | undefined
    const topic = request.headers['x-wc-webhook-topic'] as string | undefined

    if (!storeUrl) {
      fastify.log.warn('WooCommerce webhook missing x-wc-webhook-source header')
      return reply.status(400).send({ error: 'Missing store URL header' })
    }

    // Only process order creation events
    if (topic && !['order.created', 'order.updated'].includes(topic)) {
      return reply.status(200).send()
    }

    // Look up WooCommerce merchant by store URL
    const { data: merchant } = await db
      .from('woo_merchants')
      .select('*')
      .eq('store_url', storeUrl)
      .single()

    if (!merchant) {
      fastify.log.warn({ storeUrl }, 'WooCommerce merchant not found')
      return reply.status(200).send() // Return 200 so WooCommerce doesn't retry
    }

    // Verify webhook signature
    const rawBody = (request as any).rawBody as Buffer
    if (signatureHeader && merchant.webhook_secret) {
      const valid = verifyWooCommerceSignature(rawBody, signatureHeader, merchant.webhook_secret)
      if (!valid) {
        fastify.log.warn({ storeUrl }, 'Invalid WooCommerce webhook signature')
        return reply.status(401).send({ error: 'Invalid signature' })
      }
    }

    // Check merchant config
    const { data: config } = await db
      .from('merchant_configs')
      .select('engine_enabled, offers_enabled')
      .eq('merchant_id', merchant.merchant_id)
      .single()

    if (!config?.engine_enabled) {
      return reply.status(200).send()
    }

    const order = request.body as WooOrder

    // Only process completed/processing orders (not pending/cancelled)
    if (order.status && !['processing', 'completed', 'on-hold'].includes(order.status)) {
      fastify.log.info({ orderId: order.id, status: order.status }, 'Skipping non-active WooCommerce order')
      return reply.status(200).send()
    }

    // Deduplicate — use prefixed order ID
    const wooOrderId = `woo_${order.id}`
    const { data: existing } = await db
      .from('transaction_events')
      .select('id')
      .eq('merchant_id', merchant.merchant_id)
      .eq('shopify_order_id', wooOrderId)
      .maybeSingle()

    if (existing) {
      fastify.log.info({ orderId: order.id }, 'Duplicate WooCommerce webhook ignored')
      return reply.status(200).send()
    }

    // Look up the core merchant record to get geography
    const { data: coreMerchant } = await db
      .from('merchants')
      .select('geography')
      .eq('id', merchant.merchant_id)
      .single()

    // Translate and persist transaction event
    const eventData = translateWooOrder(order, merchant.merchant_id, coreMerchant?.geography ?? 'AE')

    const { data: event, error } = await db
      .from('transaction_events')
      .insert(eventData)
      .select()
      .single()

    if (error || !event) {
      fastify.log.error({ error }, 'Failed to insert WooCommerce transaction event')
      return reply.status(500).send()
    }

    fastify.log.info({ transactionEventId: event.id, orderId: order.id, storeUrl }, 'WooCommerce transaction event created')

    // Run Core Engine (same engine as Shopify — platform agnostic)
    if (config.engine_enabled) {
      try {
        await processTransactionEvent(event)
        fastify.log.info({ transactionEventId: event.id }, 'Core Engine completed for WooCommerce order')
      } catch (err) {
        fastify.log.error({ err, transactionEventId: event.id }, 'Core Engine error on WooCommerce order')
      }
    }

    return reply.status(200).send()
  })

  // ── GET /woo/opportunity/decision ──────────────────────────────────
  // Called by the WooCommerce thank-you page widget.
  // Same logic as /opportunity/decision but uses wooOrderId + storeUrl.
  fastify.get('/woo/opportunity/decision', async (request, reply) => {
    const { wooOrderId, storeUrl } = request.query as {
      wooOrderId?: string
      storeUrl?: string
    }

    if (!wooOrderId || !storeUrl) {
      return reply.send({ opportunity: null })
    }

    const normalizedUrl = storeUrl.replace(/\/$/, '')
    const prefixedId = `woo_${wooOrderId}`

    const [wooMerchantResult, eventResult] = await Promise.all([
      db.from('woo_merchants').select('merchant_id').eq('store_url', normalizedUrl).single(),
      db.from('transaction_events').select('id').eq('shopify_order_id', prefixedId).maybeSingle()
    ])

    const wooMerchant = wooMerchantResult.data
    const event = eventResult.data

    if (!wooMerchant || !event) return reply.send({ opportunity: null })

    const [configResult, decisionResult] = await Promise.all([
      db.from('merchant_configs').select('offers_enabled').eq('merchant_id', wooMerchant.merchant_id).single(),
      db.from('decision_records').select('outcome_type, selected_definition_id').eq('transaction_event_id', event.id).single()
    ])

    const config = configResult.data
    const decision = decisionResult.data

    if (!config?.offers_enabled) return reply.send({ opportunity: null })
    if (!decision || decision.outcome_type !== 'OPPORTUNITY_IDENTIFIED') {
      return reply.send({ opportunity: null })
    }

    const [instanceResult, definitionResult] = await Promise.all([
      db.from('opportunity_instances').select('id, current_state').eq('transaction_event_id', event.id).single(),
      db.from('opportunity_definitions')
        .select('headline, description, value_proposition, visual_asset_url, cta_label, value_bullets, social_proof, trust_rating')
        .eq('id', decision.selected_definition_id!)
        .single()
    ])

    const instance = instanceResult.data
    const definition = definitionResult.data

    if (!instance || !['SELECTED', 'PRESENTED'].includes(instance.current_state)) {
      return reply.send({ opportunity: null })
    }
    if (!definition) return reply.send({ opportunity: null })

    // Mark as presented (background, don't await)
    if (instance.current_state === 'SELECTED') {
      ;(async () => {
        await db.from('opportunity_instances')
          .update({ current_state: 'PRESENTED' })
          .eq('id', instance.id)
      })()
    }

    return reply.send({
      opportunity: {
        instanceId: instance.id,
        headline: definition.headline,
        description: definition.description,
        valueProposition: definition.value_proposition,
        visualAssetUrl: definition.visual_asset_url,
        ctaLabel: definition.cta_label,
        valueBullets: definition.value_bullets ?? [],
        socialProof: definition.social_proof ?? null,
        trustRating: definition.trust_rating ?? null,
      }
    })
  })

  // ── POST /woo/opportunity/response ─────────────────────────────────
  // Customer accepts or declines the offer on the WooCommerce thank-you page.
  fastify.post('/woo/opportunity/response', async (request, reply) => {
    const { instanceId, response, storeUrl } = request.body as {
      instanceId?: string
      response?: 'ACCEPTED' | 'DECLINED'
      storeUrl?: string
    }

    if (!instanceId || !response || !storeUrl) {
      return reply.status(400).send({ error: 'Missing required fields' })
    }
    if (!['ACCEPTED', 'DECLINED'].includes(response)) {
      return reply.status(400).send({ error: 'Invalid response' })
    }

    const normalizedUrl = storeUrl.replace(/\/$/, '')
    const { data: wooMerchant } = await db
      .from('woo_merchants')
      .select('merchant_id')
      .eq('store_url', normalizedUrl)
      .single()

    if (!wooMerchant) return reply.status(403).send()

    const { data: instance } = await db
      .from('opportunity_instances')
      .select('id, merchant_id, current_state, definition_id, transaction_event_id, customer_reference')
      .eq('id', instanceId)
      .single()

    if (!instance || instance.merchant_id !== wooMerchant.merchant_id) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    if (instance.current_state !== 'PRESENTED') {
      return reply.send({ ok: true })
    }

    const responseAt = new Date().toISOString()

    if (response === 'DECLINED') {
      await db.from('opportunity_instances').update({
        current_state: 'DECLINED',
        customer_response: 'DECLINED',
        response_at: responseAt,
      }).eq('id', instanceId)
      return reply.send({ ok: true })
    }

    // ACCEPTED — fetch customer details from the transaction event's WooCommerce order
    const { data: txEvent } = await db
      .from('transaction_events')
      .select('shopify_order_id, cart_line_items')
      .eq('id', instance.transaction_event_id)
      .single()

    const { data: definition } = await db
      .from('opportunity_definitions')
      .select('shopify_product_price')
      .eq('id', instance.definition_id)
      .single()

    // Fetch customer details from WooCommerce via REST API
    let customerName: string | null = null
    let customerEmail: string | null = null
    let customerPhone: string | null = null
    let shippingAddress: object | null = null

    const { data: wooMerchantFull } = await db
      .from('woo_merchants')
      .select('store_url, api_key, api_secret')
      .eq('merchant_id', wooMerchant.merchant_id)
      .single()

    if (wooMerchantFull && txEvent?.shopify_order_id) {
      try {
        const wooOrderId = txEvent.shopify_order_id.replace('woo_', '')
        const auth = Buffer.from(`${wooMerchantFull.api_key}:${wooMerchantFull.api_secret}`).toString('base64')
        const orderRes = await fetch(
          `${wooMerchantFull.store_url}/wp-json/wc/v3/orders/${wooOrderId}`,
          { headers: { Authorization: `Basic ${auth}` } }
        )
        if (orderRes.ok) {
          const wooOrder: any = await orderRes.json()
          const fn = wooOrder.shipping?.first_name ?? wooOrder.billing?.first_name ?? ''
          const ln = wooOrder.shipping?.last_name ?? wooOrder.billing?.last_name ?? ''
          customerName = `${fn} ${ln}`.trim() || null
          customerEmail = wooOrder.billing?.email ?? null
          customerPhone = wooOrder.shipping?.phone ?? wooOrder.billing?.phone ?? null
          shippingAddress = wooOrder.shipping ?? wooOrder.billing ?? null
        }
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch WooCommerce order for fulfillment')
      }
    }

    await db.from('opportunity_instances').update({
      current_state: 'COMPLETED',
      customer_response: 'ACCEPTED',
      response_at: responseAt,
      execution_completed_at: responseAt,
      outcome_value: definition?.shopify_product_price ?? null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
    }).eq('id', instanceId)

    fastify.log.info({ instanceId }, 'WooCommerce opportunity accepted')
    return reply.send({ ok: true })
  })

  // ── POST /woo/connect ──────────────────────────────────────────────
  // Called by the WooCommerce plugin on activation to register the merchant.
  fastify.post('/woo/connect', async (request, reply) => {
    const { storeUrl, storeName, apiKey, apiSecret, webhookSecret, geography } = request.body as {
      storeUrl?: string
      storeName?: string
      apiKey?: string
      apiSecret?: string
      webhookSecret?: string
      geography?: string
    }

    if (!storeUrl || !storeName || !apiKey || !apiSecret) {
      return reply.status(400).send({ error: 'Missing required fields' })
    }

    const normalizedUrl = storeUrl.replace(/\/$/, '')

    // Check if already registered
    const { data: existing } = await db
      .from('woo_merchants')
      .select('merchant_id')
      .eq('store_url', normalizedUrl)
      .single()

    if (existing) {
      // Update credentials
      await db.from('woo_merchants').update({
        api_key: apiKey,
        api_secret: apiSecret,
        webhook_secret: webhookSecret ?? '',
        store_name: storeName,
      }).eq('store_url', normalizedUrl)

      return reply.send({ ok: true, merchantId: existing.merchant_id, isNew: false })
    }

    // Create new merchant record in core merchants table
    const { data: coreMerchant, error: merchantError } = await db
      .from('merchants')
      .insert({
        name: storeName,
        shopify_shop_domain: `woo_${normalizedUrl.replace(/https?:\/\//, '')}`,
        shopify_access_token: 'woocommerce',   // placeholder — not used for WooCommerce
        shopify_webhook_secret: webhookSecret ?? '',
        geography: geography ?? 'AE',
      })
      .select('id')
      .single()

    if (merchantError || !coreMerchant) {
      fastify.log.error({ merchantError }, 'Failed to create WooCommerce merchant')
      return reply.status(500).send({ error: 'Failed to create merchant' })
    }

    // Create merchant config
    await db.from('merchant_configs').insert({
      merchant_id: coreMerchant.id,
      engine_enabled: true,
      offers_enabled: true,
      dashboard_enabled: true,
      shopify_enabled: false,
    })

    // Create WooCommerce merchant record
    const { error: wooError } = await db.from('woo_merchants').insert({
      merchant_id: coreMerchant.id,
      store_url: normalizedUrl,
      store_name: storeName,
      api_key: apiKey,
      api_secret: apiSecret,
      webhook_secret: webhookSecret ?? '',
    })

    if (wooError) {
      fastify.log.error({ wooError }, 'Failed to insert woo_merchant')
      return reply.status(500).send({ error: 'Failed to register WooCommerce store' })
    }

    fastify.log.info({ storeUrl: normalizedUrl, merchantId: coreMerchant.id }, 'New WooCommerce merchant connected')
    return reply.send({ ok: true, merchantId: coreMerchant.id, isNew: true })
  })
}