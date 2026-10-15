import type { CaseResult, CheckResult, Report } from './types'

/**
 * Explanations and suggested fixes. Deterministic on purpose: every sentence is derived
 * from the rules that actually failed, so the advice cannot drift from the decision.
 */

const FIXES: Record<string, string> = {
  min_grounding: 'Tell the model to answer only from the provided source and to say "not stated in the source" otherwise. Check that the source really contains the answer.',
  max_hallucination_risk: 'Add the instruction "do not add facts that are not in the source", lower the temperature, and review the flagged claims below.',
  max_toxicity: 'Add a tone instruction to the system prompt, remove provocative framing from the prompt, and add an output moderation step before showing answers to users.',
  min_consistency: 'Lower the temperature, give the model more specific source text, and require it to quote the source. Unstable answers usually mean the model is guessing.',
  no_pii: 'Redact personal data before it reaches the model, tell the model never to repeat it, and filter outputs for emails, phone numbers and card numbers.',
  no_secrets: 'Remove keys and tokens from prompts and context, and rotate any key that appeared. Add secret scanning on outputs.',
  has_citations: 'Ask the model to cite its source for every claim, for example with [1] markers or a source line.',
  valid_json: 'Use the provider\'s structured-output or JSON mode and validate against a schema instead of asking for JSON in prose.',
  max_words: 'Ask for a shorter answer and set a maximum output length.',
  min_words: 'Ask for a more complete answer or check that the prompt gives enough to work with.',
  contains: 'State the required wording in the prompt, or add it in a post-processing step.',
  not_contains: 'Tell the model not to use this wording, or filter it in a post-processing step.',
  regex: 'Check the output format instructions against the pattern in this rule.',
}

const failed = (checks: CheckResult[]) => checks.filter((c) => c.status === 'fail')

export function explainResult(r: Pick<CaseResult, 'decision' | 'checks' | 'claims' | 'error' | 'mode'>): { explanation: string; fixes: string[] } {
  if (r.decision === 'ERROR') {
    return { explanation: `This answer could not be evaluated: ${r.error ?? 'unknown error'}`, fixes: ['Check the API key, the model name and your provider quota, then run it again.'] }
  }
  const bad = failed(r.checks)
  const blocking = bad.filter((c) => c.blocking)
  const warnings = bad.filter((c) => !c.blocking)
  const skipped = r.checks.filter((c) => c.status === 'skip')
  const parts: string[] = []
  if (r.decision === 'FAIL') {
    parts.push(`Failed because ${blocking.length === 1 ? 'a blocking rule was' : `${blocking.length} blocking rules were`} broken: ${blocking.map((c) => `${c.name}: ${c.reason.replace(/\.$/, '')}`).join('; ')}.`)
  } else {
    parts.push(`Passed: all ${r.checks.filter((c) => c.blocking && c.status !== 'skip').length} blocking rules that could be checked were satisfied.`)
  }
  if (warnings.length) parts.push(`Warnings (do not block): ${warnings.map((c) => c.name).join('; ')}.`)
  if (skipped.length) parts.push(`${skipped.length} rule${skipped.length === 1 ? ' was' : 's were'} skipped because the data needed was missing (${skipped.map((c) => c.name).join('; ')}). A pass here says nothing about those.`)
  if (r.mode === 'demo') parts.push('This is a demo run with offline heuristics, so treat it as an illustration, not evidence.')
  const fixes = [...new Set(bad.map((c) => FIXES[c.type]).filter(Boolean))]
  const flagged = r.claims.filter((c) => c.verdict === 'unsupported' || c.verdict === 'contradicted')
  if (flagged.length) fixes.push(`Review ${flagged.length === 1 ? 'this claim' : 'these claims'}: ${flagged.slice(0, 3).map((c) => `"${c.text}"`).join(' ')}`)
  return { explanation: parts.join(' '), fixes }
}

export type Recommendation = { verdict: 'ship' | 'fix' | 'block'; headline: string; detail: string }

export function recommend(results: CaseResult[], mode: Report['mode']): Recommendation {
  const total = results.length
  const errors = results.filter((r) => r.decision === 'ERROR').length
  const pass = results.filter((r) => r.decision === 'PASS')
  const fail = results.filter((r) => r.decision === 'FAIL')
  const skipped = results.some((r) => r.checks.some((c) => c.status === 'skip'))
  const demoNote = mode === 'demo' ? ' This was a demo run; repeat it in live mode before relying on it.' : ''
  if (total === 0) return { verdict: 'block', headline: 'Nothing was evaluated', detail: 'Add at least one question and one model or answer.' }
  if (errors > 0) return { verdict: 'fix', headline: 'Fix the errors and run again', detail: `${errors} of ${total} evaluations could not run, so the gate cannot pass. See the error messages on those cards.` }
  if (fail.length === 0) {
    return {
      verdict: 'ship',
      headline: 'Safe to ship under these rules',
      detail: `All ${pass.length} answers satisfied every blocking rule.${skipped ? ' Some rules were skipped for missing data (see each card), so add a source text to cover them.' : ''}${demoNote}`,
    }
  }
  if (pass.length > 0) {
    const names = [...new Set(pass.map((r) => r.model))].join(', ')
    return { verdict: 'fix', headline: `Only ${names} cleared the gate`, detail: `${fail.length} of ${total} answers failed. Prefer the ones that passed, or apply the suggested fixes to the failing ones and re-run.${demoNote}` }
  }
  return { verdict: 'block', headline: 'Do not ship this yet', detail: `Every answer failed at least one blocking rule. Apply the suggested fixes, then re-run.${demoNote}` }
}
