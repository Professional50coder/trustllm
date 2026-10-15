import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { SIGNAL_HELP } from '@/lib/core/explain'

export const metadata: Metadata = { title: 'Docs', description: 'Get started with TrustLLM: browser, CLI and GitHub Action, what each score means, and how keys are handled.' }

const RULES: [string, string, string][] = [
  ['no_pii', 'Exact', 'Emails, phone numbers, US SSNs, card numbers (Luhn checked).'],
  ['no_secrets', 'Exact', 'OpenAI-style keys, GitHub tokens, AWS keys, private key blocks, Slack tokens.'],
  ['has_citations', 'Exact', 'A [1] marker, a link, "(Author, 2020)" or a "source:" line.'],
  ['valid_json', 'Exact', 'The answer parses as JSON (code fences allowed).'],
  ['max_words / min_words', 'Exact', 'Length limits. value is a word count.'],
  ['contains / not_contains', 'Exact', 'Required or banned text. value is the text; ignoreCase defaults to true.'],
  ['regex', 'Exact', 'pattern, flags, mustMatch (default true).'],
  ['min_grounding', 'Scored', 'Percent of claims supported by the source text. Skipped without a source.'],
  ['max_hallucination_risk', 'Scored', 'Percent of claims unsupported or contradicted. Skipped without a source.'],
  ['max_toxicity', 'Scored', '0 none, 1 mild, 2 clear, 3 severe.'],
  ['min_consistency', 'Scored', 'Agreement with extra samples. Needs a model-generated answer and 2 or more samples.'],
]

