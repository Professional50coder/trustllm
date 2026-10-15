import { z } from 'zod'
import { RulesSchema, DEFAULT_RULES } from './guardrails'
import { OPENAI_COMPATIBLE_PRESETS } from './providers'
import { evaluate, type EvaluateOptions } from './evaluate'
import type { ProviderSpec, Report } from './types'

const ModelInput = z.object({
  provider: z.enum(['demo', 'openai', 'anthropic']),
  /** Name from OPENAI_COMPATIBLE_PRESETS. Free-form URLs are not accepted on the server (SSRF). */
  preset: z.string().max(30).optional(),
  model: z.string().min(1).max(100),
  /** Used for this request only. Never stored or logged. */
  apiKey: z.string().max(400).optional(),
})

export const EvaluateRequest = z.object({
  mode: z.enum(['demo', 'live']),
  cases: z
    .array(
      z.object({
        id: z.string().max(60).optional(),
        prompt: z.string().min(1).max(4000),
        context: z.string().max(12000).optional(),
        answer: z.string().max(8000).optional(),
      }),
    )
    .min(1)
    .max(5),
  models: z.array(ModelInput).max(4).default([]),
  judge: ModelInput.optional(),
  samples: z.number().int().min(1).max(4).default(1),
  rules: RulesSchema.optional(),
})
export type EvaluateRequestBody = z.infer<typeof EvaluateRequest>

/** Upper bound on provider calls one request may trigger. */
export const MAX_CALLS = 60

function toSpec(m: z.infer<typeof ModelInput>, env: Record<string, string | undefined>, allowServerKeys: boolean): ProviderSpec {
  if (m.provider === 'demo') return { kind: 'demo', model: m.model }
  const preset = m.preset ? OPENAI_COMPATIBLE_PRESETS[m.preset] : undefined
  if (m.preset && !preset) throw new RequestError(`Unknown provider preset "${m.preset}".`)
  const serverKey = allowServerKeys ? env[m.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'] : undefined
  return { kind: m.provider, model: m.model, baseUrl: preset?.baseUrl, apiKey: m.apiKey || serverKey }
}

export class RequestError extends Error {}

export function estimateCalls(b: EvaluateRequestBody): number {
  const gen = b.cases.reduce((n, c) => n + (c.answer === undefined ? Math.max(1, b.models.length) : 0), 0)
  return gen * b.samples + b.cases.length * Math.max(1, b.models.length) * 2
}

export async function handleEvaluate(raw: unknown, env: Record<string, string | undefined> = {}, providerOptions?: EvaluateOptions['providerOptions']): Promise<Report> {
  const parsed = EvaluateRequest.safeParse(raw)
  if (!parsed.success) throw new RequestError(parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '))
  const b = parsed.data
  const allowServerKeys = env.TRUSTLLM_ALLOW_SERVER_KEYS === '1'
  if (b.mode === 'live' && b.models.length === 0 && b.cases.some((c) => c.answer === undefined)) throw new RequestError('Pick at least one model, or paste an answer to evaluate.')
  if (b.mode === 'live' && b.models.some((m) => m.provider === 'demo')) throw new RequestError('Demo models cannot be used in live mode.')
  if (b.mode === 'demo' && b.models.some((m) => m.provider !== 'demo')) throw new RequestError('Live models cannot be used in demo mode.')
  if (estimateCalls(b) > MAX_CALLS) throw new RequestError(`Too many model calls for one request (limit ${MAX_CALLS}). Reduce cases, models or samples.`)
  const models = b.models.map((m) => toSpec(m, env, allowServerKeys))
  const judge = b.judge ? toSpec(b.judge, env, allowServerKeys) : undefined
  return evaluate(b.cases, { mode: b.mode, models, judge, samples: b.samples, rules: b.rules ?? DEFAULT_RULES, providerOptions })
}

/** Best-effort in-memory limiter. On serverless each instance has its own counter, so this only blunts casual abuse. */
export function makeLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 5000) hits.clear()
    return true
  }
}
