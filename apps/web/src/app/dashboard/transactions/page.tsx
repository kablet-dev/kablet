import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = parseInt(pageParam ?? '1')
  const { transactions, total } = await api.getTransactions(session.access_token, page)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">No transactions yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Decision</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(transaction => {
                const decision = transaction.decision
const instance = transaction.instance

                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(transaction.received_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      #{transaction.shopify_order_id}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={'/dashboard/transactions?page=' + (page - 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={'/dashboard/transactions?page=' + (page + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}