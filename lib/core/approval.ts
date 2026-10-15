import type { CaseResult, Report } from './types'
import { recommend } from './advice'

export function summarize(results: CaseResult[]): Report['summary'] {
  const passed = results.filter((r) => r.decision === 'PASS').length
  const approved = results.filter((r) => r.decision === 'FAIL' && r.approval).length
  const failed = results.filter((r) => r.decision === 'FAIL' && !r.approval).length
  const errors = results.filter((r) => r.decision === 'ERROR').length
  return { total: results.length, passed, failed, errors, approved, gate: failed === 0 && errors === 0 && results.length > 0 ? 'PASS' : 'FAIL' }
}

export const MIN_REASON = 8

/**
 * Records a human override on one FAIL result and recomputes the gate. The original
 * decision and every failed rule stay in the report; only the gate outcome changes.
 */
export function approveResult(report: Report, index: number, reason: string, now: () => Date = () => new Date()): Report {
  const r = report.results[index]
  if (!r || r.decision !== 'FAIL') throw new Error('Only a failed answer can be approved.')
  const text = reason.trim()
  if (text.length < MIN_REASON) throw new Error(`Give a reason of at least ${MIN_REASON} characters so the override can be audited.`)
  const results = report.results.map((x, i) => (i === index ? { ...x, approval: { reason: text.slice(0, 500), at: now().toISOString() } } : x))
  return { ...report, results, summary: summarize(results), recommendation: recommend(results, report.mode) }
}

export function revokeApproval(report: Report, index: number): Report {
  const results = report.results.map((x, i) => {
    if (i !== index) return x
    const { approval: _removed, ...rest } = x
    void _removed
    return rest
  })
  return { ...report, results, summary: summarize(results), recommendation: recommend(results, report.mode) }
}
