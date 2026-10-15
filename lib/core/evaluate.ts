import type { CaseResult, EvalCase, Mode, ProviderSpec, Report, Signals } from './types'
import { REPORT_SCHEMA } from './types'
import { countWords } from './text'
import { demoGenerate } from './demo'
import { expressedConfidence, heuristicClaims, heuristicConsistency, heuristicToxicity, summarizeClaims } from './heuristics'
import { DEFAULT_RULES, decide, evaluateRules, type Rule } from './guardrails'
import { createProvider, redact, type Provider, type ProviderOptions } from './providers'
import { judgeClaims, judgeConsistency } from './judge'
import { explainResult, recommend } from './advice'

export interface EvaluateOptions {
  mode: Mode
  /** Models to evaluate. In demo mode use ids from DEMO_MODELS. Ignored for cases that carry their own answer. */
  models: ProviderSpec[]
  /** Judge for live mode. Defaults to the first model's provider settings. */
  judge?: ProviderSpec
  /** Total answers drawn per model per case (1 = no consistency check). */
  samples?: number
  rules?: Rule[]
  providerOptions?: ProviderOptions
  now?: () => Date
}

export const PROVIDED_ANSWER = 'provided-answer'
export const OFFLINE_JUDGE = 'offline-heuristic'

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))

/** Convenience summary only. The release decision comes from the rules. */
export function overallScore(s: Signals): number | null {
  const parts: [number, number][] = []
  if (s.grounding !== null) parts.push([s.grounding, 0.4])
  if (s.hallucinationRisk !== null) parts.push([100 - s.hallucinationRisk, 0.3])
  if (s.consistency !== null) parts.push([s.consistency, 0.3])
  parts.push([100 - (s.toxicity * 100) / 3, 0.2])
  const w = parts.reduce((a, [, x]) => a + x, 0)
  return clamp(parts.reduce((a, [v, x]) => a + v * x, 0) / w)
}

async function evaluateOne(c: EvalCase, caseId: string, model: ProviderSpec | null, opts: EvaluateOptions, judge: Provider | null): Promise<CaseResult> {
  const t0 = Date.now()
  const rules = opts.rules ?? DEFAULT_RULES
  const samples = Math.max(1, Math.min(opts.samples ?? 1, 5))
  const modelName = model ? model.model : PROVIDED_ANSWER
  const live = opts.mode === 'live'
  const hasContext = !!c.context?.trim()
  const base = { caseId, prompt: c.prompt, model: modelName, mode: opts.mode, judge: live ? (opts.judge ?? model)?.model ?? 'unknown' : OFFLINE_JUDGE }

  try {
    let answer = c.answer
    let extra: string[] = []
    if (answer === undefined) {
      if (!model) throw new Error('No model given and no answer provided.')
      if (live) {
        const p = createProvider(model, opts.providerOptions)
        const user = c.context ? `Context:\n${c.context}\n\nQuestion: ${c.prompt}` : c.prompt
        answer = await p.complete({ user, temperature: 0.2, maxTokens: 800 })
        // SelfCheckGPT draws extra samples at high temperature so that unstable claims diverge.
        extra = await Promise.all(Array.from({ length: samples - 1 }, () => p.complete({ user, temperature: 1, maxTokens: 800 })))
      } else {
        answer = demoGenerate(model.model, c.prompt, c.context, 0)
        extra = Array.from({ length: samples - 1 }, (_, i) => demoGenerate(model.model, c.prompt, c.context, i + 1))
      }
    }

    let claims
    let toxicity: Signals['toxicity']
    let consistency: number | null
    if (live) {
      if (!judge) throw new Error('No judge available.')
      const j = await judgeClaims(judge, c.prompt, answer, c.context)
      claims = j.claims
      toxicity = j.toxicity
      consistency = extra.length ? await judgeConsistency(judge, c.prompt, answer, extra) : null
    } else {
      claims = hasContext ? heuristicClaims(answer, c.context!) : []
      toxicity = heuristicToxicity(answer)
      consistency = heuristicConsistency(answer, extra)
    }
    const sum = summarizeClaims(claims, hasContext)
    const signals: Signals = {
      grounding: sum.grounding,
      hallucinationRisk: sum.risk,
      expressedConfidence: expressedConfidence(answer),
      toxicity,
      consistency,
      answerWords: countWords(answer),
    }
    const checks = evaluateRules(rules, answer, signals)
    const decision = decide(checks)
    return { ...base, answer, signals, claims, checks, decision, overall: overallScore(signals), ...explainResult({ decision, checks, claims, mode: opts.mode }), latencyMs: Date.now() - t0 }
  } catch (e) {
    const key = model?.apiKey ?? opts.judge?.apiKey
    const msg = redact(e instanceof Error ? e.message : String(e), key)
    const empty: Signals = { grounding: null, hallucinationRisk: null, expressedConfidence: 0, toxicity: 0, consistency: null, answerWords: 0 }
    return { ...base, answer: '', signals: empty, claims: [], checks: [], decision: 'ERROR', overall: null, error: msg, ...explainResult({ decision: 'ERROR', checks: [], claims: [], error: msg, mode: opts.mode }), latencyMs: Date.now() - t0 }
  }
}

export async function evaluate(cases: EvalCase[], opts: EvaluateOptions): Promise<Report> {
  const rules = opts.rules ?? DEFAULT_RULES
  let judge: Provider | null = null
  if (opts.mode === 'live') {
    const spec = opts.judge ?? opts.models[0]
    if (spec) {
      try {
        judge = createProvider(spec, opts.providerOptions)
      } catch {
        judge = null // surfaces as a per-result ERROR with a clear message
      }
    }
  }
  const jobs: Promise<CaseResult>[] = []
  cases.forEach((c, i) => {
    const id = c.id ?? `case-${i + 1}`
    if (c.answer !== undefined) jobs.push(evaluateOne(c, id, null, opts, judge))
    else for (const m of opts.models) jobs.push(evaluateOne(c, id, m, opts, judge))
  })
  const results = await Promise.all(jobs)
  const passed = results.filter((r) => r.decision === 'PASS').length
  const failed = results.filter((r) => r.decision === 'FAIL').length
  const errors = results.filter((r) => r.decision === 'ERROR').length
  const live = opts.mode === 'live'
  const judgeName = live ? (opts.judge ?? opts.models[0])?.model ?? 'unknown' : OFFLINE_JUDGE
  const notes = live
    ? ['Scores come from an LLM judge using a written rubric. A judge is an opinion: it can be wrong, favour long answers and favour its own model family.', 'Prefer a judge from a different model family than the one being evaluated.']
    : ['DEMO MODE: answers come from deterministic stand-ins and scores from simple offline word-overlap and keyword rules. No language model was called. These numbers illustrate the workflow and are not a measurement of any real model.']
  return {
    schema: REPORT_SCHEMA,
    generatedAt: (opts.now ?? (() => new Date()))().toISOString(),
    mode: opts.mode,
    judge: judgeName,
    samples: Math.max(1, Math.min(opts.samples ?? 1, 5)),
    guardrails: rules,
    results,
    summary: { total: results.length, passed, failed, errors, gate: failed === 0 && errors === 0 && results.length > 0 ? 'PASS' : 'FAIL' },
    recommendation: recommend(results, opts.mode),
    notes,
  }
}
