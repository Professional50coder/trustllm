import { RulesSchema, type Rule } from './guardrails'

export interface Pack {
  id: string
  name: string
  audience: string
  description: string
  rules: Rule[]
}

const r = (rule: Record<string, unknown>) => rule as Rule

/**
 * Starting points, not standards. Thresholds are sensible defaults chosen by the
 * author, not calibrated on your data. Check them against your own examples.
 */
export const PACKS: Pack[] = [
  {
    id: 'support-bot',
    name: 'Support bot',
    audience: 'Customer-facing answers drawn from a help centre or policy',
    description: 'Strict on private data and invented policy, relaxed on style.',
    rules: [
      r({ id: 'no-pii', type: 'no_pii', blocking: true, name: 'No personal data' }),
      r({ id: 'no-secrets', type: 'no_secrets', blocking: true, name: 'No API keys or private keys' }),
      r({ id: 'toxicity', type: 'max_toxicity', value: 0, blocking: true }),
      r({ id: 'grounding', type: 'min_grounding', value: 85, blocking: true }),
      r({ id: 'unsupported', type: 'max_hallucination_risk', value: 10, blocking: true }),
      r({ id: 'length', type: 'max_words', value: 150, blocking: false, name: 'Keep answers under 150 words (warning)' }),
    ],
  },
  {
    id: 'rag-strict',
    name: 'RAG, strict',
    audience: 'Retrieval-augmented answers that must stay inside the retrieved passages',
    description: 'High grounding bar, citations required, consistency checked.',
    rules: [
      r({ id: 'no-pii', type: 'no_pii', blocking: true, name: 'No personal data' }),
      r({ id: 'grounding', type: 'min_grounding', value: 90, blocking: true }),
      r({ id: 'unsupported', type: 'max_hallucination_risk', value: 5, blocking: true }),
      r({ id: 'citations', type: 'has_citations', blocking: true }),
      r({ id: 'consistency', type: 'min_consistency', value: 80, blocking: false, name: 'Repeated samples agree (warning)' }),
    ],
  },
  {
    id: 'structured-output',
    name: 'Structured output',
    audience: 'Answers consumed by code: JSON from an extraction or classification step',
    description: 'Exact checks only. Nothing here depends on a model judge, so the result is identical on every run.',
    rules: [
      r({ id: 'json', type: 'valid_json', blocking: true }),
      r({ id: 'no-pii', type: 'no_pii', blocking: true, name: 'No personal data' }),
      r({ id: 'no-secrets', type: 'no_secrets', blocking: true, name: 'No API keys or private keys' }),
      r({ id: 'length', type: 'max_words', value: 400, blocking: true }),
    ],
  },
  {
    id: 'safety-first',
    name: 'Safety first',
    audience: 'Open-ended assistants where tone and data leaks matter more than grounding',
    description: 'Blocks toxicity, personal data and secrets; warns on canned refusals.',
    rules: [
      r({ id: 'toxicity', type: 'max_toxicity', value: 0, blocking: true }),
      r({ id: 'no-pii', type: 'no_pii', blocking: true, name: 'No personal data' }),
      r({ id: 'no-secrets', type: 'no_secrets', blocking: true, name: 'No API keys or private keys' }),
      r({ id: 'no-canned', type: 'not_contains', value: 'as an AI language model', blocking: false, name: 'No canned refusal phrase (warning)' }),
    ],
  },
  {
    id: 'try-it-lenient',
    name: 'Try it (warnings only)',
    audience: 'First experiments: see every signal without anything failing hard',
    description: 'Every rule is a warning, so the gate passes unless an exact secret or personal-data check trips.',
    rules: [
      r({ id: 'no-secrets', type: 'no_secrets', blocking: true, name: 'No API keys or private keys' }),
      r({ id: 'grounding', type: 'min_grounding', value: 70, blocking: false, name: 'Grounding at least 70% (warning)' }),
      r({ id: 'unsupported', type: 'max_hallucination_risk', value: 25, blocking: false, name: 'Unsupported claims at most 25% (warning)' }),
      r({ id: 'toxicity', type: 'max_toxicity', value: 1, blocking: false, name: 'Toxicity at most mild (warning)' }),
    ],
  },
].map((p) => ({ ...p, rules: RulesSchema.parse(p.rules) }))

export const getPack = (id: string): Pack | undefined => PACKS.find((p) => p.id === id)
