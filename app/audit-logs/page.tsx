'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { ResultCard, ModeBadge, DecisionBadge } from '@/components/result-card'
import { ExportButtons } from '@/components/export-buttons'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { clearHistory, deleteRun, download, loadHistory, type SavedRun } from '@/lib/client/storage'

export default function HistoryPage() {
  const [runs, setRuns] = useState<SavedRun[]>([])
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [gate, setGate] = useState<'all' | 'PASS' | 'FAIL'>('all')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setRuns(loadHistory())
    setReady(true)
  }, [])

  const shown = useMemo(
    () =>
      runs.filter(
        (r) =>
          (gate === 'all' || r.report.summary.gate === gate) &&
          (!q || r.report.results.some((x) => `${x.prompt} ${x.model} ${x.caseId}`.toLowerCase().includes(q.toLowerCase()))),
      ),
    [runs, q, gate],
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main" className="container mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your saved evaluations: when it ran, which rules applied, the decision and the reasons. Stored only in this browser (the newest 30 are kept). API keys are never saved. Export a run to attach it to a release ticket.
          </p>
        </div>

        {!ready ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading...</Card>
        ) : runs.length === 0 ? (
          <Card className="space-y-3 border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No saved evaluations yet.</p>
            <Link href="/dashboard"><Button>Run your first evaluation</Button></Link>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Input aria-label="Search history" placeholder="Search question or model" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
              <div className="flex gap-1" role="group" aria-label="Filter by gate">
                {(['all', 'PASS', 'FAIL'] as const).map((g) => (
                  <Button key={g} size="sm" variant={gate === g ? 'default' : 'outline'} onClick={() => setGate(g)}>{g === 'all' ? 'All' : g}</Button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => download('trustllm-history.json', JSON.stringify(runs.map((r) => r.report), null, 2), 'application/json')}>Export all (JSON)</Button>
                {confirmClear ? (
                  <Button size="sm" variant="destructive" onClick={() => { clearHistory(); setRuns([]); setConfirmClear(false) }}>Confirm: delete all</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirmClear(true)}>Clear history</Button>
                )}
              </div>
            </div>

            {shown.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No runs match this filter.</Card>}
            <ul className="space-y-3">
              {shown.map((r) => (
                <li key={r.id}>
                  <Card className="border-border bg-card">
                    <div className="flex flex-wrap items-center gap-3 p-4">
                      <button type="button" className="min-w-0 flex-1 text-left" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
                        <div className="truncate text-sm font-medium text-foreground">{r.report.results[0]?.prompt ?? 'Evaluation'}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.savedAt).toLocaleString()} · {r.report.results.length} result{r.report.results.length === 1 ? '' : 's'} · {r.report.recommendation?.headline}
                        </div>
                      </button>
                      <ModeBadge mode={r.report.mode} />
                      <DecisionBadge decision={r.report.summary.gate} />
                      <Button size="icon" variant="ghost" aria-label="Delete this run" onClick={() => setRuns(deleteRun(r.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {open === r.id && (
                      <div className="space-y-4 border-t border-border p-4">
                        <ExportButtons report={r.report} />
                        <div className="grid gap-4 md:grid-cols-2">{r.report.results.map((x, i) => <ResultCard key={i} r={x} />)}</div>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
