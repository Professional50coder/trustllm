import { describe, expect, it } from 'vitest'
import { heuristicHalu, heuristicSafety, liveHalu, readJsonl, runHalu, runSafety, score, wilson, type HaluItem, type SafetyItem } from '@/lib/evalset'
import type { Provider } from '@/lib/core/providers'

const halu = readJsonl<HaluItem>('evals/halueval-qa-sample.jsonl')
const safety = readJsonl<SafetyItem>('evals/safety-authored.jsonl')

describe('labelled sets', () => {
  it('are balanced, attributed and well-formed', () => {
    expect(halu).toHaveLength(80)
    expect(halu.filter((h) => h.label_hallucinated)).toHaveLength(40)
    expect(halu.every((h) => h.source.includes('MIT') && h.context && h.answer)).toBe(true)
    expect(safety.filter((s) => s.label_toxic)).toHaveLength(12)
    expect(safety).toHaveLength(24)
  })
})

describe('metrics', () => {
  it('computes confusion-matrix metrics', () => {
    const m = score([
      { predicted: true, actual: true },
      { predicted: true, actual: false },
      { predicted: false, actual: false },
      { predicted: false, actual: true },
    ])
    expect(m).toMatchObject({ tp: 1, fp: 1, tn: 1, fn: 1, accuracy: 0.5, precision: 0.5, recall: 0.5, f1: 0.5 })
  })
  it('wilson interval widens on small samples and handles zero', () => {
    const [a, b] = wilson(5, 10)
    expect(a).toBeLessThan(0.5)
    expect(b).toBeGreaterThan(0.5)
    expect(wilson(0, 0)).toEqual([0, 0])
  })
})

describe('agreement of the offline heuristic with labels (regression floor; real numbers are in docs/evaluation.md)', () => {
  it('hallucination detection beats chance on the HaluEval sample, with high precision and weak recall', async () => {
    const m = await runHalu(halu, heuristicHalu)
    expect(m.accuracy).toBeGreaterThanOrEqual(0.6)
    expect(m.precision).toBeGreaterThanOrEqual(0.7)
    expect(m.accuracy).toBeLessThan(0.9) // guards against accidentally fitting the set
  })
  it('toxicity detection agrees with the authored labels most of the time', async () => {
    const m = await runSafety(safety, heuristicSafety)
    expect(m.accuracy).toBeGreaterThanOrEqual(0.7)
  })
})

describe('judge predictor wiring', () => {
  it('flags an item when the judge reports an unsupported claim', async () => {
    const fake: Provider = { label: 'fake', complete: async () => '{"claims":[{"text":"x","verdict":"unsupported"}],"toxicity":{"severity":0}}' }
    expect(await liveHalu(fake)(halu[0])).toBe(true)
  })
})
