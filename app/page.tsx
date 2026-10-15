import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ResultCard } from '@/components/result-card'
import { ArrowRight, FileText, ListChecks, ShieldCheck, Terminal } from 'lucide-react'
import { evaluate } from '@/lib/core/evaluate'
import { SCENARIOS } from '@/lib/scenarios'

const REPO = 'https://github.com/Professional50coder/trustllm'

const FAQ = [
  ['Do I need an API key to try it?', 'No. Demo mode runs offline with deterministic stand-ins and simple word-matching rules. It is clearly labelled and is not a measurement of any real model. For real scoring, add your own key in Live mode.'],
  ['What happens to my API key?', 'It stays in your browser tab\'s memory, is sent with your request to the provider through the server, and is never stored, logged, saved in history or put in an export. In the CLI it is read from an environment variable.'],
  ['How are answers scored in live mode?', 'An LLM judge follows a written rubric: it splits the answer into claims, checks each against your source text, rates toxicity on a 4-step scale, and compares extra samples for consistency. Exact rules such as personal-data and length checks do not use a model at all.'],
  ['Can I trust the scores?', 'Treat them as a strong second opinion, not ground truth. Judges can be wrong and favour their own model family. The repository publishes how well the offline scorer agrees with labelled examples, including the weak spots.'],
  ['How is this different from promptfoo or DeepEval?', 'Those are broad evaluation frameworks. TrustLLM is a small release gate: written rules, one decision with reasons, a CLI exit code for CI, and a browser view for people who do not write code. See the comparison in the repo.'],
  ['Is it free?', 'The code is MIT licensed. You pay only your model provider for live runs.'],
] as const

