'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { ResultCard, ModeBadge } from '@/components/result-card'
import { ExportButtons } from '@/components/export-buttons'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, ShieldCheck, ShieldAlert, FileDown, Lock, Info } from 'lucide-react'
import { SCENARIOS } from '@/lib/scenarios'
import { DEMO_MODELS } from '@/lib/core/demo'
import { OPENAI_COMPATIBLE_PRESETS } from '@/lib/core/providers'
import { DEFAULT_RULES, ruleName, type Rule } from '@/lib/core/guardrails'
import type { Report } from '@/lib/core/types'
import { approveResult, revokeApproval } from '@/lib/core/approval'
import { addRun, updateRun, DEFAULT_PREFS, download, loadPrefs, loadRules, savePrefs, type Prefs } from '@/lib/client/storage'
import { buildConfigYaml } from '@/lib/client/config-export'

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', kind: 'openai' as const, example: 'gpt-4o-mini' },
  { id: 'anthropic', label: 'Anthropic', kind: 'anthropic' as const, example: 'claude-haiku-4-5' },
  ...Object.entries(OPENAI_COMPATIBLE_PRESETS)
    .filter(([id]) => id !== 'openai')
    .map(([id, p]) => ({ id, label: p.label, kind: 'openai' as const, example: 'model-name' })),
]

const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'

