'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Trash2, RotateCcw, Download, Upload } from 'lucide-react'
import { PACKS } from '@/lib/core/packs'
import { DEFAULT_RULES, JUDGE_TYPES, RulesSchema, parseRules, ruleName, rulesToYaml, type Rule } from '@/lib/core/guardrails'
import { loadRules, resetRules, saveRules, download } from '@/lib/client/storage'

type NewKind = { type: Rule['type']; label: string; help: string; value?: 'number' | 'text' | 'none'; def?: string }

const KINDS: NewKind[] = [
  { type: 'min_grounding', label: 'Grounding at least (%)', help: 'Share of claims the source text supports.', value: 'number', def: '80' },
  { type: 'max_hallucination_risk', label: 'Unsupported claims at most (%)', help: 'Share of claims the source does not support.', value: 'number', def: '15' },
  { type: 'max_toxicity', label: 'Toxicity at most (0 none, 1 mild, 2 clear, 3 severe)', help: 'Insults, hate, threats.', value: 'number', def: '0' },
  { type: 'min_consistency', label: 'Consistency at least (%)', help: 'Repeated answers keep the same facts.', value: 'number', def: '70' },
  { type: 'no_pii', label: 'No personal data', help: 'Emails, phone numbers, SSNs, card numbers.', value: 'none' },
  { type: 'no_secrets', label: 'No API keys or private keys', help: 'Common key and token formats.', value: 'none' },
  { type: 'has_citations', label: 'Must cite a source', help: 'A [1] marker, link or "source:" line.', value: 'none' },
  { type: 'valid_json', label: 'Answer must be valid JSON', help: 'For structured outputs.', value: 'none' },
  { type: 'max_words', label: 'At most N words', help: 'Length cap.', value: 'number', def: '150' },
  { type: 'min_words', label: 'At least N words', help: 'Completeness floor.', value: 'number', def: '10' },
  { type: 'contains', label: 'Must contain text', help: 'For example a required disclaimer.', value: 'text' },
  { type: 'not_contains', label: 'Must not contain text', help: 'For example a banned phrase.', value: 'text' },
]

