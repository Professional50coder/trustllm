import { describe, expect, it } from 'vitest'
import { PACKS, getPack } from '@/lib/core/packs'
import { RulesSchema, rulesToYaml, parseRules } from '@/lib/core/guardrails'
import { evaluate } from '@/lib/core/evaluate'
import { approveResult, revokeApproval, summarize } from '@/lib/core/approval'
import { toCsv, toMarkdown } from '@/lib/core/report'
import { decodeReport, encodeReport } from '@/lib/client/share'
import { handleMcp } from '@/cli/mcp'
import { exampleConfig, main } from '@/cli/main'
import { parseConfig } from '@/lib/core/config'
import type { FetchLike } from '@/lib/core/providers'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CTX = 'Customers may request a refund within 30 days of purchase. Refunds are issued to the original payment method within 5 business days.'
const prompt = 'How long do customers have to request a refund?'
const demo = (m: string) => ({ kind: 'demo' as const, model: m })

describe('guardrail packs', () => {
  it('are valid, uniquely identified and round-trip through YAML', () => {
    expect(new Set(PACKS.map((p) => p.id)).size).toBe(PACKS.length)
    for (const p of PACKS) {
      expect(RulesSchema.safeParse(p.rules).success).toBe(true)
      expect(parseRules(rulesToYaml(p.rules))).toHaveLength(p.rules.length)
      expect(p.audience.length).toBeGreaterThan(10)
    }
  })
  it('structured-output pack uses only exact checks', () => {
    const judgeTypes = ['min_grounding', 'max_hallucination_risk', 'max_toxicity', 'min_consistency']
    expect(getPack('structured-output')!.rules.some((r) => judgeTypes.includes(r.type))).toBe(false)
  })
  it('the lenient pack passes where the strict one fails, on the same sloppy answer', async () => {
    const run = async (id: string) => (await evaluate([{ prompt, context: CTX }], { mode: 'demo', models: [demo('demo-sloppy')], samples: 3, rules: getPack(id)!.rules })).results[0].decision
    expect(await run('support-bot')).toBe('FAIL')
    expect(await run('try-it-lenient')).toBe('PASS')
  })
  it('init --pack writes a config that parses with that pack', () => {
    const cfg = parseConfig(exampleConfig('rag-strict'))
    expect(cfg.rules.map((r) => r.type)).toContain('has_citations')
    expect(() => exampleConfig('nope')).toThrow(/Unknown pack/)
  })
  it('CLI init --pack validates the pack name', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tl-pack-'))
    expect(await main(['init', join(dir, 'a.yaml'), '--pack', 'safety-first'], {})).toBe(0)
    expect(readFileSync(join(dir, 'a.yaml'), 'utf8')).toContain('safety-first')
    expect(await main(['init', join(dir, 'b.yaml'), '--pack', 'bogus'], {})).toBe(2)
  })
})

describe('human approval', () => {
  const run = () => evaluate([{ prompt, context: CTX }], { mode: 'demo', models: [demo('demo-careful'), demo('demo-rude')], samples: 2 })
  it('turns a failed gate into a recorded, auditable release and can be withdrawn', async () => {
    const report = await run()
    expect(report.summary.gate).toBe('FAIL')
    const i = report.results.findIndex((r) => r.decision === 'FAIL')
    expect(() => approveResult(report, i, 'short')).toThrow(/reason/)
    expect(() => approveResult(report, report.results.findIndex((r) => r.decision === 'PASS'), 'a long enough reason')).toThrow(/failed/)
    const approved = approveResult(report, i, 'Reviewed with the legal team; the quote is intentional.', () => new Date('2026-01-01T00:00:00Z'))
    expect(approved.results[i].decision).toBe('FAIL') // original decision preserved
    expect(approved.results[i].approval?.at).toBe('2026-01-01T00:00:00.000Z')
    expect(approved.summary).toMatchObject({ gate: 'PASS', failed: 0, approved: 1 })
    expect(approved.recommendation.headline).toBe('Released with human approval')
    expect(toMarkdown(approved)).toContain('Approved by a reviewer')
    expect(toCsv(approved)).toContain('"yes"')
    const withdrawn = revokeApproval(approved, i)
    expect(withdrawn.summary.gate).toBe('FAIL')
    expect(withdrawn.results[i].approval).toBeUndefined()
    expect(summarize(report.results).gate).toBe('FAIL')
  })
})