export default function EvaluatePage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES)
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [prompt, setPrompt] = useState(SCENARIOS[0].prompt)
  const [context, setContext] = useState(SCENARIOS[0].context)
  const [answerSource, setAnswerSource] = useState<'generate' | 'paste'>('generate')
  const [pasted, setPasted] = useState('')
  const [demoModels, setDemoModels] = useState<string[]>(DEMO_MODELS.map((m) => m.id))
  // The key lives only in this component's state: not in localStorage, not in history, not in exports.
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const resultsRef = useRef<HTMLElement | null>(null)
  const runId = useRef<string | null>(null)

  useEffect(() => {
    if (report) resultsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [report])

  useEffect(() => {
    setPrefs(loadPrefs())
    setRules(loadRules())
  }, [])

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(next)
  }

  const provider = PROVIDERS.find((p) => p.id === prefs.providerId) ?? PROVIDERS[0]
  const liveModels = useMemo(() => prefs.models.split(',').map((m) => m.trim()).filter(Boolean).slice(0, 4), [prefs.models])
  const judgeSameAsCandidate = prefs.mode === 'live' && (!prefs.judgeModel.trim() || liveModels.includes(prefs.judgeModel.trim()))

  const pickScenario = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id)
    setScenarioId(id)
    if (s) {
      setPrompt(s.prompt)
      setContext(s.context)
    }
  }

  const canRun = prompt.trim().length > 0 && (answerSource === 'paste' ? pasted.trim().length > 0 : prefs.mode === 'demo' ? demoModels.length > 0 : liveModels.length > 0 && apiKey.length > 0)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const withKey = (model: string) => ({ provider: provider.kind, preset: provider.id === 'anthropic' || provider.id === 'openai' ? undefined : provider.id, model, apiKey })
      const body = {
        mode: prefs.mode,
        cases: [{ id: scenarioId, prompt, context: context.trim() || undefined, answer: answerSource === 'paste' ? pasted : undefined }],
        models: answerSource === 'paste' ? [] : prefs.mode === 'demo' ? demoModels.map((model) => ({ provider: 'demo', model })) : liveModels.map(withKey),
        judge: prefs.mode === 'live' ? withKey(prefs.judgeModel.trim() || liveModels[0] || 'gpt-4o-mini') : undefined,
        samples: answerSource === 'paste' ? 1 : prefs.samples,
        rules,
      }
      const res = await fetch('/api/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) throw new Error(data?.error ?? `The server returned ${res.status}.`)
      setReport(data as Report)
      runId.current = prefs.saveHistory ? addRun(data as Report)[0]?.id ?? null : null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const changeReport = (next: Report) => {
    setReport(next)
    if (runId.current) updateRun(runId.current, next)
  }

  const downloadConfig = () => {
    const yaml = buildConfigYaml({
      mode: prefs.mode,
      samples: prefs.samples,
      provider: { kind: provider.kind, presetId: provider.id === 'anthropic' ? undefined : provider.id },
      models: prefs.mode === 'demo' ? demoModels : liveModels,
      judgeModel: prefs.judgeModel.trim() || undefined,
      cases: [{ id: scenarioId, prompt, context: context.trim() || undefined, ...(answerSource === 'paste' ? { answer: pasted } : {}) }],
      rules,
    })
    download('trustllm.yaml', yaml, 'text/yaml')
  }

  return (
    <AppShell title="Evaluate" description="Give a question and the source text the answer must stick to. TrustLLM checks each answer against your guardrail rules and returns PASS or FAIL with reasons.">

        {report === null && !loading && (
          <Card className="border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
            <strong>First time here?</strong> An example is already filled in and Demo mode needs no key. Press <strong>Run evaluation</strong> to see one careful model pass and two flawed ones fail.
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="space-y-4 border-border bg-card p-5 lg:col-span-3">
            <div className="space-y-1.5">
              <Label htmlFor="scenario">Example</Label>
              <select id="scenario" className={selectCls} value={scenarioId} onChange={(e) => pickScenario(e.target.value)}>
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
                {!SCENARIOS.some((s) => s.id === scenarioId) && <option value={scenarioId}>Custom</option>}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt">Question or prompt</Label>
              <Textarea id="prompt" rows={2} maxLength={4000} value={prompt} onChange={(e) => { setPrompt(e.target.value); setScenarioId('custom') }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="context">Source text the answer must be based on <span className="text-muted-foreground">(recommended)</span></Label>
              <Textarea id="context" rows={5} maxLength={12000} value={context} onChange={(e) => { setContext(e.target.value); setScenarioId('custom') }} placeholder="Paste the policy, document or retrieved passage. Without it, grounding and unsupported-claim rules are skipped." />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">Where does the answer come from?</legend>
              <div className="flex gap-4 text-sm text-foreground">
                <label className="flex items-center gap-2"><input type="radio" name="src" checked={answerSource === 'generate'} onChange={() => setAnswerSource('generate')} /> Models answer it</label>
                <label className="flex items-center gap-2"><input type="radio" name="src" checked={answerSource === 'paste'} onChange={() => setAnswerSource('paste')} /> I have an answer to check</label>
              </div>
            </fieldset>
            {answerSource === 'paste' && (
              <div className="space-y-1.5">
                <Label htmlFor="pasted">Answer to check</Label>
                <Textarea id="pasted" rows={4} maxLength={8000} value={pasted} onChange={(e) => setPasted(e.target.value)} />
              </div>
            )}
          </Card>

          <Card className="space-y-4 border-border bg-card p-5 lg:col-span-2">
            <div className="flex gap-2" role="group" aria-label="Mode">
              <Button size="sm" variant={prefs.mode === 'demo' ? 'default' : 'outline'} onClick={() => update({ mode: 'demo' })}>Demo (no key)</Button>
              <Button size="sm" variant={prefs.mode === 'live' ? 'default' : 'outline'} onClick={() => update({ mode: 'live' })}>Live (your key)</Button>
            </div>

            {prefs.mode === 'demo' ? (
              <div className="space-y-3">
                <p className="flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3 w-3 shrink-0" />Demo uses deterministic stand-ins for models and simple word-matching rules. No AI model is called. It shows the workflow; it does not measure any real model.</p>
                {answerSource === 'generate' && (
                  <div className="space-y-1.5">
                    <Label>Stand-in models</Label>
                    {DEMO_MODELS.map((m) => (
                      <label key={m.id} className="flex items-start gap-2 text-sm text-foreground">
                        <input type="checkbox" className="mt-1" checked={demoModels.includes(m.id)} onChange={(e) => setDemoModels((cur) => (e.target.checked ? [...cur, m.id] : cur.filter((x) => x !== m.id)))} />
                        <span>{m.label}<span className="block text-xs text-muted-foreground">{m.blurb}</span></span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="provider">Provider</Label>
                  <select id="provider" className={selectCls} value={prefs.providerId} onChange={(e) => update({ providerId: e.target.value, models: PROVIDERS.find((p) => p.id === e.target.value)?.example ?? '' })}>
                    {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="key">API key</Label>
                  <Input id="key" type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your key" />
                  <p className="flex gap-2 text-xs text-muted-foreground"><Lock className="mt-0.5 h-3 w-3 shrink-0" />Kept in this tab&apos;s memory only. Sent with each request to your chosen provider through this server, never stored, logged, saved in history or included in exports. Gone when you close or reload the tab.</p>
                </div>
                {answerSource === 'generate' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="models">Models to compare (comma separated, up to 4)</Label>
                    <Input id="models" value={prefs.models} onChange={(e) => update({ models: e.target.value })} placeholder={provider.example} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="judge">Judge model <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="judge" value={prefs.judgeModel} onChange={(e) => update({ judgeModel: e.target.value })} placeholder={`defaults to ${liveModels[0] ?? 'the first model'}`} />
                  {judgeSameAsCandidate && <p className="text-xs text-warn">The judge is the same model being judged. LLM judges tend to favour their own output. A different judge model gives a fairer score.</p>}
                </div>
              </div>
            )}

            {answerSource === 'generate' && (
              <div className="space-y-1.5">
                <Label htmlFor="samples">Samples per answer: {prefs.samples}</Label>
                <input id="samples" type="range" min={1} max={4} value={prefs.samples} onChange={(e) => update({ samples: Number(e.target.value) })} className="w-full" />
                <p className="text-xs text-muted-foreground">1 skips the consistency check. 2 or more re-asks the model and checks that its facts stay the same.</p>
              </div>
            )}

            <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center justify-between text-foreground"><span className="font-medium">{rules.length} guardrail rules active</span><Link href="/guardrails" className="underline">edit</Link></div>
              <ul className="list-disc space-y-0.5 pl-4">{rules.slice(0, 6).map((r, i) => <li key={i}>{ruleName(r)}{!r.blocking && ' (warning)'}</li>)}</ul>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={prefs.saveHistory} onChange={(e) => update({ saveHistory: e.target.checked })} /> Save results to this browser&apos;s history</label>

            <Button className="w-full gap-2" disabled={!canRun || loading} onClick={run}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {loading ? 'Evaluating...' : 'Run evaluation'}
            </Button>
            {!canRun && !loading && <p className="text-xs text-muted-foreground">{prefs.mode === 'live' && !apiKey ? 'Add your API key to run live.' : 'Fill in the question and choose at least one model or paste an answer.'}</p>}
          </Card>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger-soft p-4 text-sm text-foreground">
            <strong>Could not run the evaluation.</strong> {error}
          </div>
        )}

        {report && (
          <section ref={resultsRef} className="scroll-mt-20 space-y-4" aria-live="polite">
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${report.summary.gate === 'PASS' ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft'}`}>
              <div className="flex items-center gap-3">
                {report.summary.gate === 'PASS' ? <ShieldCheck className="h-6 w-6 text-success" /> : <ShieldAlert className="h-6 w-6 text-danger" />}
                <div>
                  <div className="text-lg font-semibold text-foreground" data-testid="gate">Release gate: {report.summary.gate} <span className="font-normal text-muted-foreground">({report.summary.passed} passed, {report.summary.failed} failed{report.summary.errors > 0 && `, ${report.summary.errors} errors`})</span></div>
                  <div className="text-sm text-foreground" data-testid="recommendation"><strong>{report.recommendation.headline}.</strong> {report.recommendation.detail}</div>
                </div>
              </div>
              <ModeBadge mode={report.mode} />
            </div>
            {report.notes.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{report.results.map((r, i) => <ResultCard key={i} r={r} onApprove={(reason) => changeReport(approveResult(report, i, reason))} onRevoke={() => changeReport(revokeApproval(report, i))} />)}</div>
            <div className="flex flex-wrap items-center gap-3">
              <ExportButtons report={report} />
              <Button size="sm" variant="outline" className="gap-1" onClick={downloadConfig}><FileDown className="h-3 w-3" /> Download trustllm.yaml for CI</Button>
              {prefs.saveHistory && <Link href="/audit-logs"><Badge variant="secondary">Saved to History</Badge></Link>}
            </div>
          </section>
        )}

        {!report && !error && !loading && (
          <Card className="border-dashed border-border p-8 text-center text-sm text-muted-foreground">No results yet. Results appear here with a PASS or FAIL for each answer.</Card>
        )}
    </AppShell>
  )
}
