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
    case 'today': {
      const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString()
    }
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate()-7); return d.toISOString()
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate()-30); return d.toISOString()
    }
    case '90d': {
      const d = new Date(now); d.setDate(d.getDate()-90); return d.toISOString()
    }
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

    if (!merchantUser) return reply.status(403).send({ error: 'No merchant account found' })

    const { data: config } = await db
      .from('merchant_configs')
      .select('dashboard_enabled')
      .eq('merchant_id', merchantUser.merchant_id)
      .single()

    if (!config?.dashboard_enabled) return reply.status(403).send({ error: 'Dashboard not enabled' })

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
        if (merchant) { request.merchantId = merchant.id; return }
      }
    }
  } catch {}

  // Try WooCommerce auth (storeUrl + apiKey in query params)
  try {
    const { storeUrl, apiKey } = request.query as any
    if (storeUrl && apiKey) {
      const { data: wooMerchant } = await db
        .from('woo_merchants')
        .select('merchant_id, api_key')
        .eq('store_url', storeUrl.replace(/\/$/, ''))
        .single()
      if (wooMerchant && wooMerchant.api_key === apiKey) {
        request.merchantId = wooMerchant.merchant_id
        return
      }
    }
  } catch {}

  return reply.status(401).send({ error: 'Invalid token' })
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware)

  // ── GET /dashboard/summary ────────────────────────────────────────────
  fastify.get('/dashboard/summary', async (request, reply) => {
    const { period = 'lifetime' } = request.query as { period?: string }
    const merchantId = request.merchantId!
    const since = getPeriodFilter(period)

    let txQuery = db.from('transaction_events').select('id').eq('merchant_id', merchantId)
    if (since) txQuery = txQuery.gte('received_at', since)
    const { data: transactions } = await txQuery
    const txIds = transactions?.map(t => t.id) ?? []

    if (txIds.length === 0) {
      return reply.send({
        total_revenue: 0, transactions_processed: 0, opportunities_presented: 0,
        opportunities_accepted: 0, acceptance_rate: 0, revenue_per_order: 0,
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

  // ── GET /dashboard/transactions ───────────────────────────────────────
  fastify.get('/dashboard/transactions', async (request, reply) => {
    const { page = '1', period = 'lifetime' } = request.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page))
    const limit = 20
    const offset = (pageNum - 1) * limit
    const since = getPeriodFilter(period)
    const merchantId = request.merchantId!

    let query = db.from('transaction_events')
      .select('id, shopify_order_id, transaction_value, transaction_currency, transaction_type, is_first_transaction, source_platform, received_at', { count: 'exact' })
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
      .select('transaction_event_id, outcome_type, selected_definition_id, candidates_evaluated')
      .in('transaction_event_id', txIds)

    const { data: instances } = await db
      .from('opportunity_instances')
      .select('transaction_event_id, current_state, customer_response, outcome_value, response_at')
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
      return { ...tx, decision, instance, offer_name: definition?.name ?? null }
    })

    return reply.send({ transactions: result, total: count ?? 0, page: pageNum })
  })

  // ── GET /dashboard/analytics ──────────────────────────────────────────
  fastify.get('/dashboard/analytics', async (request, reply) => {
    const { period = 'lifetime' } = request.query as { period?: string }
    const merchantId = request.merchantId!
    const since = getPeriodFilter(period)

    // Fetch all transactions in period with their instances
    let txQuery = db.from('transaction_events')
      .select('id, received_at, transaction_value, is_first_transaction, source_platform')
      .eq('merchant_id', merchantId)
      .order('received_at', { ascending: true })
    if (since) txQuery = txQuery.gte('received_at', since)
    const { data: transactions } = await txQuery
    const txIds = transactions?.map(t => t.id) ?? []

    if (txIds.length === 0) {
      return reply.send({
        revenue_by_day: [], acceptance_by_day: [],
        new_vs_returning: { new: 0, returning: 0 },
        source_platform: {},
        total_revenue: 0, acceptance_rate: 0,
        transactions_processed: 0, revenue_per_order: 0,
      })
    }

    const { data: instances } = await db
      .from('opportunity_instances')
      .select('transaction_event_id, current_state, customer_response, outcome_value, response_at')
      .eq('merchant_id', merchantId)
      .in('transaction_event_id', txIds)

    // Revenue by day
    const revenueByDay: Record<string, number> = {}
    const acceptanceByDay: Record<string, { presented: number; accepted: number }> = {}

    transactions?.forEach(tx => {
      const day = tx.received_at.split('T')[0]
      if (!revenueByDay[day]) revenueByDay[day] = 0
      if (!acceptanceByDay[day]) acceptanceByDay[day] = { presented: 0, accepted: 0 }

      const inst = instances?.find(i => i.transaction_event_id === tx.id)
      if (inst) {
        if (inst.current_state === 'COMPLETED' && inst.outcome_value) {
          revenueByDay[day] += Number(inst.outcome_value)
        }
        if (['PRESENTED','ACCEPTED','DECLINED','EXPIRED','COMPLETED','FAILED'].includes(inst.current_state)) {
          acceptanceByDay[day].presented++
          if (inst.customer_response === 'ACCEPTED') acceptanceByDay[day].accepted++
        }
      }
    })

    // New vs returning
    const newCount = transactions?.filter(t => t.is_first_transaction).length ?? 0
    const returningCount = (transactions?.length ?? 0) - newCount

    // Source platform breakdown
    const platformCounts: Record<string, number> = {}
    transactions?.forEach(tx => {
      const p = tx.source_platform || 'UNKNOWN'
      platformCounts[p] = (platformCounts[p] || 0) + 1
    })

    // Overall stats
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
      revenue_by_day: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
      acceptance_by_day: Object.entries(acceptanceByDay).map(([date, v]) => ({
        date,
        rate: v.presented > 0 ? Math.round((v.accepted / v.presented) * 100) : 0,
        presented: v.presented,
        accepted: v.accepted,
      })),
      new_vs_returning: { new: newCount, returning: returningCount },
      source_platform: platformCounts,
      total_revenue: totalRevenue,
      acceptance_rate: acceptanceRate,
      transactions_processed: txIds.length,
      revenue_per_order: revenuePerOrder,
    })
  })

  // ── GET /dashboard/engine ─────────────────────────────────────────────
  fastify.get('/dashboard/engine', async (request, reply) => {
    const merchantId = request.merchantId!

    const { data: decisions } = await db
      .from('decision_records')
      .select('outcome_type, candidates_evaluated, decided_at')
      .eq('merchant_id', merchantId)
      .order('decided_at', { ascending: false })

    const total = decisions?.length ?? 0
    const matched = decisions?.filter(d => d.outcome_type === 'OPPORTUNITY_IDENTIFIED').length ?? 0
    const noMatch = decisions?.filter(d => d.outcome_type === 'NO_ELIGIBLE_OPPORTUNITIES').length ?? 0
    const empty = decisions?.filter(d => d.outcome_type === 'CATALOG_EMPTY').length ?? 0
    const avgCandidates = total > 0
      ? Math.round((decisions?.reduce((s, d) => s + (d.candidates_evaluated || 0), 0) ?? 0) / total) : 0
    const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0

    // Recent decisions for timeline (last 7 days by day)
    const now = new Date()
    const byDay: Record<string, { matched: number; total: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      byDay[d.toISOString().split('T')[0]] = { matched: 0, total: 0 }
    }
    decisions?.forEach(d => {
      const day = d.decided_at.split('T')[0]
      if (byDay[day]) {
        byDay[day].total++
        if (d.outcome_type === 'OPPORTUNITY_IDENTIFIED') byDay[day].matched++
      }
    })

    return reply.send({
      total_decisions: total,
      matched,
      no_match: noMatch,
      catalog_empty: empty,
      match_rate: matchRate,
      avg_candidates_evaluated: avgCandidates,
      decisions_by_day: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
    })
  })

  // ── GET /dashboard/customer-insights ─────────────────────────────────
  fastify.get('/dashboard/customer-insights', async (request, reply) => {
    const { period = 'lifetime' } = request.query as { period?: string }
    const merchantId = request.merchantId!
    const since = getPeriodFilter(period)

    let txQuery = db.from('transaction_events')
      .select('id, transaction_value, is_first_transaction, source_platform, received_at')
      .eq('merchant_id', merchantId)
    if (since) txQuery = txQuery.gte('received_at', since)
    const { data: transactions } = await txQuery
    const txIds = transactions?.map(t => t.id) ?? []

    if (txIds.length === 0) {
      return reply.send({
        new_vs_returning: { new: 0, returning: 0 },
        platform_breakdown: {},
        segments: [],
        avg_order_value: 0,
        total_customers: 0,
      })
    }

    const { data: instances } = await db
      .from('opportunity_instances')
      .select('transaction_event_id, current_state, customer_response, outcome_value')
      .eq('merchant_id', merchantId)
      .in('transaction_event_id', txIds)

    // New vs returning
    const newTxs = transactions?.filter(t => t.is_first_transaction) ?? []
    const returningTxs = transactions?.filter(t => !t.is_first_transaction) ?? []

    // Acceptance by customer type
    const calcAcceptance = (txSubset: any[]) => {
      const ids = txSubset.map(t => t.id)
      const insts = instances?.filter(i => ids.includes(i.transaction_event_id)) ?? []
      const pres = insts.filter(i => ['PRESENTED','ACCEPTED','DECLINED','EXPIRED','COMPLETED','FAILED'].includes(i.current_state))
      const acc = insts.filter(i => i.customer_response === 'ACCEPTED')
      return pres.length > 0 ? Math.round((acc.length / pres.length) * 100) : 0
    }

    // Platform breakdown
    const platformBreakdown: Record<string, { count: number; accepted: number; presented: number }> = {}
    transactions?.forEach(tx => {
      const p = tx.source_platform || 'UNKNOWN'
      if (!platformBreakdown[p]) platformBreakdown[p] = { count: 0, accepted: 0, presented: 0 }
      platformBreakdown[p].count++
      const inst = instances?.find(i => i.transaction_event_id === tx.id)
      if (inst) {
        if (['PRESENTED','ACCEPTED','DECLINED','EXPIRED','COMPLETED','FAILED'].includes(inst.current_state)) platformBreakdown[p].presented++
        if (inst.customer_response === 'ACCEPTED') platformBreakdown[p].accepted++
      }
    })

    // Value segments based on transaction_value quartiles
    const values = transactions?.map(t => Number(t.transaction_value)).sort((a, b) => a - b) ?? []
    const q1 = values[Math.floor(values.length * 0.25)] ?? 0
    const q3 = values[Math.floor(values.length * 0.75)] ?? 0

    const segments = [
      { name: 'High-value returning', txs: returningTxs.filter(t => Number(t.transaction_value) >= q3) },
      { name: 'High-value new', txs: newTxs.filter(t => Number(t.transaction_value) >= q3) },
      { name: 'Mid-value returning', txs: returningTxs.filter(t => Number(t.transaction_value) >= q1 && Number(t.transaction_value) < q3) },
      { name: 'Mid-value new', txs: newTxs.filter(t => Number(t.transaction_value) >= q1 && Number(t.transaction_value) < q3) },
    ].map(s => ({
      name: s.name,
      count: s.txs.length,
      acceptance_rate: calcAcceptance(s.txs),
      avg_order: s.txs.length > 0
        ? Math.round(s.txs.reduce((sum, t) => sum + Number(t.transaction_value), 0) / s.txs.length) : 0,
    }))

    const avgOrderValue = values.length > 0
      ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0

    return reply.send({
      new_vs_returning: {
        new: newTxs.length,
        returning: returningTxs.length,
        new_acceptance: calcAcceptance(newTxs),
        returning_acceptance: calcAcceptance(returningTxs),
      },
      platform_breakdown: platformBreakdown,
      segments,
      avg_order_value: avgOrderValue,
      total_customers: txIds.length,
    })
  })

  // ── GET /dashboard/ai-insights ────────────────────────────────────────
  fastify.get('/dashboard/ai-insights', async (request, reply) => {
    const merchantId = request.merchantId!

    const [lifetimeRes, weekRes, monthRes, prefsRes] = await Promise.all([
      db.from('opportunity_instances')
        .select('current_state, customer_response, outcome_value, created_at')
        .eq('merchant_id', merchantId),
      db.from('opportunity_instances')
        .select('current_state, customer_response, outcome_value')
        .eq('merchant_id', merchantId)
        .gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString()),
      db.from('opportunity_instances')
        .select('current_state, customer_response, outcome_value')
        .eq('merchant_id', merchantId)
        .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString()),
      db.from('merchant_opportunity_preferences')
        .select('category, enabled')
        .eq('merchant_id', merchantId),
    ])

    const calcStats = (instances: any[]) => {
      const presented = instances.filter(i =>
        ['PRESENTED','ACCEPTED','DECLINED','EXPIRED','COMPLETED','FAILED'].includes(i.current_state))
      const accepted = instances.filter(i => i.customer_response === 'ACCEPTED')
      const completed = instances.filter(i => i.current_state === 'COMPLETED')
      const revenue = completed.reduce((s, i) => s + Number(i.outcome_value ?? 0), 0)
      const rate = presented.length > 0 ? Math.round((accepted.length / presented.length) * 100 * 10) / 10 : 0
      return { presented: presented.length, accepted: accepted.length, revenue, rate }
    }

    const lifetime = calcStats(lifetimeRes.data ?? [])
    const week = calcStats(weekRes.data ?? [])
    const month = calcStats(monthRes.data ?? [])
    const disabledCategories = (prefsRes.data ?? []).filter(p => !p.enabled).map(p => p.category)
    const enabledCategories = (prefsRes.data ?? []).filter(p => p.enabled).map(p => p.category)

    // Revenue trend: compare this week vs last week
    const lastWeekRes = await db.from('opportunity_instances')
      .select('current_state, outcome_value')
      .eq('merchant_id', merchantId)
      .gte('created_at', new Date(Date.now() - 14*24*60*60*1000).toISOString())
      .lte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString())
    const lastWeek = calcStats(lastWeekRes.data ?? [])
    const revenueTrend = lastWeek.revenue > 0
      ? Math.round(((week.revenue - lastWeek.revenue) / lastWeek.revenue) * 100) : null

    return reply.send({
      week,
      month,
      lifetime,
      revenue_trend_pct: revenueTrend,
      disabled_categories: disabledCategories,
      enabled_categories: enabledCategories,
      has_bank_details: false, // checked separately via /payouts/settings
    })
  })

  // ── GET /dashboard/integrations ───────────────────────────────────────
  fastify.get('/dashboard/integrations', async (request, reply) => {
    const merchantId = request.merchantId!

    const [merchantRes, configRes, wooRes] = await Promise.all([
      db.from('merchants').select('id, shopify_shop_domain, geography, created_at').eq('id', merchantId).single(),
      db.from('merchant_configs').select('*').eq('merchant_id', merchantId).single(),
      db.from('woo_merchants').select('store_url, store_name, updated_at').eq('merchant_id', merchantId).maybeSingle(),
    ])

    const merchant = merchantRes.data
    const config = configRes.data

    return reply.send({
      shopify: {
        connected: !!merchant?.shopify_shop_domain,
        shop_domain: merchant?.shopify_shop_domain ?? null,
        enabled: config?.shopify_enabled ?? false,
      },
      woocommerce: {
        connected: !!wooRes.data,
        store_url: wooRes.data?.store_url ?? null,
        store_name: wooRes.data?.store_name ?? null,
      },
      webhook: {
        registered: config?.setup_completed ?? false,
      },
      checkout_extension: {
        installed: config?.setup_completed ?? false,
      },
      engine: {
        enabled: config?.engine_enabled ?? false,
        offers_enabled: config?.offers_enabled ?? false,
      },
      merchant: {
        id: merchant?.id ?? null,
        geography: merchant?.geography ?? 'UAE',
        installed_at: merchant?.created_at ?? null,
      },
    })
  })

  // ── GET /dashboard/opportunity-preferences ────────────────────────────
  fastify.get('/dashboard/opportunity-preferences', async (request, reply) => {
    const merchantId = request.merchantId!
    const { data } = await db
      .from('merchant_opportunity_preferences')
      .select('category, enabled, updated_at')
      .eq('merchant_id', merchantId)
    return reply.send({ preferences: data ?? [] })
  })

  // ── PATCH /dashboard/opportunity-preferences ──────────────────────────
  fastify.patch('/dashboard/opportunity-preferences', async (request, reply) => {
    const merchantId = request.merchantId!
    const { category, enabled } = request.body as { category: string; enabled: boolean }

    if (!category || typeof enabled !== 'boolean') {
      return reply.status(400).send({ error: 'category and enabled are required' })
    }

    const { data, error } = await db
      .from('merchant_opportunity_preferences')
      .upsert({
        merchant_id: merchantId,
        category,
        enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,category' })
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.send({ preference: data })
  })

  // ── GET /dashboard/editor-url ─────────────────────────────────────────
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
        { method: 'POST', headers: { 'X-Shopify-Access-Token': merchant.shopify_access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `{ checkoutProfiles(first: 1) { edges { node { id } } } }` }) }
      )
      const profileData = await profileResponse.json() as any
      const profileGid = profileData?.data?.checkoutProfiles?.edges?.[0]?.node?.id
      const profileId = profileGid?.split('/').pop() ?? ''
      const fallback: Record<string, string> = {
        'kablet-dev.myshopify.com': '4988010747',
        '4piius-i0.myshopify.com': '4107731126',
        'kablet-dev-2.myshopify.com': '5045288996',
      }
      const resolvedProfileId = profileId || fallback[merchant.shopify_shop_domain] || ''
      const storeName = merchant.shopify_shop_domain.replace('.myshopify.com', '')
      const url = resolvedProfileId
        ? `https://admin.shopify.com/store/${storeName}/settings/checkout/editor/profiles/${resolvedProfileId}?page=thank-you`
        : `https://admin.shopify.com/store/${storeName}/settings/checkout`
      return reply.send({ url })
    } catch {
      return reply.send({ url: `https://${merchant.shopify_shop_domain}/admin/settings/checkout` })
    }
  })

  // ── GET /dashboard/config ─────────────────────────────────────────────
  fastify.get('/dashboard/config', async (request, reply) => {
    const { data } = await db
      .from('merchant_configs')
      .select('offers_enabled, engine_enabled, setup_completed, shopify_enabled, dashboard_enabled')
      .eq('merchant_id', request.merchantId!)
      .single()
    return reply.send(data ?? { offers_enabled: true, engine_enabled: true, setup_completed: false, shopify_enabled: true, dashboard_enabled: true })
  })

  // ── POST /dashboard/complete-setup ────────────────────────────────────
  fastify.post('/dashboard/complete-setup', async (request, reply) => {
    const { data, error } = await db
      .from('merchant_configs')
      .update({ setup_completed: true })
      .eq('merchant_id', request.merchantId!)
      .select().single()
    if (error) return reply.status(500).send({ error: error.message })
    return reply.send({ ok: true })
  })

  // ── POST /dashboard/register-webhook ─────────────────────────────────
  fastify.post('/dashboard/register-webhook', async (request, reply) => {
    const merchantId = request.merchantId!
    const { data: merchant } = await db
      .from('merchants')
      .select('shopify_shop_domain, shopify_access_token')
      .eq('id', merchantId).single()
    if (!merchant) return reply.status(404).send({ error: 'Merchant not found' })
    try {
      const res = await fetch(`https://${merchant.shopify_shop_domain}/admin/api/2026-07/webhooks.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': merchant.shopify_access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook: { topic: 'orders/create', address: `${process.env.RENDER_EXTERNAL_URL}/webhook/shopify/order`, format: 'json' } })
      })
      const data = await res.json() as any
      return reply.send({ ok: true, data })
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to register webhook' })
    }
  })

  // ── PATCH /dashboard/config ───────────────────────────────────────────
  fastify.patch('/dashboard/config', async (request, reply) => {
    const body = request.body as any
    const { data, error } = await db
      .from('merchant_configs')
      .update(body)
      .eq('merchant_id', request.merchantId!)
      .select().single()
    if (error) return reply.status(500).send({ error: error.message })
    return reply.send(data)
  })
}
