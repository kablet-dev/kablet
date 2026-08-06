import OpportunityEditor from '../[id]/OpportunityEditor'

const empty = {
  id: 'new',
  name: '',
  lifecycle_state: 'DRAFT',
  base_priority: 10,
  required_geography: 'AE',
  min_transaction_value: null,
  required_transaction_type: null,
  requires_shipping_address: true,
  execution_method: 'PHYSICAL_SHIPMENT',
  shopify_product_variant_id: '',
  shopify_product_price: 0,
  headline: '',
  description: '',
  value_proposition: '',
  visual_asset_url: '',
  cta_label: 'Add to my order',
  value_bullets: [],
  social_proof: null,
  trust_rating: null,
  created_at: new Date().toISOString(),
}

export default function NewOpportunityPage() {
  return <OpportunityEditor opportunity={empty as any} isNew />
}