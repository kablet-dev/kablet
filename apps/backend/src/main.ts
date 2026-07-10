import Fastify from 'fastify'
import cors from '@fastify/cors'
import { db } from './db.js'
import { webhookRoutes } from './routes/webhook.js'
import { opportunityRoutes } from './routes/opportunity.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { onboardingRoutes } from './routes/onboarding.js'
import { adminRoutes } from './routes/admin.js'
import { embeddedRoutes } from './routes/embedded.js'
import { payoutRoutes } from './routes/payouts.js'
import { complianceRoutes } from './routes/compliance.js'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000'

const server = Fastify({
  logger: true
})

await server.register(cors, {
  origin: [
    ALLOWED_ORIGIN,
    /\.myshopify\.com$/,
    /\.shopify\.com$/,
    /\.shopifycdn\.com$/,
    /\.netlify\.app$/,
  ],
  credentials: true,
})

server.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (req, body, done) => {
    try {
      ;(req as any).rawBody = body
      done(null, JSON.parse(body.toString()))
    } catch (err) {
      done(err as Error, undefined)
    }
  }
)

server.get('/health', async () => {
  const { error } = await db.from('merchants').select('id').limit(1)
  return {
    status: 'ok',
    db: error ? 'error' : 'connected'
  }
})

server.get('/auth/callback', async (request, reply) => {
  const { code, shop } = request.query as any

  if (!code || !shop) {
    return reply.status(400).send({ error: 'Missing code or shop' })
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })

  const data = await response.json() as any
  const accessToken = data.access_token

  if (!accessToken) {
    return reply.status(400).send({ error: 'Failed to get access token' })
  }

  server.log.info({ shop }, 'OAuth completed')

  const shopResponse = await fetch(
  `https://${shop}/admin/api/2026-07/graphql.json`,
  {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `{ shop { name } }`
    })
  }
)
const shopData = await shopResponse.json() as any
const shopName = shopData?.data?.shop?.name ?? shop

  const { data: existingMerchant } = await db
    .from('merchants')
    .select('id')
    .eq('shopify_shop_domain', shop)
    .single()

  if (!existingMerchant) {
    const { data: newMerchant, error } = await db
      .from('merchants')
      .insert({
        name: shopName,
        shopify_shop_domain: shop,
        shopify_access_token: accessToken,
        shopify_webhook_secret: process.env.SHOPIFY_CLIENT_SECRET ?? '',
        geography: 'AE',
      })
      .select('id')
      .single()

    if (!error && newMerchant) {
      await db.from('merchant_configs').insert({
        merchant_id: newMerchant.id,
        engine_enabled: true,
        offers_enabled: true,
        dashboard_enabled: true,
        shopify_enabled: true,
      })

  // Register orders/create webhook via REST API
await fetch(
  `https://${shop}/admin/api/2026-07/webhooks.json`,
  {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhook: {
        topic: 'orders/create',
        address: `${process.env.RENDER_EXTERNAL_URL}/webhook/shopify/order`,
        format: 'json',
      }
    })
  }
) 

server.log.info({ shop, merchantId: newMerchant.id }, 'New merchant created automatically')
    }
  } else {
    await db
  .from('merchants')
  .update({ shopify_access_token: accessToken })
  .eq('shopify_shop_domain', shop)

server.log.info({ shop, tokenPrefix: accessToken.substring(0, 10) }, 'Token updated')

    await db
      .from('merchant_configs')
      .update({
        engine_enabled: true,
        offers_enabled: true,
        shopify_enabled: true,
      })
      .eq('merchant_id', existingMerchant.id)

    server.log.info({ shop }, 'Existing merchant token updated and config re-enabled')
  }

  const { data: merchant } = await db
    .from('merchants')
    .select('id')
    .eq('shopify_shop_domain', shop)
    .single()

  // For embedded experience, redirect to app within Shopify admin
const host = (request.query as any).host
if (host) {
  return reply.redirect(`/app?shop=${shop}&host=${host}`)
} else {
  return reply.redirect(`/?shop=${shop}`)
}
})

await server.register(webhookRoutes)
await server.register(opportunityRoutes)
await server.register(dashboardRoutes)
await server.register(onboardingRoutes)
await server.register(adminRoutes)
await server.register(embeddedRoutes)
await server.register(payoutRoutes)
await server.register(complianceRoutes)

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

const BACKEND_URL = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${PORT}`
setInterval(async () => {
  try {
    await fetch(`${BACKEND_URL}/health`)
  } catch {
    // Ignore errors
  }
}, 14 * 60 * 1000)

start()