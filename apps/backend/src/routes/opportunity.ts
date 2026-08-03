import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { fetchShopifyOrder } from '../shopify.js'

// ── Shared helper to build opportunity response ───────────────────
async function buildOpportunityResponse(
  instanceId: string,
  definitionId: string,
  currentState: string
): Promise<object | null> {
  const { data: definition } = await db
    .from('opportunity_definitions')
    .select('headline, description, value_proposition, visual_asset_url, cta_label, value_bullets, social_proof, trust_rating, template, shopify_product_price')
    .eq('id', definitionId)
    .single()

  if (!definition) return null

  // Mark as PRESENTED in background
  if (currentState === 'SELECTED') {
    db.from('opportunity_instances')
      .update({ current_state: 'PRESENTED' })
      .eq('id', instanceId)
      .then(() => {})
  }

  return {
    instanceId,
    template: definition.template ?? 'PHYSICAL_PRODUCT',
    headline: definition.headline,
    description: definition.description,
    valueProposition: definition.value_proposition,
    visualAssetUrl: definition.visual_asset_url,
    ctaLabel: definition.cta_label,
    valueBullets: definition.value_bullets ?? [],
    socialProof: definition.social_proof ?? null,
    trustRating: definition.trust_rating ?? null,
    price: definition.shopify_product_price
      ? String(definition.shopify_product_price)
      : null,
  }
}

export async function opportunityRoutes(fastify: FastifyInstance) {

  // ── GET /opportunity/decision ─────────────────────────────────────
  fastify.get('/opportunity/decision', async (request, reply) => {
    const { shopifyOrderId, shopDomain } = request.query as {
      shopifyOrderId?: string
      shopDomain?: string
    }

    if (!shopifyOrderId || !shopDomain || shopifyOrderId === '0') {
      return reply.send({ opportunity: null })
    }

    // Look up merchant
    const { data: merchant } = await db
      .from('merchants')
      .select('id')
      .eq('shopify_shop_domain', shopDomain)
      .single()

    if (!merchant) return reply.send({ opportunity: null })

    // Check offers enabled
    const { data: config } = await db
      .from('merchant_configs')
      .select('offers_enabled')
      .eq('merchant_id', merchant.id)
      .single()

    if (!config?.offers_enabled) return reply.send({ opportunity: null })

    // Look up transaction event
    const { data: event } = await db
      .from('transaction_events')
      .select('*')
      .eq('shopify_order_id', shopifyOrderId)
      .eq('merchant_id', merchant.id)
      .maybeSingle()

    // ── Fast path: transaction + decision already exist ──────────────
    if (event) {
      const { data: decision } = await db
        .from('decision_records')
        .select('outcome_type, selected_definition_id')
        .eq('transaction_event_id', event.id)
        .maybeSingle()

      if (decision) {
        // Decision already made
        if (decision.outcome_type !== 'OPPORTUNITY_IDENTIFIED') {
          return reply.send({ opportunity: null })
        }

        const { data: instance } = await db
          .from('opportunity_instances')
          .select('id, current_state')
          .eq('transaction_event_id', event.id)
          .single()

        if (!instance || !['SELECTED', 'PRESENTED'].includes(instance.current_state)) {
          return reply.send({ opportunity: null })
        }

        const opp = await buildOpportunityResponse(
          instance.id,
          decision.selected_definition_id!,
          instance.current_state
        )

        fastify.log.info({ instanceId: instance.id }, 'Opportunity presented')
        return reply.send({ opportunity: opp })
      }

      // ── Transaction exists but engine hasn't run yet ─────────────
      // Webhook is processing in parallel — wait briefly then check again
      await new Promise(resolve => setTimeout(resolve, 1500))

      const { data: retryDecision } = await db
        .from('decision_records')
        .select('outcome_type, selected_definition_id')
        .eq('transaction_event_id', event.id)
        .maybeSingle()

      if (!retryDecision || retryDecision.outcome_type !== 'OPPORTUNITY_IDENTIFIED') {
        return reply.send({ opportunity: null })
      }

      const { data: retryInstance } = await db
        .from('opportunity_instances')
        .select('id, current_state')
        .eq('transaction_event_id', event.id)
        .single()

      if (!retryInstance || !['SELECTED', 'PRESENTED'].includes(retryInstance.current_state)) {
        return reply.send({ opportunity: null })
      }

      const oppRetry = await buildOpportunityResponse(
        retryInstance.id,
        retryDecision.selected_definition_id!,
        retryInstance.current_state
      )

      fastify.log.info({ instanceId: retryInstance.id }, 'Opportunity presented (after wait)')
      return reply.send({ opportunity: oppRetry })
    }

    // ── Transaction doesn't exist yet — return null, widget will retry ──
    // The webhook will create it within 1-2 seconds
    return reply.send({ opportunity: null })
  })

  // ── POST /opportunity/response ────────────────────────────────────
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
