import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { verifyShopifyHmac } from '../shopify.js'

function verifyCompliance(request: any, reply: any): boolean {
  const hmacHeader = request.headers['x-shopify-hmac-sha256'] as string | undefined
  const rawBody = request.rawBody as Buffer
  const appSecret = process.env.SHOPIFY_CLIENT_SECRET ?? ''

  if (!hmacHeader || !rawBody) {
    reply.status(401).send({ error: 'Missing HMAC header' })
    return false
  }

  if (!verifyShopifyHmac(rawBody, hmacHeader, appSecret)) {
    reply.status(401).send({ error: 'Invalid signature' })
    return false
  }

  return true
}

export async function complianceRoutes(fastify: FastifyInstance) {

  fastify.post('/webhooks/customers/data_request', async (request, reply) => {
    if (!verifyCompliance(request, reply)) return

    const payload = request.body as any
    fastify.log.info({
      shop: payload.shop_domain,
      customerId: payload.customer?.id,
    }, 'Customer data request received')

    return reply.status(200).send()
  })

  fastify.post('/webhooks/app/uninstalled', async (request, reply) => {
    if (!verifyCompliance(request, reply)) return

    const payload = request.body as any
    const shopDomain = payload.domain

    fastify.log.info({ shopDomain }, 'App uninstalled')

    if (shopDomain) {
      const { data: merchant } = await db
        .from('merchants')
        .select('id')
        .eq('shopify_shop_domain', shopDomain)
        .single()

      if (merchant) {
        await db
          .from('merchant_configs')
          .update({
            engine_enabled: false,
            offers_enabled: false,
            shopify_enabled: false,
          })
          .eq('merchant_id', merchant.id)
      }
    }

    return reply.status(200).send()
  })

  fastify.post('/webhooks/customers/redact', async (request, reply) => {
    if (!verifyCompliance(request, reply)) return

    const payload = request.body as any
    fastify.log.info({
      shop: payload.shop_domain,
      customerId: payload.customer?.id,
    }, 'Customer redact request received')

    return reply.status(200).send()
  })

  fastify.post('/webhooks/shop/redact', async (request, reply) => {
    if (!verifyCompliance(request, reply)) return

    const payload = request.body as any
    fastify.log.info({
      shop: payload.shop_domain,
    }, 'Shop redact request received')

    return reply.status(200).send()
  })
}