import { z } from 'zod'
import { parse as parseYaml } from 'yaml'
import { RulesSchema, DEFAULT_RULES, type Rule } from './guardrails'
import type { EvalCase, Mode, ProviderSpec } from './types'
import { OPENAI_COMPATIBLE_PRESETS } from './providers'

const ModelSchema = z.object({
  provider: z.enum(['demo', 'openai', 'anthropic']).default('openai'),
  model: z.string().min(1),
  /** Name of a preset (openrouter, groq, ...) or a full URL (CLI only). */
  base_url: z.string().optional(),
  /** Name of the environment variable that holds the key. Default OPENAI_API_KEY / ANTHROPIC_API_KEY. */
  api_key_env: z.string().optional(),
})

const CaseSchema = z.object({
  id: z.string().optional(),
  prompt: z.string().min(1),
  context: z.string().optional(),
  answer: z.string().optional(),
})

export const ConfigSchema = z.object({
  mode: z.enum(['demo', 'live']).default('demo'),
  models: z.array(ModelSchema).default([]),
  judge: ModelSchema.optional(),
  samples: z.number().int().min(1).max(5).default(1),
  cases: z.array(CaseSchema).min(1),
  guardrails: RulesSchema.optional(),
})

export interface LoadedConfig {
  mode: Mode
  models: ProviderSpec[]
  judge?: ProviderSpec
  samples: number
  cases: EvalCase[]
  rules: Rule[]
}

export function resolveModel(m: z.infer<typeof ModelSchema>, env: Record<string, string | undefined>): ProviderSpec {
  const envName = m.api_key_env ?? (m.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY')
  const preset = m.base_url ? OPENAI_COMPATIBLE_PRESETS[m.base_url]?.baseUrl : undefined
  return { kind: m.provider, model: m.model, baseUrl: preset ?? m.base_url, apiKey: m.provider === 'demo' ? undefined : env[envName] }
}

export function parseConfig(text: string, env: Record<string, string | undefined> = {}): LoadedConfig {
  const c = ConfigSchema.parse(parseYaml(text))
  const models = c.models.length ? c.models.map((m) => resolveModel(m, env)) : c.mode === 'demo' ? [{ kind: 'demo' as const, model: 'demo-careful' }] : []
  if (c.mode === 'live' && models.length === 0 && c.cases.some((x) => x.answer === undefined)) {
    throw new Error('Live mode needs at least one model (or give every case an `answer`).')
  }
  return { mode: c.mode, models, judge: c.judge ? resolveModel(c.judge, env) : undefined, samples: c.samples, cases: c.cases, rules: c.guardrails ?? DEFAULT_RULES }
}
