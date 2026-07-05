import { adminApi } from '@/lib/admin-api'
import MerchantToggle from '@/components/MerchantToggle'

export default async function MerchantsPage() {
  const { merchants } = await adminApi.getMerchants()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Merchants</h1>
        <p className="text-sm text-gray-400 mt-1">{merchants.length} total</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {merchants.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No merchants yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Merchant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Store</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Controls</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transactions</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {merchants.map(merchant => {
                const config = merchant.merchant_configs?.[0]
                return (
                  <tr key={merchant.id} className="hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{merchant.name}</div>
                      <div className="text-gray-500 text-xs">{merchant.geography}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {merchant.shopify_shop_domain}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <MerchantToggle
                            merchantId={merchant.id}
                            enabled={config?.engine_enabled ?? false}
                            field="engine_enabled"
                          />
                          <span className="text-xs text-gray-400">Engine</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MerchantToggle
                            merchantId={merchant.id}
                            enabled={config?.offers_enabled ?? false}
                            field="offers_enabled"
                          />
                          <span className="text-xs text-gray-400">Offers</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {merchant.transaction_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-400">
                      AED {Number(merchant.total_revenue).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(merchant.created_at).toLocaleDateString()}
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