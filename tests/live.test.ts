import { describe, expect, it } from 'vitest'
import { createProvider, redact, ProviderError, type FetchLike } from '@/lib/core/providers'
import { evaluate } from '@/lib/core/evaluate'
import { extractJson, parseClaimsReply, parseConsistencyReply } from '@/lib/core/judge'
import { parseConfig } from '@/lib/core/config'
import { main } from '@/cli/main'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const KEY = 'sk-test-SECRETSECRETSECRET1234'
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
const chat = (text: string) => json(200, { choices: [{ message: { content: text } }] })

describe('provider adapters (fake fetch)', () => {
  it('sends an OpenAI-compatible request with a bearer key', async () => {
    let seen: { url: string; init: RequestInit } | undefined
    const f: FetchLike = async (url, init) => ((seen = { url, init }), chat('hi'))
    const p = createProvider({ kind: 'openai', model: 'm', apiKey: KEY, baseUrl: 'https://example.test/v1/' }, { fetch: f })
    expect(await p.complete({ user: 'q', system: 's', temperature: 0, maxTokens: 5 })).toBe('hi')
    expect(seen!.url).toBe('https://example.test/v1/chat/completions')
    expect((seen!.init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`)
    expect(JSON.parse(seen!.init.body as string).messages[0].role).toBe('system')
  })
  it('adapts to max_completion_tokens and temperature errors', async () => {
    const bodies: Record<string, unknown>[] = []
    const f: FetchLike = async (_u, init) => {
      const b = JSON.parse(init.body as string)
      bodies.push(b)
      if ('max_tokens' in b) return json(400, { error: { message: "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens'." } })
      if ('temperature' in b) return json(400, { error: { message: "Unsupported value: 'temperature' does not support 0" } })
      return chat('ok')
    }
    const p = createProvider({ kind: 'openai', model: 'm', apiKey: KEY }, { fetch: f })
    expect(await p.complete({ user: 'q', temperature: 0, maxTokens: 5 })).toBe('ok')
    expect(bodies.at(-1)).toMatchObject({ max_completion_tokens: 5 })
    expect(bodies.at(-1)).not.toHaveProperty('temperature')
  })
  it('turns auth failures into readable errors and never leaks the key', async () => {
    const f: FetchLike = async () => json(401, { error: { message: `Incorrect API key provided: ${KEY}` } })
    const p = createProvider({ kind: 'openai', model: 'm', apiKey: KEY }, { fetch: f })
    const err = await p.complete({ user: 'q', temperature: 0, maxTokens: 5 }).catch((e) => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.message).toMatch(/key was rejected/)
    expect(err.message).not.toContain(KEY)
  })
  it('calls Anthropic with the right headers and parses text blocks', async () => {
    let seen: { url: string; init: RequestInit } | undefined
    const f: FetchLike = async (url, init) => ((seen = { url, init }), json(200, { content: [{ type: 'text', text: 'yo' }] }))
    const p = createProvider({ kind: 'anthropic', model: 'm', apiKey: KEY }, { fetch: f })
    expect(await p.complete({ user: 'q', system: 's', temperature: 0, maxTokens: 5 })).toBe('yo')
    expect(seen!.url).toBe('https://api.anthropic.com/v1/messages')
    const h = seen!.init.headers as Record<string, string>
    expect(h['x-api-key']).toBe(KEY)
    expect(h['anthropic-version']).toBeTruthy()
  })
  it('requires a key and reports network failures without the key', async () => {
    expect(() => createProvider({ kind: 'openai', model: 'm' })).toThrow(/No API key/)
    const f: FetchLike = async () => {
      throw new Error(`connect failed for ${KEY}`)
    }
    const err = await createProvider({ kind: 'openai', model: 'm', apiKey: KEY }, { fetch: f }).complete({ user: 'q', temperature: 0, maxTokens: 5 }).catch((e) => e)
    expect(err.message).not.toContain(KEY)
  })
  it('redact masks keys and key-shaped strings', () => {
    expect(redact(`a ${KEY} b`, KEY)).not.toContain('SECRETSECRET')
    expect(redact('sk-abcdefghijklmnopqrstuvwxyz')).toBe('sk-abcdefgh***')
  })
})

describe('judge parsing', () => {
  it('extracts JSON from fenced or chatty replies', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(() => extractJson('no json')).toThrow()
  })
  it('parses claims and consistency', () => {
    const r = parseClaimsReply('{"claims":[{"text":"x","verdict":"supported"}],"toxicity":{"severity":2}}')
    expect(r.toxicity).toBe(2)
    expect(() => parseClaimsReply('{"claims":[{"text":"x","verdict":"maybe"}],"toxicity":{"severity":0}}')).toThrow()
    expect(parseConsistencyReply('{"samples":[{"index":1,"verdict":"agree"},{"index":2,"verdict":"partial"}]}', 2)).toBe(75)
    expect(parseConsistencyReply('{"samples":[]}', 2)).toBe(0)
  })
})

/** A scripted "provider" behind fake fetch: answers, judge replies and sample variation. */
function scriptedFetch(opts: { answer: string; claims: unknown[]; tox?: number; consistency?: string }): FetchLike {
  return async (_url, init) => {
    const b = JSON.parse(init.body as string)
    const sys: string = b.messages[0].role === 'system' ? b.messages[0].content : ''
    if (sys.includes('atomic factual claims')) return chat(JSON.stringify({ claims: opts.claims, toxicity: { severity: opts.tox ?? 0 } }))
    if (sys.includes('compare a MAIN answer')) return chat(opts.consistency ?? '{"samples":[{"index":1,"verdict":"agree"},{"index":2,"verdict":"agree"}]}')
    return chat(opts.answer)
  }
}

describe('live evaluation (fake fetch)', () => {
  const model = { kind: 'openai' as const, model: 'gpt-x', apiKey: KEY }
  const c = { id: 'c1', prompt: 'Refund window?', context: 'Refunds within 30 days.' }

  it('passes a grounded answer and fails an ungrounded one using judge verdicts', async () => {
    const good = await evaluate([c], { mode: 'live', models: [model], samples: 3, providerOptions: { fetch: scriptedFetch({ answer: '30 days.', claims: [{ text: '30 days', verdict: 'supported' }] }) } })
    expect(good.results[0].decision).toBe('PASS')
    expect(good.results[0].signals.consistency).toBe(100)
    expect(good.judge).toBe('gpt-x')
    const bad = await evaluate([c], { mode: 'live', models: [model], samples: 3, providerOptions: { fetch: scriptedFetch({ answer: '90 days.', claims: [{ text: '90 days', verdict: 'contradicted' }], consistency: '{"samples":[{"index":1,"verdict":"contradict"},{"index":2,"verdict":"partial"}]}' }) } })
    expect(bad.results[0].decision).toBe('FAIL')
    expect(bad.results[0].signals.hallucinationRisk).toBe(100)
    expect(bad.notes.join(' ')).toMatch(/opinion/)
  })
  it('records a provider failure as ERROR with a redacted message and fails the gate', async () => {
    const f: FetchLike = async () => json(401, { error: { message: `bad key ${KEY}` } })
    const r = await evaluate([c], { mode: 'live', models: [model], providerOptions: { fetch: f } })
    expect(r.results[0].decision).toBe('ERROR')
    expect(JSON.stringify(r)).not.toContain(KEY)
    expect(r.summary.gate).toBe('FAIL')
  })
  it('live mode without a key reports a clear error, not a crash', async () => {
    const r = await evaluate([c], { mode: 'live', models: [{ kind: 'openai', model: 'gpt-x' }] })
    expect(r.results[0].error).toMatch(/No API key/)
  })
  it('judges a pasted answer with no model call for generation', async () => {
    const r = await evaluate([{ prompt: 'q', answer: 'fine' }], { mode: 'live', models: [], judge: model, providerOptions: { fetch: scriptedFetch({ answer: 'unused', claims: [{ text: 'fine', verdict: 'unverifiable' }] }) } })
    expect(r.results[0].decision).toBe('PASS')
  })
})

describe('config and CLI', () => {
  it('resolves keys from the named environment variable', () => {
    const cfg = parseConfig('mode: live\nmodels:\n  - { provider: openai, model: m, base_url: groq, api_key_env: MY_KEY }\ncases:\n  - { prompt: hi }', { MY_KEY: 'k123456789' })
    expect(cfg.models[0]).toMatchObject({ apiKey: 'k123456789', baseUrl: 'https://api.groq.com/openai/v1' })
    expect(cfg.rules.length).toBeGreaterThan(0)
  })
  it('rejects configs without cases', () => {
    expect(() => parseConfig('mode: demo')).toThrow()
  })
  const dir = mkdtempSync(join(tmpdir(), 'trustllm-'))
  const write = (name: string, body: string) => {
    const p = join(dir, name)
    writeFileSync(p, body)
    return p
  }
  const pass = 'mode: demo\ncases:\n  - { prompt: How long is the refund window?, context: Refunds are allowed within 30 days of purchase by customers. }\n'
  const failing = 'mode: demo\nmodels:\n  - { provider: demo, model: demo-rude }\ncases:\n  - { prompt: How long is the refund window?, context: Refunds are allowed within 30 days of purchase by customers. }\n'
  it('exit code 0 when the gate passes, 1 when it fails, 2 on bad config', async () => {
    expect(await main(['run', write('a.yaml', pass), '--quiet'], {})).toBe(0)
    expect(await main(['run', write('b.yaml', failing), '--quiet'], {})).toBe(1)
    expect(await main(['run', write('c.yaml', 'cases: []'), '--quiet'], {})).toBe(2)
    expect(await main(['run', join(dir, 'missing.yaml')], {})).toBe(2)
  })
  it('writes JSON and Markdown reports and a GitHub step summary', async () => {
    const out = join(dir, 'r.json')
    const md = join(dir, 'r.md')
    const summary = join(dir, 'summary.md')
    await main(['run', write('d.yaml', failing), '--json', out, '--md', md, '--quiet'], { GITHUB_STEP_SUMMARY: summary })
    expect(JSON.parse(readFileSync(out, 'utf8')).summary.gate).toBe('FAIL')
    expect(readFileSync(md, 'utf8')).toContain('release-gate report')
    expect(readFileSync(summary, 'utf8')).toContain('Gate: **FAIL**')
  })
  it('init writes a config that runs', async () => {
    const p = join(dir, 'init.yaml')
    expect(await main(['init', p], {})).toBe(0)
    expect(await main(['init', p], {})).toBe(2)
    expect(await main(['run', p, '--quiet'], {})).toBe(0)
  })
})
