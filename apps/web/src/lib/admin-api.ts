const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

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
  required_transaction_type: string | null
  requires_shipping_address: boolean
  execution_method: string
  shopify_product_variant_id: string
  shopify_product_price: number
  headline: string
  description: string
  value_proposition: string
  visual_asset_url: string
  cta_label: string
  value_bullets: string[]
  social_proof: string | null
  trust_rating: number | null
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

  getOpportunity: (id: string) =>
    adminFetch<OpportunityDefinition>(`/admin/catalog/${id}`),

  updateOpportunity: (id: string, body: Partial<OpportunityDefinition>) =>
    fetch(`${API_URL}/admin/catalog/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify(body),
    }),

  getAllPayouts: () =>
    adminFetch<{ payouts: any[] }>('/admin/payouts'),

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

  siteCheck: (url: string) =>
    fetch(`${API_URL}/admin/site-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ url }),
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(
          error?.error ?? `Site check failed: ${response.status}`,
        )
      }

      return response.json()
    }),

  getAnalytics: () =>
    adminFetch<{
      metrics: {
        form_submissions: number
        offers_displayed: number
        offers_accepted: number
        offers_declined: number
        offers_dismissed: number
        no_offer_decisions: number
        errors: number
        acceptance_rate: number
        consent_rate: number
      }
      events: Array<{
        id: string
        event_type: string
        created_at: string
        intent_event_id: string | null
        opportunity_instance_id: string | null
        host_sites: {
          name: string
          domain: string
          public_id: string
        } | null
      }>
      decisions: Array<{
        id: string
        outcome_type: string
        decided_at: string
        intent_event_id: string | null
        host_site_id: string | null
      }>
    }>('/admin/analytics'),
      getRequests: () =>
    adminFetch<{
      requests: any[]
      customers: any[]
      opportunities: any[]
      consents: any[]
      decisions: any[]
    }>('/admin/requests'),
}