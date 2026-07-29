import type { FastifyInstance, FastifyRequest } from 'fastify'
import { db } from '../db.js'

// ── Auth: validates storeUrl + apiKey against woo_merchants table ──────
// Completely separate from Shopify/Supabase auth. No overlap.
async function wooAuth(request: FastifyRequest, reply: any): Promise<string | null> {
  const { storeUrl, apiKey } = (request.query ?? request.body ?? {}) as any

  if (!storeUrl || !apiKey) {
    reply.status(401).send({ error: 'Missing storeUrl or apiKey' })
    return null
  }

  const normalizedUrl = storeUrl.replace(/\/$/, '')

  const { data: wooMerchant } = await db
    .from('woo_merchants')
    .select('merchant_id, api_key')
    .eq('store_url', normalizedUrl)
    .single()

  if (!wooMerchant || wooMerchant.api_key !== apiKey) {
    reply.status(403).send({ error: 'Invalid credentials' })
    return null
  }

  return wooMerchant.merchant_id
}

function getPeriodFilter(period: string): string | null {
  const now = new Date()
  switch (period) {
    case 'today':
      const today = new Date(now); today.setHours(0,0,0,0); return today.toISOString()
    case '7d':
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7); return d7.toISOString()
    case '30d':
      const d30 = new Date(now); d30.setDate(d30.getDate() - 30); return d30.toISOString()
    default: return null
  }
}

