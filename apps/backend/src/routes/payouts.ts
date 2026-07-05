import type { FastifyInstance, FastifyRequest } from 'fastify'
import { db } from '../db.js'

const PAYOUT_PER_TRANSACTION = 8.00 // AED per completed transaction

export async function payoutRoutes(fastify: FastifyInstance) {

  // Auth middleware — supports both Supabase and Shopify session tokens
  async function authMiddleware(request: FastifyRequest, reply: any) {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' })
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
      if (merchantUser) {
        ;(request as any).merchantId = merchantUser.merchant_id
        return
      }
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
            ;(request as any).merchantId = merchant.id
            return
          }
        }
      }
    } catch {}

    return reply.status(401).send({ error: 'Unauthorized' })
  }

  fastify.addHook('preHandler', authMiddleware)

  // ── GET /payouts/settings ────────────────────────────────────────────
  fastify.get('/payouts/settings', async (request, reply) => {
    const merchantId = (request as any).merchantId

    const { data } = await db
      .from('merchant_payout_settings')
      .select('*')
      .eq('merchant_id', merchantId)
      .single()

    return reply.send({ settings: data ?? null })
  })

  // ── POST /payouts/settings ───────────────────────────────────────────
  fastify.post('/payouts/settings', async (request, reply) => {
    const merchantId = (request as any).merchantId
    const body = request.body as any

    if (!body.full_name || !body.account_holder_name || !body.bank_name || !body.iban) {
      return reply.status(400).send({ error: 'All fields are required' })
    }

    // Upsert payout settings
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

  // ── GET /payouts/summary ─────────────────────────────────────────────
  fastify.get('/payouts/summary', async (request, reply) => {
    const merchantId = (request as any).merchantId

    // Get current week's completed transactions
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    const nextMonday = new Date(weekStart)
    nextMonday.setDate(weekStart.getDate() + 7)

    const { data: currentWeekInstances } = await db
      .from('opportunity_instances')
      .select('id, outcome_value, response_at')
      .eq('merchant_id', merchantId)
      .eq('current_state', 'COMPLETED')
      .gte('response_at', weekStart.toISOString())

    const currentWeekCount = currentWeekInstances?.length ?? 0
    const currentWeekAmount = currentWeekCount * PAYOUT_PER_TRANSACTION

    // Get all payouts history
    const { data: payouts } = await db
      .from('merchant_payouts')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('period_start', { ascending: false })

    // Get total lifetime earnings
    const { data: allCompleted } = await db
      .from('opportunity_instances')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('current_state', 'COMPLETED')

    const lifetimeTransactions = allCompleted?.length ?? 0
    const lifetimeEarnings = lifetimeTransactions * PAYOUT_PER_TRANSACTION

    return reply.send({
      current_week: {
        transactions: currentWeekCount,
        amount: currentWeekAmount,
        period_start: weekStart.toISOString().split('T')[0],
        period_end: nextMonday.toISOString().split('T')[0],
        next_payout_date: nextMonday.toISOString().split('T')[0],
      },
      lifetime: {
        transactions: lifetimeTransactions,
        earnings: lifetimeEarnings,
      },
      payouts: payouts ?? [],
    })
  })
}