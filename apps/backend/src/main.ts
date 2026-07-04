import Fastify from 'fastify'
import cors from '@fastify/cors'
import { db } from './db.js'
import { webhookRoutes } from './routes/webhook.js'
import { opportunityRoutes } from './routes/opportunity.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { onboardingRoutes } from './routes/onboarding.js'
import { adminRoutes } from './routes/admin.js'

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
  server.log.info({ shop, accessToken: data.access_token }, 'OAuth completed')

  // Redirect to onboarding page instead of returning JSON
  return reply.redirect(`/?shop=${shop}`)
})

await server.register(webhookRoutes)
await server.register(opportunityRoutes)
await server.register(dashboardRoutes)
await server.register(onboardingRoutes)
await server.register(adminRoutes)

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