import type { FastifyInstance, FastifyRequest } from 'fastify'
import { db } from '../db.js'

declare module 'fastify' {
  interface FastifyRequest {
    merchantId?: string
  }
}

function getPeriodFilter(period: string): string | null {
  const now = new Date()
  switch (period) {
    case 'today':
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      return today.toISOString()
    case '7d':
      const d7 = new Date(now)
      d7.setDate(d7.getDate() - 7)
      return d7.toISOString()
    case '30d':
      const d30 = new Date(now)
      d30.setDate(d30.getDate() - 30)
      return d30.toISOString()
    case 'lifetime':
    default:
      return null
  }
}

async function authMiddleware(request: FastifyRequest, reply: any) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization header' })
  }

  const token = authHeader.split(' ')[1]

  // Try Supabase Auth
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

  // Try Shopify session token
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
  } catch {}

  return reply.status(401).send({ error: 'Invalid token' })
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware)

  // ── GET /dashboard/summary ───────────────────────────────────────────
  fastify.get('/dashboard/summary', async (request, reply) => {
    const { period = 'lifetime' } = request.query as { period?: string }
    const merchantId = request.merchantId!
    const since = getPeriodFilter(period)

    // Get transactions in period
    let txQuery = db
      .from('transaction_events')
      .select('id')
      .eq('merchant_id', merchantId)

    if (since) txQuery = txQuery.gte('received_at', since)
    const { data: transactions } = await txQuery

    const txIds = transactions?.map(t => t.id) ?? []

    if (txIds.length === 0) {
      return reply.send({
        total_revenue: 0,
        transactions_processed: 0,
        opportunities_presented: 0,
        opportunities_accepted: 0,
        acceptance_rate: 0,
        revenue_per_order: 0,
      })
    }

    // Get instances for these transactions
    const { data: instances } = await db
      .from('opportunity_instances')
      .select('current_state, customer_response, outcome_value')
      .eq('merchant_id', merchantId)
      .in('transaction_event_id', txIds)

    const completed = instances?.filter(i => i.current_state === 'COMPLETED') ?? []
    const presented = instances?.filter(i =>
      ['PRESENTED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'COMPLETED', 'FAILED'].includes(i.current_state)
    ) ?? []
    const accepted = instances?.filter(i => i.customer_response === 'ACCEPTED') ?? []

    const totalRevenue = completed.reduce((sum, i) => sum + (Number(i.outcome_value) ?? 0), 0)
    const acceptanceRate = presented.length > 0
      ? Math.round((accepted.length / presented.length) * 100 * 10) / 10
      : 0
    const revenuePerOrder = txIds.length > 0
      ? Math.round((totalRevenue / txIds.length) * 100) / 100
      : 0

    return reply.send({
      total_revenue: totalRevenue,
      transactions_processed: txIds.length,
      opportunities_presented: presented.length,
      opportunities_accepted: accepted.length,
      acceptance_rate: acceptanceRate,
      revenue_per_order: revenuePerOrder,
    })
  })

  // ── GET /dashboard/transactions ──────────────────────────────────────
  fastify.get('/dashboard/transactions', async (request, reply) => {
    const { page = '1', period = 'lifetime' } = request.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page))
    const limit = 20
    const offset = (pageNum - 1) * limit
    const since = getPeriodFilter(period)
    const merchantId = request.merchantId!

    let query = db
      .from('transaction_events')
      .select('id, shopify_order_id, transaction_value, transaction_currency, transaction_type, received_at', { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (since) query = query.gte('received_at', since)

    const { data: transactions, count } = await query

    if (!transactions || transactions.length === 0) {
      return reply.send({ transactions: [], total: 0, page: pageNum })
    }

    const txIds = transactions.map(t => t.id)

    // Fetch decisions
    const { data: decisions } = await db
      .from('decision_records')
      .select('transaction_event_id, outcome_type, selected_definition_id')
      .in('transaction_event_id', txIds)

    // Fetch instances
    const { data: instances } = await db
      .from('opportunity_instances')
      .select('transaction_event_id, current_state, customer_response, outcome_value')
      .in('transaction_event_id', txIds)

    // Fetch definition names
    const definitionIds = decisions
      ?.map(d => d.selected_definition_id)
      .filter(Boolean) ?? []

    const { data: definitions } = definitionIds.length > 0
      ? await db
          .from('opportunity_definitions')
          .select('id, name')
          .in('id', definitionIds)
      : { data: [] }

    const result = transactions.map(tx => {
      const decision = decisions?.find(d => d.transaction_event_id === tx.id) ?? null
      const instance = instances?.find(i => i.transaction_event_id === tx.id) ?? null
      const definition = decision?.selected_definition_id
        ? definitions?.find(d => d.id === decision.selected_definition_id) ?? null
        : null

      return {
        ...tx,
        decision,
        instance,
        offer_name: definition?.name ?? null,
      }
    })

    return reply.send({
      transactions: result,
      total: count ?? 0,
      page: pageNum,
    })
  })

  // ── GET /dashboard/editor-url ────────────────────────────────────────
fastify.get('/dashboard/editor-url', async (request, reply) => {
  const { data: merchant } = await db
    .from('merchants')
    .select('shopify_shop_domain, shopify_access_token')
    .eq('id', request.merchantId!)
    .single()

  if (!merchant) return reply.status(404).send({ error: 'Merchant not found' })

  try {
    const profileResponse = await fetch(
      `https://${merchant.shopify_shop_domain}/admin/api/2026-07/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': merchant.shopify_access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{ checkoutProfiles(first: 1) { edges { node { id } } } }`
        })
      }
    )
   const profileData = await profileResponse.json() as any
fastify.log.info({ profileData: JSON.stringify(profileData) }, 'Profile response')
const profileGid = profileData?.data?.checkoutProfiles?.edges?.[0]?.node?.id
const profileId = profileGid?.split('/').pop() ?? ''
fastify.log.info({ profileId, profileGid }, 'Checkout profile fetched')
    // Fallback profile IDs per store (used when token type doesn't support GraphQL)
const fallbackProfileIds: Record<string, string> = {
  'kablet-dev.myshopify.com': '4988010747',
  '4piius-i0.myshopify.com': '4107731126',
  'kablet-dev-2.myshopify.com': '5045288996',
}

const resolvedProfileId = profileId || fallbackProfileIds[merchant.shopify_shop_domain] || ''

const url = resolvedProfileId
  ? `https://${merchant.shopify_shop_domain}/admin/settings/checkout/editor/profiles/${resolvedProfileId}?page=thank-you`
  : `https://${merchant.shopify_shop_domain}/admin/settings/checkout`

    return reply.send({ url })
  } catch {
    return reply.send({ url: `https://${merchant.shopify_shop_domain}/admin/settings/checkout` })
  }
})

  // ── GET /dashboard/config ────────────────────────────────────────────
