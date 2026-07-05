import type { FastifyInstance } from 'fastify'

export async function complianceRoutes(fastify: FastifyInstance) {

  // Customer data request — respond with what data we hold
  fastify.post('/webhooks/customers/data_request', async (request, reply) => {
    const payload = request.body as any
    fastify.log.info({
      shop: payload.shop_domain,
      customerId: payload.customer?.id,
    }, 'Customer data request received')

    // We store: customer_reference, customer_name, customer_email, 
    // customer_phone, shipping_address in opportunity_instances
    // Respond 200 to acknowledge — manual process for now
    return reply.status(200).send()
  })

  // Customer redact — delete customer data
  fastify.post('/webhooks/customers/redact', async (request, reply) => {
    const payload = request.body as any
    fastify.log.info({
      shop: payload.shop_domain,
      customerId: payload.customer?.id,
    }, 'Customer redact request received')

    // For MVP: log and acknowledge
    // TODO: implement actual data deletion from opportunity_instances
    return reply.status(200).send()
  })

  // Shop redact — delete all merchant data after uninstall
  fastify.post('/webhooks/shop/redact', async (request, reply) => {
    const payload = request.body as any
    fastify.log.info({
      shop: payload.shop_domain,
    }, 'Shop redact request received')

    // For MVP: log and acknowledge
    // TODO: implement merchant data cleanup
    return reply.status(200).send()
  })
}