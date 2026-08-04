'use client'

import { useState } from 'react'
import type { MerchantSummary, Transaction, MerchantConfig } from '@/lib/api'
import { api, fmtAmount, fmtDate, decisionLabel } from '@/lib/api'

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'All time', value: 'lifetime' },
]

function StatCard({
  label,
  value,
  sub,
  accent,
  trend,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  trend?: 'up' | 'neutral'
}) {
  return (
    <div style={{
      background: accent ? 'linear-gradient(135deg, #6f57e8 0%, #8a76ef 100%)' : '#ffffff',
      border: accent ? 'none' : '1px solid #eeeef2',
      borderRadius: '14px',
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: accent ? '0 8px 24px rgba(111,87,232,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <p style={{
        fontSize: '11.5px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.7px',
        color: accent ? 'rgba(255,255,255,0.7)' : '#9898aa',
        margin: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '28px',
        fontWeight: '700',
        color: accent ? '#ffffff' : '#0a0a0f',
        margin: 0,
        letterSpacing: '-0.8px',
        lineHeight: 1,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: '12px',
          color: accent ? 'rgba(255,255,255,0.65)' : '#9898aa',
          margin: 0,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ state }: { state: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    COMPLETED: { bg: '#dcfce7', color: '#15803d', label: 'Completed' },
    ACCEPTED:  { bg: '#ede9fc', color: '#5b45d4', label: 'Accepted' },
    PRESENTED: { bg: '#fef3c7', color: '#d97706', label: 'Presented' },
    DECLINED:  { bg: '#f5f5f8', color: '#6b6b7e', label: 'Declined' },
    EXPIRED:   { bg: '#f5f5f8', color: '#9898aa', label: 'Expired' },
    FAILED:    { bg: '#fee2e2', color: '#dc2626', label: 'Failed' },
    SELECTED:  { bg: '#f5f3fe', color: '#8a76ef', label: 'Selected' },
  }
  const s = map[state] ?? { bg: '#f5f5f8', color: '#9898aa', label: state }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: s.bg, color: s.color,
      fontSize: '11.5px', fontWeight: '600', padding: '3px 9px',
      borderRadius: '100px',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function EngineStatus({ enabled }: { enabled: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: enabled ? '#f0fdf4' : '#fee2e2',
      border: `1px solid ${enabled ? '#bbf7d0' : '#fecaca'}`,
      borderRadius: '100px', padding: '4px 12px',
      fontSize: '12px', fontWeight: '600',
      color: enabled ? '#15803d' : '#dc2626',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: enabled ? '#16a34a' : '#dc2626',
        boxShadow: enabled ? '0 0 0 3px rgba(22,163,74,0.2)' : undefined,
        animation: enabled ? 'pulse 2s infinite' : undefined,
      }} />
      Engine {enabled ? 'Active' : 'Paused'}
    </div>
  )
}

export default function DashboardClient({
  summary: initialSummary,
  transactions: initialTransactions,
  totalTransactions: initialTotal,
  config,
  accessToken,
}: {
  summary: MerchantSummary
  transactions: Transaction[]
  totalTransactions: number
  config: MerchantConfig
  accessToken: string
}) {
  const [period, setPeriod] = useState('lifetime')
  const [summary, setSummary] = useState(initialSummary)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const fetchData = async (newPeriod: string, newPage = 1) => {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([
        api.getSummary(accessToken, newPeriod),
        api.getTransactions(accessToken, newPage, newPeriod),
      ])
      setSummary(s)
      setTransactions(t.transactions)
      setTotal(t.total)
      setPage(newPage)
    } catch {}
    setLoading(false)
  }

  const handlePeriod = (p: string) => {
    setPeriod(p)
    fetchData(p, 1)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0a0a0f', margin: 0, letterSpacing: '-0.5px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '13.5px', color: '#9898aa', marginTop: '4px', marginBottom: 0 }}>
            Revenue generated by Kablet's Decision Engine
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <EngineStatus enabled={config.engine_enabled} />
        </div>
      </div>

      {/* Period filter */}
      <div style={{
        display: 'inline-flex', gap: '2px',
        background: '#eeeef2', borderRadius: '10px', padding: '3px',
        marginBottom: '24px',
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePeriod(p.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              background: period === p.value ? '#ffffff' : 'transparent',
              color: period === p.value ? '#0a0a0f' : '#6b6b7e',
              boxShadow: period === p.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '28px',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}>
        <StatCard
          label="Additional Revenue"
          value={fmtAmount(summary.total_revenue)}
          sub="Generated by Kablet"
          accent
        />
        <StatCard
          label="Revenue Per Order"
          value={fmtAmount(summary.revenue_per_order)}
          sub="Average uplift per transaction"
        />
        <StatCard
          label="Acceptance Rate"
          value={`${summary.acceptance_rate}%`}
          sub="Customers who accepted"
        />
        <StatCard
          label="Transactions Processed"
          value={summary.transactions_processed.toLocaleString()}
          sub="Orders analyzed by engine"
        />
        <StatCard
          label="Opportunities Presented"
          value={summary.opportunities_presented.toLocaleString()}
          sub="Shown to customers"
        />
        <StatCard
          label="Opportunities Accepted"
          value={summary.opportunities_accepted.toLocaleString()}
          sub="Converted by customers"
        />
      </div>

      {/* Transactions table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #eeeef2',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #eeeef2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0a0a0f', margin: 0 }}>
              Recent Transactions
            </h2>
            <p style={{ fontSize: '12px', color: '#9898aa', margin: '2px 0 0' }}>
              {total.toLocaleString()} total
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#f5f5f8', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 12px',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="5" width="14" height="10" rx="2" stroke="#9898aa" strokeWidth="1.4"/>
                <path d="M2 8h14" stroke="#9898aa" strokeWidth="1.4"/>
                <path d="M5 3l2-2 5 0 2 2" stroke="#9898aa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '14px', color: '#4a4a5a', fontWeight: '500', margin: 0 }}>No transactions yet</p>
            <p style={{ fontSize: '12.5px', color: '#9898aa', marginTop: '4px', marginBottom: 0 }}>
              Transactions will appear here once your first order is processed
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Date', 'Order ID', 'Order Value', 'Opportunity', 'Decision', 'Revenue', 'Status'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px',
                        textAlign: h === 'Revenue' ? 'right' : 'left',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: '#9898aa',
                        borderBottom: '1px solid #eeeef2',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={tx.id} style={{
                      borderBottom: i < transactions.length - 1 ? '1px solid #f5f5f8' : 'none',
                    }}>
                      <td style={{ padding: '13px 16px', color: '#6b6b7e', whiteSpace: 'nowrap' }}>
                        {fmtDate(tx.received_at)}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6b6b7e' }}>
                          #{tx.shopify_order_id}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: '600', color: '#0a0a0f' }}>
                        {fmtAmount(tx.transaction_value, tx.transaction_currency)}
                      </td>
                      <td style={{ padding: '13px 16px', color: '#4a4a5a', maxWidth: '160px' }}>
                        {tx.offer_name ? (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {tx.offer_name}
                          </span>
                        ) : (
                          <span style={{ color: '#c4c4cf' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: '12px', color: '#6b6b7e' }}>
                          {decisionLabel(tx.decision?.outcome_type)}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        {tx.instance?.outcome_value ? (
                          <span style={{ fontWeight: '600', color: '#15803d' }}>
                            {fmtAmount(tx.instance.outcome_value!)}
                          </span>
                        ) : (
                          <span style={{ color: '#c4c4cf' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        {tx.instance ? (
                          <StatusBadge state={tx.instance.current_state} />
                        ) : (
                          <span style={{ color: '#c4c4cf', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #eeeef2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '12px', color: '#9898aa' }}>
                  Page {page} of {totalPages} · {total} transactions
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => fetchData(period, page - 1)}
                    style={{
                      padding: '6px 12px', borderRadius: '7px', fontSize: '12.5px',
                      border: '1px solid #eeeef2', background: '#fff', cursor: 'pointer',
                      color: '#4a4a5a', fontWeight: '500',
                      opacity: page <= 1 ? 0.4 : 1,
                    }}
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchData(period, page + 1)}
                    style={{
                      padding: '6px 12px', borderRadius: '7px', fontSize: '12.5px',
                      border: '1px solid #eeeef2', background: '#fff', cursor: 'pointer',
                      color: '#4a4a5a', fontWeight: '500',
                      opacity: page >= totalPages ? 0.4 : 1,
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Engine insight strip */}
      <div style={{
        marginTop: '20px',
        background: '#f5f3fe',
        border: '1px solid #ede9fc',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #6f57e8, #a897f4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="3" stroke="white" strokeWidth="1.4"/>
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0f', margin: 0 }}>
            Decision Engine is optimizing automatically
          </p>
          <p style={{ fontSize: '12px', color: '#6b6b7e', margin: '2px 0 0' }}>
            Kablet analyzes every transaction and selects the highest-converting opportunity. No manual configuration needed.
          </p>
        </div>
        <a href="/dashboard/decision-engine" style={{
          padding: '7px 14px', borderRadius: '8px',
          background: '#6f57e8', color: '#fff',
          fontSize: '12.5px', fontWeight: '600',
          textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          View Engine →
        </a>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
