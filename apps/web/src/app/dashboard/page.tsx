import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const [summary, transactionsData, config] = await Promise.all([
    api.getSummary(session.access_token, 'lifetime').catch(() => ({
      total_revenue: 0,
      transactions_processed: 0,
      opportunities_presented: 0,
      opportunities_accepted: 0,
      acceptance_rate: 0,
      revenue_per_order: 0,
    })),
    api.getTransactions(session.access_token, 1, 'lifetime').catch(() => ({
      transactions: [],
      total: 0,
      page: 1,
    })),
    api.getConfig(session.access_token).catch(() => ({
      offers_enabled: true,
      engine_enabled: true,
      setup_completed: false,
    })),
  ])

  return (
    <DashboardClient
      summary={summary}
      transactions={transactionsData.transactions}
      totalTransactions={transactionsData.total}
      config={config}
      accessToken={session.access_token}
    />
  )
}
