const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function apiFetch<T>(
  path: string,
  token: string
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export interface MerchantSummary {
  total_revenue: number
  transactions_processed: number
  opportunities_presented: number
  opportunities_accepted: number
  acceptance_rate: number
}

export interface Transaction {
  id: string
  shopify_order_id: string
  transaction_value: number
  transaction_currency: string
  transaction_type: string
  received_at: string
  decision_records: Array<{
    outcome_type: string
    opportunity_instances: Array<{
      current_state: string
      customer_response: string | null
      outcome_value: number | null
    }>
  }>
}

export const api = {
  getSummary: (token: string) =>
    apiFetch<MerchantSummary>('/dashboard/summary', token),

  getTransactions: (token: string, page = 1) =>
    apiFetch<{ transactions: Transaction[]; total: number; page: number }>(
      `/dashboard/transactions?page=${page}`,
      token
    ),
}