import { useState, useEffect } from 'preact/hooks'
import { dashboardApi, fmtAmount, fmtDate } from '../../../../../shared/models/dashboard.ts'

function statusTone(status) {
  switch (status) {
    case 'PAID':       return 'success'
    case 'PROCESSING': return 'attention'
    default:           return 'neutral'
  }
}

/** @param {{ token: string }} props */
export default function PayoutsPage({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const d = await dashboardApi.getPayoutSummary(token)
        setData(d)
      } catch {
        setError('Failed to load payout data.')
      }
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <s-page heading="Payouts">
        <s-section>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner />
            <s-text>Loading payouts…</s-text>
          </s-stack>
        </s-section>
      </s-page>
    )
  }

  if (error || !data) {
    return (
      <s-page heading="Payouts">
        <s-section>
          <s-banner tone="critical">
            <s-paragraph>{error ?? 'No payout data available.'}</s-paragraph>
          </s-banner>
        </s-section>
      </s-page>
    )
  }

  return (
    <s-page heading="Payouts">

      {/* Current period summary */}
      <s-section heading="This Week">
        <s-grid columns="3" gap="base">
          <s-card>
            <s-box paddingBlock="base" paddingInline="base">
              <s-stack gap="tight">
                <s-text tone="subdued" size="small">Pending Earnings</s-text>
                <s-text size="large" fontWeight="bold">
                  {fmtAmount(data.current_week.amount)}
                </s-text>
                <s-text tone="subdued" size="small">
                  {data.current_week.transactions} completed offers this week
                </s-text>
              </s-stack>
            </s-box>
          </s-card>

          <s-card>
            <s-box paddingBlock="base" paddingInline="base">
              <s-stack gap="tight">
                <s-text tone="subdued" size="small">Next Payout</s-text>
                <s-text size="large" fontWeight="bold">
                  {fmtDate(data.current_week.next_payout_date)}
                </s-text>
                <s-text tone="subdued" size="small">Every Monday · AED 8 per completed offer</s-text>
              </s-stack>
            </s-box>
          </s-card>

          <s-card>
            <s-box paddingBlock="base" paddingInline="base">
              <s-stack gap="tight">
                <s-text tone="subdued" size="small">Lifetime Earnings</s-text>
                <s-text size="large" fontWeight="bold">
                  {fmtAmount(data.lifetime.earnings)}
                </s-text>
                <s-text tone="subdued" size="small">
                  {data.lifetime.transactions.toLocaleString()} completed offers total
                </s-text>
              </s-stack>
            </s-box>
          </s-card>
        </s-grid>
      </s-section>

      {/* Payout history */}
      <s-section heading="Payout History">
        {data.payouts.length === 0 ? (
          <s-stack gap="base" alignItems="center">
            <s-paragraph>No payouts yet.</s-paragraph>
            <s-paragraph tone="subdued">
              Your first payout will appear here after your first completed week.
            </s-paragraph>
          </s-stack>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Period</s-table-header>
              <s-table-header>Completed Offers</s-table-header>
              <s-table-header>Amount</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Paid On</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {data.payouts.map(p => (
                <s-table-row key={p.id}>
                  <s-table-cell>
                    <s-text>
                      {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                    </s-text>
                  </s-table-cell>
                  <s-table-cell>
                    <s-text>{p.transactions_count}</s-text>
                  </s-table-cell>
                  <s-table-cell>
                    <s-text fontWeight="semibold">{fmtAmount(p.total_amount)}</s-text>
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge tone={statusTone(p.status)}>
                      {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    {p.paid_at
                      ? <s-text>{fmtDate(p.paid_at)}</s-text>
                      : <s-text tone="subdued">—</s-text>}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      {/* Rate info banner */}
      <s-section>
        <s-banner tone="info">
          <s-paragraph>
            You earn AED 8 for every completed offer. Payouts are processed every Monday and sent to your registered bank account.
          </s-paragraph>
        </s-banner>
      </s-section>

    </s-page>
  )
}
