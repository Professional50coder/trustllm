import type { CaseResult, Report } from './types'
import { TOX_LABEL } from './guardrails'

export function toJson(report: Report): string {
  return JSON.stringify(report, null, 2)
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const pct = (n: number | null) => (n === null ? 'n/a' : `${n}%`)

export function signalLine(r: CaseResult): string {
  const s = r.signals
  return `grounding ${pct(s.grounding)}, unsupported claims ${pct(s.hallucinationRisk)}, consistency ${pct(s.consistency)}, toxicity ${TOX_LABEL[s.toxicity]}`
}

export function toMarkdown(report: Report): string {
  const L: string[] = []
  L.push('# TrustLLM release-gate report', '')
  L.push(`Gate: **${report.summary.gate}**  (${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.errors} errors, ${report.summary.total} total)`, '')
  L.push(`Mode: **${report.mode === 'demo' ? 'DEMO (offline heuristics, no model called)' : 'LIVE (LLM judge)'}**  |  Judge: ${report.judge}  |  Samples per answer: ${report.samples}  |  Generated: ${report.generatedAt}`, '')
  L.push(`Recommendation: **${report.recommendation.headline}**. ${report.recommendation.detail}`, '')
  for (const n of report.notes) L.push(`> ${n}`)
  L.push('', '| Case | Model | Decision | Overall | Scores |', '|---|---|---|---|---|')
  for (const r of report.results) L.push(`| ${cell(r.caseId)} | ${cell(r.model)} | ${r.decision} | ${r.overall ?? 'n/a'} | ${r.decision === 'ERROR' ? cell(r.error ?? '') : cell(signalLine(r))} |`)
  for (const r of report.results) {
    L.push('', `## ${r.caseId} / ${r.model}: ${r.decision}`, '', `Prompt: ${r.prompt}`, '')
    if (r.decision === 'ERROR') {
      L.push(`Error: ${r.error}`)
      continue
    }
    L.push(r.explanation, '')
    if (r.fixes.length) L.push('Suggested fixes:', '', ...r.fixes.map((f) => `- ${f}`), '')
    L.push('Rules:', '')
    for (const c of r.checks) L.push(`- ${c.status.toUpperCase()}${c.blocking ? '' : ' (warning only)'}: ${c.name}. ${c.reason}`)
    const flagged = r.claims.filter((c) => c.verdict !== 'supported')
    if (flagged.length) {
      L.push('', 'Claims that were not supported:', '')
      for (const c of flagged) L.push(`- [${c.verdict}] ${c.text}${c.note ? ` (${c.note})` : ''}`)
    }
    L.push('', 'Answer:', '', ...r.answer.split('\n').map((l) => `> ${l}`))
  }
  return L.join('\n') + '\n'
}

export function toCsv(report: Report): string {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['case', 'model', 'decision', 'overall', 'grounding', 'unsupported', 'consistency', 'toxicity', 'failed_rules', 'mode', 'judge', 'generated_at']
  const rows = report.results.map((r) => [
    r.caseId, r.model, r.decision, r.overall, r.signals.grounding, r.signals.hallucinationRisk, r.signals.consistency, TOX_LABEL[r.signals.toxicity],
    r.checks.filter((c) => c.status === 'fail').map((c) => c.ruleId).join(';'), r.mode, r.judge, report.generatedAt,
  ])
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n'
}
