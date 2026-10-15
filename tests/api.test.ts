import { describe, expect, it } from 'vitest'
import { handleEvaluate, makeLimiter, RequestError, estimateCalls, EvaluateRequest } from '@/lib/core/api'
import { POST } from '@/app/api/evaluate/route'
import { GET } from '@/app/api/health/route'
import type { FetchLike } from '@/lib/core/providers'

const CTX = 'Refunds are allowed within 30 days of purchase by customers.'
const demoBody = { mode: 'demo', cases: [{ prompt: 'How long is the refund window?', context: CTX }], models: [{ provider: 'demo', model: 'demo-careful' }], samples: 2 }
const post = (body: unknown) => POST(new Request('http://x/api/evaluate', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` } }))

describe('/api/evaluate', () => {
  it('runs a demo evaluation and returns a versioned report', async () => {
    const res = await post(demoBody)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const j = await res.json()
    expect(j.schema).toBe('trustllm.report/v1')
    expect(j.mode).toBe('demo')
    expect(j.results[0].decision).toBe('PASS')
  })
  it('rejects bad input with 400 and a readable message', async () => {
    const res = await post({ mode: 'demo', cases: [] })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/cases/)
    const bad = await POST(new Request('http://x', { method: 'POST', body: 'not json' }))
    expect(bad.status).toBe(400)
  })
  it('refuses oversize bodies and unknown presets', async () => {
    const big = await POST(new Request('http://x', { method: 'POST', body: '{}', headers: { 'content-length': '999999' } }))
    expect(big.status).toBe(413)
    await expect(handleEvaluate({ ...demoBody, mode: 'live', models: [{ provider: 'openai', preset: 'evil', model: 'm', apiKey: 'k12345678' }] })).rejects.toThrow(RequestError)
  })
  it('does not accept a free-form base URL (SSRF guard)', () => {
    const p = EvaluateRequest.parse({ ...demoBody, models: [{ provider: 'openai', model: 'm', baseUrl: 'http://169.254.169.254' }] })
    expect(JSON.stringify(p)).not.toContain('169.254')
  })
  it('enforces the call budget and mode/provider consistency', async () => {
    const many = { mode: 'live', cases: Array.from({ length: 5 }, () => ({ prompt: 'q' })), models: Array.from({ length: 4 }, () => ({ provider: 'openai', model: 'm', apiKey: 'k12345678' })), samples: 4 }
    expect(estimateCalls(EvaluateRequest.parse(many))).toBeGreaterThan(60)
    await expect(handleEvaluate(many)).rejects.toThrow(/Too many model calls/)
    await expect(handleEvaluate({ ...demoBody, mode: 'live' })).rejects.toThrow(/Demo models/)
    await expect(handleEvaluate({ ...demoBody, models: [{ provider: 'openai', model: 'm' }] })).rejects.toThrow(/Live models/)
  })
  it('live mode uses the request key only for that call and never echoes it', async () => {
    const KEY = 'sk-request-KEYKEYKEYKEY1234567'
    const seenKeys: string[] = []
    const f: FetchLike = async (_u, init) => {
      seenKeys.push((init.headers as Record<string, string>).authorization)
      const b = JSON.parse(init.body as string)
      const sys = b.messages[0].role === 'system' ? b.messages[0].content : ''
      const text = sys.includes('atomic factual claims') ? '{"claims":[{"text":"30 days","verdict":"supported"}],"toxicity":{"severity":0}}' : '30 days'
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 })
    }
    const report = await handleEvaluate({ mode: 'live', cases: [{ prompt: 'q', context: CTX }], models: [{ provider: 'openai', model: 'm', apiKey: KEY }], samples: 1 }, {}, { fetch: f })
    expect(report.results[0].decision).toBe('PASS')
    expect(seenKeys.every((k) => k === `Bearer ${KEY}`)).toBe(true)
    expect(JSON.stringify(report)).not.toContain(KEY)
  })
  it('server keys are ignored unless explicitly enabled', async () => {
    const f: FetchLike = async () => new Response('{}', { status: 500 })
    const r = await handleEvaluate({ mode: 'live', cases: [{ prompt: 'q' }], models: [{ provider: 'openai', model: 'm' }] }, { OPENAI_API_KEY: 'sk-server-keykeykeykey123456' }, { fetch: f })
    expect(r.results[0].error).toMatch(/No API key/)
  })
  it('rate limiter blocks after the cap and recovers after the window', () => {
    const allow = makeLimiter(2, 1000)
    expect([allow('a', 0), allow('a', 1), allow('a', 2)]).toEqual([true, true, false])
    expect(allow('b', 2)).toBe(true)
    expect(allow('a', 2000)).toBe(true)
  })
})

describe('/api/health', () => {
  it('reports capabilities and never exposes key values', async () => {
    const j = await GET().json()
    expect(j.ok).toBe(true)
    expect(JSON.stringify(j)).not.toMatch(/sk-/)
    expect(j.presets.length).toBeGreaterThan(1)
  })
})
