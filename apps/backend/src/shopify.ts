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
    cart_line_items: order.line_items?.map(item => ({
      product_id: item.product_id?.toString(),
      variant_id: item.variant_id?.toString(),
      title: item.title,
      quantity: item.quantity,
      price: parseFloat(item.price),
      sku: item.sku,
    })) ?? [],
  }
}

export async function fetchShopifyOrder(
  shopDomain: string,
  accessToken: string,
  orderId: string
): Promise<ShopifyOrder> {
  const response = await fetch(
    `https://${shopDomain}/admin/api/2026-07/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          order(id: "gid://shopify/Order/${orderId}") {
            id
            email
            shippingAddress {
              firstName
              lastName
              address1
              address2
              city
              province
              country
              countryCode
              zip
              phone
            }
            lineItems(first: 50) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    id
                    sku
                    price
                    product {
                      id
                    }
                  }
                }
              }
            }
          }
        }`
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Shopify GraphQL error: ${response.status}`)
  }

  const data = await response.json() as any
  const order = data?.data?.order

  if (!order) throw new Error('Order not found')

  // Transform GraphQL response to match our ShopifyOrder interface
  return {
    id: parseInt(orderId),
    total_price: '0',
    currency: 'AED',
    created_at: new Date().toISOString(),
    email: order.email,
    shipping_address: order.shippingAddress ? {
      first_name: order.shippingAddress.firstName,
      last_name: order.shippingAddress.lastName,
      address1: order.shippingAddress.address1,
      address2: order.shippingAddress.address2,
      city: order.shippingAddress.city,
      province: order.shippingAddress.province,
      country: order.shippingAddress.country,
      country_code: order.shippingAddress.countryCode,
      zip: order.shippingAddress.zip,
      phone: order.shippingAddress.phone,
    } : undefined,
    line_items: order.lineItems?.edges?.map((edge: any) => ({
      title: edge.node.title,
      quantity: edge.node.quantity,
      price: edge.node.variant?.price ?? '0',
      sku: edge.node.variant?.sku,
      product_id: edge.node.variant?.product?.id ? 
        parseInt(edge.node.variant.product.id.split('/').pop()) : undefined,
      variant_id: edge.node.variant?.id ?
        parseInt(edge.node.variant.id.split('/').pop()) : undefined,
    })) ?? [],
  }
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
  line_items?: ShopifyLineItem[]
}

export interface ShopifyLineItem {
  product_id?: number
  variant_id?: number
  title: string
  quantity: number
  price: string
  sku?: string
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