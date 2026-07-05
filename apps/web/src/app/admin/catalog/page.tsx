import { adminApi } from '@/lib/admin-api'
import CatalogActions from '@/components/CatalogActions'
import NewDefinitionForm from '@/components/NewDefinitionForm'

export default async function CatalogPage() {
  const { definitions } = await adminApi.getCatalog()

  const stateColors: Record<string, string> = {
    ACTIVE: 'bg-green-900 text-green-300',
    DRAFT: 'bg-yellow-900 text-yellow-300',
    PAUSED: 'bg-gray-800 text-gray-400',
    ARCHIVED: 'bg-red-900 text-red-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Opportunity Catalog</h1>
          <p className="text-sm text-gray-400 mt-1">{definitions.length} definitions</p>
        </div>
      </div>

      <NewDefinitionForm />

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {definitions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No opportunity definitions yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Geography</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Order</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {definitions.map(def => (
                <tr key={def.id} className="hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{def.name}</div>
                    <div className="text-gray-500 text-xs">{def.headline}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                      stateColors[def.lifecycle_state] ?? 'bg-gray-800 text-gray-400'
                    }`}>
                      {def.lifecycle_state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{def.required_geography}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {def.min_transaction_value ? `AED ${def.min_transaction_value}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">
                    AED {Number(def.shopify_product_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{def.base_priority}</td>
                  <td className="px-4 py-3">
                    <CatalogActions
                      id={def.id}
                      lifecycleState={def.lifecycle_state}
                    />
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