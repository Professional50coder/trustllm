# Market and prior-art research

Research date: 2026-10-16. Star counts and licences come from the GitHub REST API on that date. Claims about tools are limited to what their own READMEs or public issue trackers state; nothing here is a benchmark of those tools.

## Who this is for

| Buyer / user | Situation | Job to be done |
|---|---|---|
| Developer shipping an LLM feature | Changes a prompt or swaps a model and wants to know if it got worse | "Fail my pull request if the answers break my rules." |
| Tech lead / PM approving a release | Needs a yes/no with a reason they can forward | "Give me a PASS/FAIL I can attach to the release ticket." |
| Compliance / risk reviewer | Has to show what bar a model cleared and when | "Show me the written rules, the scores, and the date." |
| Small team without an eval platform | Cannot justify a hosted observability suite | "Let me try this in a browser with no install, then move it into CI." |

## What existing tools do

| Tool | Licence (GitHub API) | Stars | What it does well | Where it leaves a gap for a small release gate |
|---|---|---|---|---|
| [promptfoo](https://github.com/promptfoo/promptfoo) | MIT | 26.0k | Declarative YAML configs, CLI, CI, side-by-side provider comparison, red teaming, local-first. README says it is now part of OpenAI and stays MIT. | Broad (red teaming, code scanning), so a large surface to learn. Top-voted issues are about config ergonomics: separating tests by prompt ([#1092](https://github.com/promptfoo/promptfoo/issues/1092)), comparing against a previous run ([#1395](https://github.com/promptfoo/promptfoo/issues/1395)), a JSON schema for the config ([#726](https://github.com/promptfoo/promptfoo/issues/726)), and heavy dependencies ([#7254](https://github.com/promptfoo/promptfoo/issues/7254)). |
| [DeepEval](https://github.com/confident-ai/deepeval) | Apache-2.0 | 18.9k | Pytest-style tests; metrics for faithfulness, hallucination, G-Eval, toxicity; 0-1 scores with a pass threshold. | Python-only code-first workflow; repeatedly promotes a paid platform. Top-voted issues: users asking to silence the platform push ([#1417](https://github.com/confident-ai/deepeval/issues/1417)), unconditional output ([#769](https://github.com/confident-ai/deepeval/issues/769)), telemetry on by default ([#1419](https://github.com/confident-ai/deepeval/issues/1419)), and judge output that is not valid JSON ([#929](https://github.com/confident-ai/deepeval/issues/929)). |
| [Ragas](https://github.com/explodinggradients/ragas) | not confirmed via API on the research date | n/a | Reference-free RAG metrics ([paper](https://arxiv.org/abs/2309.15217)). | RAG-specific; a library of metrics, not a release decision. |
| [Giskard](https://github.com/Giskard-AI/giskard-oss) | Apache-2.0 | 5.9k | Evaluation and testing of LLM agents. | Library for ML engineers, no browser audit view in the OSS repo. |
| [Guardrails AI](https://github.com/guardrails-ai/guardrails) | Apache-2.0 | 7.5k | Runtime validators on model output. | Runtime filtering, not pre-release evidence. |
| [NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) | GitHub shows "Other" | 7.3k | Programmable runtime rails for conversational apps. | Runtime dialogue control, needs its own config language. |
| [TruLens](https://github.com/truera/trulens) | MIT | 3.6k | Feedback functions and tracking for experiments. | Tracking oriented. |
| [Langfuse](https://github.com/langfuse/langfuse), [Phoenix](https://github.com/Arize-ai/phoenix) | mixed / non-standard (GitHub reports NOASSERTION) | 35.9k / 11.9k | Production tracing, datasets, online evals. | Observability platforms to deploy and operate; heavier than a release gate. |
| [OpenAI Evals](https://github.com/openai/evals), [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) | NOASSERTION / MIT | 19.6k / 14.2k | Benchmark registries and few-shot academic evaluation. | Measure models on benchmarks, not your prompt against your rules. |

## What practitioners say about gating

- A write-up that wired six open-source eval frameworks into a GitHub Actions merge queue reports that the gates which stayed stable relied on deterministic checks that return an exit code in seconds, with LLM-judge scores kept as non-blocking signals; frameworks dominated by judge calls drifted ([DEV Community](https://dev.to/ethanwritesai/we-gated-ci-on-six-open-source-llm-eval-frameworks-only-two-survived-the-merge-queue-5elf)). This is one author's experience, so treat it as a hypothesis, but it matches the judge-bias literature below.
- Another piece argues teams are getting better at producing eval scores than at turning them into build decisions ([HackerNoon](https://hackernoon.com/llm-evals-are-not-enough-the-missing-ci-layer-nobody-talks-about)).
- A PromptLayer article argues code-first tools leave non-engineers (prompt owners, reviewers) out. It is vendor marketing, so weight it accordingly.
- Judge reliability: LLM judges show position, verbosity and self-preference bias ([MT-Bench paper](https://arxiv.org/abs/2306.05685), [self-preference study](https://arxiv.org/abs/2410.21819)).

## The gap TrustLLM can honestly own

Not "another eval framework" and not "better metrics". The defensible wedge is the **release decision and the evidence around it**:

1. **Written guardrails as the contract.** One small YAML/JSON file of named rules. Each rule yields PASS or FAIL with a plain-language reason, so a PM can read the result without knowing what "faithfulness 0.71" means.
2. **Deterministic rules first, judge scores second.** Length, forbidden/required text, regex, PII patterns, valid JSON and citation checks run offline and are exact. Judge-based rules are available and labelled as model opinions; each rule carries a `blocking` flag.
3. **A CLI and GitHub Action whose exit code is the gate** (0 pass, 1 gate failed, 2 error), with a Markdown job summary and a versioned JSON report.
4. **A zero-install browser UI for the same engine**: try it with no keys (clearly labelled offline demo), paste your own key (kept in memory only) for live runs, compare models side by side, export the report, keep a local audit history.
5. **Small and quiet**: no telemetry, no account, no upsell, keys never stored or logged.

What TrustLLM does **not** try to be: a red-teaming suite (promptfoo), a metrics library (DeepEval, Ragas), a runtime guardrail layer (Guardrails AI, NeMo) or a tracing platform (Langfuse, Phoenix). The README says so and points to them.

## Reusable patterns and licence notes

No code was copied from any project above. Patterns adopted as ideas (ideas and file-format conventions are not copyrightable; credited here anyway):

| Pattern | Seen in | How TrustLLM uses it | Licence of source |
|---|---|---|---|
| Declarative YAML config with a case list and assertions | promptfoo | `trustllm.yaml` with `cases` and `guardrails` | MIT |
| Score 0-1 plus threshold gives pass/fail | DeepEval | Every judge signal has a threshold rule | Apache-2.0 |
| Exit code and JSON output for CI | promptfoo | CLI exit codes, `trustllm.report/v1` JSON | MIT |
| Claim-level faithfulness: decompose answer into claims, check each against context | Ragas paper, FActScore | Judge returns per-claim verdicts; the demo heuristic checks claims lexically | paper methods |
| Sampling-based consistency without a reference | SelfCheckGPT ([arXiv:2303.08896](https://arxiv.org/abs/2303.08896)) | Consistency = agreement of the answer with extra samples | paper method |
| Rubric prompt with fixed integer scale, JSON-only output, temperature 0, order randomised | MT-Bench / G-Eval ([arXiv:2303.16634](https://arxiv.org/abs/2303.16634)) | `lib/core/judge.ts` | paper methods |

Evaluation data used for the agreement test is documented in [evaluation.md](./evaluation.md) with its own licence notes.

## Product consequences

Prioritised in this order: (1) shared evaluation engine, (2) guardrail config and deterministic checks, (3) CLI and GitHub Action, (4) web UI on the same engine with export and local history, (5) labelled agreement test, (6) docs for a first-time user, (7) deploy and verify.

## Peers and lessons (Product Hunt, October 2026)

Method and honesty note: search and page-fetch tools were used read-only, with no sign-up, log-in or personal data. Some listed products (Tiden, Polylane Impact Analysis, Kerno 1.0, CodeCrab, Actually Asked, ReSO AI, Basedash connector gallery) could not be confirmed or read through those tools, so they are not characterised here; closer equivalents that could be found are used instead. Comment themes below come only from pages that were actually read.

| Peer | What it does | What users say or ask (where readable) | Borrow | Avoid |
|---|---|---|---|---|
| [withHuman](https://mcpservers.org/servers/withhuman-ai) | Open-source human-approval layer: an agent pauses at a consequential action until a reviewer approves; queue, audit trail, web UI, self-hostable; open protocol (AAP); MCP server and SDK integrations. | Page not readable beyond the listing summary. | Human sign-off with an audit trail on risky outcomes; MCP integration; open source plus self-host framing. | Building a hosted queue and notification system: out of scope and needs a backend. |
| Plumb and Yoetz (as listed on [hunted.space](https://hunted.space/product/plumb) and Product Hunt; the closest findable equivalents to "intent verification for coding agents") | Verify an agent's claim of completion independently of the agent; Plumb is deterministic, makes no model calls, and returns PASS, FAIL, BLOCK or "uncertain". | Listing text only. | Deterministic-first verification, and an explicit "uncertain / skipped" outcome instead of a false pass. TrustLLM already does this with `skip`. | Claiming to verify intent: TrustLLM verifies rules against a source text, not intent. |
| [Inferock Bench](https://www.producthunt.com/p/inferock/inferock-bench) | Local proxy that records per-call tokens, failures and retries and produces a receipt. Open source (FSL-1.1-Apache-2.0). | Commenters liked that keys and data stay local, that setup is two settings, and that it verifies a bill rather than replacing it. Questions: separating real failures from hidden tokens; "a silently wrong value looks like success". | Show usage per run (calls, tokens, latency) so cost is visible; keys-stay-local messaging. | Estimating money from a hard-coded price table: prices change, so TrustLLM shows calls, tokens and time, not dollars. |
| RaptorCI, MergAI, Kryon AI, AI Risk Manager (PR risk tools found via [Product Hunt alternatives](https://www.producthunt.com/products/raptorci/alternatives) and [hunted.space](https://hunted.space/product/mergai)) | Score pull-request risk, block unsafe merges, post a report as a PR comment; AI Risk Manager is a deterministic-by-default CLI with a merge decision. | Listing text only. | A PR comment with the gate summary; merge decision as a first-class output; deterministic default. | Opaque risk scores with no stated rule behind them. |
| [Kerno](https://www.producthunt.com/products/kerno) | Generates and runs tests in the IDE or CLI, with audit reports. | Listing text only. | Audit report as a deliverable. | None specific. |
| [Navige](https://navige.ai) (studied in a browser, see [design-notes.md](./design-notes.md)) | Governs agent cost; free watch tier, savings-share pricing explained with a worked example. | Not readable (account wall). | Lead with what is free; state exactly when money changes hands; FAQ with real objections. | Unverifiable headline numbers. |

Cross-cutting patterns seen on Product Hunt this month: open source with self-hosting as a trust signal, MCP servers as a distribution channel for agent tools, local-first tools that keep keys on the user's machine, example galleries before commitment, `npx`-style one-line start, and launch-ready pages. A product-hunting thread asked whether anyone has actually disputed a provider bill and received a credit, a reminder that trust claims need receipts.

### What was implemented, ranked by user value over effort

| Rank | Idea | Value | Effort | Status |
|---|---|---|---|---|
| 1 | Guardrail packs gallery: ready-made rule sets to start from (support bot, RAG, structured output, safety-first) | High: removes the blank-page problem | Low | Implemented: Guardrails page and CLI `init --pack` |
| 2 | Human approval on a FAIL, with reason, recorded in the report and history | High for the reviewer persona; matches the withHuman lesson without a server | Low | Implemented (local, per result, recorded in exports) |
| 3 | Shareable report links (report encoded in the URL fragment, never sent to a server) | High: forward a result without accounts | Low | Implemented: `/report` page |
| 4 | Usage and latency per run (calls, tokens where the provider returns them, time) | Medium: cost visibility without price tables | Low | Implemented |
| 5 | PR comment with the gate summary from the GitHub Action | High for the developer persona | Medium | Implemented in `action.yml` (`comment: true`); documented as not exercised against a real pull request |
| 6 | MCP server exposing `evaluate`, `list_rule_types` and `list_packs` tools | Medium-high: lets agents call the gate | Medium | Implemented: `node dist/cli.cjs mcp` (stdio, minimal protocol), tested at the protocol level only, not against a real MCP client |
| 7 | `llms.txt` and agent-readable docs | Medium, near-zero effort | Low | Implemented |
| - | Hosted approval queue and notifications | Medium | High, needs backend and auth | Not built |
| - | Dollar cost estimates | Medium | Medium and drifts as prices change | Not built, by choice |