export async function wooDashboardRoutes(fastify: FastifyInstance) {

  // ── GET /woo/dashboard/summary ────────────────────────────────────────
  fastify.get('/woo/dashboard/summary', async (request, reply) => {
    const merchantId = await wooAuth(request, reply)
    if (!merchantId) return

    const { period = 'lifetime' } = request.query as any
    const since = getPeriodFilter(period)

    let txQuery = db
      .from('transaction_events')
      .select('id')
      .eq('merchant_id', merchantId)
    if (since) txQuery = txQuery.gte('received_at', since)
    const { data: transactions } = await txQuery

    const txIds = transactions?.map(t => t.id) ?? []

    if (txIds.length === 0) {
      return reply.send({
        total_revenue: 0, transactions_processed: 0,
        opportunities_presented: 0, opportunities_accepted: 0,
        acceptance_rate: 0, revenue_per_order: 0,
      })
    }

    const { data: instances } = await db
      .from('opportunity_instances')
      .select('current_state, customer_response, outcome_value')
      .eq('merchant_id', merchantId)
      .in('transaction_event_id', txIds)

    const completed = instances?.filter(i => i.current_state === 'COMPLETED') ?? []
    const presented = instances?.filter(i =>
      ['PRESENTED','ACCEPTED','DECLINED','EXPIRED','COMPLETED','FAILED'].includes(i.current_state)
    ) ?? []
    const accepted = instances?.filter(i => i.customer_response === 'ACCEPTED') ?? []

    const totalRevenue = completed.reduce((sum, i) => sum + (Number(i.outcome_value) ?? 0), 0)
    const acceptanceRate = presented.length > 0
      ? Math.round((accepted.length / presented.length) * 100 * 10) / 10 : 0
    const revenuePerOrder = txIds.length > 0
      ? Math.round((totalRevenue / txIds.length) * 100) / 100 : 0

    return reply.send({
      total_revenue: totalRevenue,
      transactions_processed: txIds.length,
      opportunities_presented: presented.length,
      opportunities_accepted: accepted.length,
      acceptance_rate: acceptanceRate,
      revenue_per_order: revenuePerOrder,
    })
  })

  // ── GET /woo/dashboard/transactions ──────────────────────────────────
  fastify.get('/woo/dashboard/transactions', async (request, reply) => {
    const merchantId = await wooAuth(request, reply)
    if (!merchantId) return

    const { page = '1', period = 'lifetime' } = request.query as any
    const pageNum = Math.max(1, parseInt(page))
    const limit = 20
    const offset = (pageNum - 1) * limit
    const since = getPeriodFilter(period)

    let query = db
      .from('transaction_events')
      .select('id, shopify_order_id, transaction_value, transaction_currency, received_at', { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (since) query = query.gte('received_at', since)

    const { data: transactions, count } = await query
    if (!transactions || transactions.length === 0) {
      return reply.send({ transactions: [], total: 0, page: pageNum })
    }

    const txIds = transactions.map(t => t.id)

    const { data: decisions } = await db
      .from('decision_records')
      .select('transaction_event_id, outcome_type, selected_definition_id')
      .in('transaction_event_id', txIds)

    const { data: instances } = await db
      .from('opportunity_instances')
      .select('transaction_event_id, current_state, customer_response, outcome_value')
      .in('transaction_event_id', txIds)

    const definitionIds = decisions?.map(d => d.selected_definition_id).filter(Boolean) ?? []
    const { data: definitions } = definitionIds.length > 0
      ? await db.from('opportunity_definitions').select('id, name').in('id', definitionIds)
      : { data: [] }

    const result = transactions.map(tx => {
      const decision = decisions?.find(d => d.transaction_event_id === tx.id) ?? null
      const instance = instances?.find(i => i.transaction_event_id === tx.id) ?? null
      const definition = decision?.selected_definition_id
        ? definitions?.find(d => d.id === decision.selected_definition_id) ?? null : null
      return { ...tx, instance, offer_name: definition?.name ?? null }
    })

    return reply.send({ transactions: result, total: count ?? 0, page: pageNum })
  })

  // ── GET /woo/payouts/summary ──────────────────────────────────────────
  fastify.get('/woo/payouts/summary', async (request, reply) => {
    const merchantId = await wooAuth(request, reply)
    if (!merchantId) return

    const PAYOUT_PER = 8.00
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysToMonday)
    weekStart.setHours(0,0,0,0)
    const nextMonday = new Date(weekStart)
    nextMonday.setDate(weekStart.getDate() + 7)

    const { data: weekInstances } = await db
      .from('opportunity_instances')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('current_state', 'COMPLETED')
      .gte('response_at', weekStart.toISOString())

    const { data: payouts } = await db
      .from('merchant_payouts')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('period_start', { ascending: false })

    const { data: allCompleted } = await db
      .from('opportunity_instances')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('current_state', 'COMPLETED')

    const weekCount = weekInstances?.length ?? 0
    const lifetimeCount = allCompleted?.length ?? 0

    return reply.send({
      current_week: {
        transactions: weekCount,
        amount: weekCount * PAYOUT_PER,
        next_payout_date: nextMonday.toISOString().split('T')[0],
      },
      lifetime: {
        transactions: lifetimeCount,
        earnings: lifetimeCount * PAYOUT_PER,
      },
      payouts: payouts ?? [],
    })
  })

  // ── GET /woo/payouts/settings ─────────────────────────────────────────
  fastify.get('/woo/payouts/settings', async (request, reply) => {
    const merchantId = await wooAuth(request, reply)
    if (!merchantId) return

    const { data } = await db
      .from('merchant_payout_settings')
      .select('*')
      .eq('merchant_id', merchantId)
      .single()

    return reply.send({ settings: data ?? null })
  })

  // ── POST /woo/payouts/settings ────────────────────────────────────────
  fastify.post('/woo/payouts/settings', async (request, reply) => {
    const merchantId = await wooAuth(request, reply)
    if (!merchantId) return

    const body = request.body as any
    if (!body.full_name || !body.account_holder_name || !body.bank_name || !body.iban) {
      return reply.status(400).send({ error: 'All fields are required' })
    }

    const { data, error } = await db
      .from('merchant_payout_settings')
      .upsert({
        merchant_id: merchantId,
        full_name: body.full_name,
        account_holder_name: body.account_holder_name,
        bank_name: body.bank_name,
        iban: body.iban,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id' })
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.send({ settings: data })
  })

  // ── GET /woo/dashboard/config ─────────────────────────────────────────
  fastify.get('/woo/dashboard/config', async (request, reply) => {
    const merchantId = await wooAuth(request, reply)
    if (!merchantId) return

    const { data } = await db
      .from('merchant_configs')
      .select('offers_enabled, engine_enabled')
      .eq('merchant_id', merchantId)
      .single()

    return reply.send(data ?? { offers_enabled: true, engine_enabled: true })
  })

  // ── PATCH /woo/dashboard/config ───────────────────────────────────────
  fastify.patch('/woo/dashboard/config', async (request, reply) => {
    const merchantId = await wooAuth(request, reply)
    if (!merchantId) return

    const body = request.body as any
    const allowed = ['offers_enabled', 'engine_enabled']
    const update: any = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await db
      .from('merchant_configs')
      .update(update)
      .eq('merchant_id', merchantId)
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.send(data)
  })
}