import { db } from './db.js'
import type {
  TransactionEvent,
  OpportunityDefinition,
  EligibilityResult
} from './types.js'

// ── Eligibility ────────────────────────────────────────────────────────

function evaluateEligibility(
  def: OpportunityDefinition,
  event: TransactionEvent
): EligibilityResult {
  if (def.required_geography !== event.transaction_geography) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: `geography_mismatch: required ${def.required_geography}, got ${event.transaction_geography}`
    }
  }

  if (
    def.min_transaction_value !== null &&
    event.transaction_value < def.min_transaction_value
  ) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: `below_min_value: required ${def.min_transaction_value}, got ${event.transaction_value}`
    }
  }

  if (
    def.required_transaction_type !== null &&
    def.required_transaction_type !== event.transaction_type
  ) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: `transaction_type_mismatch: required ${def.required_transaction_type}, got ${event.transaction_type}`
    }
  }

  if (def.requires_shipping_address && !event.has_shipping_address) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: 'no_shipping_address'
    }
  }

  return { definitionId: def.id, passed: true }
}

// ── Scoring ────────────────────────────────────────────────────────────

function computeScore(def: OpportunityDefinition): number {
  return 1000 - def.base_priority
}

// ── Persistence ────────────────────────────────────────────────────────

async function persistDecision(
  event: TransactionEvent,
  outcomeType: 'OPPORTUNITY_IDENTIFIED' | 'NO_ELIGIBLE_OPPORTUNITIES' | 'CATALOG_EMPTY',
  winner: OpportunityDefinition | null,
  trace: EligibilityResult[],
  candidatesEvaluated: number,
  selectedScore: number | null
): Promise<string> {
  const { data, error } = await db
    .from('decision_records')
    .insert({
      transaction_event_id: event.id,
      merchant_id: event.merchant_id,
      outcome_type: outcomeType,
      selected_definition_id: winner?.id ?? null,
      candidates_evaluated: candidatesEvaluated,
      eligibility_trace: trace,
      selected_score: selectedScore
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to persist decision: ${error.message}`)
  return data.id
}

async function createInstance(
  event: TransactionEvent,
  definition: OpportunityDefinition,
  decisionRecordId: string
): Promise<void> {
  const { error } = await db.from('opportunity_instances').insert({
    decision_record_id: decisionRecordId,
    definition_id: definition.id,
    transaction_event_id: event.id,
    merchant_id: event.merchant_id,
    customer_reference: event.customer_reference,
    current_state: 'SELECTED'
  })

  if (error) throw new Error(`Failed to create instance: ${error.message}`)
}

// ── Public interface ───────────────────────────────────────────────────

export async function processTransactionEvent(
  event: TransactionEvent
): Promise<void> {
  // 1. Fetch all active definitions
  const { data: definitions, error } = await db
    .from('opportunity_definitions')
    .select('*')
    .eq('lifecycle_state', 'ACTIVE')
    .order('base_priority', { ascending: true })

  if (error) throw new Error(`Failed to fetch definitions: ${error.message}`)

  // 2. Handle empty catalog
  if (!definitions || definitions.length === 0) {
    await persistDecision(event, 'CATALOG_EMPTY', null, [], 0, null)
    return
  }

  // 3. Evaluate eligibility for every definition
  const trace: EligibilityResult[] = definitions.map(def =>
    evaluateEligibility(def, event)
  )

  const eligible = definitions.filter(def =>
    trace.find(r => r.definitionId === def.id)?.passed === true
  )

  // 4. Handle no eligible definitions
  if (eligible.length === 0) {
    await persistDecision(
      event,
      'NO_ELIGIBLE_OPPORTUNITIES',
      null,
      trace,
      definitions.length,
      null
    )
    return
  }

  // 5. Score and rank eligible definitions
  const ranked = eligible
    .map(def => ({ definition: def, score: computeScore(def) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // Deterministic tiebreaker
      return a.definition.id.localeCompare(b.definition.id)
    })

  const winner = ranked[0].definition
  const winnerScore = ranked[0].score

  // 6. Persist decision and create instance
  const decisionId = await persistDecision(
    event,
    'OPPORTUNITY_IDENTIFIED',
    winner,
    trace,
    definitions.length,
    winnerScore
  )

  await createInstance(event, winner, decisionId)
}