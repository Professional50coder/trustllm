import Link from 'next/link'
import { ArrowRight, FileText, ListChecks, ShieldCheck, Github } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { FeatureTabs } from '@/components/feature-tabs'
import { ResultCard } from '@/components/result-card'
import { Button } from '@/components/ui/button'
import { evaluate } from '@/lib/core/evaluate'
import { SCENARIOS } from '@/lib/scenarios'

const REPO = 'https://github.com/Professional50coder/trustllm'

const PROOF = [
  ['66.3%', 'accuracy of the offline demo scorer on 80 public HaluEval answers (95% CI 55-76%). Published with its weak spots.', `${REPO}/blob/main/docs/evaluation.md`],
  ['13', 'rule types, 7 of them exact checks that never change between runs.', '/docs#rules'],
  ['MIT', 'licensed, no account, no telemetry. Run it yourself for confidential text.', `${REPO}/blob/main/LICENSE`],
  ['CI', 'type check, lint, tests, production build and a Docker smoke test on every commit.', `${REPO}/actions`],
] as const

const FAQ = [
  ['Do I need an API key to try it?', 'No. Demo mode runs offline with deterministic stand-ins and simple word-matching rules. It is labelled everywhere and is not a measurement of any real model. For real scoring, add your own key in Live mode.'],
  ['What happens to my API key?', 'It stays in your browser tab\'s memory, travels only with the evaluation request, and is never stored, logged, saved in history or put in an export. In the CLI it is read from an environment variable.'],
  ['Will it change what my model says?', 'No. TrustLLM only reads answers and judges them. It never sits in your production path.'],
  ['How are answers scored in live mode?', 'An LLM judge follows a written rubric: it splits the answer into claims, checks each against your source text, rates toxicity on a 4-step scale, and compares extra samples for consistency. Exact rules such as personal-data and length checks use no model at all.'],
  ['Can I trust the scores?', 'Treat them as a strong second opinion, not ground truth. Judges can be wrong and favour their own model family. The repository publishes how the offline scorer agrees with labelled examples, including where it fails. Judge agreement is not yet measured; the command to measure it is documented.'],
  ['How is this different from promptfoo or DeepEval?', 'Those are broad evaluation toolkits for engineers. TrustLLM is a small release gate: written rules, one decision with reasons, a CLI exit code for CI, and a browser view for people who do not write code. The comparison, with sources, is in the repository.'],
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
      <SiteNav />
      <main id="main">
        {/* Hero */}
        <section className="bg-glow relative overflow-hidden border-b border-border">
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
            <div className="mx-auto max-w-3xl animate-fade-up text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-card">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Open source, MIT, no account needed
              </span>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
                Know if an AI answer is safe to <span className="accent-serif text-primary">ship</span>, before your users see it.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
                Write the rules an answer must meet. TrustLLM checks each answer against your source text and returns PASS or FAIL, with the reasons and a suggested fix. In the browser, or as a failing CI step.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/dashboard"><Button size="lg" className="gap-2 rounded-full px-6">Run a demo, no key needed <ArrowRight className="h-4 w-4" /></Button></Link>
                <a href={REPO}><Button size="lg" variant="outline" className="gap-2 rounded-full px-6"><Github className="h-4 w-4" /> Star on GitHub</Button></a>
              </div>
            </div>

            {/* Product window */}
            <div className="mx-auto mt-14 max-w-5xl animate-fade-up rounded-2xl border border-border bg-card shadow-float [animation-delay:120ms]">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/60" /><span className="h-2.5 w-2.5 rounded-full bg-warn/60" /><span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 truncate rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">trustllm / evaluate / refund-policy</span>
              </div>
              <div className="space-y-4 bg-muted/30 p-4 sm:p-6">
                <div className="rounded-xl border border-border bg-card p-4 text-sm">
                  <div className="text-xs text-muted-foreground">Question</div>
                  <div className="font-medium text-foreground">{scenario.prompt}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Source text</div>
                  <div className="text-muted-foreground">{scenario.context}</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">{example.results.map((r, i) => <ResultCard key={i} r={r} />)}</div>
                <p className="text-center text-sm text-foreground"><strong>{example.recommendation.headline}.</strong> {example.recommendation.detail}</p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">A real report from the actual engine, generated while this page was built, in labelled demo mode.</p>
          </div>
        </section>

        {/* Proof */}
        <section className="border-b border-border" aria-label="Verifiable facts">
          <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {PROOF.map(([big, text, href]) => (
              <a key={big} href={href} className="group bg-background p-6 transition-colors hover:bg-secondary/50">
                <div className="text-3xl font-semibold tracking-tight text-foreground">{big}</div>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Contrast */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="why">
          <h2 id="why" className="mx-auto max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Most tools show you what went wrong <span className="accent-serif text-primary">after</span> release.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-secondary/60 p-8">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Eyeballing and dashboards</div>
              <p className="mt-3 text-2xl font-semibold text-foreground">Paste a few prompts, skim the answers, ship, then read the complaints.</p>
            </div>
            <div className="rounded-3xl bg-primary p-8 text-primary-foreground">
              <div className="text-xs font-medium uppercase tracking-wide opacity-80">TrustLLM</div>
              <p className="mt-3 text-2xl font-semibold">Write the bar once. Every answer clears it or comes back with the reason.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-border bg-secondary/40" aria-labelledby="how-h">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="how-h" className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Three steps, about a minute</h2>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {([
                [FileText, 'Give it a question and a source', 'Paste the policy, document or retrieved passage the answer must stick to. Let models answer it, or paste an answer you already have.'],
                [ListChecks, 'Set your guardrails', 'No personal data, nothing the source does not support, no toxic language, required citations, length. Mark each as blocking or warning.'],
                [ShieldCheck, 'Get a decision you can act on', 'PASS or FAIL per answer, the reasons, the claims to review, a suggested fix, and an export for the release ticket.'],
              ] as const).map(([Icon, title, body], i) => (
                <li key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
                    <span className="font-mono text-xs text-muted-foreground">STEP 0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="feat-h">
          <h2 id="feat-h" className="mx-auto max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Four things it does, <span className="accent-serif text-primary">and nothing more</span>.
          </h2>
          <div className="mt-12"><FeatureTabs /></div>
        </section>

        {/* Who + not */}
        <section className="border-y border-border bg-secondary/40" aria-labelledby="who">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="who" className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Who it is for</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                ['Developers shipping an LLM feature', 'Change a prompt or swap a model and find out in CI whether answers broke your rules.'],
                ['Product and QA reviewers', 'Open the browser app, see PASS or FAIL with reasons, and export it. No code needed.'],
                ['Risk and compliance reviewers', 'Keep the written rules, the scores and the date of every run as an audit trail.'],
              ].map(([t, b]) => (
                <div key={t} className="rounded-2xl border border-border bg-card p-6 shadow-card"><h3 className="font-semibold text-foreground">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{b}</p></div>
              ))}
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-3 font-semibold text-foreground">What it does not do</h3>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  <li>Prove an answer is true. It checks claims against the source you supply.</li>
                  <li>Replace human review for high-stakes decisions.</li>
                  <li>Red-team your app, trace production traffic or filter outputs at runtime.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-3 font-semibold text-foreground">Free, and honest about cost</h3>
                <p className="text-sm text-muted-foreground">The code is MIT licensed and there is no hosted plan. Demo mode costs nothing. In live mode you pay only your model provider, for the answers and the judge calls you choose to run.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 mx-auto max-w-3xl px-4 py-20 sm:px-6" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Questions, answered straight</h2>
          <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-start gap-4 font-medium text-foreground">
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  <span className="flex-1">{q}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 pl-9 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-3xl bg-[hsl(var(--band))] px-6 py-16 text-center text-[hsl(var(--band-foreground))] shadow-float">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Run your first check in under a minute.</h2>
            <p className="mx-auto mt-3 max-w-xl opacity-80">An example is already filled in. No key, no sign-up.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard"><Button size="lg" variant="secondary" className="gap-2 rounded-full px-6">Open the app <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link href="/docs"><Button size="lg" variant="ghost" className="rounded-full px-6 text-[hsl(var(--band-foreground))] hover:bg-white/10 hover:text-[hsl(var(--band-foreground))]">Read the docs</Button></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
