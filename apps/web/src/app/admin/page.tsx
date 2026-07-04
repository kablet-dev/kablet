import { adminApi } from '@/lib/admin-api'

export default async function AdminPage() {
  const summary = await adminApi.getSummary()

  const stats = [
    { label: 'Total Merchants', value: summary.total_merchants.toString() },
    { label: 'Transactions Processed', value: summary.total_transactions.toLocaleString() },
    { label: 'Revenue Generated', value: `AED ${Number(summary.total_revenue).toFixed(2)}` },
    { label: 'Offers Accepted', value: summary.total_accepted.toLocaleString() },
    { label: 'Acceptance Rate', value: `${summary.acceptance_rate}%` },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Platform Overview</h1>
        <p className="text-sm text-gray-400 mt-1">All merchants, all time</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}