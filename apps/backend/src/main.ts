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