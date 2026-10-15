export const REPORT_SCHEMA = 'trustllm.report/v1'

export type Mode = 'demo' | 'live'
export type ProviderKind = 'demo' | 'openai' | 'anthropic'

export interface ProviderSpec {
  kind: ProviderKind
  model: string
  /** Base URL for OpenAI-compatible servers. Defaults to the OpenAI API. */
  baseUrl?: string
  /** Never persisted, never logged, never written to a report. */
  apiKey?: string
}

export interface EvalCase {
  id?: string
  prompt: string
  /** Reference passage the answer must be grounded in (RAG context, policy text, source document). */
  context?: string
  /** Evaluate an answer you already have instead of generating one. */
  answer?: string
}

export type ClaimVerdict = 'supported' | 'unsupported' | 'contradicted' | 'unverifiable'

export interface Claim {
  text: string
  verdict: ClaimVerdict
  note?: string
}

/** 0 none, 1 mild, 2 clear, 3 severe */
export type ToxicitySeverity = 0 | 1 | 2 | 3

export interface Signals {
  /** % of claims supported by the context. null when no context was given. */
  grounding: number | null
  /** % of claims unsupported or contradicted. null when it cannot be measured. */
  hallucinationRisk: number | null
  /** How certain the wording sounds (0-100). Describes tone, not correctness. */
  expressedConfidence: number
  toxicity: ToxicitySeverity
  /** Agreement of the answer with extra samples, 0-100. null when no samples were drawn. */
  consistency: number | null
  answerWords: number
}

export type CheckStatus = 'pass' | 'fail' | 'skip'

export interface CheckResult {
  ruleId: string
  name: string
  type: string
  kind: 'deterministic' | 'judge'
  blocking: boolean
  status: CheckStatus
  /** Plain-language explanation shown to the user. */
  reason: string
}

export interface CaseResult {
  caseId: string
  prompt: string
  model: string
  mode: Mode
  /** What produced the scores: 'offline-heuristic' or the judge model id. */
  judge: string
  answer: string
  signals: Signals
  claims: Claim[]
  checks: CheckResult[]
  decision: 'PASS' | 'FAIL' | 'ERROR'
  /** Convenience summary 0-100; the decision comes from the rules, not from this number. */
  overall: number | null
  /** Why it passed or failed, in plain language. */
  explanation: string
  /** Concrete suggested fixes derived from the failed rules. */
  fixes: string[]
  error?: string
  latencyMs: number
}

export interface Report {
  schema: typeof REPORT_SCHEMA
  generatedAt: string
  mode: Mode
  judge: string
  samples: number
  guardrails: unknown[]
  results: CaseResult[]
  summary: { total: number; passed: number; failed: number; errors: number; gate: 'PASS' | 'FAIL' }
  /** Overall recommendation for the run. */
  recommendation: { verdict: 'ship' | 'fix' | 'block'; headline: string; detail: string }
  notes: string[]
}
