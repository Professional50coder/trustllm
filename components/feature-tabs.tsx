'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

const ITEMS = [
  { tag: 'Written rules', title: 'Your bar, in writing.', body: 'Pick rules from a short list, set the numbers, mark each as blocking or warning. The same file runs in the browser and in CI.' },
  { tag: 'Exact first', title: 'Exact checks never wobble.', body: 'Personal data, secrets, length, banned or required text, JSON validity and citations are plain code. Same answer, same result, every run. Model-judged scores sit beside them, clearly labelled.' },
  { tag: 'Reasons and fixes', title: 'Every FAIL says why.', body: 'You get the rule that broke, the claim that was not in your source, and a suggested change to the prompt or pipeline. Rules that could not run are shown as skipped, never as a silent pass.' },
  { tag: 'CI gate', title: 'Fail the build, not the launch.', body: 'The CLI and GitHub Action exit with 0 pass, 1 gate failed, 2 error, and write a Markdown report to the job summary.' },
]

function Visual({ i }: { i: number }) {
  if (i === 0)
    return (
      <ul className="space-y-2 text-sm">
        {[['No personal data', 'blocking'], ['Grounding at least 80%', 'blocking'], ['Unsupported claims at most 15%', 'blocking'], ['Repeated samples agree', 'warning']].map(([n, k]) => (
          <li key={n} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-foreground">
            <span>{n}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${k === 'blocking' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>{k}</span>
          </li>
        ))}
      </ul>
    )
  if (i === 1)
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Exact</div>
          <div className="space-y-1.5 text-foreground"><div>Email, phone, card</div><div>API keys</div><div>Length, JSON</div><div>Required text</div></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Judged</div>
          <div className="space-y-1.5 text-foreground"><div>Grounding</div><div>Unsupported claims</div><div>Toxicity</div><div>Consistency</div></div>
        </div>
      </div>
    )
  if (i === 2)
    return (
      <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
        <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-danger" /> <strong>Unsupported claims at most 15%</strong></div>
        <p className="text-muted-foreground">25% of claims are not supported by the source.</p>
        <div className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">Fix: tell the model to answer only from the source and to say &ldquo;not stated&rdquo; otherwise.</div>
        <div className="flex items-center gap-2 text-muted-foreground"><MinusCircle className="h-4 w-4" /> Consistency skipped: no extra samples</div>
        <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> No personal data</div>
      </div>
    )
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-foreground p-4 text-xs leading-relaxed text-background"><code>{`$ node dist/cli.cjs run trustllm.yaml
PASS  refund / model-a
FAIL  refund / model-b
      FAIL Unsupported claims at most 15%:
      25% of claims are unsupported
Gate: FAIL (1 passed, 1 failed, 0 errors)
$ echo $?
1`}</code></pre>
    )
}

export function FeatureTabs() {
  const [active, setActive] = useState(0)
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <div className="space-y-3" role="tablist" aria-label="Features">
        {ITEMS.map((it, i) => (
          <button
            key={it.tag}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`w-full rounded-2xl border p-5 text-left transition-all ${active === i ? 'border-primary/40 bg-card shadow-card' : 'border-border bg-transparent hover:bg-card/60'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs ${active === i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>0{i + 1}</span>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{it.tag}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{it.title}</h3>
            {active === i && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.body}</p>}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="rounded-3xl border border-border bg-secondary/50 p-5 shadow-card sm:p-7" key={active}>
        <div className="animate-fade-up"><Visual i={active} /></div>
      </div>
    </div>
  )
}