fastify.get('/dashboard/config', async (request, reply) => {
  const { data } = await db
    .from('merchant_configs')
    .select('offers_enabled, engine_enabled, setup_completed')
    .eq('merchant_id', request.merchantId!)
    .single()

  return reply.send(data ?? { offers_enabled: true, engine_enabled: true, setup_completed: false })
})



// ── POST /dashboard/complete-setup ──────────────────────────────────
fastify.post('/dashboard/complete-setup', async (request, reply) => {
  const { data, error } = await db
    .from('merchant_configs')
    .update({ setup_completed: true })
    .eq('merchant_id', request.merchantId!)
    .select()
    .single()

  if (error) return reply.status(500).send({ error: error.message })
  return reply.send({ ok: true })
})

// ── POST /dashboard/register-webhook ────────────────────────────────
fastify.post('/dashboard/register-webhook', async (request, reply) => {
  const merchantId = request.merchantId!

  const { data: merchant } = await db
    .from('merchants')
    .select('shopify_shop_domain, shopify_access_token')
    .eq('id', merchantId)
    .single()

  if (!merchant) return reply.status(404).send({ error: 'Merchant not found' })

  try {
    const res = await fetch(
      `https://${merchant.shopify_shop_domain}/admin/api/2026-07/webhooks.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': merchant.shopify_access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic: 'orders/create',
            address: `${process.env.RENDER_EXTERNAL_URL}/webhook/shopify/order`,
            format: 'json',
          }
        })
      }
    )

    const data = await res.json() as any
    fastify.log.info({ data: JSON.stringify(data), shop: merchant.shopify_shop_domain }, 'Webhook registration attempt')

    return reply.send({ ok: true, data })
  } catch (err) {
    fastify.log.error({ err }, 'Webhook registration failed')
    return reply.status(500).send({ error: 'Failed to register webhook' })
  }
})

// ── PATCH /dashboard/config ──────────────────────────────────────────
fastify.patch('/dashboard/config', async (request, reply) => {
  const body = request.body as any

  const { data, error } = await db
    .from('merchant_configs')
    .update(body)
    .eq('merchant_id', request.merchantId!)
    .select()
    .single()

  if (error) return reply.status(500).send({ error: error.message })
  return reply.send(data)
})
}