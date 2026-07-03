import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const [summary, transactionsData] = await Promise.all([
    api.getSummary(session.access_token),
    api.getTransactions(session.access_token, 1),
  ])

  const stats = [
    {
      label: 'Revenue Generated',
      value: `AED ${Number(summary.total_revenue).toFixed(2)}`,
    },
    {
      label: 'Transactions Processed',
      value: summary.transactions_processed.toString(),
    },
    {
      label: 'Offers Shown',
      value: summary.opportunities_presented.toString(),
    },
    {
      label: 'Acceptance Rate',
      value: `${summary.acceptance_rate}%`,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your Kablet performance at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Recent Transactions
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {transactionsData.transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No transactions yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order Value</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Decision</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactionsData.transactions.map(transaction => {
                  const decision = transaction.decision_records?.[0]
                  const instance = decision?.opportunity_instances?.[0]

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(transaction.received_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {transaction.transaction_currency}{' '}
                        {Number(transaction.transaction_value).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {decision?.outcome_type === 'OPPORTUNITY_IDENTIFIED'
                          ? 'Offer shown'
                          : decision?.outcome_type === 'NO_ELIGIBLE_OPPORTUNITIES'
                          ? 'No match'
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {instance ? (
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                            instance.current_state === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : instance.current_state === 'DECLINED'
                              ? 'bg-gray-100 text-gray-600'
                              : instance.current_state === 'PRESENTED'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {instance.current_state.toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {instance?.outcome_value ? (
                          <span className="text-green-700">
                            AED {Number(instance.outcome_value).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}