describe('usage and latency', () => {
  it('counts calls and sums provider-reported tokens per result', async () => {
    const f: FetchLike = async (_u, init) => {
      const b = JSON.parse(init.body as string)
      const sys = b.messages[0].role === 'system' ? b.messages[0].content : ''
      const text = sys.includes('atomic factual claims') ? '{"claims":[{"text":"x","verdict":"supported"}],"toxicity":{"severity":0}}' : sys.includes('MAIN answer') ? '{"samples":[{"index":1,"verdict":"agree"}]}' : '30 days'
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 })
    }
    const r = await evaluate([{ prompt, context: CTX }], { mode: 'live', models: [{ kind: 'openai', model: 'm', apiKey: 'sk-test-0123456789' }], samples: 2, providerOptions: { fetch: f } })
    // 1 answer + 1 sample + 1 claims judge + 1 consistency judge
    expect(r.results[0].usage).toEqual({ calls: 4, inputTokens: 40, outputTokens: 20 })
    expect(toMarkdown(r)).toContain('4 provider calls, 40 input and 20 output tokens')
  })
  it('demo mode reports zero calls and null tokens', async () => {
    const r = await evaluate([{ prompt, context: CTX }], { mode: 'demo', models: [demo('demo-careful')] })
    expect(r.results[0].usage).toEqual({ calls: 0, inputTokens: null, outputTokens: null })
  })
})

describe('share links', () => {
  it('round-trips a report through the URL fragment format', async () => {
    const report = await evaluate([{ prompt, context: CTX }], { mode: 'demo', models: [demo('demo-careful'), demo('demo-sloppy')], samples: 3 })
    const token = await encodeReport(report)
    expect(token).toMatch(/^z\.[A-Za-z0-9_-]+$/)
    expect(token.length).toBeLessThan(JSON.stringify(report).length) // compressed
    const back = await decodeReport(token)
    expect(back.summary).toEqual(report.summary)
    expect(back.results[1].answer).toBe(report.results[1].answer)
  })
  it('rejects garbage and non-report payloads', async () => {
    await expect(decodeReport('nonsense')).rejects.toThrow(/not a TrustLLM report link/)
    const bad = `j.${btoa(JSON.stringify({ hello: 1 })).replace(/=+$/, '')}`
    await expect(decodeReport(bad)).rejects.toThrow(/not valid/)
  })
})

describe('MCP server', () => {
  const call = (method: string, params?: Record<string, unknown>) => handleMcp({ jsonrpc: '2.0', id: 1, method, params }, {})
  it('initializes, lists tools and answers ping; notifications get no response', async () => {
    const init = (await call('initialize', { protocolVersion: '2025-03-26' })) as { result: { protocolVersion: string; capabilities: unknown; serverInfo: { name: string } } }
    expect(init.result.protocolVersion).toBe('2025-03-26')
    expect(init.result.serverInfo.name).toBe('trustllm')
    const list = (await call('tools/list')) as { result: { tools: { name: string }[] } }
    expect(list.result.tools.map((t) => t.name)).toEqual(['evaluate', 'list_packs', 'list_rule_types'])
    expect(await call('ping')).toMatchObject({ result: {} })
    expect(await handleMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, {})).toBeNull()
  })
  it('evaluate runs the gate and returns Markdown plus structured content', async () => {
    const res = (await call('tools/call', { name: 'evaluate', arguments: { prompt, context: CTX, pack: 'support-bot' } })) as { result: { content: { text: string }[]; structuredContent: { summary: { gate: string }; schema: string } } }
    expect(res.result.structuredContent.schema).toBe('trustllm.report/v1')
    expect(res.result.structuredContent.summary.gate).toBe('PASS')
    expect(res.result.content[0].text).toContain('release-gate report')
  })
  it('evaluates a pasted answer and reports a failure', async () => {
    const res = (await call('tools/call', { name: 'evaluate', arguments: { prompt: 'q', answer: 'mail me at a@b.com' } })) as { result: { structuredContent: { summary: { gate: string } } } }
    expect(res.result.structuredContent.summary.gate).toBe('FAIL')
  })
  it('returns tool-level errors for bad input and protocol errors for unknown things', async () => {
    const bad = (await call('tools/call', { name: 'evaluate', arguments: { prompt: '' } })) as { result: { isError: boolean; content: { text: string }[] } }
    expect(bad.result.isError).toBe(true)
    const nopack = (await call('tools/call', { name: 'evaluate', arguments: { prompt: 'q', pack: 'x' } })) as { result: { isError: boolean } }
    expect(nopack.result.isError).toBe(true)
    const live = (await call('tools/call', { name: 'evaluate', arguments: { prompt: 'q', mode: 'live', model: 'm' } })) as { result: { structuredContent: { results: { error: string }[] } } }
    expect(live.result.structuredContent.results[0].error).toMatch(/No API key/)
    expect(await call('tools/call', { name: 'nope', arguments: {} })).toMatchObject({ error: { code: -32602 } })
    expect(await call('bogus/method')).toMatchObject({ error: { code: -32601 } })
    const packs = (await call('tools/call', { name: 'list_packs', arguments: {} })) as { result: { content: { text: string }[] } }
    expect(JSON.parse(packs.result.content[0].text)).toHaveLength(PACKS.length)
  })
})
