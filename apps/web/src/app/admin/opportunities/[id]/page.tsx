import { adminApi } from '@/lib/admin-api'
import { notFound } from 'next/navigation'
import OpportunityEditor from './OpportunityEditor'

export default async function OpportunityPage({ params }: { params: { id: string } }) {
  if (params.id === 'new') {
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
    return <OpportunityEditor opportunity={empty as any} isNew />
  }

  try {
    const opportunity = await adminApi.getOpportunity(params.id)
    return <OpportunityEditor opportunity={opportunity} isNew={false} />
  } catch {
    notFound()
  }
}