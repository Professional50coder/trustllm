import { describe, expect, it } from 'vitest'
import {
  MODEL_BASELINES,
  countWords,
  evaluateResponse,
  generateMetrics,
  guardrailChecks,
  hallucinationLevel,
  hasConclusion,
  isPass,
  seededRng,
  toxicityLevel,
  type Metrics,
} from '@/lib/scoring'
import { generateMockResponse } from '@/lib/mock-responses'

const constRng = (v: number) => () => v

const base: Metrics = {
  groundingScore: 90,
  hallucinationLevel: 'Low',
  hallucinationRisk: 4,
  confidence: 85,
  toxicity: 'Low',
  toxicityRoll: 10,
  answerLength: 100,
  consistencyScore: 90,
  overallScore: 90,
}

describe('level bucketing', () => {
  it('maps hallucination risk to Low/Medium/High at the boundaries', () => {
    expect(hallucinationLevel(0)).toBe('Low')
    expect(hallucinationLevel(0.0499)).toBe('Low')
    expect(hallucinationLevel(0.05)).toBe('Medium')
    expect(hallucinationLevel(0.1499)).toBe('Medium')
    expect(hallucinationLevel(0.15)).toBe('High')
  })
  it('maps the toxicity roll to Low/Medium/High at the boundaries', () => {
    expect(toxicityLevel(0.75)).toBe('Low')
    expect(toxicityLevel(0.76)).toBe('Medium')
    expect(toxicityLevel(0.85)).toBe('Medium')
    expect(toxicityLevel(0.86)).toBe('High')
  })
})

describe('text helpers', () => {
  it('counts words and treats empty text as zero', () => {
    expect(countWords('a  b\nc')).toBe(3)
    expect(countWords('')).toBe(0)
  })
  it('detects conclusion markers case-insensitively', () => {
    expect(hasConclusion('In Summary, yes')).toBe(true)
    expect(hasConclusion('no marker here')).toBe(false)
  })
})

describe('isPass', () => {
  it('passes at overall 80 with non-High hallucination', () => {
    expect(isPass({ ...base, overallScore: 80, hallucinationLevel: 'Medium' })).toBe(true)
  })
  it('fails below 80', () => {
    expect(isPass({ ...base, overallScore: 79 })).toBe(false)
  })
  it('fails on High hallucination even with a high score', () => {
    expect(isPass({ ...base, overallScore: 95, hallucinationLevel: 'High' })).toBe(false)
  })
})

describe('guardrailChecks', () => {
  it('reports each rule independently', () => {
    const checks = guardrailChecks({ ...base, groundingScore: 79, consistencyScore: 85, toxicity: 'Medium' })
    const by = Object.fromEntries(checks.map((c) => [c.name, c.passed]))
    expect(by['Grounding Score >= 80%']).toBe(false)
    expect(by['Consistency >= 85%']).toBe(true)
    expect(by['Toxicity: Low']).toBe(false)
    expect(by['Hallucination Level: Low']).toBe(true)
  })
})

describe('generateMetrics', () => {
  const text = generateMockResponse('gpt4', 'What is machine learning?')

  it('is reproducible for the same seed', () => {
    const a = generateMetrics('gpt4', text, seededRng(42))
    const b = generateMetrics('gpt4', text, seededRng(42))
    expect(a).toEqual(b)
  })

  it('keeps every percentage within 0-100 for all models over many seeds', () => {
    for (const id of Object.keys(MODEL_BASELINES)) {
      for (let seed = 0; seed < 300; seed++) {
        const m = generateMetrics(id, text, seededRng(seed))
        for (const v of [m.groundingScore, m.hallucinationRisk, m.confidence, m.consistencyScore, m.overallScore]) {
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('never reports negative hallucination risk at the grounding cap', () => {
    // rng 1 => max positive variance; gpt4 + long text hits the 0.99 cap.
    const long = 'word '.repeat(300)
    const m = generateMetrics('gpt4', long, constRng(1))
    expect(m.groundingScore).toBe(99)
    expect(m.hallucinationRisk).toBeGreaterThanOrEqual(0)
    expect(m.hallucinationLevel).toBe('Low')
  })

  it('adds the conclusion bonus to consistency', () => {
    const without = generateMetrics('gpt35', 'plain answer text', constRng(0.5))
    const withMarker = generateMetrics('gpt35', 'plain answer text therefore', constRng(0.5))
    expect(withMarker.consistencyScore).toBeGreaterThan(without.consistencyScore)
  })

  it('falls back to the gpt35 baseline for unknown models', () => {
    expect(generateMetrics('nope', text, seededRng(7))).toEqual(generateMetrics('gpt35', text, seededRng(7)))
  })

  it('computes overall as 0.4*grounding + 0.3*(100-risk) + 0.3*consistency', () => {
    const m = generateMetrics('mistral', text, seededRng(3))
    const expected = Math.round(
      m.groundingScore * 0.4 + (100 - m.hallucinationRisk) * 0.3 + m.consistencyScore * 0.3,
    )
    expect(m.overallScore).toBe(expected)
  })

  it('uses the third draw for toxicity so a high roll fails the toxicity guardrail', () => {
    let n = 0
    const rng = () => [0.5, 0.5, 0.95][n++]
    const e = evaluateResponse('gpt4', text, rng)
    expect(e.metrics.toxicity).toBe('High')
    expect(e.checks.find((c) => c.name === 'Toxicity: Low')?.passed).toBe(false)
  })
})

describe('seededRng', () => {
  it('stays in [0,1) and differs by seed', () => {
    const r = seededRng(1)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    expect(seededRng(1)()).not.toBe(seededRng(2)())
  })
})

describe('generateMockResponse', () => {
  it('interpolates the prompt and falls back to gpt4 for unknown models', () => {
    expect(generateMockResponse('claude3', 'my prompt')).toContain('my prompt')
    expect(generateMockResponse('unknown', 'p')).toBe(generateMockResponse('gpt4', 'p'))
  })
})
