import type { FastifyInstance, FastifyRequest } from 'fastify'
import { db } from '../db.js'

declare module 'fastify' {
  interface FastifyRequest {
    merchantId?: string
  }
}

async function authMiddleware(request: FastifyRequest, reply: any) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization header' })
  }

  const token = authHeader.split(' ')[1]

  // Try Supabase Auth first
  const { data: { user }, error } = await db.auth.getUser(token)

  if (!error && user) {
    const { data: merchantUser } = await db
      .from('merchant_users')
      .select('merchant_id')
      .eq('supabase_user_id', user.id)
      .single()

    if (!merchantUser) {
      return reply.status(403).send({ error: 'No merchant account found' })
    }

    const { data: config } = await db
      .from('merchant_configs')
      .select('dashboard_enabled')
      .eq('merchant_id', merchantUser.merchant_id)
      .single()

    if (!config?.dashboard_enabled) {
      return reply.status(403).send({ error: 'Dashboard not enabled' })
    }

    request.merchantId = merchantUser.merchant_id
    return
  }

  // Try Shopify session token (JWT)
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      const shopDomain = payload.dest?.replace('https://', '')

      if (shopDomain) {
        const { data: merchant } = await db
          .from('merchants')
          .select('id')
          .eq('shopify_shop_domain', shopDomain)
          .single()

        if (merchant) {
          request.merchantId = merchant.id
          return
        }
      }
    }
  } catch {
    // Not a valid Shopify session token
  }

  return reply.status(401).send({ error: 'Invalid token' })
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware)

  fastify.get('/dashboard/summary', async (request, reply) => {
    const { data, error } = await db
      .rpc('get_merchant_summary', { p_merchant_id: request.merchantId })

    if (error) {
      fastify.log.error({ error }, 'Failed to get merchant summary')
      return reply.status(500).send({ error: 'Failed to load summary' })
    }

    return reply.send(data)
  })

  fastify.get('/dashboard/transactions', async (request, reply) => {
    const { page = '1' } = request.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page))
    const limit = 20
    const offset = (pageNum - 1) * limit

    const { data, error, count } = await db
  .from('transaction_events')
  .select(`
    id,
    shopify_order_id,
    transaction_value,
    transaction_currency,
    transaction_type,
    received_at,
    decision_records!inner (
      outcome_type,
      opportunity_instances (
        current_state,
        customer_response,
        outcome_value
      )
    )
  `, { count: 'exact' })
  .eq('merchant_id', request.merchantId!)
  .order('received_at', { ascending: false })
  .range(offset, offset + limit - 1)

    if (error) {
      fastify.log.error({ error }, 'Failed to get transactions')
      return reply.status(500).send({ error: 'Failed to load transactions' })
    }

    return reply.send({
      transactions: data,
      total: count ?? 0,
      page: pageNum,
    })
  })
}