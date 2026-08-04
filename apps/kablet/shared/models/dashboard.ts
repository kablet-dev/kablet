// ── Shared dashboard types & fetch logic ─────────────────────────────────────
// Used by both the Preact App Home extension (Shopify) and the Next.js web app.

export const BACKEND_URL = 'https://kablet-backend.onrender.com'

export interface MerchantSummary {
  total_revenue: number
  transactions_processed: number
  opportunities_presented: number
  opportunities_accepted: number
  acceptance_rate: number
  revenue_per_order: number
}

export interface Transaction {
  id: string
  shopify_order_id: string
  transaction_value: number
  transaction_currency: string
  transaction_type: string
  received_at: string
  offer_name: string | null
  decision: {
    outcome_type: string
    selected_definition_id: string | null
  } | null
  instance: {
    current_state: string
    customer_response: string | null
    outcome_value: number | null
  } | null
}

export interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  page: number
}

export interface MerchantConfig {
  offers_enabled: boolean
  engine_enabled: boolean
  setup_completed: boolean
}

export interface PayoutSummary {
  current_week: {
    transactions: number
    amount: number
    period_start: string
    period_end: string
    next_payout_date: string
  }
  lifetime: {
    transactions: number
    earnings: number
  }
  payouts: Array<{
    id: string
    period_start: string
    period_end: string
    transactions_count: number
    total_amount: number
    status: 'PENDING' | 'PROCESSING' | 'PAID'
    paid_at: string | null
  }>
}

export interface PayoutSettings {
  full_name: string
  account_holder_name: string
  bank_name: string
  iban: string
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

export const dashboardApi = {
  getSummary: (token: string, period = 'lifetime') =>
    apiFetch<MerchantSummary>(`/dashboard/summary?period=${period}`, token),

  getTransactions: (token: string, page = 1, period = 'lifetime') =>
    apiFetch<TransactionsResponse>(
      `/dashboard/transactions?page=${page}&period=${period}`,
      token
    ),

  getConfig: (token: string) =>
    apiFetch<MerchantConfig>('/dashboard/config', token),

  updateConfig: (token: string, body: Partial<MerchantConfig>) =>
    apiFetch<MerchantConfig>('/dashboard/config', token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getPayoutSummary: (token: string) =>
    apiFetch<PayoutSummary>('/payouts/summary', token),

  getPayoutSettings: (token: string) =>
    apiFetch<{ settings: PayoutSettings | null }>('/payouts/settings', token),

  savePayoutSettings: (token: string, body: PayoutSettings) =>
    apiFetch<{ settings: PayoutSettings }>('/payouts/settings', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// ── Formatters shared across both UIs ────────────────────────────────────────

export function fmtAmount(n: number, currency = 'AED'): string {
  return `${currency} ${new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function decisionLabel(outcomeType: string | undefined): string {
  switch (outcomeType) {
    case 'OPPORTUNITY_IDENTIFIED': return 'Matched'
    case 'NO_ELIGIBLE_OPPORTUNITIES': return 'No match'
    case 'CATALOG_EMPTY': return 'No catalog'
    default: return '—'
  }
}