const H2 = 'mb-3 mt-12 text-2xl font-bold text-foreground scroll-mt-20'
const P = 'text-sm leading-relaxed text-muted-foreground'
const CODE = 'overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-foreground'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main id="main" className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
        <p className={`${P} mt-2`}>On this page: <a className="underline" href="#browser">browser</a>, <a className="underline" href="#cli">command line</a>, <a className="underline" href="#action">GitHub Action</a>, <a className="underline" href="#scores">what the scores mean</a>, <a className="underline" href="#rules">rules</a>, <a className="underline" href="#mcp">MCP</a>, <a className="underline" href="#privacy">privacy</a>, <a className="underline" href="#limits">limits</a>.</p>

        <h2 id="browser" className={H2}>First run in the browser</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Open <Link href="/dashboard" className="underline">Evaluate</Link>. An example question and source text are already filled in and Demo mode is on.</li>
          <li>Press <strong className="text-foreground">Run evaluation</strong>. You get one PASS and two FAILs with reasons. Demo results are labelled because no AI model is called.</li>
          <li>Open a card, click a score to read what it means, and read the suggested fixes.</li>
          <li>Switch to <strong className="text-foreground">Live</strong>, choose a provider, paste your key, list the models to compare and run again. Use a judge model from a different family than the candidate when you can.</li>
          <li>Edit the rules under <Link href="/guardrails" className="underline">Guardrails</Link>, export results, and download a <code>trustllm.yaml</code> to run the same check in CI.</li>
        </ol>

        <h2 id="cli" className="mb-3 mt-12 text-2xl font-bold text-foreground scroll-mt-20">Command line</h2>
        <p className={P}>Needs Node 20 or newer. No install step: the repository ships a bundled CLI.</p>
        <pre className={`${CODE} mt-3`}><code>{`git clone https://github.com/Professional50coder/trustllm && cd trustllm
node dist/cli.cjs init trustllm.yaml      # writes an example config
node dist/cli.cjs run trustllm.yaml --json report.json --md report.md
echo $?                                    # 0 pass, 1 gate failed, 2 error

# live mode: keys come from the environment, never from the file
OPENAI_API_KEY=... node dist/cli.cjs run trustllm.yaml`}</code></pre>

        <h2 id="action" className={H2}>GitHub Action</h2>
        <pre className={CODE}><code>{`- uses: actions/checkout@v4
- uses: Professional50coder/trustllm@main
  with:
    config: trustllm.yaml
  env:
    OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}`}</code></pre>
        <p className={`${P} mt-2`}>The job fails when the gate fails and a Markdown report is written to the job summary.</p>

        <p className={`${P} mt-2`}>Add <code>comment: true</code> (and <code>permissions: pull-requests: write</code> on the job) to post the report on the pull request.</p>

        <h2 id="mcp" className={H2}>MCP server and agents</h2>
        <p className={P}>Agents can call the gate as a tool. Start the server with <code>node dist/cli.cjs mcp</code> (stdio). Tools: <code>evaluate</code>, <code>list_packs</code>, <code>list_rule_types</code>. A summary for agents is at <a className="underline" href="/llms.txt">/llms.txt</a>. The server speaks a minimal subset of the protocol and has been tested at the message level, not with every client.</p>

        <h2 id="packs" className={H2}>Packs, approvals and sharing</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Packs</strong>: on <Link href="/guardrails" className="underline">Guardrails</Link>, start from support bot, strict RAG, structured output, safety first, or warnings-only. In the CLI: <code>init --pack support-bot</code>.</li>
          <li><strong className="text-foreground">Approve anyway</strong>: on a failed answer, record a human override with a reason. The failure stays in the report; the gate outcome becomes &ldquo;released with human approval&rdquo;.</li>
          <li><strong className="text-foreground">Copy share link</strong>: the whole report is packed into the link after the <code>#</code>, which browsers never send to a server. Anyone with the link sees the report; do not share it for confidential content.</li>
        </ul>

        <h2 id="scores" className={H2}>What the scores mean</h2>
        <dl className="space-y-4">
          {Object.values(SIGNAL_HELP).map((h) => (
            <div key={h.title}>
              <dt className="font-medium text-foreground">{h.title}</dt>
              <dd className={P}>{h.what} {h.high} <em>{h.caveat}</em></dd>
            </div>
          ))}
        </dl>

        <h2 id="rules" className={H2}>Guardrail rules</h2>
        <p className={P}>Exact rules give the same answer every time. Scored rules depend on the judge, so keep them as warnings (<code>blocking: false</code>) until you trust them on your own data. A rule that cannot run (for example grounding without a source text) is shown as skipped and never counts as a pass.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-foreground"><tr><th className="p-2">type</th><th className="p-2">kind</th><th className="p-2">meaning</th></tr></thead>
            <tbody className="text-muted-foreground">{RULES.map(([t, k, m]) => <tr key={t} className="border-t border-border"><td className="p-2 font-mono text-xs">{t}</td><td className="p-2">{k}</td><td className="p-2">{m}</td></tr>)}</tbody>
          </table>
        </div>
        <pre className={`${CODE} mt-3`}><code>{`guardrails:
  - { id: no-pii, type: no_pii }
  - { id: grounded, type: min_grounding, value: 80 }
  - { id: consistent, type: min_consistency, value: 70, blocking: false }`}</code></pre>

        <h2 id="privacy" className={H2}>Privacy and keys</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Your key lives in the page&apos;s memory and is sent only with the evaluation request. It is never written to browser storage, history, exports or logs, and it disappears on reload.</li>
          <li>The server forwards your prompt, source text and key to the provider you chose and returns the result. It stores nothing and has no database.</li>
          <li>The server only connects to known provider endpoints (OpenAI, Anthropic, OpenRouter, Groq, Together, Mistral, DeepSeek). Custom endpoints are available in the CLI only.</li>
          <li>Rules, saved runs and preferences are kept in this browser&apos;s local storage. Clear them from History.</li>
          <li>Do not paste confidential text into a deployment you do not control. Run the app yourself for sensitive data.</li>
        </ul>

        <h2 id="limits" className={H2}>Limits</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Grounding is relative to the source you supply, not to the truth.</li>
          <li>Demo scoring compares words and numbers. It misses paraphrase and implicit toxicity.</li>
          <li>LLM judges can be wrong, favour long answers and favour their own model family.</li>
          <li>The web app limits one request to 5 cases, 4 models and 60 model calls.</li>
          <li>Measured agreement with labelled examples and its limits are in <a className="underline" href="https://github.com/Professional50coder/trustllm/blob/main/docs/evaluation.md">docs/evaluation.md</a>.</li>
        </ul>
      </main>
      <SiteFooter />
    </div>
  )
}
