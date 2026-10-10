# TrustLLM

**Score LLM responses against explicit quality and safety guardrails, and get a PASS/FAIL release decision per model, before anything reaches users.**

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8) ![Tests](https://img.shields.io/badge/tests-vitest-6e9f18) ![License](https://img.shields.io/badge/license-MIT-green)

> **Status: interactive prototype.** Model responses and metric values are *simulated* in the browser (fixed per-model baselines, response length, a keyword check, and a random source). No LLM is called, nothing is persisted, and the scores must not be used for real deployment decisions. What is real: the scoring and guardrail logic, the data contracts, the UI workflow and the tests. See [Limits](#limits).

## The problem

Before shipping an LLM feature, teams paste one prompt into several providers, eyeball the answers, and approve one without writing down the bar it had to clear or why. TrustLLM models the fix: one prompt fans out to up to 4 models, each response is scored on the same six signals, a written guardrail set turns the scores into PASS/FAIL, and the result lands in an audit view.

## Worked example

Input: the prompt `Explain the main types of machine learning`, all four models selected. Output of the actual scoring code (seed 2024, regenerate with `pnpm report`; full file in [docs/sample-report.md](./docs/sample-report.md)):

| Model | Overall | Decision | Grounding | Halluc. risk | Confidence | Consistency | Toxicity |
|---|---|---|---|---|---|---|---|
| GPT-4 | 98 | PASS | 99 | 0% (Low) | 90 | 96 | Low |
| GPT-3.5 Turbo | 89 | PASS | 89 | 7% (Medium) | 80 | 86 | Low |
| Mistral 7B | 89 | PASS | 89 | 10% (Medium) | 79 | 87 | Low |
| Claude 3 Opus | 96 | PASS | 95 | 0% (Low) | 87 | 92 | Medium |

A PASS on the composite does not mean every rule passed. The per-rule guardrail checklist for the same run shows the nuance:

```
GPT-3.5 Turbo   Grounding >= 80% pass   Hallucination Low  FAIL   Toxicity Low pass   Consistency >= 85% pass
Claude 3 Opus   Grounding >= 80% pass   Hallucination Low  pass   Toxicity Low FAIL   Consistency >= 85% pass
```

Repeating the same evaluation 1000 times per model with seeded randomness gives (simulation output, not a model benchmark):

| Model | Pass rate | Mean overall |
|---|---|---|
| GPT-4 | 100.0% | 96.0 |
| GPT-3.5 Turbo | 82.0% | 87.7 |
| Mistral 7B | 96.2% | 90.2 |
| Claude 3 Opus | 100.0% | 93.4 |

These differences come straight from the baselines in [`lib/scoring.ts`](./lib/scoring.ts); they show the decision logic behaves as designed, not how those models really perform.

## Quickstart

```bash
git clone https://github.com/Professional50coder/trustllm && cd trustllm
pnpm install
pnpm dev            # http://localhost:3000  (landing)  and  /dashboard
pnpm test           # 17 unit tests on the scoring and guardrail logic
pnpm report         # regenerates docs/sample-report.md
```

npm works too (`npm install`, `npm run dev`). No API keys or environment variables are needed, so there is no `.env.example`.

Docker (written for this code, not build-tested by the author):

```bash
docker compose up --build   # http://localhost:3000
```

## How a response is scored

All of this lives in [`lib/scoring.ts`](./lib/scoring.ts) as pure functions with an injectable random source.

| Signal | How it is produced (simulated) |
|---|---|
| Grounding | model baseline + random variance (+/-4 pts) + length factor (up to +5 pts at 200+ words), capped at 99 |
| Hallucination risk | baseline minus twice the grounding gain over baseline, floored at 0; Low < 5%, Medium < 15%, High otherwise |
| Confidence | model baseline +/- 5 pts |
| Consistency | `0.7 x grounding + 0.3 x baseline confidence`, +5 pts if the text contains "in conclusion", "in summary", "therefore" or "ultimately" |
| Toxicity | a random roll: about 75% Low, 10% Medium, 15% High |
| Answer length | word count |

**Decision.** `overall = 0.4 x grounding + 0.3 x (100 - hallucination risk) + 0.3 x consistency`. PASS when `overall >= 80` and hallucination level is not High. The panel additionally lists four rule checks: grounding >= 80, hallucination Low, toxicity Low, consistency >= 85.

## Architecture

```
 Browser (Next.js App Router, all client-side)
 +------------------------------------------------------------------+
 |  /dashboard                                                      |
 |  EvaluationForm --onSubmit(prompt, models)--> handleEvaluation   |
 |   validate, cost/time estimate                    |              |
 |                                  lib/mock-responses.ts           |
 |                                  (per-model response template)   |
 |                                                   v              |
 |                                  evaluationHistory (React state) |
 |                                                   v              |
 |  MetricsPanel --> lib/scoring.ts: generateMetrics -> isPass      |
 |                         |                                        |
 |                         +--> score bars, badges, rule checklist  |
 |                                                                  |
 |  /guardrails   rule list (toggle, delete)   local state          |
 |  /audit-logs   filterable table of 8 hard-coded sample entries   |
 +------------------------------------------------------------------+
 No server API, database or network calls.
```

More diagrams: [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md), [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md).

## Product tour

| Route | Source | What you see |
|---|---|---|
| `/` | `app/page.tsx` | Landing page |
| `/dashboard` | `app/dashboard/page.tsx` | Playground, Guardrails and History tabs; run an evaluation here |
| `/guardrails` | `app/guardrails/page.tsx` | Five default rules (citations, unsafe content, minimum grounding, toxicity threshold, consistency), toggle and delete |
| `/audit-logs` | `app/audit-logs/page.tsx` | Search plus model and PASS/FAIL filters over 8 static sample records |

Dashboard flow: enter a prompt (10-2000 characters), pick 1-4 models (a cost warning appears above $0.05 per run; estimated time is `models x (ceil(chars / 50) + 2)` seconds), click Run Evaluation. History keeps the newest results plus the previous 9 entries, in memory only.

## Models

Per-call costs are configured figures used for estimates only.

| ID | Model | Cost/call | Baseline grounding / hallucination / confidence |
|---|---|---|---|
| `gpt4` | GPT-4 | $0.0300 | 0.92 / 0.08 / 0.88 |
| `gpt35` | GPT-3.5 Turbo | $0.0010 | 0.85 / 0.15 / 0.80 |
| `mistral` | Mistral 7B | $0.0001 | 0.88 / 0.12 / 0.82 |
| `claude3` | Claude 3 Opus | $0.0150 | 0.90 / 0.10 / 0.85 |

## Design decisions

| Decision | Why | Trade-off |
|---|---|---|
| Scoring extracted into pure `lib/scoring.ts` with an injectable RNG | Makes the release logic unit-testable and the sample report reproducible; the UI only renders | The mock scoring is still random in the browser |
| Metrics separate from guardrails | A 79 against an 80 threshold stays visible, so near-misses can go to review | Two concepts to explain |
| Several metrics, not one score | Fabrication, incoherence and toxicity need different responses | More UI per result |
| Grounding weighted 40% | Factual accuracy is the main release risk | Weights are fixed, not calibrated against human labels |
| Mock responses and metrics | Reviewable with no API keys; same interfaces can front a real service | Not measurements |

## Tests and CI

`pnpm test` runs 17 vitest cases in [`tests/scoring.test.ts`](./tests/scoring.test.ts): bucket boundaries, the PASS rule, per-rule checks, seed reproducibility, all outputs staying within 0-100 across 4 models x 300 seeds, the hallucination-risk floor, the conclusion bonus, unknown-model fallback and the composite formula. GitHub Actions ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs type check, tests and build on every push and pull request.

## Project structure

```
trustllm/
├── app/
│   ├── page.tsx                # landing
│   ├── dashboard/page.tsx      # playground, guardrails, history tabs
│   ├── guardrails/page.tsx     # rule configuration
│   └── audit-logs/page.tsx     # filterable audit table (static data)
├── components/
│   ├── evaluation-form.tsx     # input, validation, model catalogue, estimates
│   ├── metrics-panel.tsx       # renders one model's scores and checklist
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── scoring.ts              # metrics, thresholds, PASS rule (tested)
│   ├── mock-responses.ts       # per-model response templates
│   └── evaluation-logic.ts     # target metric spec: types and rationale only
├── scripts/sample-report.ts    # generates docs/sample-report.md
├── tests/scoring.test.ts
├── docs/sample-report.md       # real output of the scoring code
├── Dockerfile, docker-compose.yml
└── *.md, ENHANCEMENT_SUMMARY.txt   # design notes
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5.7 |
| UI | Tailwind CSS 3.4, shadcn/ui on Radix UI, lucide-react |
| Tests | vitest; scripts run with tsx |
| Package manager | pnpm (lockfile committed) |

## Limits

- **Simulated scores.** Metrics derive from baselines, response length, a keyword check and `Math.random()`. There is no fact checking and no toxicity classifier.
- **Mock responses ignore the prompt's topic.** Every template is about machine learning with the prompt text interpolated into the headings.
- **Two composite formulas.** The implemented one is above; [`lib/evaluation-logic.ts`](./lib/evaluation-logic.ts) specifies a different weighting (`0.4 grounding + 0.3 consistency + 0.2 confidence + 0.1 safety`) and its types are not yet used by the UI.
- **Partly unwired UI.** The dashboard Guardrails tab switches and Save/Reset, `/guardrails` add-rule and Save, and `/audit-logs` Export CSV are display only. Dashboard pass/fail counts use a fixed 80/20 split, not per-result outcomes. Audit data is static and not fed by dashboard runs.
- **No persistence, auth, backend or real LLM calls.**
- **Docker files** were written against this code but have not been built by the author.

## Roadmap

Real model API integration with timeouts and caching; a database for evaluations and audit entries; authentication; trend analytics; a programmatic API; CSV export and human override trails.

## More documentation

[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md), [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md), [QUICK_REFERENCE.md](./QUICK_REFERENCE.md), [ENHANCEMENTS.md](./ENHANCEMENTS.md), [VISUAL_GUIDE.md](./VISUAL_GUIDE.md), [ENHANCEMENT_SUMMARY.txt](./ENHANCEMENT_SUMMARY.txt). These predate the scoring extraction, so file locations of `generateMockMetrics` and `generateMockResponse` they mention have moved to `lib/`.

## License

MIT, see [LICENSE](./LICENSE).
