import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { verifyShopifyHmac, translateShopifyOrder } from '../shopify.js'
import { processTransactionEvent } from '../engine.js'

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/webhook/shopify/order', async (request, reply) => {
    const shopDomain = request.headers['x-shopify-shop-domain'] as string | undefined
    const hmacHeader = request.headers['x-shopify-hmac-sha256'] as string | undefined

    if (!shopDomain || !hmacHeader) {
      return reply.status(400).send({ error: 'Missing required headers' })
    }

    // Look up merchant by shop domain
    const { data: merchant } = await db
      .from('merchants')
      .select('*')
      .eq('shopify_shop_domain', shopDomain)
      .single()

    if (!merchant) {
      return reply.status(200).send()
    }

    // Verify HMAC signature
    const rawBody = (request as any).rawBody as Buffer
    if (!verifyShopifyHmac(rawBody, hmacHeader, merchant.shopify_webhook_secret)) {
      fastify.log.warn({ shopDomain }, 'Invalid HMAC signature')
      return reply.status(401).send({ error: 'Invalid signature' })
    }

    // Check merchant config
    const { data: config } = await db
      .from('merchant_configs')
      .select('shopify_enabled, engine_enabled')
      .eq('merchant_id', merchant.id)
      .single()

    if (!config?.shopify_enabled) {
      return reply.status(200).send()
    }

    const order = request.body as any

    // Deduplicate
    const { data: existing } = await db
      .from('transaction_events')
      .select('id')
      .eq('merchant_id', merchant.id)
      .eq('shopify_order_id', order.id.toString())
      .maybeSingle()

    if (existing) {
      fastify.log.info({ orderId: order.id }, 'Duplicate webhook ignored')
      return reply.status(200).send()
    }

    // Create transaction event
    const eventData = translateShopifyOrder(order, merchant)
    const { data: event, error } = await db
      .from('transaction_events')
      .insert(eventData)
      .select()
      .single()

    if (error || !event) {
      fastify.log.error({ error }, 'Failed to insert transaction event')
      return reply.status(500).send()
    }

    fastify.log.info({ transactionEventId: event.id, orderId: order.id }, 'Transaction event created')

    // Run Core Engine
    if (config.engine_enabled) {
      try {
        await processTransactionEvent(event)
        fastify.log.info({ transactionEventId: event.id }, 'Core Engine completed')
      } catch (err) {
        fastify.log.error({ err, transactionEventId: event.id }, 'Core Engine error')
      }
    }

    return reply.status(200).send()
  })
}