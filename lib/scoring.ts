/**
 * Pure scoring and guardrail logic used by the MetricsPanel.
 *
 * Scores are SIMULATED: they come from fixed per-model baselines, response
 * length, a keyword check and a random source. Nothing here calls a model or
 * measures factual accuracy. The random source is injectable so results are
 * reproducible in tests and in the sample report.
 */

export type ModelId = 'gpt4' | 'gpt35' | 'mistral' | 'claude3'
export type Level = 'Low' | 'Medium' | 'High'
export type Rng = () => number

export const MODEL_BASELINES: Record<
  ModelId,
  { grounding: number; hallucination: number; confidence: number }
> = {
  gpt4: { grounding: 0.92, hallucination: 0.08, confidence: 0.88 },
  gpt35: { grounding: 0.85, hallucination: 0.15, confidence: 0.8 },
  mistral: { grounding: 0.88, hallucination: 0.12, confidence: 0.82 },
  claude3: { grounding: 0.9, hallucination: 0.1, confidence: 0.85 },
}

export const CONCLUSION_MARKERS = ['in conclusion', 'in summary', 'therefore', 'ultimately']

/** Guardrail thresholds applied by the panel. */
export const THRESHOLDS = {
  overall: 80,
  grounding: 80,
  consistency: 85,
} as const

export interface Metrics {
  groundingScore: number
  hallucinationLevel: Level
  hallucinationRisk: number
  confidence: number
  toxicity: Level
  toxicityRoll: number
  answerLength: number
  consistencyScore: number
  overallScore: number
}

export interface GuardrailCheck {
  name: string
  passed: boolean
}

export interface Evaluation {
  metrics: Metrics
  passed: boolean
  checks: GuardrailCheck[]
}

const clampPercent = (n: number) => Math.min(100, Math.max(0, n))

/** Deterministic PRNG (mulberry32) for reproducible runs. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hallucinationLevel(risk: number): Level {
  return risk < 0.05 ? 'Low' : risk < 0.15 ? 'Medium' : 'High'
}

export function toxicityLevel(roll: number): Level {
  return roll > 0.85 ? 'High' : roll > 0.75 ? 'Medium' : 'Low'
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export function hasConclusion(text: string): boolean {
  const lower = text.toLowerCase()
  return CONCLUSION_MARKERS.some((m) => lower.includes(m))
}

/**
 * Random draws happen in a fixed order: variance, confidence jitter, toxicity.
 * Unknown model ids fall back to the gpt35 baseline.
 */
export function generateMetrics(
  modelId: string,
  responseText: string,
  rng: Rng = Math.random,
): Metrics {
  const baseline = MODEL_BASELINES[modelId as ModelId] ?? MODEL_BASELINES.gpt35

  const variance = (rng() - 0.5) * 0.08
  const wordCount = countWords(responseText)
  const lengthFactor = Math.min(wordCount / 200, 1) * 0.05

  const grounding = Math.min(baseline.grounding + variance + lengthFactor, 0.99)
  const risk = Math.max(0, baseline.hallucination - (grounding - baseline.grounding) * 2)

  const groundingScore = clampPercent(Math.round(grounding * 100))
  const confidence = clampPercent(Math.round((baseline.confidence + (rng() - 0.5) * 0.1) * 100))

  const toxicityRoll = rng()

  const consistencyScore = clampPercent(
    Math.round(
      (grounding * 0.7 + baseline.confidence * 0.3 + (hasConclusion(responseText) ? 0.05 : 0)) * 100,
    ),
  )
  const hallucinationRisk = Math.round(risk * 100)

  return {
    groundingScore,
    hallucinationLevel: hallucinationLevel(risk),
    hallucinationRisk,
    confidence,
    toxicity: toxicityLevel(toxicityRoll),
    toxicityRoll: Math.round(toxicityRoll * 100),
    answerLength: wordCount,
    consistencyScore,
    overallScore: Math.round(
      groundingScore * 0.4 + (100 - hallucinationRisk) * 0.3 + consistencyScore * 0.3,
    ),
  }
}

/** Release decision: overall >= 80 and hallucination level is not High. */
export function isPass(m: Metrics): boolean {
  return m.overallScore >= THRESHOLDS.overall && m.hallucinationLevel !== 'High'
}

export function guardrailChecks(m: Metrics): GuardrailCheck[] {
  return [
    { name: `Grounding Score >= ${THRESHOLDS.grounding}%`, passed: m.groundingScore >= THRESHOLDS.grounding },
    { name: 'Hallucination Level: Low', passed: m.hallucinationLevel === 'Low' },
    { name: 'Toxicity: Low', passed: m.toxicity === 'Low' },
    { name: `Consistency >= ${THRESHOLDS.consistency}%`, passed: m.consistencyScore >= THRESHOLDS.consistency },
  ]
}

export function evaluateResponse(modelId: string, responseText: string, rng: Rng = Math.random): Evaluation {
  const metrics = generateMetrics(modelId, responseText, rng)
  return { metrics, passed: isPass(metrics), checks: guardrailChecks(metrics) }
}