export default function GuardrailsPage() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES)
  const [ready, setReady] = useState(false)
  const [kind, setKind] = useState<NewKind>(KINDS[0])
  const [val, setVal] = useState(KINDS[0].def ?? '')
  const [yaml, setYaml] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setRules(loadRules())
    setReady(true)
  }, [])

  const commit = (next: Rule[]) => {
    setRules(next)
    saveRules(next)
    setMsg(null)
  }

  const add = () => {
    const raw: Record<string, unknown> = { type: kind.type, blocking: true }
    if (kind.value === 'number') raw.value = Number(val)
    if (kind.value === 'text') raw.value = val
    const parsed = RulesSchema.element.safeParse(raw)
    if (!parsed.success) return setMsg({ ok: false, text: parsed.error.issues.map((i) => i.message).join('; ') || 'That value is not valid for this rule.' })
    commit([...rules, parsed.data])
    setMsg({ ok: true, text: `Added: ${ruleName(parsed.data)}.` })
  }

  const importYaml = () => {
    try {
      const next = parseRules(yaml)
      if (next.length === 0) throw new Error('No rules found. Expected a "guardrails:" list.')
      commit(next)
      setMsg({ ok: true, text: `Imported ${next.length} rules.` })
    } catch (e) {
      setMsg({ ok: false, text: `Could not import: ${e instanceof Error ? e.message.slice(0, 300) : 'invalid file'}` })
    }
  }

  return (
    <AppShell title="Guardrails" description="These written rules decide PASS or FAIL. A broken blocking rule fails the gate; a non-blocking rule only warns. Saved in this browser and used by Evaluate. Export as YAML to enforce the same rules in CI.">

        <section aria-labelledby="packs-h" className="space-y-3">
          <h2 id="packs-h" className="font-semibold text-foreground">Start from a pack</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PACKS.map((p) => (
              <Card key={p.id} className="flex flex-col justify-between gap-3 border-border bg-card p-4 shadow-card">
                <div>
                  <h3 className="font-medium text-foreground">{p.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.audience}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{p.description} {p.rules.length} rules.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { commit(p.rules); setMsg({ ok: true, text: `Loaded the "${p.name}" pack (${p.rules.length} rules). Edit anything below.` }) }}>Use this pack</Button>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Packs are starting points with defaults chosen by the author, not calibrated thresholds. Check them against your own examples.</p>
        </section>

        <h2 className="font-semibold text-foreground">Active rules</h2>
        <Card className="divide-y divide-border border-border bg-card" aria-label="Active rules">
          {!ready ? (
            <div className="p-6 text-sm text-muted-foreground">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No rules: every answer would pass. Add a rule below or reset to the defaults.</div>
          ) : (
            rules.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">{ruleName(r)}</div>
                  <div className="text-xs text-muted-foreground">{JUDGE_TYPES.includes(r.type) ? 'Scored from the answer: LLM judge in live mode, word rules in demo' : 'Exact check on the text, same result every time'}</div>
                </div>
                {'value' in r && typeof r.value === 'number' && (
                  <Input
                    aria-label={`Value for ${ruleName(r)}`}
                    type="number"
                    className="w-24"
                    value={r.value}
                    onChange={(e) => {
                      const next = rules.map((x, j) => (j === i ? { ...x, value: Number(e.target.value), name: undefined } : x))
                      const ok = RulesSchema.safeParse(next)
                      if (ok.success) commit(ok.data)
                    }}
                  />
                )}
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={r.blocking} onChange={(e) => commit(rules.map((x, j) => (j === i ? { ...x, blocking: e.target.checked } : x)))} />
                  Blocking
                </label>
                <Button size="icon" variant="ghost" aria-label={`Delete rule ${ruleName(r)}`} onClick={() => commit(rules.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </Card>

        <Card className="space-y-3 border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">Add a rule</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="kind">Rule</Label>
              <select
                id="kind"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={kind.type}
                onChange={(e) => {
                  const k = KINDS.find((x) => x.type === e.target.value) ?? KINDS[0]
                  setKind(k)
                  setVal(k.def ?? '')
                }}
              >
                {KINDS.map((k) => <option key={k.type} value={k.type}>{k.label}</option>)}
              </select>
            </div>
            {kind.value !== 'none' && (
              <div className="space-y-1.5">
                <Label htmlFor="val">{kind.value === 'number' ? 'Value' : 'Text'}</Label>
                <Input id="val" type={kind.value === 'number' ? 'number' : 'text'} value={val} onChange={(e) => setVal(e.target.value)} className="w-40" />
              </div>
            )}
            <Button onClick={add}>Add rule</Button>
          </div>
          <p className="text-xs text-muted-foreground">{kind.help}</p>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => { commit(resetRules()); setMsg({ ok: true, text: 'Reset to the default rules.' }) }}>
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => download('guardrails.yaml', rulesToYaml(rules), 'text/yaml')}>
            <Download className="h-4 w-4" /> Export YAML for CI
          </Button>
        </div>

        <Card className="space-y-3 border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">Import rules</h2>
          <Label htmlFor="yaml" className="sr-only">Paste YAML or JSON rules</Label>
          <Textarea id="yaml" rows={6} value={yaml} onChange={(e) => setYaml(e.target.value)} placeholder={'guardrails:\n  - { type: no_pii }\n  - { type: min_grounding, value: 85 }'} className="font-mono text-xs" />
          <Button variant="outline" className="gap-2" onClick={importYaml} disabled={!yaml.trim()}><Upload className="h-4 w-4" /> Import</Button>
        </Card>

        {msg && <div role={msg.ok ? 'status' : 'alert'} className={`rounded-md border p-3 text-sm text-foreground ${msg.ok ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft'}`}>{msg.text}</div>}
    </AppShell>
  )
}
