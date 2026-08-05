import { db } from './db.js'
import type {
  TransactionEvent,
  OpportunityDefinition,
  EligibilityResult,
} from './types.js'

// ── Engine Config ──────────────────────────────────────────────────────
// Reads the single engine_config row. Falls back to safe defaults if missing.

interface EngineSettings {
  engine: { enabled: boolean; mode: 'live' | 'shadow' | 'dry_run' }
  scoring: { priority_weight: number; ai_weight: number }
  ai: { enabled: boolean; provider: string | null }
  safety: { max_offers_per_customer_per_day: number }
  features: { experiments: boolean; budgets: boolean; ai_scoring: boolean }
}

const DEFAULT_SETTINGS: EngineSettings = {
  engine:  { enabled: true, mode: 'live' },
  scoring: { priority_weight: 1.0, ai_weight: 0.0 },
  ai:      { enabled: false, provider: null },
  safety:  { max_offers_per_customer_per_day: 3 },
  features:{ experiments: false, budgets: false, ai_scoring: false },
}

async function getEngineConfig(): Promise<EngineSettings> {
  const { data } = await db
    .from('engine_config')
    .select('settings')
    .limit(1)
    .single()
  return (data?.settings as EngineSettings) ?? DEFAULT_SETTINGS
}

// ── Pipeline Types ─────────────────────────────────────────────────────
// Each stage returns structured data so the full trace is always available
// for debugging, analytics, and future decision-inspection tools.

interface EligibilityStageResult {
  eligible: OpportunityDefinition[]
  trace: EligibilityResult[]
}

interface ScoringResult {
  definition: OpportunityDefinition
  baseScore: number
  aiScore: number
  finalScore: number
}

interface RankingResult {
  winner: OpportunityDefinition
  winnerScore: number
  ranked: ScoringResult[]
}

export interface DecisionTrace {
  candidates:    OpportunityDefinition[]
  eligibility:   EligibilityResult[]
  scores:        ScoringResult[]
  winner:        OpportunityDefinition | null
  winnerScore:   number | null
  outcomeType:   'OPPORTUNITY_IDENTIFIED' | 'NO_ELIGIBLE_OPPORTUNITIES' | 'CATALOG_EMPTY'
}

// ── Stage 1: Candidate Provider ────────────────────────────────────────
// Fetches all active opportunity definitions.
// Future: filter by campaign budgets, schedules, merchant targeting.

async function fetchCandidates(): Promise<OpportunityDefinition[]> {
  const { data, error } = await db
    .from('opportunity_definitions')
    .select('*')
    .eq('lifecycle_state', 'ACTIVE')
    .order('base_priority', { ascending: true })

  if (error) throw new Error(`CandidateProvider failed: ${error.message}`)
  return data ?? []
}

// ── Stage 2: Eligibility Provider ─────────────────────────────────────
// Evaluates each candidate against the transaction event.
// Future: add merchant overrides, frequency limits, budget checks.

function evaluateEligibility(
  def: OpportunityDefinition,
  event: TransactionEvent
): EligibilityResult {
  if (def.required_geography !== event.transaction_geography) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: `geography_mismatch: required ${def.required_geography}, got ${event.transaction_geography}`,
    }
  }

  if (
    def.min_transaction_value !== null &&
    event.transaction_value < def.min_transaction_value
  ) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: `below_min_value: required ${def.min_transaction_value}, got ${event.transaction_value}`,
    }
  }

  if (
    def.required_transaction_type !== null &&
    def.required_transaction_type !== event.transaction_type
  ) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: `transaction_type_mismatch: required ${def.required_transaction_type}, got ${event.transaction_type}`,
    }
  }

  if (def.requires_shipping_address && !event.has_shipping_address) {
    return {
      definitionId: def.id,
      passed: false,
      failedReason: 'no_shipping_address',
    }
  }

  return { definitionId: def.id, passed: true }
}

function runEligibility(
  candidates: OpportunityDefinition[],
  event: TransactionEvent
): EligibilityStageResult {
  const trace = candidates.map(def => evaluateEligibility(def, event))
  const eligible = candidates.filter(
    def => trace.find(r => r.definitionId === def.id)?.passed === true
  )
  return { eligible, trace }
}

