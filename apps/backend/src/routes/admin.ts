import type { FastifyInstance, FastifyRequest } from 'fastify'
import { db } from '../db.js'

declare module 'fastify' {
  interface FastifyRequest {
    isAdmin?: boolean
  }
}

async function adminAuthMiddleware(request: FastifyRequest, reply: any) {
  // Allow browser CORS preflight requests through.
  // The actual GET/POST/PATCH request is still protected below.
  if (request.method === 'OPTIONS') {
    return
  }

  const authHeader = request.headers.authorization
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret) {
    return reply.status(500).send({ error: 'Admin secret not configured' })
  }

  if (authHeader !== `Bearer ${adminSecret}`) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', adminAuthMiddleware)

  // ── PATCH /admin/merchants/:id/config ───────────────────────────────
fastify.patch('/admin/merchants/:id/config', async (request, reply) => {
  const { id } = request.params as { id: string }
  const body = request.body as any

  const { data, error } = await db
    .from('merchant_configs')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', id)
    .select()
    .single()

  if (error) return reply.status(500).send({ error: error.message })
  return reply.send(data)
})

  // ── GET /admin/summary ───────────────────────────────────────────────
  fastify.get('/admin/summary', async (request, reply) => {
    const { data: merchants } = await db
      .from('merchants')
      .select('id', { count: 'exact' })

    const { data: transactions } = await db
      .from('transaction_events')
      .select('id', { count: 'exact' })

    const { data: completed } = await db
      .from('opportunity_instances')
      .select('outcome_value')
      .eq('current_state', 'COMPLETED')

    const totalRevenue = completed?.reduce((sum, i) => sum + (i.outcome_value ?? 0), 0) ?? 0
    const totalAccepted = completed?.length ?? 0

    const { data: presented } = await db
      .from('opportunity_instances')
      .select('id', { count: 'exact' })
      .in('current_state', ['PRESENTED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'FAILED'])

    const acceptanceRate = presented?.length
      ? Math.round((totalAccepted / presented.length) * 100 * 10) / 10
      : 0

    return reply.send({
      total_merchants: merchants?.length ?? 0,
      total_transactions: transactions?.length ?? 0,
      total_revenue: totalRevenue,
      total_accepted: totalAccepted,
      acceptance_rate: acceptanceRate,
    })
  })

    fastify.get('/admin/analytics', async (request, reply) => {
    const query = request.query as {
      siteId?: string
    }

    let intentQuery = db
      .from('intent_events')
      .select('id, host_site_id, event_type, category, page_url, received_at')

    let widgetQuery = db
      .from('widget_events')
      .select(
        'id, host_site_id, intent_event_id, opportunity_instance_id, event_type, session_id, metadata, created_at, host_sites(name, domain, public_id)',
      )

    let decisionQuery = db
      .from('decision_records')
      .select('id, host_site_id, intent_event_id, outcome_type, decided_at')

    if (query.siteId) {
      intentQuery = intentQuery.eq('host_site_id', query.siteId)
      widgetQuery = widgetQuery.eq('host_site_id', query.siteId)
      decisionQuery = decisionQuery.eq('host_site_id', query.siteId)
    }

    const [
      { data: allIntents, error: intentError },
      { data: allWidgetEvents, error: widgetError },
      { data: allDecisions, error: decisionError },
      { data: recentEvents, error: recentError },
    ] = await Promise.all([
      intentQuery,
      widgetQuery,
      decisionQuery,
      db
        .from('widget_events')
        .select(
          'id, host_site_id, intent_event_id, opportunity_instance_id, event_type, session_id, metadata, created_at, host_sites(name, domain, public_id)',
        )
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (intentError || widgetError || decisionError || recentError) {
      return reply.status(500).send({
        error:
          intentError?.message ||
          widgetError?.message ||
          decisionError?.message ||
          recentError?.message ||
          'Could not load analytics',
      })
    }

    const intents = allIntents ?? []
    const widgetEvents = allWidgetEvents ?? []
    const decisions = allDecisions ?? []

    const eventsOfType = (type: string) =>
      widgetEvents.filter((event) => event.event_type === type)

    const displayed = eventsOfType('DISPLAYED')
    const declined = eventsOfType('DECLINED')
    const dismissed = eventsOfType('DISMISSED')
    const errors = eventsOfType('ERROR')

    const acceptedKeys = new Set(
      eventsOfType('ACCEPTED').map(
        (event) =>
          event.opportunity_instance_id ||
          event.intent_event_id ||
          event.id,
      ),
    )

    const noOfferDecisions = decisions.filter((decision) =>
      ['NO_ELIGIBLE_OPPORTUNITIES', 'CATALOG_EMPTY'].includes(
        decision.outcome_type,
      ),
    )

    const offersDisplayed = displayed.length
    const offersAccepted = acceptedKeys.size

    return reply.send({
      metrics: {
        form_submissions: intents.length,
        offers_displayed: offersDisplayed,
        offers_accepted: offersAccepted,
        offers_declined: declined.length,
        offers_dismissed: dismissed.length,
        no_offer_decisions: noOfferDecisions.length,
        errors: errors.length,
        acceptance_rate: offersDisplayed
          ? Math.round((offersAccepted / offersDisplayed) * 1000) / 10
          : 0,
        consent_rate: offersDisplayed
          ? Math.round((offersAccepted / offersDisplayed) * 1000) / 10
          : 0,
      },
      events: recentEvents ?? [],
      decisions: noOfferDecisions,
    })
  })
  // ── GET /admin/fulfillments ──────────────────────────────────────────
  fastify.get('/admin/fulfillments', async (request, reply) => {
    const { status = 'COMPLETED' } = request.query as { status?: string }

    const { data, error } = await db
      .from('opportunity_instances')
      .select(`
        id,
        current_state,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        outcome_value,
        created_at,
        response_at,
        merchants (name, shopify_shop_domain),
        opportunity_definitions (name, shopify_product_price)
      `)
      .eq('current_state', status)
      .order('response_at', { ascending: false })

    if (error) {
      return reply.status(500).send({ error: error.message })
    }

    return reply.send({ fulfillments: data })
  })

  // ── GET /admin/merchants ─────────────────────────────────────────────
  fastify.get('/admin/merchants', async (request, reply) => {
    const { data: merchants } = await db
      .from('merchants')
      .select(`
        id,
        name,
        shopify_shop_domain,
        geography,
        created_at,
        merchant_configs (
          engine_enabled,
          offers_enabled,
          shopify_enabled
        )
      `)
      .order('created_at', { ascending: false })

    // Get transaction count per merchant
    const merchantsWithStats = await Promise.all(
      (merchants ?? []).map(async (merchant) => {
        const { count: txCount } = await db
          .from('transaction_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)

        const { data: completed } = await db
          .from('opportunity_instances')
          .select('outcome_value')
          .eq('merchant_id', merchant.id)
          .eq('current_state', 'COMPLETED')

        const revenue = completed?.reduce((sum, i) => sum + (i.outcome_value ?? 0), 0) ?? 0

        return {
          ...merchant,
          transaction_count: txCount ?? 0,
          total_revenue: revenue,
        }
      })
    )

    return reply.send({ merchants: merchantsWithStats })
  })

  // ── GET /admin/catalog ───────────────────────────────────────────────
  fastify.get('/admin/catalog', async (request, reply) => {
    const { data, error } = await db
      .from('opportunity_definitions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return reply.status(500).send({ error: error.message })

    return reply.send({ definitions: data })
  })

  // ── POST /admin/catalog ──────────────────────────────────────────────
  fastify.post('/admin/catalog', async (request, reply) => {
    const body = request.body as any

    const { data, error } = await db
      .from('opportunity_definitions')
      .insert({
        name: body.name,
        lifecycle_state: 'DRAFT',
        base_priority: body.base_priority ?? 100,
        required_geography: body.required_geography ?? 'AE',
        min_transaction_value: body.min_transaction_value ?? null,
        required_transaction_type: body.required_transaction_type ?? null,
        requires_shipping_address: body.requires_shipping_address ?? true,
        execution_method: 'PHYSICAL_SHIPMENT',
        shopify_product_variant_id: body.shopify_product_variant_id ?? 'pending',
        shopify_product_price: body.shopify_product_price,
        headline: body.headline,
        description: body.description,
        value_proposition: body.value_proposition,
        visual_asset_url: body.visual_asset_url,
        cta_label: body.cta_label ?? 'Add to my order',
      })
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })

    return reply.status(201).send(data)
  })

  // ── PATCH /admin/catalog/:id/activate ───────────────────────────────
  fastify.patch('/admin/catalog/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string }

    const { data, error } = await db
      .from('opportunity_definitions')
      .update({ lifecycle_state: 'ACTIVE' })
      .eq('id', id)
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.send(data)
  })

  // ── PATCH /admin/catalog/:id/pause ──────────────────────────────────
  fastify.patch('/admin/catalog/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string }

    const { data, error } = await db
      .from('opportunity_definitions')
      .update({ lifecycle_state: 'PAUSED' })
      .eq('id', id)
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.send(data)
  })

  // ── GET /admin/catalog/:id ──────────────────────────────────────────
  fastify.get('/admin/catalog/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const { data, error } = await db
      .from('opportunity_definitions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return reply.status(404).send({ error: 'Not found' })
    return reply.send(data)
  })

  // ── PATCH /admin/catalog/:id ─────────────────────────────────────────
  fastify.patch('/admin/catalog/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any

    // Prevent direct lifecycle_state changes through this route
    delete body.lifecycle_state
    delete body.id
    delete body.created_at

    const { data, error } = await db
      .from('opportunity_definitions')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.send(data)
  })

  // ── GET /admin/transactions ──────────────────────────────────────────
  fastify.get('/admin/transactions', async (request, reply) => {
    const { page = '1' } = request.query as { page?: string }
    const pageNum = Math.max(1, parseInt(page))
    const limit = 20
    const offset = (pageNum - 1) * limit

    const { data, count } = await db
      .from('transaction_events')
      .select(`
        id,
        shopify_order_id,
        transaction_value,
        transaction_currency,
        transaction_geography,
        received_at,
        cart_line_items,
        merchants (name),
        decision_records (
          outcome_type,
          opportunity_instances (
            current_state,
            customer_response,
            outcome_value,
            customer_name
          )
        )
      `, { count: 'exact' })
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return reply.send({ transactions: data, total: count ?? 0, page: pageNum })
  })
  // ── GET /admin/payouts ───────────────────────────────────────────────
fastify.get('/admin/payouts', async (request, reply) => {
  const { data } = await db
    .from('merchant_payouts')
    .select(`*, merchants (name)`)
    .order('created_at', { ascending: false })

  return reply.send({ payouts: data ?? [] })
})

// ── PATCH /admin/payouts/:id/mark-paid ───────────────────────────────
fastify.patch('/admin/payouts/:id/mark-paid', async (request, reply) => {
  const { id } = request.params as { id: string }

  const { data, error } = await db
    .from('merchant_payouts')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return reply.status(500).send({ error: error.message })
  return reply.send(data)
})
  // ── PATCH /admin/host-sites/:publicId/config ─────────────────────────
  fastify.patch('/admin/host-sites/:publicId/config', async (request, reply) => {
    const { publicId } = request.params as { publicId: string }
    const body = request.body as {
      manual_category?: string | null
      manual_offer_id?: string | null
    }

    const { data, error } = await db
      .from('host_sites')
      .update({
        manual_category: body.manual_category || null,
        manual_offer_id: body.manual_offer_id || null,
      })
      .eq('public_id', publicId)
      .select('id, public_id, manual_category, manual_offer_id')
      .single()

    if (error) {
      return reply.status(500).send({ error: error.message })
    }

    return reply.send(data)
  })
    // ── POST /admin/site-check ────────────────────────────────────────────
  fastify.post('/admin/site-check', async (request, reply) => {
    const body = request.body as { url?: string }

    if (!body.url) {
      return reply.status(400).send({ error: 'Website URL is required' })
    }

    let targetUrl: URL

    try {
      targetUrl = new URL(body.url)

      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported')
      }
    } catch {
      return reply.status(400).send({ error: 'Enter a valid website URL' })
    }

    try {
      const response = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent': 'Kablet Site Checker/1.0',
        },
        signal: AbortSignal.timeout(15000),
      })

      const html = await response.text()
      const lowerHtml = html.toLowerCase()

      const forms = (html.match(/<form\b/gi) || []).length

      const detectedPlatforms: string[] = []
      const detectedForms: string[] = []

      if (
        lowerHtml.includes('wp-content') ||
        lowerHtml.includes('wordpress')
      ) {
        detectedPlatforms.push('WordPress')
      }

      if (
        lowerHtml.includes('wpcf7') ||
        lowerHtml.includes('contact-form-7')
      ) {
        detectedForms.push('Contact Form 7')
      }

      if (
        lowerHtml.includes('wpforms') ||
        lowerHtml.includes('wpforms-form')
      ) {
        detectedForms.push('WPForms')
      }

      if (
        lowerHtml.includes('gform_wrapper') ||
        lowerHtml.includes('gravityforms')
      ) {
        detectedForms.push('Gravity Forms')
      }

      if (
        lowerHtml.includes('elementor-form') ||
        lowerHtml.includes('elementor-pro')
      ) {
        detectedForms.push('Elementor Forms')
      }

      if (lowerHtml.includes('w-form')) {
        detectedPlatforms.push('Webflow')
      }

      if (lowerHtml.includes('shopify')) {
        detectedPlatforms.push('Shopify')
      }

      const ajaxIndicators = [
        'xmlhttprequest',
        'fetch(',
        'admin-ajax.php',
        'wpforms-ajax',
        'elementor-pro',
        'gravityforms',
      ]

      const ajaxDetected = ajaxIndicators.some((indicator) =>
        lowerHtml.includes(indicator)
      )

      const https = targetUrl.protocol === 'https:'
      const compatible =
        forms > 0 &&
        (detectedForms.includes('Contact Form 7') ||
          detectedForms.includes('WPForms') ||
          detectedForms.includes('Gravity Forms') ||
          detectedForms.includes('Elementor Forms') ||
          ajaxDetected)

      let fitResult = 'REVIEW NEEDED'
      let recommendation = 'Submit a test form manually before pitching.'

      if (compatible && https) {
        fitResult = 'GOOD FIT'
        recommendation =
          'One-script widget should be suitable. Perform one test submission.'
      } else if (!https) {
        fitResult = 'REVIEW NEEDED'
        recommendation = 'Website is not using HTTPS.'
      } else if (forms === 0) {
        fitResult = 'NOT READY'
        recommendation = 'No forms were detected on this page.'
      }

      return reply.send({
        url: targetUrl.toString(),
        reachable: response.ok,
        statusCode: response.status,
        https,
        forms,
        platforms: detectedPlatforms,
        formTypes: detectedForms,
        ajaxDetected,
        fitResult,
        recommendation,
      })
    } catch (error) {
      request.log.error({ error }, 'Site check failed')

      return reply.status(502).send({
        error: 'Could not access this website',
      })
    }
  })
}