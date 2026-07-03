import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function opportunityRoutes(fastify: FastifyInstance) {

  // ── GET /opportunity/decision ────────────────────────────────────────
  fastify.get('/opportunity/decision', async (request, reply) => {
    const { shopifyOrderId, shopDomain } = request.query as {
      shopifyOrderId?: string
      shopDomain?: string
    }

    if (!shopifyOrderId || !shopDomain) {
      return reply.send({ opportunity: null })
    }

    const { data: merchant } = await db
      .from('merchants')
      .select('id')
      .eq('shopify_shop_domain', shopDomain)
      .single()

    if (!merchant) return reply.send({ opportunity: null })

    const { data: config } = await db
      .from('merchant_configs')
      .select('offers_enabled')
      .eq('merchant_id', merchant.id)
      .single()

    if (!config?.offers_enabled) return reply.send({ opportunity: null })

    const { data: event } = await db
      .from('transaction_events')
      .select('id')
      .eq('merchant_id', merchant.id)
      .eq('shopify_order_id', shopifyOrderId)
      .maybeSingle()

    if (!event) return reply.send({ opportunity: null })

    const { data: decision } = await db
      .from('decision_records')
      .select('outcome_type, selected_definition_id')
      .eq('transaction_event_id', event.id)
      .single()

    if (!decision || decision.outcome_type !== 'OPPORTUNITY_IDENTIFIED') {
      return reply.send({ opportunity: null })
    }

    const { data: instance } = await db
      .from('opportunity_instances')
      .select('id, current_state')
      .eq('transaction_event_id', event.id)
      .single()

    if (!instance || instance.current_state !== 'SELECTED') {
      return reply.send({ opportunity: null })
    }

    const { data: definition } = await db
      .from('opportunity_definitions')
      .select('headline, description, value_proposition, visual_asset_url, cta_label')
      .eq('id', decision.selected_definition_id!)
      .single()

    if (!definition) return reply.send({ opportunity: null })

    await db
      .from('opportunity_instances')
      .update({ current_state: 'PRESENTED' })
      .eq('id', instance.id)

    fastify.log.info({ instanceId: instance.id }, 'Opportunity presented')

    return reply.send({
      opportunity: {
        instanceId: instance.id,
        headline: definition.headline,
        description: definition.description,
        valueProposition: definition.value_proposition,
        visualAssetUrl: definition.visual_asset_url,
        ctaLabel: definition.cta_label,
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
      .select('id')
      .eq('shopify_shop_domain', shopDomain)
      .single()

    if (!merchant) return reply.status(403).send()

    const { data: instance } = await db
      .from('opportunity_instances')
      .select('id, merchant_id, current_state, definition_id')
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

    // ACCEPTED — get the product price for outcome value
    const { data: definition } = await db
      .from('opportunity_definitions')
      .select('shopify_product_price')
      .eq('id', instance.definition_id)
      .single()

    await db
      .from('opportunity_instances')
      .update({
        current_state: 'COMPLETED',
        customer_response: 'ACCEPTED',
        response_at: responseAt,
        execution_completed_at: responseAt,
        outcome_value: definition?.shopify_product_price ?? null,
      })
      .eq('id', instanceId)

    fastify.log.info({ instanceId }, 'Opportunity accepted and completed')

    return reply.send({ ok: true })
  })
}