const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''

async function adminFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_SECRET}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Admin API error: ${response.status}`)
  }

  return response.json()
}

export interface AdminSummary {
  total_merchants: number
  total_transactions: number
  total_revenue: number
  total_accepted: number
  acceptance_rate: number
}

export interface Fulfillment {
  id: string
  current_state: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_address: any
  outcome_value: number | null
  created_at: string
  response_at: string | null
  merchants: { name: string; shopify_shop_domain: string }
  opportunity_definitions: { name: string; shopify_product_price: number }
}

export interface AdminMerchant {
  id: string
  name: string
  shopify_shop_domain: string
  geography: string
  created_at: string
  transaction_count: number
  total_revenue: number
  merchant_configs: {
    engine_enabled: boolean
    offers_enabled: boolean
    shopify_enabled: boolean
  }[]
}

export interface OpportunityDefinition {
  id: string
  name: string
  lifecycle_state: string
  base_priority: number
  required_geography: string
  min_transaction_value: number | null
  shopify_product_price: number
  headline: string
  description: string
  value_proposition: string
  visual_asset_url: string
  cta_label: string
  created_at: string
}

export const adminApi = {
  getSummary: () =>
    adminFetch<AdminSummary>('/admin/summary'),

  getFulfillments: (status = 'COMPLETED') =>
    adminFetch<{ fulfillments: Fulfillment[] }>(`/admin/fulfillments?status=${status}`),

  getMerchants: () =>
    adminFetch<{ merchants: AdminMerchant[] }>('/admin/merchants'),

  getCatalog: () =>
    adminFetch<{ definitions: OpportunityDefinition[] }>('/admin/catalog'),

  activateDefinition: (id: string) =>
    fetch(`${API_URL}/admin/catalog/${id}/activate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    }),

  pauseDefinition: (id: string) =>
    fetch(`${API_URL}/admin/catalog/${id}/pause`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    }),
}