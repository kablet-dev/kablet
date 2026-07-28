import crypto from 'crypto'
import type { TransactionEventInsert } from './types.js'

// ── Signature verification ─────────────────────────────────────────────
// WooCommerce signs webhooks with HMAC-SHA256 using the webhook secret
// Header: x-wc-webhook-signature  (base64 encoded)
export function verifyWooCommerceSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64')

    const headerBuf = Buffer.from(signatureHeader, 'base64')
    const computedBuf = Buffer.from(computed, 'base64')

    if (headerBuf.length !== computedBuf.length) return false
    return crypto.timingSafeEqual(computedBuf, headerBuf)
  } catch {
    return false
  }
}

// ── Order translator ───────────────────────────────────────────────────
// WooCommerce REST API order shape → Kablet TransactionEventInsert
export function translateWooOrder(
  order: WooOrder,
  merchantId: string,
  geography: string
): TransactionEventInsert {
  const billingCountry = order.billing?.country ?? ''
  const shippingCountry = order.shipping?.country ?? ''
  const geoCode = billingCountry || shippingCountry || geography

  const hasShipping =
    !!order.shipping?.address_1 && order.shipping.address_1.trim() !== ''

  // Use customer ID if available, otherwise email, otherwise billing phone
  const customerRef =
    order.customer_id && order.customer_id > 0
      ? `woo_customer_${order.customer_id}`
      : order.billing?.email ?? order.billing?.phone ?? `woo_guest_${order.id}`

  const lineItems =
    order.line_items?.map(item => ({
      product_id: item.product_id?.toString(),
      variant_id: item.variation_id ? item.variation_id.toString() : undefined,
      title: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price ?? item.total ?? '0'),
      sku: item.sku ?? undefined,
    })) ?? []

  return {
    merchant_id: merchantId,
    shopify_order_id: `woo_${order.id}`,   // reuse field, prefixed to avoid collisions
    transaction_type: 'PURCHASE',
    transaction_value: parseFloat(order.total),
    transaction_currency: order.currency ?? 'AED',
    transaction_geography: geoCode,
    transaction_occurred_at: order.date_created_gmt
      ? order.date_created_gmt + 'Z'
      : new Date().toISOString(),
    customer_reference: customerRef,
    is_first_transaction: false,            // WooCommerce doesn't send order count in webhook
    has_shipping_address: hasShipping,
    cod_supported: true,
    source_platform: 'WOOCOMMERCE',
    cart_line_items: lineItems,
  }
}

// ── WooCommerce order types ────────────────────────────────────────────
export interface WooOrder {
  id: number
  status: string
  currency: string
  total: string
  customer_id: number
  date_created_gmt?: string
  billing?: WooAddress
  shipping?: WooAddress
  line_items?: WooLineItem[]
  payment_method?: string
}

export interface WooAddress {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  email?: string
  phone?: string
}

export interface WooLineItem {
  id: number
  name: string
  product_id: number
  variation_id?: number
  quantity: number
  total: string
  price?: string
  sku?: string
}