import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

function value(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await adminApi.getRequests()

  const request = data.requests.find((item) => item.id === id)

  if (!request) {
    return (
      <div className="space-y-4">
        <Link href="/admin/requests" className="text-violet-400">
          ← Back to requests
        </Link>
        <h1 className="text-xl font-semibold text-white">
          Request not found
        </h1>
      </div>
    )
  }

  const customer = data.customers.find(
    (item) => item.id === request.customer_id,
  )

  const opportunity = data.opportunities.find(
    (item) => item.intent_event_id === request.id,
  )

  const consent = data.consents.find(
    (item) => item.intent_event_id === request.id,
  )

  const decision = data.decisions.find(
    (item) => item.intent_event_id === request.id,
  )

  return (
    <div className="max-w-5xl space-y-8">
      <Link href="/admin/requests" className="text-sm text-violet-400">
        ← Back to requests
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-white">
          Request details
        </h1>
        <p className="mt-1 text-sm text-gray-500">{request.id}</p>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-5 text-lg font-medium text-white">Customer</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-gray-500">Name</p>
            <p className="mt-1 text-white">
              {customer
                ? [customer.first_name, customer.last_name]
                    .filter(Boolean)
                    .join(' ') || 'Unknown'
                : 'Unknown'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Email</p>
            <p className="mt-1 text-white">{value(customer?.email)}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Phone</p>
            <p className="mt-1 text-white">{value(customer?.phone)}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Company</p>
            <p className="mt-1 text-white">{value(customer?.company_id)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-5 text-lg font-medium text-white">
          Request information
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-gray-500">Category</p>
            <p className="mt-1 text-white">{value(request.category)}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Geography</p>
            <p className="mt-1 text-white">{value(request.geography)}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-gray-500">Request text</p>
            <p className="mt-1 whitespace-pre-wrap text-white">
              {value(request.intent_text)}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Budget</p>
            <p className="mt-1 text-white">{value(request.budget)}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Timeline</p>
            <p className="mt-1 text-white">{value(request.timeline)}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-gray-500">Source page</p>
            <p className="mt-1 break-all text-white">
              {value(request.page_url)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-5 text-lg font-medium text-white">Outcome</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-gray-500">Decision</p>
            <p className="mt-1 text-white">
              {value(decision?.outcome_type)}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Offer state</p>
            <p className="mt-1 text-white">
              {value(opportunity?.current_state)}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Consent</p>
            <p className="mt-1 text-white">
              {consent ? 'Granted' : 'Not granted'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Received</p>
            <p className="mt-1 text-white">
              {value(request.received_at)}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}