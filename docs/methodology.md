# Methodology

How TrustLLM turns an answer into PASS or FAIL, what each design choice rests on, and where it is weak.

## Decision model

A **guardrail set** is a list of named rules (`lib/core/guardrails.ts`). Each rule returns `pass`, `fail` or `skip` with a plain-language reason. The gate is: *every blocking rule that ran must pass.* Non-blocking rules produce warnings. A rule that cannot run (for example grounding without a source text) is `skip`, never a silent pass, and the explanation says so.

The "overall" number (0-100) is a convenience for sorting. It does not decide anything and its weights are not calibrated.

Rationale for rule-based gating with exact checks first: practitioners who wired several open-source eval frameworks into merge queues report that gates built on deterministic checks stayed stable while judge-heavy gates drifted ([DEV Community write-up](https://dev.to/ethanwritesai/we-gated-ci-on-six-open-source-llm-eval-frameworks-only-two-survived-the-merge-queue-5elf), anecdotal). So exact rules (personal data, secrets, length, banned text, JSON validity, citations) are separate from judge-scored rules, and judge-scored rules can be made non-blocking.

## Signals

| Signal | Live mode (LLM judge) | Demo mode (offline) | Basis |
|---|---|---|---|
| Grounding | share of atomic claims the judge marks `supported` by the context | share of sentences whose content words (and numbers) appear in the context | claim-level faithfulness as in Ragas ([arXiv:2309.15217](https://arxiv.org/abs/2309.15217)) and FActScore ([arXiv:2305.14251](https://arxiv.org/abs/2305.14251)) |
| Unsupported claims | share marked `unsupported` or `contradicted` | same lexical test, plus a numeric mismatch check | same |
| Consistency | judge compares the main answer with extra samples drawn at temperature 1 (`agree` 1, `partial` 0.5, `contradict` 0) | sentence coverage of the answer by each sample | SelfCheckGPT: facts a model really knows stay stable across samples ([arXiv:2303.08896](https://arxiv.org/abs/2303.08896)) |
| Toxicity | judge rates 0 none, 1 mild, 2 clear, 3 severe against written anchors | short word and phrase list | rubric with fixed integer scale and anchors, as recommended for LLM judges ([MT-Bench, arXiv:2306.05685](https://arxiv.org/abs/2306.05685); [G-Eval, arXiv:2303.16634](https://arxiv.org/abs/2303.16634)) |
| Expressed confidence | hedge and booster words | same | describes tone only. Verbalised confidence is not calibration; see [Kadavath et al., arXiv:2207.05221](https://arxiv.org/abs/2207.05221) for why calibration needs measurement against outcomes. It is never used as a gate by default. |

## Judge design (`lib/core/judge.ts`)

- **Claims, not a holistic score.** The judge splits the answer into atomic claims and labels each against the context. This is more inspectable than a single 1-10 score and gives the "claims to review" list.
- **Written rubric, fixed scale, JSON-only, temperature 0.** Reduces variance. Malformed JSON gets one retry (invalid judge JSON is a well-known failure mode of judge metrics).
- **Prompt-injection hygiene.** Question, context and answer are fenced in tags and the judge is told they are data. This reduces, but does not eliminate, the risk that an answer talks the judge into a pass.
- **Known judge biases** (position, verbosity, self-preference): MT-Bench documents position and verbosity bias; a 2024 study documents self-preference ([arXiv:2410.21819](https://arxiv.org/abs/2410.21819)). Mitigations implemented: the UI warns when the judge is the same model as the candidate; claims are judged per claim rather than comparing two answers (so there is no answer order to bias); no length reward. Not implemented: multi-judge ensembles and position swapping, because there are no pairwise comparisons.
- **Toxicity**: purpose-built classifiers such as Llama Guard ([arXiv:2312.06674](https://arxiv.org/abs/2312.06674)) or Perspective are stronger than a general judge for safety screening. TrustLLM does not bundle one. Use a moderation endpoint in front of production traffic; TrustLLM is a pre-release check.

## Demo mode

Demo mode exists so a first-time visitor can see the whole workflow without a key. Every demo result carries a `DEMO` label in the UI, in the report notes, in exports and in the recommendation text. Demo "models" are deterministic stand-ins (`lib/core/demo.ts`) that build answers from the context passage. The scores they get are not measurements of any real model.

## Safety of the backend

- Keys travel only in the request body of one call and are redacted from any error text and never written to reports.
- The server accepts provider **presets** only, not arbitrary URLs, so it cannot be used to reach internal hosts (SSRF). The CLI accepts custom base URLs because it runs on the user's own machine.
- Request size, number of cases/models/samples and total model calls per request are capped. A best-effort in-memory rate limit applies per IP (per serverless instance).
- No database, no server-side persistence, no telemetry.

## Known limitations

- Grounding is relative to the supplied source, not to the truth.
- The offline scorer is a word-overlap proxy. See [evaluation.md](./evaluation.md) for measured agreement: it catches roughly four in ten hallucinated answers on a public sample.
- Thresholds are defaults, not calibrated. Calibrate on your own labelled data before making a rule blocking.
- LLM judge agreement with labels has not been measured by the author (no provider key was used in development). `pnpm evalset --live` produces it for your provider.
