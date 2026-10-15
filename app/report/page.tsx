'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { ResultCard, ModeBadge } from '@/components/result-card'
import { ExportButtons } from '@/components/export-buttons'
import { Button } from '@/components/ui/button'
import { decodeReport } from '@/lib/client/share'
import type { Report } from '@/lib/core/types'

export default function SharedReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = window.location.hash.slice(1)
    if (!token) {
      setError('This page shows a report from a share link. Open a link made with "Copy share link" in the app.')
      return
    }
    decodeReport(token).then(setReport).catch((e) => setError(e instanceof Error ? e.message : 'Could not read this link.'))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Shared report</h1>
          <p className="mt-1 text-sm text-muted-foreground">The full report is inside the link itself. It was not uploaded anywhere and this page stores nothing.</p>
        </div>
        {error && (
          <div role="alert" className="rounded-lg border border-warn/40 bg-warn-soft p-4 text-sm text-foreground">
            {error} <Link href="/dashboard" className="underline">Open the app</Link>
          </div>
        )}
        {!report && !error && <p className="text-sm text-muted-foreground">Reading report...</p>}
        {report && (
          <section className="space-y-4">
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${report.summary.gate === 'PASS' ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft'}`}>
              <div className="flex items-center gap-3">
                {report.summary.gate === 'PASS' ? <ShieldCheck className="h-6 w-6 text-success" /> : <ShieldAlert className="h-6 w-6 text-danger" />}
                <div>
                  <div className="text-lg font-semibold text-foreground">Release gate: {report.summary.gate}</div>
                  <div className="text-sm text-foreground"><strong>{report.recommendation?.headline}.</strong> {report.recommendation?.detail}</div>
                </div>
              </div>
              <ModeBadge mode={report.mode} />
            </div>
            <p className="text-xs text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()} · judge: {report.judge}</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{report.results.map((r, i) => <ResultCard key={i} r={r} />)}</div>
            <div className="flex flex-wrap items-center gap-3"><ExportButtons report={report} /><Link href="/dashboard"><Button size="sm">Run your own evaluation</Button></Link></div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
