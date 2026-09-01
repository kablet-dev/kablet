import { db } from './db.js'
import {
  fetchCandidates,
  runEligibility,
  runScoring,
  runRanking,
} from './engine.js'
import type { TransactionEvent } from './types.js'

export interface IntentInput {
  id: string
  host_site_id: string
  customer_id?: string | null
  company_id?: string | null
  category?: string | null
  manual_offer_id?: string | null
  geography?: string | null
  budget?: number | null
  intent_text?: string | null
}

export async function processIntentEvent(event: IntentInput) {
    let candidateQuery = db
    .from('opportunity_definitions')
    .select('*')
    .eq('lifecycle_state', 'ACTIVE')
    .order('base_priority', { ascending: true })

 if (event.manual_offer_id === null) {
  const { error: decisionError } = await db
    .from('decision_records')
    .insert({
      transaction_event_id: null,
      intent_event_id: event.id,
      merchant_id: null,
      host_site_id: event.host_site_id,
      outcome_type: 'NO_ELIGIBLE_OPPORTUNITIES',
      selected_definition_id: null,
      candidates_evaluated: 0,
      eligibility_trace: [],
      selected_score: null,
    })

  if (decisionError) {
    throw new Error(decisionError.message)
  }

  return {
    outcome: 'NO_ELIGIBLE_OPPORTUNITIES',
    opportunity: null,
  }
}

if (event.manual_offer_id) {
  candidateQuery = candidateQuery.eq('id', event.manual_offer_id)
}

  const { data: candidates, error: candidateError } = await candidateQuery

  if (candidateError) {
    throw new Error(candidateError.message)
  }

  if (!candidates || candidates.length === 0) {
    return {
      outcome: 'CATALOG_EMPTY',
      opportunity: null,
    }
  }

    const transactionLikeEvent = {
    transaction_geography: event.geography ?? 'UAE',
    transaction_value: event.budget ?? 0,
    transaction_type: 'FORM_SUBMISSION',
    has_shipping_address: false,
  } as any

  const { eligible, trace: eligibilityTrace } = runEligibility(
    candidates,
    transactionLikeEvent
  )

  if (eligible.length === 0) {
    return {
      outcome: 'NO_ELIGIBLE_OPPORTUNITIES',
      opportunity: null,
    }
  }

  const scored = runScoring(eligible, {
    scoring: {
      priority_weight: 1,
      ai_weight: 0,
    },
  } as any)

  const ranking = runRanking(scored)
  const winner = ranking.winner

  const { data: decision, error: decisionError } = await db
    .from('decision_records')
    .insert({
      transaction_event_id: null,
      intent_event_id: event.id,
      merchant_id: null,
      host_site_id: event.host_site_id,
      outcome_type: 'OPPORTUNITY_IDENTIFIED',
      selected_definition_id: winner.id,
      candidates_evaluated: candidates.length,
      eligibility_trace: candidates.map((candidate) => ({
        definitionId: candidate.id,
        passed: eligible.some((item) => item.id === candidate.id),
      })),
      selected_score: 1000 - winner.base_priority,
    })
    .select('id')
    .single()

  if (decisionError || !decision) {
    throw new Error(
      decisionError?.message ?? 'Could not create decision record'
    )
  }

  const { data: instance, error: instanceError } = await db
    .from('opportunity_instances')
    .insert({
      decision_record_id: decision.id,
      definition_id: winner.id,
      transaction_event_id: null,
      intent_event_id: event.id,
      merchant_id: null,
      host_site_id: event.host_site_id,
      customer_reference: null,
      current_state: 'SELECTED',
    })
    .select('id')
    .single()

  if (instanceError || !instance) {
    throw new Error(
      instanceError?.message ?? 'Could not create opportunity instance'
    )
  }

  return {
    outcome: 'OPPORTUNITY_IDENTIFIED',
    opportunity: {
      instanceId: instance.id,
      definitionId: winner.id,
      name: winner.name,
      headline: winner.headline,
      description: winner.description,
      valueProposition: winner.value_proposition,
      ctaLabel: winner.cta_label,
      visualAssetUrl: winner.visual_asset_url,
      valueBullets: winner.value_bullets,
    },
  }
}