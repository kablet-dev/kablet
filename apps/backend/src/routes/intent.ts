import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { processIntentEvent } from '../intent-engine.js'

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

interface IntentRequest {
  eventType:
    | 'FORM_SUBMISSION'
    | 'RFQ_SUBMITTED'
    | 'QUOTE_REQUESTED'
    | 'DEMO_BOOKED'
    | 'CONSULTATION_REQUESTED'
    | 'PURCHASE_COMPLETED'
  sourcePlatform: string
  externalEventId?: string
  formId?: string
  pageUrl?: string
  hostUrl?: string
  category?: string
  projectType?: string
  intentText?: string
  geography?: string
  quantity?: number
  budget?: number
  budgetCurrency?: string
  timeline?: string
  customer?: {
    externalCustomerId?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    jobTitle?: string
  }
  company?: {
    name?: string
    website?: string
    industry?: string
    companySize?: string
    geography?: string
  }
  structuredContext?: Record<string, unknown>
}

export async function intentRoutes(fastify: FastifyInstance) {
  fastify.post('/intent/events', async (request, reply) => {
    const apiKey = request.headers['x-kablet-site-key'] as string | undefined

    if (!apiKey) {
      return reply.status(401).send({ error: 'Missing site key' })
    }

    const keyHash = hashApiKey(apiKey)

    const { data: keyRecord } = await db
      .from('host_api_keys')
      .select('id, host_site_id')
      .eq('key_hash', keyHash)
      .eq('status', 'ACTIVE')
      .single()

    if (!keyRecord) {
      return reply.status(401).send({ error: 'Invalid site key' })
    }

    const { data: site } = await db
      .from('host_sites')
      .select('id, status, default_geography')
      .eq('id', keyRecord.host_site_id)
      .single()

    if (!site || site.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Host site is not active' })
    }

    const body = request.body as IntentRequest

    if (!body.eventType || !body.sourcePlatform) {
      return reply.status(400).send({
        error: 'eventType and sourcePlatform are required',
      })
    }

    // Update API key usage timestamp.
    await db
      .from('host_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id)

    let companyId: string | null = null

    if (body.company?.name || body.company?.website) {
      const { data: company, error } = await db
        .from('companies')
        .insert({
          host_site_id: site.id,
          name: body.company.name ?? null,
          website: body.company.website ?? null,
          industry: body.company.industry ?? null,
          company_size: body.company.companySize ?? null,
          geography: body.company.geography ?? body.geography ?? site.default_geography,
        })
        .select('id')
        .single()

      if (error) {
        fastify.log.error({ error }, 'Failed to create company')
        return reply.status(500).send({ error: 'Failed to create company' })
      }

      companyId = company.id
    }

    let customerId: string | null = null

    if (
      body.customer?.email ||
      body.customer?.phone ||
      body.customer?.externalCustomerId
    ) {
      const { data: customer, error } = await db
        .from('customer_profiles')
        .insert({
          host_site_id: site.id,
          company_id: companyId,
          external_customer_id: body.customer.externalCustomerId ?? null,
          first_name: body.customer.firstName ?? null,
          last_name: body.customer.lastName ?? null,
          email: body.customer.email ?? null,
          phone: body.customer.phone ?? null,
          job_title: body.customer.jobTitle ?? null,
        })
        .select('id')
        .single()

      if (error) {
        fastify.log.error({ error }, 'Failed to create customer')
        return reply.status(500).send({ error: 'Failed to create customer' })
      }

      customerId = customer.id
    }

    const { data: intentEvent, error: eventError } = await db
      .from('intent_events')
      .insert({
        host_site_id: site.id,
        customer_id: customerId,
        company_id: companyId,
        event_type: body.eventType,
        source_platform: body.sourcePlatform,
        external_event_id: body.externalEventId ?? null,
        form_id: body.formId ?? null,
        page_url: body.pageUrl ?? null,
        host_url: body.hostUrl ?? null,
        category: body.category ?? null,
        project_type: body.projectType ?? null,
        intent_text: body.intentText ?? null,
        geography: body.geography ?? site.default_geography,
        quantity: body.quantity ?? null,
        budget: body.budget ?? null,
        budget_currency: body.budgetCurrency ?? null,
        timeline: body.timeline ?? null,
        structured_context: body.structuredContext ?? {},
        raw_context: {},
      })
      .select('id')
      .single()

    if (eventError) {
      fastify.log.error({ eventError }, 'Failed to create intent event')
      return reply.status(500).send({ error: 'Failed to create intent event' })
    }

    let engineResult

try {
  engineResult = await processIntentEvent({
    id: intentEvent.id,
    host_site_id: site.id,
    customer_id: customerId,
    company_id: companyId,
    category: body.category,
    geography: body.geography ?? site.default_geography,
    budget: body.budget,
    intent_text: body.intentText,
  })
} catch (error) {
  fastify.log.error({ error }, 'Intent engine failed')

  return reply.status(500).send({
    error: 'Intent was saved, but offer selection failed',
    intentEventId: intentEvent.id,
    })

  fastify.post('/intent/consent', async (request, reply) => {
    const apiKey = request.headers['x-kablet-site-key'] as string | undefined

    if (!apiKey) {
      return reply.status(401).send({ error: 'Missing site key' })
    }

    const keyHash = hashApiKey(apiKey)

    const { data: keyRecord } = await db
      .from('host_api_keys')
      .select('id, host_site_id')
      .eq('key_hash', keyHash)
      .eq('status', 'ACTIVE')
      .single()

    if (!keyRecord) {
      return reply.status(401).send({ error: 'Invalid site key' })
    }

    const body = request.body as {
      intentEventId?: string
      instanceId?: string
      consentText?: string
      consentVersion?: string
      sourceUrl?: string
    }

    if (!body.intentEventId || !body.instanceId) {
      return reply.status(400).send({
        error: 'intentEventId and instanceId are required',
      })
    }

    const { data: event } = await db
      .from('intent_events')
      .select('id, customer_id')
      .eq('id', body.intentEventId)
      .eq('host_site_id', keyRecord.host_site_id)
      .single()

    if (!event) {
      return reply.status(404).send({ error: 'Intent event not found' })
    }

    const { data: instance } = await db
      .from('opportunity_instances')
      .select('id, current_state')
      .eq('id', body.instanceId)
      .eq('intent_event_id', body.intentEventId)
      .eq('host_site_id', keyRecord.host_site_id)
      .single()

    if (!instance) {
      return reply.status(404).send({ error: 'Opportunity not found' })
    }

    const { data: consent, error: consentError } = await db
      .from('buyer_consents')
      .insert({
        customer_id: event.customer_id,
        intent_event_id: event.id,
        consent_type: 'CONNECT_WITH_PROVIDER',
        consent_text:
          body.consentText ??
          'I agree to be contacted by relevant providers.',
        consent_version: body.consentVersion ?? 'v1',
        source_url: body.sourceUrl ?? null,
      })
      .select('id')
      .single()

    if (consentError || !consent) {
      return reply.status(500).send({ error: 'Could not save consent' })
    }

    await db
      .from('opportunity_instances')
      .update({
        current_state: 'ACCEPTED',
        customer_response: 'ACCEPTED',
        response_at: new Date().toISOString(),
      })
      .eq('id', instance.id)

    await db.from('widget_events').insert({
      host_site_id: keyRecord.host_site_id,
      intent_event_id: event.id,
      opportunity_instance_id: instance.id,
      event_type: 'ACCEPTED',
    })

    return reply.send({
      ok: true,
      status: 'ACCEPTED',
      consentId: consent.id,
    })
  })
}

return reply.status(201).send({
  ok: true,
  intentEventId: intentEvent.id,
  status: 'PROCESSED',
  outcome: engineResult.outcome,
  opportunity: engineResult.opportunity,
})
  })
}