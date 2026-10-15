# TrustLLM

**A release gate for LLM answers.** Write the rules an answer must meet, check answers against your own source text, and get PASS or FAIL with plain-language reasons and suggested fixes. Use it in the browser, or fail a CI build from the command line.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6) ![License](https://img.shields.io/badge/license-MIT-green)

**Live: https://trustllm.vercel.app** (demo mode works with no key; live mode takes your own key).

## Why this exists

Teams change a prompt or swap a model, eyeball a few answers and ship. Evaluation frameworks exist (promptfoo, DeepEval, Ragas and others) but they are broad toolkits aimed at engineers. TrustLLM owns one narrow job: **the release decision and the evidence around it**.

- Written guardrails as the contract, each rule giving PASS, FAIL or SKIP with a reason a non-engineer can read.
- Exact, deterministic rules first (personal data, secrets, length, banned or required text, JSON validity, citations). Model-judged rules (grounding, unsupported claims, toxicity, consistency) are available and can be warnings until you trust them.
- A CLI and GitHub Action whose exit code is the gate, and a browser app for reviewers who do not write code.
- No account, no telemetry, no database. Keys are never stored or logged.

Design patterns studied (patterns only, nothing copied): [docs/design-notes.md](./docs/design-notes.md). Agent-readable summary: [`/llms.txt`](./public/llms.txt). Research behind this positioning, with sources: [docs/market-research.md](./docs/market-research.md). How scoring works and why: [docs/methodology.md](./docs/methodology.md). How well it agrees with labels, honestly: [docs/evaluation.md](./docs/evaluation.md).

## Quick start

**In the browser (no key needed).** Open the app, go to **Evaluate**, press **Run evaluation**. Demo mode is clearly labelled: it uses deterministic stand-ins and simple word-matching, and calls no AI model. Switch to **Live**, pick a provider, paste your API key (kept in tab memory only) and run again for real scoring.

**Locally.** Needs Node 20+ and pnpm.

```bash
git clone https://github.com/Professional50coder/trustllm && cd trustllm
pnpm install
pnpm dev                      # http://localhost:3000
```

**CLI (no install step).** The repository ships a bundled CLI.

```bash
node dist/cli.cjs init trustllm.yaml
node dist/cli.cjs run trustllm.yaml --json report.json --md report.md
echo $?                       # 0 gate passed, 1 gate failed, 2 error
OPENAI_API_KEY=... node dist/cli.cjs run trustllm.yaml   # live mode
```

**GitHub Action.**

```yaml
- uses: actions/checkout@v4
- uses: Professional50coder/trustllm@main
  with:
    config: trustllm.yaml
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}   # live mode only
```

Optional: post the report on pull requests with `comment: true` (give the job `permissions: pull-requests: write`).

**MCP server (for agents).** `node dist/cli.cjs mcp` serves the gate over stdio with the tools `evaluate`, `list_packs` and `list_rule_types`. Example client entry: `{ "command": "node", "args": ["dist/cli.cjs", "mcp"] }`. Live mode reads `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` from the server environment.

**Start from a pack.** `node dist/cli.cjs init --pack support-bot` (also `rag-strict`, `structured-output`, `safety-first`, `try-it-lenient`), or pick one on the Guardrails page.

`trustllm.yaml` can be generated from the web app (**Download trustllm.yaml for CI**). Minimal example:

```yaml
mode: live
samples: 3
models:
  - { provider: openai, model: gpt-4o-mini }
judge:
  provider: anthropic          # a different family than the candidate is fairer
  model: claude-haiku-4-5
cases:
  - id: refund-policy
    prompt: How long do customers have to request a refund?
    context: Customers may request a refund within 30 days of purchase.
guardrails:
  - { type: no_pii }
  - { type: min_grounding, value: 80 }
  - { type: max_hallucination_risk, value: 15 }
  - { type: min_consistency, value: 70, blocking: false }
```

## What you get

- **Release gate** per answer: PASS or FAIL, the rules that decided it, and an overall recommendation for the run (ship, fix, or block).
- **Explanations and suggested fixes** derived from the rules that actually failed, plus the claims to review.
- **Six signals** with plain-language help on each: grounding, unsupported claims, consistency, toxicity, expressed confidence, overall.
- **Guardrail packs**: ready-made rule sets (support bot, strict RAG, structured output, safety first, warnings-only) as a starting point.
- **Human approval** on a FAIL, with a required reason, recorded in the report and history. The original failure stays on record.
- **Usage per result**: provider calls, tokens as reported by the provider, and time. No dollar estimates, because prices change.
- **Shareable report links**: the report is compressed into the URL fragment, so nothing is uploaded or stored. Do not share a link for confidential content.
- **Side-by-side comparison** of up to four models on the same question.
- **Exports**: JSON (`trustllm.report/v1`), Markdown, CSV.
- **Local history** in your browser, no server storage.
- **Providers**: OpenAI, Anthropic, and OpenAI-compatible (OpenRouter, Groq, Together, Mistral, DeepSeek presets in the web app; any URL in the CLI).

Rule types: `no_pii`, `no_secrets`, `has_citations`, `valid_json`, `max_words`, `min_words`, `contains`, `not_contains`, `regex`, `min_grounding`, `max_hallucination_risk`, `max_toxicity`, `min_consistency`. See the in-app Docs page.

## Architecture

```
 Browser (Next.js App Router)            CLI / GitHub Action (dist/cli.cjs)
   /  /dashboard  /guardrails  /audit-logs  /docs        trustllm.yaml -> exit code
        |  POST /api/evaluate (zod-validated, size + call budget + rate limit)
        v                                        v
 +--------------------------------------------------------------+
 | lib/core  (pure TypeScript, shared by web, API, CLI, tests)  |
 |  providers.ts  OpenAI-compatible + Anthropic adapters        |
 |  judge.ts      claim-level rubric judge, consistency judge   |
 |  heuristics.ts offline scorer used in demo mode              |
 |  checks.ts     deterministic PII / secret / JSON / citation  |
 |  guardrails.ts rule schema, evaluation, gate decision        |
 |  advice.ts     explanations, fixes, recommendation           |
 |  report.ts     JSON / Markdown / CSV                         |
 +--------------------------------------------------------------+
   Keys: request body only, redacted from errors, never stored.
   Server accepts provider presets only (no free-form URLs).
```

## Privacy and keys

Your key lives in the page's memory and is sent only with the evaluation request, through this server, to the provider you chose. It is not written to browser storage, history, exports, reports or logs. The server stores nothing. The server ignores any server-side provider keys unless `TRUSTLLM_ALLOW_SERVER_KEYS=1` is set. For confidential text, run the app yourself rather than using a shared deployment.

## Verification status

| Item | Status |
|---|---|
| Unit and integration tests (vitest) | `pnpm test`: 60+ tests covering the engine, adapters with a fake fetch, API routes, CLI exit codes, labelled sets |
| Type check, lint, production build | `pnpm typecheck`, `pnpm lint`, `pnpm build`; all run in GitHub Actions on every push |
| Docker image | built and called in CI (`docker` job); not run locally by the author |
| GitHub Action | exercised in CI against `examples/trustllm.yaml` (`action` job). The PR-comment path (`comment: true`) has **not** been run against a real pull request |
| MCP server | tested at the JSON-RPC level and by piping messages to the bundled CLI. **Not tested with a real MCP client** |
| Provider adapters against the real APIs | **Not exercised with a real key during development.** They are tested against scripted fake responses that follow the documented request and response shapes. First real-key run is yours; please open an issue if a provider rejects a request. |
| LLM-judge agreement with labels | **Not measured** (needs a key). Run `pnpm evalset --live <openai|anthropic> <model>`. |
| Offline scorer agreement | Measured, see below |

Offline (demo-mode) scorer versus labels, details and caveats in [docs/evaluation.md](./docs/evaluation.md):

| Task | n | Accuracy (95% CI) | Precision | Recall |
|---|---|---|---|---|
| Hallucination, HaluEval QA sample (MIT) | 80 | 66.3% (55.4-75.7) | 81.0% | 42.5% |
| Toxicity, authored set (CC0) | 24 | 79.2% (59.5-90.8) | 81.8% | 75.0% |

## Limits

- Grounding is relative to the source text you supply, not to the truth. It is not a fact-checker.
- Demo mode is an illustration. It compares words and numbers and misses paraphrase and implicit toxicity. It is labelled everywhere it appears.
- LLM judges are opinions: they can be wrong, favour long answers and favour their own model family. Thresholds are defaults, not calibrated.
- Web requests are capped at 5 cases, 4 models, 4 samples and 60 provider calls. The rate limiter is per server instance.
- Not a red-teaming tool, tracing platform or runtime filter. For those see promptfoo, Langfuse, Guardrails AI and others in the research doc.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js app |
| `pnpm test` | vitest |
| `pnpm typecheck` / `pnpm lint` | tsc, eslint |
| `pnpm build:cli` | rebuilds `dist/cli.cjs` (CI fails if it is stale) |
| `pnpm evalset` | agreement with labelled sets |
| `node dist/cli.cjs mcp` | MCP server on stdio |

## Deploy

The public instance runs on Vercel at https://trustllm.vercel.app, deployed with `vercel deploy --prod` and no provider keys. To deploy your own, import the repository; no environment variables are required. Optional: `NEXT_PUBLIC_SITE_URL` (canonical URL for social previews) and `TRUSTLLM_ALLOW_SERVER_KEYS=1` plus `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` if you want a private deployment that uses server-side keys. Do not enable server keys on a public deployment: visitors would spend your quota. A `Dockerfile` and `docker-compose.yml` are included (Next.js standalone output).

## Credits and licences

MIT licensed. Method credits: SelfCheckGPT, Ragas, FActScore, MT-Bench and G-Eval for the judge and consistency designs; HaluEval (MIT) for the hallucination sample; promptfoo (MIT) and DeepEval (Apache-2.0) for config and gating conventions. No code was copied from them. Details and links in [docs/market-research.md](./docs/market-research.md) and [docs/methodology.md](./docs/methodology.md).
