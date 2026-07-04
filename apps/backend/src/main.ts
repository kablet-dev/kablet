import Fastify from 'fastify'
import { db } from './db.js'
import { webhookRoutes } from './routes/webhook.js'
import { opportunityRoutes } from './routes/opportunity.js'
import { dashboardRoutes } from './routes/dashboard.js'

const server = Fastify({
  logger: true
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

// OAuth callback — exchanges Shopify code for access token
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

  return reply.send({
    shop,
    access_token: data.access_token,
    message: 'Save this access token!'
  })
})

await server.register(webhookRoutes)
await server.register(opportunityRoutes)
await server.register(dashboardRoutes)

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()