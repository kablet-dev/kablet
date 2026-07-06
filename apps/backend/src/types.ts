export interface Merchant {
  id: string
  name: string
  shopify_shop_domain: string
  shopify_access_token: string
  shopify_webhook_secret: string
  geography: string
  created_at: string
}

export interface MerchantConfig {
  id: string
  merchant_id: string
  engine_enabled: boolean
  offers_enabled: boolean
  dashboard_enabled: boolean
  shopify_enabled: boolean
}

export interface TransactionEvent {
  id: string
  merchant_id: string
  shopify_order_id: string
  transaction_type: string
  transaction_value: number
  transaction_currency: string
  transaction_geography: string
  transaction_occurred_at: string
  customer_reference: string
  is_first_transaction: boolean
  has_shipping_address: boolean
  cod_supported: boolean
  source_platform: string
  received_at: string
  cart_line_items: CartLineItem[]
}

export interface CartLineItem {
  product_id?: string
  variant_id?: string
  title: string
  quantity: number
  price: number
  sku?: string
}

export interface OpportunityDefinition {
  id: string
  name: string
  lifecycle_state: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
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

export interface DecisionRecord {
  id: string
  transaction_event_id: string
  merchant_id: string
  outcome_type: 'OPPORTUNITY_IDENTIFIED' | 'NO_ELIGIBLE_OPPORTUNITIES' | 'CATALOG_EMPTY'
  selected_definition_id: string | null
  candidates_evaluated: number
  eligibility_trace: EligibilityResult[]
  selected_score: number | null
  decided_at: string
}

export interface OpportunityInstance {
  id: string
  decision_record_id: string
  definition_id: string
  transaction_event_id: string
  merchant_id: string
  customer_reference: string
  current_state: InstanceState
  customer_response: 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | null
  response_at: string | null
  shopify_cod_order_id: string | null
  execution_completed_at: string | null
  execution_failed_reason: string | null
  outcome_value: number | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_address: object | null
  created_at: string
}

export type InstanceState =
  | 'SELECTED'
  | 'PRESENTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'FAILED'

export interface EligibilityResult {
  definitionId: string
  passed: boolean
  failedReason?: string
}

export type TransactionEventInsert = Omit<TransactionEvent, 'id' | 'received_at'>