import { adminApi } from '@/lib/admin-api'

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function MetricCard({
  label,
  value,
  tone = 'text-white',
}: {
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

export default async function AnalyticsPage() {
  const analytics = await adminApi.getAnalytics()
  const { metrics, events, decisions } = analytics

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Widget Analytics</h1>
        <p className="mt-1 text-sm text-gray-400">
          Complete activity across host sites and buyer journeys.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Form submissions" value={metrics.form_submissions} />
        <MetricCard label="Offers displayed" value={metrics.offers_displayed} />
        <MetricCard
          label="Offers accepted"
          value={metrics.offers_accepted}
          tone="text-emerald-400"
        />
        <MetricCard
          label="Consent rate"
          value={`${metrics.consent_rate}%`}
          tone="text-emerald-400"
        />
        <MetricCard
          label="Offers declined"
          value={metrics.offers_declined}
        />
        <MetricCard
          label="Popup dismissed"
          value={metrics.offers_dismissed}
        />
        <MetricCard
          label="No offer decisions"
          value={metrics.no_offer_decisions}
          tone="text-amber-400"
        />
        <MetricCard
          label="Errors"
          value={metrics.errors}
          tone={metrics.errors ? 'text-red-400' : 'text-white'}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 p-5">
            <h2 className="font-semibold text-white">Conversion funnel</h2>
            <p className="mt-1 text-sm text-gray-500">
              How submitted requests move through the widget.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <FunnelRow
              label="Form submissions"
              value={metrics.form_submissions}
              total={metrics.form_submissions}
            />
            <FunnelRow
              label="Offers displayed"
              value={metrics.offers_displayed}
              total={metrics.form_submissions}
            />
            <FunnelRow
              label="Offers accepted"
              value={metrics.offers_accepted}
              total={metrics.form_submissions}
            />
            <FunnelRow
              label="Consent rate"
              value={`${metrics.consent_rate}%`}
              total={100}
              percent={metrics.consent_rate}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 p-5">
            <h2 className="font-semibold text-white">Engine outcomes</h2>
            <p className="mt-1 text-sm text-gray-500">
              Requests where the engine did not deliver an offer.
            </p>
          </div>

          <div className="space-y-3 p-5">
            {decisions.length === 0 ? (
              <p className="text-sm text-gray-500">No decisions recorded yet.</p>
            ) : (
              decisions.slice(0, 10).map((decision) => (
                <div
                  key={decision.id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {decision.outcome_type}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(decision.decided_at)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {decision.intent_event_id
                      ? decision.intent_event_id.slice(0, 8)
                      : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 p-5">
          <h2 className="font-semibold text-white">Recent widget activity</h2>
          <p className="mt-1 text-sm text-gray-500">
            The latest frontend events recorded by Kablet.
          </p>
        </div>

        <div className="divide-y divide-gray-800">
          {events.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">
              No widget events recorded yet.
            </p>
          ) : (
            events.slice(0, 25).map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {event.event_type}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {event.host_sites?.name ?? 'Unknown host site'}
                    {event.host_sites?.domain
                      ? ` · ${event.host_sites.domain}`
                      : ''}
                  </p>
                </div>

                <div className="text-xs text-gray-500">
                  {formatDate(event.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function FunnelRow({
  label,
  value,
  total,
  percent,
}: {
  label: string
  value: number | string
  total: number
  percent?: number
}) {
  const calculatedPercent =
    percent ?? (total ? Math.round((Number(value) / total) * 100) : 0)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-white">{value}</span>
      </div>

      <div className="h-2 rounded-full bg-gray-800">
        <div
          className="h-2 rounded-full bg-violet-500"
          style={{ width: `${Math.min(calculatedPercent, 100)}%` }}
        />
      </div>
    </div>
  )
}