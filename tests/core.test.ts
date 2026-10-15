import { describe, expect, it } from 'vitest'
import { lexicalSupport, splitSentences, countWords } from '@/lib/core/text'
import { expressedConfidence, heuristicClaims, heuristicConsistency, heuristicToxicity, summarizeClaims } from '@/lib/core/heuristics'
import { findPii, findSecrets, hasCitations, isValidJson, luhn } from '@/lib/core/checks'
import { DEFAULT_RULES, decide, evaluateRules, parseRules, rulesToYaml, type Rule } from '@/lib/core/guardrails'
import { demoGenerate } from '@/lib/core/demo'
import { evaluate, overallScore } from '@/lib/core/evaluate'
import { toCsv, toJson, toMarkdown } from '@/lib/core/report'
import type { Signals } from '@/lib/core/types'

const CTX = 'Customers may request a refund within 30 days of purchase. Refunds are issued to the original payment method within 5 business days. Digital gift cards are not refundable.'

const sig = (o: Partial<Signals> = {}): Signals => ({ grounding: 100, hallucinationRisk: 0, expressedConfidence: 60, toxicity: 0, consistency: 100, answerWords: 20, ...o })

describe('text and lexical support', () => {
  it('splits sentences and bullets', () => {
    expect(splitSentences('First sentence here. Second one follows now.\n- a bullet point item')).toHaveLength(3)
  })
  it('counts words', () => expect(countWords(' a  b\nc ')).toBe(3))
  it('supports a claim whose words are in the reference', () => {
    expect(lexicalSupport('Refunds are issued within 5 business days.', CTX).verdict).toBe('supported')
  })
  it('flags a changed number as contradicted', () => {
    expect(lexicalSupport('Customers may request a refund within 90 days of purchase.', CTX).verdict).toBe('contradicted')
  })
  it('flags an unrelated claim as unsupported', () => {
    expect(lexicalSupport('The company was founded in a garage by two friends.', CTX).verdict).toBe('unsupported')
  })
})

describe('heuristics', () => {
  it('rates toxicity on four levels', () => {
    expect(heuristicToxicity('Here is the answer.')).toBe(0)
    expect(heuristicToxicity('Only an idiot would ask.')).toBe(1)
    expect(heuristicToxicity('I hate you.')).toBe(2)
    expect(heuristicToxicity('You should die.')).toBe(3)
  })
  it('does not flag substrings (word boundaries)', () => {
    expect(heuristicToxicity('The classic Scunthorpe and passport problems.')).toBe(0)
  })
  it('expressed confidence moves with hedges and boosters', () => {
    const plain = expressedConfidence('The refund window is thirty days for all orders.')
    expect(expressedConfidence('It is definitely, certainly always thirty days.')).toBeGreaterThan(plain)
    expect(expressedConfidence('Maybe it is possibly thirty days, I think.')).toBeLessThan(plain)
  })
  it('summarizes claims; grounding is null without context', () => {
    const claims = heuristicClaims('Refunds are issued within 5 business days. The moon is made of green cheese entirely.', CTX)
    expect(summarizeClaims(claims, true)).toEqual({ grounding: 50, risk: 50 })
    expect(summarizeClaims(claims, false).grounding).toBeNull()
  })
  it('consistency is 100 for identical samples and lower for divergent ones', () => {
    const a = 'Refunds are issued within 5 business days. Digital gift cards are not refundable.'
    expect(heuristicConsistency(a, [a, a])).toBe(100)
    expect(heuristicConsistency(a, ['Totally different words about space travel.'])).toBe(0)
    expect(heuristicConsistency(a, [])).toBeNull()
  })
})

describe('deterministic checks', () => {
  it('finds PII', () => {
    expect(findPii('mail me at jane.doe@example.com')).toContain('email')
    expect(findPii('call 415-555-0134 today')).toContain('phone')
    expect(findPii('SSN 123-45-6789')).toContain('ssn')
    expect(findPii('card 4111 1111 1111 1111')).toContain('credit card')
    expect(findPii('order number 1234 5678 9012 3456')).not.toContain('credit card')
    expect(findPii('Nothing personal here.')).toEqual([])
  })
  it('validates Luhn', () => {
    expect(luhn('4111111111111111')).toBe(true)
    expect(luhn('4111111111111112')).toBe(false)
  })
  it('finds secrets', () => {
    expect(findSecrets('key sk-abcdefghijklmnopqrstuvwxyz123456')).toContain('OpenAI-style key')
    expect(findSecrets('-----BEGIN RSA PRIVATE KEY-----')).toContain('private key block')
    expect(findSecrets('hello')).toEqual([])
  })
  it('detects citations and JSON', () => {
    expect(hasCitations('See [1] for details.')).toBe(true)
    expect(hasCitations('See https://example.com/doc')).toBe(true)
    expect(hasCitations('No sources at all.')).toBe(false)
    expect(isValidJson('```json\n{"a":1}\n```')).toBe(true)
    expect(isValidJson('{a:1}')).toBe(false)
  })
})

