import { adminApi } from '@/lib/admin-api'
import MarkPaidButton from '@/components/MarkPaidButton'

export default async function AdminPayoutsPage() {
  const { payouts } = await adminApi.getAllPayouts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Payouts</h1>
        <p className="text-sm text-gray-400 mt-1">Manage weekly merchant payouts</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {payouts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No payouts yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Merchant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transactions</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {payouts.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-800">
                  <td className="px-4 py-3 text-white">{p.merchants?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.period_start} – {p.period_end}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{p.transactions_count}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">
                    AED {Number(p.total_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'PAID' ? 'bg-green-900 text-green-300' :
                      p.status === 'PROCESSING' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {p.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status !== 'PAID' && (
                      <MarkPaidButton payoutId={p.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}