'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle, ChevronDown } from 'lucide-react'
import type { CaseResult } from '@/lib/core/types'
import { SIGNAL_HELP, type SignalKey } from '@/lib/core/explain'
import { TOX_LABEL } from '@/lib/core/guardrails'

export function ModeBadge({ mode }: { mode: 'demo' | 'live' }) {
  return mode === 'demo' ? (
    <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400">DEMO: offline heuristics, no model called</Badge>
  ) : (
    <Badge variant="outline" className="border-emerald-500/60 text-emerald-600 dark:text-emerald-400">LIVE: LLM judge</Badge>
  )
}

export function DecisionBadge({ decision }: { decision: CaseResult['decision'] }) {
  const cls = decision === 'PASS' ? 'bg-emerald-600 text-white' : decision === 'FAIL' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
  return <Badge className={cls}>{decision}</Badge>
}

function Signal({ k, value }: { k: SignalKey; value: string }) {
  const [open, setOpen] = useState(false)
  const h = SIGNAL_HELP[k]
  return (
    <div className="rounded-md border border-border p-2">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <span className="text-xs text-muted-foreground">{h.title}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="text-lg font-semibold text-foreground">{value}</div>
      {open && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {h.what} {h.high} <span className="italic">{h.caveat}</span>
        </p>
      )}
    </div>
  )
}

const pct = (n: number | null) => (n === null ? 'n/a' : `${n}%`)

export function ResultCard({ r }: { r: CaseResult }) {
  const s = r.signals
  const icon = { pass: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />, fail: <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />, skip: <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" /> }
  return (
    <Card className="space-y-4 border-border bg-card p-5" data-testid="result-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm text-muted-foreground">{r.caseId}</div>
          <div className="font-semibold text-foreground">{r.model === 'provided-answer' ? 'Pasted answer' : r.model}</div>
        </div>
        <div className="flex items-center gap-2">
          {r.overall !== null && <span className="text-sm text-muted-foreground" title={SIGNAL_HELP.overall.what}>overall {r.overall}</span>}
          <DecisionBadge decision={r.decision} />
        </div>
      </div>
      <ModeBadge mode={r.mode} />
      {r.decision === 'ERROR' ? (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{r.error}<span className="mt-1 block text-xs text-muted-foreground">{r.fixes[0]}</span></span>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-foreground" data-testid="explanation">{r.explanation}</p>
          {r.fixes.length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <h4 className="mb-1 text-sm font-medium text-foreground">Suggested fixes</h4>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">{r.fixes.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Signal k="grounding" value={pct(s.grounding)} />
            <Signal k="hallucinationRisk" value={pct(s.hallucinationRisk)} />
            <Signal k="consistency" value={pct(s.consistency)} />
            <Signal k="toxicity" value={TOX_LABEL[s.toxicity]} />
            <Signal k="expressedConfidence" value={`${s.expressedConfidence}%`} />
            <Signal k="overall" value={r.overall === null ? 'n/a' : String(r.overall)} />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium text-foreground">Guardrail rules</h4>
            <ul className="space-y-1.5">
              {r.checks.map((c) => (
                <li key={c.ruleId} className="flex gap-2 text-sm" data-status={c.status}>
                  {icon[c.status]}
                  <span>
                    <span className="font-medium text-foreground">{c.name}</span>
                    {!c.blocking && <span className="text-muted-foreground"> (warning only)</span>}
                    <span className="block text-xs text-muted-foreground">{c.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {r.claims.some((c) => c.verdict !== 'supported') && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-foreground">Claims to review</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {r.claims.filter((c) => c.verdict !== 'supported').map((c, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">[{c.verdict}]</span> {c.text}
                    {c.note && <span className="italic"> ({c.note})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">Show the answer ({s.answerWords} words)</summary>
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-foreground">{r.answer}</p>
          </details>
        </>
      )}
    </Card>
  )
}