export default async function Home() {
  const scenario = SCENARIOS[0]
  const example = await evaluate([{ id: 'refund-policy', prompt: scenario.prompt, context: scenario.context }], {
    mode: 'demo',
    models: [{ kind: 'demo', model: 'demo-careful' }, { kind: 'demo', model: 'demo-sloppy' }],
    samples: 3,
    now: () => new Date('2026-01-01T00:00:00Z'),
  })

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main">
        <section className="border-b border-border">
          <div className="container mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <p className="mb-3 text-sm font-medium text-primary">A release gate for LLM answers</p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Know whether an AI answer is safe to ship, before your users see it.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
              Write the rules an answer must meet. TrustLLM checks each answer against your source text and returns PASS or FAIL, with the reasons and a suggested fix. Use it in the browser, or fail a CI build from the command line.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">Try it now, no key needed <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="/docs"><Button size="lg" variant="outline">Read the docs</Button></Link>
            </div>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="how">
          <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="how" className="mb-10 text-center text-3xl font-bold text-foreground">How it works</h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {[
                [FileText, '1. Give it a question and a source', 'Paste the policy, document or retrieved passage the answer must stick to. Choose models to answer it, or paste an answer you already have.'],
                [ListChecks, '2. Set your guardrails', 'Pick written rules: no personal data, nothing unsupported by the source, no toxic language, required citations, length. Mark each as blocking or warning.'],
                [ShieldCheck, '3. Get a decision you can act on', 'PASS or FAIL per answer with plain-language reasons, the claims to review, a suggested fix, and an export for the release ticket.'],
              ].map(([Icon, title, body], i) => {
                const I = Icon as typeof FileText
                return (
                  <li key={i}>
                    <Card className="h-full space-y-3 border-border bg-card p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><I className="h-5 w-5 text-primary" /></div>
                      <h3 className="font-semibold text-card-foreground">{title as string}</h3>
                      <p className="text-sm text-muted-foreground">{body as string}</p>
                    </Card>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        <section className="border-b border-border bg-muted/20" aria-labelledby="example">
          <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="example" className="mb-2 text-center text-3xl font-bold text-foreground">A real report, not a mock-up</h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground">
              Generated by the actual engine in demo mode while this page was built. Question: &ldquo;{scenario.prompt}&rdquo; Same source text, two stand-in models. The second one invents a statistic.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {example.results.map((r, i) => <ResultCard key={i} r={r} />)}
            </div>
            <p className="mt-4 text-center text-sm text-foreground"><strong>{example.recommendation.headline}.</strong> {example.recommendation.detail}</p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="who">
          <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="who" className="mb-8 text-center text-3xl font-bold text-foreground">Who it is for</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                ['Developers shipping an LLM feature', 'Change a prompt or swap a model and find out in CI whether answers broke your rules.'],
                ['Product and QA reviewers', 'Open the browser app, see a PASS or FAIL with reasons, and export it. No code needed.'],
                ['Risk and compliance reviewers', 'Keep the written rules, the scores and the dates for every run as an audit trail.'],
              ].map(([t, b]) => (
                <Card key={t} className="border-border bg-card p-6"><h3 className="mb-2 font-semibold text-card-foreground">{t}</h3><p className="text-sm text-muted-foreground">{b}</p></Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-muted/20" aria-labelledby="features">
          <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="features" className="mb-8 text-center text-3xl font-bold text-foreground">What it does, and does not</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-semibold text-foreground">Does</h3>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Exact checks that never change between runs: personal data, secrets, length, required or banned text, JSON validity, citations.</li>
                  <li>Judge-based scoring in live mode for grounding, unsupported claims, toxicity and consistency (repeated sampling).</li>
                  <li>Works with OpenAI, Anthropic and OpenAI-compatible providers using your own key.</li>
                  <li>Side-by-side comparison of up to four models, exports as JSON, Markdown and CSV.</li>
                  <li>A command-line tool and GitHub Action whose exit code fails the build.</li>
                  <li>Local history in your browser. No account, no telemetry.</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 font-semibold text-foreground">Does not</h3>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Prove an answer is true. It checks claims against the source you supply, not against the world.</li>
                  <li>Replace human review for high-stakes decisions.</li>
                  <li>Red-team your app, trace production traffic or filter outputs at runtime.</li>
                  <li>Offer calibrated scores: thresholds are yours to tune. Measured agreement with labelled examples is published, with limits.</li>
                  <li>Store anything on a server.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="ci">
          <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <h2 id="ci" className="mb-2 flex items-center justify-center gap-2 text-center text-3xl font-bold text-foreground"><Terminal className="h-6 w-6" /> Fail the build, not the launch</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">Export your rules and a case from the app, commit the file, and add one step to your workflow.</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-foreground"><code>{`# .github/workflows/llm-gate.yml
- uses: actions/checkout@v4
- uses: Professional50coder/trustllm@main
  with:
    config: trustllm.yaml
  env:
    OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}   # live mode only`}</code></pre>
            <p className="mt-3 text-center text-xs text-muted-foreground">Exit code 0 means the gate passed, 1 means it failed, 2 means a configuration or provider error.</p>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="faq">
          <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 id="faq" className="mb-8 text-center text-3xl font-bold text-foreground">Questions</h2>
            <div className="divide-y divide-border rounded-lg border border-border">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group p-4">
                  <summary className="cursor-pointer font-medium text-foreground">{q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="container mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-foreground">Run your first check in under a minute</h2>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard"><Button size="lg" className="gap-2">Open the app <ArrowRight className="h-4 w-4" /></Button></Link>
              <a href={REPO}><Button size="lg" variant="outline">View on GitHub</Button></a>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="container mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>TrustLLM, MIT licensed</span>
          <nav className="flex gap-4" aria-label="Footer">
            <Link href="/docs" className="hover:text-foreground">Docs</Link>
            <a href={REPO} className="hover:text-foreground">GitHub</a>
            <a href={`${REPO}/blob/main/docs/market-research.md`} className="hover:text-foreground">Comparison</a>
            <a href={`${REPO}/blob/main/docs/evaluation.md`} className="hover:text-foreground">Evaluation results</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
