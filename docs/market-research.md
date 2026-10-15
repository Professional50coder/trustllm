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