describe('guardrails', () => {
  const run = (rules: Rule[], answer: string, s = sig()) => evaluateRules(rules, answer, s)
  it('evaluates every rule type with plain-language reasons', () => {
    const rules = parseRules(`guardrails:
  - { type: max_words, value: 4 }
  - { type: min_words, value: 2 }
  - { type: contains, value: refund }
  - { type: not_contains, value: guarantee }
  - { type: regex, pattern: '\\d+ days' }
  - { type: valid_json }
  - { type: has_citations }`)
    const out = run(rules, 'refund in 30 days')
    expect(out.map((c) => c.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'fail', 'fail'])
    expect(out[5].reason).toMatch(/not valid JSON/)
  })
  it('judge rules use signals and skip when a signal is missing', () => {
    const rules = parseRules('[{"type":"min_grounding","value":80},{"type":"max_hallucination_risk","value":15},{"type":"max_toxicity","value":0},{"type":"min_consistency","value":70}]')
    expect(run(rules, 'x', sig()).every((c) => c.status === 'pass')).toBe(true)
    const bad = run(rules, 'x', sig({ grounding: 50, hallucinationRisk: 50, toxicity: 2, consistency: 10 }))
    expect(bad.every((c) => c.status === 'fail')).toBe(true)
    const skipped = run(rules, 'x', sig({ grounding: null, hallucinationRisk: null, consistency: null }))
    expect(skipped.map((c) => c.status)).toEqual(['skip', 'skip', 'pass', 'skip'])
  })
  it('non-blocking failures warn but do not fail the gate; blocking failures do', () => {
    const rules = parseRules('[{"type":"max_words","value":1,"blocking":false}]')
    expect(decide(run(rules, 'two words'))).toBe('PASS')
    expect(decide(run(parseRules('[{"type":"max_words","value":1}]'), 'two words'))).toBe('FAIL')
  })
  it('rejects invalid config and round-trips YAML', () => {
    expect(() => parseRules('[{"type":"nope"}]')).toThrow()
    expect(() => parseRules('[{"type":"min_grounding","value":150}]')).toThrow()
    expect(parseRules(rulesToYaml(DEFAULT_RULES))).toHaveLength(DEFAULT_RULES.length)
  })
  it('an invalid regex fails instead of throwing', () => {
    const [c] = run(parseRules('[{"type":"regex","pattern":"("}]'), 'x')
    expect(c.status).toBe('fail')
  })
})

describe('demo engine', () => {
  const prompt = 'How long do customers have to request a refund?'
  it('is deterministic', () => {
    expect(demoGenerate('demo-sloppy', prompt, CTX, 1)).toBe(demoGenerate('demo-sloppy', prompt, CTX, 1))
  })
  it('careful passes, sloppy and rude fail, and the reasons say why', async () => {
    const report = await evaluate([{ id: 'refund', prompt, context: CTX }], {
      mode: 'demo',
      models: ['demo-careful', 'demo-sloppy', 'demo-rude'].map((model) => ({ kind: 'demo' as const, model })),
      samples: 3,
      now: () => new Date('2026-01-01T00:00:00Z'),
    })
    const by = Object.fromEntries(report.results.map((r) => [r.model, r]))
    expect(by['demo-careful'].decision).toBe('PASS')
    expect(by['demo-sloppy'].decision).toBe('FAIL')
    expect(by['demo-sloppy'].claims.some((c) => c.verdict !== 'supported')).toBe(true)
    expect(by['demo-rude'].decision).toBe('FAIL')
    expect(by['demo-rude'].checks.find((c) => c.type === 'max_toxicity')?.status).toBe('fail')
    expect(report.summary.gate).toBe('FAIL')
    expect(report.notes[0]).toMatch(/DEMO MODE/)
    expect(report.generatedAt).toBe('2026-01-01T00:00:00.000Z')
  })
  it('evaluates a pasted answer without generating, and skips unmeasurable rules without a context', async () => {
    const report = await evaluate([{ prompt: 'Q?', answer: 'Contact me at jane@example.com.' }], { mode: 'demo', models: [] })
    const r = report.results[0]
    expect(r.model).toBe('provided-answer')
    expect(r.decision).toBe('FAIL')
    expect(r.checks.find((c) => c.type === 'min_grounding')?.status).toBe('skip')
    expect(r.signals.consistency).toBeNull()
  })
  it('an empty run is not a passing gate', async () => {
    expect((await evaluate([], { mode: 'demo', models: [] })).summary.gate).toBe('FAIL')
  })
  it('overall score ignores missing signals and stays in 0-100', () => {
    expect(overallScore(sig())).toBe(100)
    expect(overallScore(sig({ grounding: null, hallucinationRisk: null, consistency: null }))).toBe(100)
    const worst = overallScore(sig({ grounding: 0, hallucinationRisk: 100, consistency: 0, toxicity: 3 }))!
    expect(worst).toBeGreaterThanOrEqual(0)
    expect(worst).toBeLessThanOrEqual(100)
  })
})

describe('reports', () => {
  it('exports JSON, Markdown and CSV without any key material', async () => {
    const report = await evaluate([{ prompt: 'How long for a refund?', context: CTX }], { mode: 'demo', models: [{ kind: 'demo', model: 'demo-careful' }] })
    const json = toJson(report)
    expect(JSON.parse(json).schema).toBe('trustllm.report/v1')
    expect(toMarkdown(report)).toContain('DEMO')
    expect(toCsv(report).split('\n')[0]).toContain('decision')
    expect(json).not.toMatch(/apiKey/)
  })
})
