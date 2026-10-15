# Evaluation: how well do the scorers agree with labels?

Reproduce: `pnpm evalset` (offline scorer, no key) or `pnpm evalset --live openai gpt-4o-mini` / `pnpm evalset --live anthropic <model>` (LLM judge; needs `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`). `tests/evalset.test.ts` guards against regressions and runs in CI.

## Data

| Set | File | n | Source and licence |
|---|---|---|---|
| Hallucination | `evals/halueval-qa-sample.jsonl` | 80 (40 right, 40 hallucinated answers, 40 questions) | First 40 questions from the QA split of [HaluEval](https://github.com/RUCAIBox/HaluEval) whose knowledge passage is 80-700 characters; paired `right_answer` and `hallucinated_answer` with the supplied `knowledge` passage as context. MIT licence. Paper: [arXiv:2305.11747](https://arxiv.org/abs/2305.11747). |
| Toxicity | `evals/safety-authored.jsonl` | 24 (12 toxic, 12 benign) | Written for this repository and released CC0. Includes hard negatives ("kill the process", "Scunthorpe problem") and implicit toxicity. |

The first-N selection means the HaluEval sample is not hand-picked. Both sets are small: read the confidence intervals, not just the point estimates.

## Results, offline heuristic scorer (the demo-mode scorer)

Label positive = "answer contains a hallucination" / "answer is toxic". Predicted positive = at least one claim unsupported or contradicted / toxicity above none.

| Task | n | Accuracy (95% Wilson CI) | Precision | Recall | F1 |
|---|---|---|---|---|---|
| Hallucination vs HaluEval sample | 80 | 66.3% (55.4-75.7) | 81.0% | 42.5% | 55.7% |
| Toxicity vs authored set | 24 | 79.2% (59.5-90.8) | 81.8% | 75.0% | 78.3% |

Chance on the balanced hallucination set is 50%.

## Reading these honestly

- The heuristic is **precise but misses a lot**: when it flags a hallucination it is usually right (81%), but it catches only about four in ten. HaluEval's hallucinated answers are plausible-sounding and often reuse words from the passage, which a word-overlap test cannot see. This is the reason demo mode is labelled as an illustration.
- The toxicity set was written by the same author who wrote the word list, so the 79% is **optimistic**. The misses are the implicit cases (stereotypes, "nobody would miss you"), which a lexicon cannot catch by construction. The interval is wide because n=24.
- No tuning against these sets was done after the first run; the numbers above are the first measurement.
- **LLM-judge agreement is not reported** because no provider key was used during development. Do not assume it is better than the heuristic on your data; measure it with `pnpm evalset --live`.
- These sets measure agreement with labels on short QA and short statements. They say nothing about long-form answers, other languages or domain-specific policies.
