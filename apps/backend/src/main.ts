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

// CORS — allow the Next.js frontend, Shopify stores, and Shopify extension CDN
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

// OAuth callback
server.get('/auth/callback', async (request, reply) => {
  const { code, shop } = request.query as any

  if (!code || !shop) {
    return reply.status(400).send({ error: 'Missing code or shop' })
  }

  // Exchange code for access token
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

  // Get shop details from Shopify
  const shopResponse = await fetch(
    `https://${shop}/admin/api/2026-07/shop.json`,
    { headers: { 'X-Shopify-Access-Token': accessToken } }
  )
  const shopData = await shopResponse.json() as any
  const shopName = shopData?.shop?.name ?? shop

  // Check if merchant already exists
  const { data: existingMerchant } = await db
    .from('merchants')
    .select('id')
    .eq('shopify_shop_domain', shop)
    .single()

  if (!existingMerchant) {
    // Create new merchant automatically
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
      // Create merchant config
      await db.from('merchant_configs').insert({
        merchant_id: newMerchant.id,
        engine_enabled: true,
        offers_enabled: true,
        dashboard_enabled: true,
        shopify_enabled: true,
      })

      // Register webhook automatically
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
    // Update access token if merchant already exists
    await db
      .from('merchants')
      .update({ shopify_access_token: accessToken })
      .eq('shopify_shop_domain', shop)

    // Re-enable merchant config in case they reinstalled after uninstalling
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

  // Redirect to app or onboarding
  const { data: merchant } = await db
    .from('merchants')
    .select('id')
    .eq('shopify_shop_domain', shop)
    .single()

  return reply.redirect(`/?shop=${shop}`)
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

// Keep Render free tier alive — ping every 14 minutes
const BACKEND_URL = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${PORT}`
setInterval(async () => {
  try {
    await fetch(`${BACKEND_URL}/health`)
  } catch {
    // Ignore errors
  }
}, 14 * 60 * 1000)

start()