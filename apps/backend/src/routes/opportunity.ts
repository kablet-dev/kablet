import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { fetchShopifyOrder } from '../shopify.js'

export async function opportunityRoutes(fastify: FastifyInstance) {

  // ── GET /opportunity/decision ────────────────────────────────────────
fastify.get('/opportunity/decision', async (request, reply) => {
  const { shopifyOrderId, shopDomain } = request.query as {
    shopifyOrderId?: string
    shopDomain?: string
  }

  if (!shopifyOrderId || !shopDomain || shopifyOrderId === '0') {
    return reply.send({ opportunity: null })
  }

  // Run merchant lookup and transaction lookup in parallel
  const [merchantResult, eventResult] = await Promise.all([
    db.from('merchants')
      .select('id')
      .eq('shopify_shop_domain', shopDomain)
      .single(),
    db.from('transaction_events')
      .select('id')
      .eq('shopify_order_id', shopifyOrderId)
      .maybeSingle()
  ])

  const merchant = merchantResult.data
  const event = eventResult.data

  if (!merchant || !event) return reply.send({ opportunity: null })

  // Run config, decision in parallel
  const [configResult, decisionResult] = await Promise.all([
    db.from('merchant_configs')
      .select('offers_enabled')
      .eq('merchant_id', merchant.id)
      .single(),
    db.from('decision_records')
      .select('outcome_type, selected_definition_id')
      .eq('transaction_event_id', event.id)
      .single()
  ])

  const config = configResult.data
  const decision = decisionResult.data

  if (!config?.offers_enabled) return reply.send({ opportunity: null })
  if (!decision || decision.outcome_type !== 'OPPORTUNITY_IDENTIFIED') {
    return reply.send({ opportunity: null })
  }

  // Run instance and definition in parallel
  const [instanceResult, definitionResult] = await Promise.all([
    db.from('opportunity_instances')
      .select('id, current_state')
      .eq('transaction_event_id', event.id)
      .single(),
    db.from('opportunity_definitions')
      .select('headline, description, value_proposition, visual_asset_url, cta_label, value_bullets, social_proof, trust_rating, template, shopify_product_price')
      .eq('id', decision.selected_definition_id!)
      .single()
  ])

  const instance = instanceResult.data
  const definition = definitionResult.data

  if (!instance || !['SELECTED', 'PRESENTED'].includes(instance.current_state)) {
    return reply.send({ opportunity: null })
  }

  if (!definition) return reply.send({ opportunity: null })

  // Update to PRESENTED
  // Update to PRESENTED in background — don't await
if (instance.current_state === 'SELECTED') {
  ;(async () => {
    await db
      .from('opportunity_instances')
      .update({ current_state: 'PRESENTED' })
      .eq('id', instance.id)
  })()
}

  fastify.log.info({ instanceId: instance.id }, 'Opportunity presented')

  return reply.send({
    opportunity: {
      instanceId: instance.id,
      template: definition.template ?? 'PHYSICAL_PRODUCT',
      headline: definition.headline,
      description: definition.description,
      valueProposition: definition.value_proposition,
      visualAssetUrl: definition.visual_asset_url,
      ctaLabel: definition.cta_label,
      valueBullets: definition.value_bullets ?? [],
      socialProof: definition.social_proof ?? null,
      trustRating: definition.trust_rating ?? null,
      price: definition.shopify_product_price ? String(definition.shopify_product_price) : null,
    }
  })
})

  // ── POST /opportunity/response ───────────────────────────────────────
  fastify.post('/opportunity/response', async (request, reply) => {
    const { instanceId, response, shopDomain } = request.body as {
      instanceId?: string
      response?: 'ACCEPTED' | 'DECLINED'
      shopDomain?: string
    }

    if (!instanceId || !response || !shopDomain) {
      return reply.status(400).send({ error: 'Missing required fields' })
    }

    if (!['ACCEPTED', 'DECLINED'].includes(response)) {
      return reply.status(400).send({ error: 'Invalid response value' })
    }

    const { data: merchant } = await db
      .from('merchants')
      .select('id, shopify_shop_domain, shopify_access_token')
      .eq('shopify_shop_domain', shopDomain)
      .single()

    if (!merchant) return reply.status(403).send()

    const { data: instance } = await db
      .from('opportunity_instances')
      .select('id, merchant_id, current_state, definition_id, transaction_event_id, customer_reference')
      .eq('id', instanceId)
      .single()

    if (!instance || instance.merchant_id !== merchant.id) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    if (instance.current_state !== 'PRESENTED') {
      return reply.send({ ok: true })
    }

    const responseAt = new Date().toISOString()

    if (response === 'DECLINED') {
      await db
        .from('opportunity_instances')
        .update({
          current_state: 'DECLINED',
          customer_response: 'DECLINED',
          response_at: responseAt,
        })
        .eq('id', instanceId)

      fastify.log.info({ instanceId }, 'Opportunity declined')
      return reply.send({ ok: true })
    }

    // ACCEPTED — fetch customer details from original Shopify order
    const { data: event } = await db
      .from('transaction_events')
      .select('shopify_order_id')
      .eq('id', instance.transaction_event_id)
      .single()

    const { data: definition } = await db
      .from('opportunity_definitions')
      .select('shopify_product_price')
      .eq('id', instance.definition_id)
      .single()

    // Fetch original order to get customer fulfillment details
    let customerName: string | null = null
    let customerEmail: string | null = null
    let customerPhone: string | null = null
    let shippingAddress: object | null = null

    if (event?.shopify_order_id) {
      try {
        const originalOrder = await fetchShopifyOrder(
          merchant.shopify_shop_domain,
          merchant.shopify_access_token,
          event.shopify_order_id
        )

        const firstName = originalOrder.shipping_address?.first_name ?? ''
        const lastName = originalOrder.shipping_address?.last_name ?? ''
        customerName = `${firstName} ${lastName}`.trim() || null
        customerEmail = originalOrder.email ?? null
        customerPhone = originalOrder.shipping_address?.phone ?? null
        shippingAddress = originalOrder.shipping_address ?? null

      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch original order for fulfillment details')
      }
    }

    // Update instance to COMPLETED with fulfillment details
    await db
      .from('opportunity_instances')
      .update({
        current_state: 'COMPLETED',
        customer_response: 'ACCEPTED',
        response_at: responseAt,
        execution_completed_at: responseAt,
        outcome_value: definition?.shopify_product_price ?? null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
      })
      .eq('id', instanceId)

    fastify.log.info({ instanceId }, 'Opportunity accepted and completed')

    return reply.send({ ok: true })
  })
}