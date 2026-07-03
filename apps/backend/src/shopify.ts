import crypto from 'crypto'
import type { Merchant, TransactionEventInsert } from './types.js'

export function verifyShopifyHmac(
  rawBody: Buffer,
  hmacHeader: string,
  secret: string
): boolean {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(hmacHeader)
    )
  } catch {
    return false
  }
}

export function translateShopifyOrder(
  order: ShopifyOrder,
  merchant: Merchant
): TransactionEventInsert {
  return {
    merchant_id: merchant.id,
    shopify_order_id: order.id.toString(),
    transaction_type: 'PURCHASE',
    transaction_value: parseFloat(order.total_price),
    transaction_currency: order.currency,
    transaction_geography:
      order.billing_address?.country_code ??
      order.shipping_address?.country_code ??
      merchant.geography,
    transaction_occurred_at: order.created_at,
    customer_reference: order.customer?.id?.toString() ?? order.email ?? 'anonymous',
    is_first_transaction: (order.customer?.orders_count ?? 1) <= 1,
    has_shipping_address: !!order.shipping_address,
    cod_supported: true,
    source_platform: 'SHOPIFY',
  }
}

export async function fetchShopifyOrder(
  shopDomain: string,
  accessToken: string,
  orderId: string
): Promise<ShopifyOrder> {
  const response = await fetch(
    `https://${shopDomain}/admin/api/2026-07/orders/${orderId}.json`,
    {
      headers: { 'X-Shopify-Access-Token': accessToken }
    }
  )

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as { order: ShopifyOrder }
  return data.order
}

export async function createShopifyCodOrder(
  shopDomain: string,
  accessToken: string,
  params: {
    variantId: string
    price: number
    shippingAddress: ShopifyAddress
    instanceId: string
  }
): Promise<string> {
  // Create draft order
  const draftResponse = await fetch(
    `https://${shopDomain}/admin/api/2026-07/draft_orders.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draft_order: {
          line_items: [{
            variant_id: params.variantId,
            quantity: 1,
            price: params.price.toFixed(2),
          }],
          shipping_address: params.shippingAddress,
          tags: 'kablet-opportunity',
          note: `Kablet post-purchase offer | Instance: ${params.instanceId}`,
        }
      })
    }
  )

  if (!draftResponse.ok) {
    const body = await draftResponse.text()
    throw new Error(`Failed to create draft order: ${draftResponse.status} ${body}`)
  }

  const draft = await draftResponse.json() as { draft_order: { id: number } }
  const draftOrderId = draft.draft_order.id

  // Complete the draft order with payment pending (COD)
  const completeResponse = await fetch(
    `https://${shopDomain}/admin/api/2026-07/draft_orders/${draftOrderId}/complete.json?payment_pending=true`,
    {
      method: 'PUT',
      headers: { 'X-Shopify-Access-Token': accessToken },
    }
  )

  if (!completeResponse.ok) {
    const body = await completeResponse.text()
    throw new Error(`Failed to complete draft order: ${completeResponse.status} ${body}`)
  }

  const completed = await completeResponse.json() as { draft_order: { order_id: number } }
  const shopifyOrderId = completed.draft_order?.order_id?.toString()

  if (!shopifyOrderId) {
    throw new Error('No order_id returned from completed draft order')
  }

  return shopifyOrderId
}

export interface ShopifyOrder {
  id: number
  total_price: string
  currency: string
  created_at: string
  email?: string
  billing_address?: ShopifyAddress
  shipping_address?: ShopifyAddress
  customer?: {
    id: number
    orders_count: number
  }
}

export interface ShopifyAddress {
  first_name?: string
  last_name?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  country?: string
  country_code?: string
  zip?: string
  phone?: string
}