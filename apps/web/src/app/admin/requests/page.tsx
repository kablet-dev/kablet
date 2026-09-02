import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default async function RequestsPage() {
  const data = await adminApi.getRequests()

  const customerById = new Map(
    data.customers.map((customer) => [customer.id, customer]),
  )

  const opportunityByIntent = new Map(
    data.opportunities.map((opportunity) => [
      opportunity.intent_event_id,
      opportunity,
    ]),
  )

  const consentByIntent = new Map(
    data.consents.map((consent) => [consent.intent_event_id, consent]),
  )

  const decisionByIntent = new Map(
    data.decisions.map((decision) => [
      decision.intent_event_id,
      decision,
    ]),
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Requests</h1>
        <p className="mt-1 text-sm text-gray-400">
          Buyer requests received across all host sites.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">Request</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Outcome</th>
                <th className="px-5 py-4">Received</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800">
              {data.requests.map((request) => {
                const customer = customerById.get(request.customer_id)
                const opportunity = opportunityByIntent.get(request.id)
                const consent = consentByIntent.get(request.id)
                const decision = decisionByIntent.get(request.id)

                const outcome = consent
                  ? 'Accepted'
                  : opportunity
                    ? 'Offer shown'
                    : decision?.outcome_type ===
                        'NO_ELIGIBLE_OPPORTUNITIES'
                      ? 'No offer'
                      : 'Received'

                return (
                  <tr key={request.id} className="text-gray-300">
                    <td className="max-w-xs px-5 py-4">
                      <p className="truncate text-white">
                        {request.intent_text || 'Form submission'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.id.slice(0, 8)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-white">
                        {customer
                          ? [customer.first_name, customer.last_name]
                              .filter(Boolean)
                              .join(' ') || 'Unknown'
                          : 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {customer?.email || customer?.phone || '—'}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {request.category || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                        {outcome}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-400">
                      {formatDate(request.received_at)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="text-sm text-violet-400 hover:text-violet-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {data.requests.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    No requests recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}