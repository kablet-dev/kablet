import { adminApi } from '@/lib/admin-api'

export default async function FulfillmentsPage() {
  const { fulfillments } = await adminApi.getFulfillments('COMPLETED')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Fulfillments</h1>
          <p className="text-sm text-gray-400 mt-1">
            {fulfillments.length} orders to fulfill
          </p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {fulfillments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No completed orders yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Merchant</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {fulfillments.map(f => {
                const addr = f.shipping_address
                return (
                  <tr key={f.id} className="hover:bg-gray-800">
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(f.response_at ?? f.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{f.customer_name ?? '—'}</div>
                      <div className="text-gray-500 text-xs">{f.customer_email ?? '—'}</div>
                      <div className="text-gray-500 text-xs">{f.customer_phone ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {addr ? (
                        <div>
                          <div>{addr.address1}</div>
                          {addr.address2 && <div>{addr.address2}</div>}
                          <div>{addr.city}, {addr.province}</div>
                          <div>{addr.country}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {f.opportunity_definitions?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {f.merchants?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-400">
                      AED {Number(f.outcome_value ?? 0).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}