// ── Stage 3: Scoring Provider ──────────────────────────────────────────
// Computes a score for each eligible candidate.
// AI plugs in here later — no engine rewrite needed.
// Combined score = (baseScore * priority_weight) + (aiScore * ai_weight)

function computeBaseScore(def: OpportunityDefinition): number {
  return 1000 - def.base_priority
}

// AI provider interface — implement and swap without touching the engine
// interface AIProvider {
//   score(event: TransactionEvent, def: OpportunityDefinition): Promise<number>
// }

function runScoring(
  eligible: OpportunityDefinition[],
  config: EngineSettings
): ScoringResult[] {
  return eligible.map(def => {
    const baseScore  = computeBaseScore(def)
    const aiScore    = 0 // future: await aiProvider.score(event, def)
    const finalScore =
      baseScore * config.scoring.priority_weight +
      aiScore   * config.scoring.ai_weight
    return { definition: def, baseScore, aiScore, finalScore }
  })
}

// ── Stage 4: Ranking Provider ──────────────────────────────────────────
// Sorts scored candidates and returns the winner.
// Future: experiment engine selects variant here instead of top score.

function runRanking(scored: ScoringResult[]): RankingResult {
  const ranked = [...scored].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore
    return a.definition.id.localeCompare(b.definition.id) // deterministic tiebreak
  })
  return {
    winner:      ranked[0].definition,
    winnerScore: ranked[0].finalScore,
    ranked,
  }
}

// ── Stage 5: Persistence Provider ─────────────────────────────────────
// Writes decision record and creates opportunity instance.
// Unchanged behavior — same DB schema as before.

async function persistDecision(
  event: TransactionEvent,
  trace: DecisionTrace
): Promise<void> {
  const { data, error } = await db
    .from('decision_records')
    .insert({
      transaction_event_id:    event.id,
      merchant_id:             event.merchant_id,
      outcome_type:            trace.outcomeType,
      selected_definition_id:  trace.winner?.id ?? null,
      candidates_evaluated:    trace.candidates.length,
      eligibility_trace:       trace.eligibility,
      selected_score:          trace.winnerScore,
    })
    .select('id')
    .single()

  if (error) throw new Error(`PersistenceProvider failed: ${error.message}`)

  if (trace.winner) {
    const { error: instanceError } = await db
      .from('opportunity_instances')
      .insert({
        decision_record_id:   data.id,
        definition_id:        trace.winner.id,
        transaction_event_id: event.id,
        merchant_id:          event.merchant_id,
        customer_reference:   event.customer_reference,
        current_state:        'SELECTED',
      })

    if (instanceError) throw new Error(`Instance creation failed: ${instanceError.message}`)
  }
}

// ── Public Interface ───────────────────────────────────────────────────
// The engine orchestrates the pipeline.
// Returns the full DecisionTrace — available for debugging and analytics
// without changing the engine.

export async function processTransactionEvent(
  event: TransactionEvent
): Promise<DecisionTrace> {
  const config = await getEngineConfig()

  // Stage 1: Candidates
  const candidates = await fetchCandidates()

  if (candidates.length === 0) {
    const trace: DecisionTrace = {
      candidates: [], eligibility: [], scores: [],
      winner: null, winnerScore: null,
      outcomeType: 'CATALOG_EMPTY',
    }
    await persistDecision(event, trace)
    return trace
  }

  // Stage 2: Eligibility
  const { eligible, trace: eligibilityTrace } = runEligibility(candidates, event)

  if (eligible.length === 0) {
    const trace: DecisionTrace = {
      candidates, eligibility: eligibilityTrace, scores: [],
      winner: null, winnerScore: null,
      outcomeType: 'NO_ELIGIBLE_OPPORTUNITIES',
    }
    await persistDecision(event, trace)
    return trace
  }

  // Stage 3: Scoring
  const scores = runScoring(eligible, config)

  // Stage 4: Ranking
  const { winner, winnerScore, ranked } = runRanking(scores)

  // Stage 5: Persist
  const trace: DecisionTrace = {
    candidates,
    eligibility: eligibilityTrace,
    scores: ranked,
    winner,
    winnerScore,
    outcomeType: 'OPPORTUNITY_IDENTIFIED',
  }
  await persistDecision(event, trace)

  return trace
}