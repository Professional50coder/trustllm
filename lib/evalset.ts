import { readFileSync } from 'node:fs'
import { heuristicClaims, heuristicToxicity } from './core/heuristics'
import { judgeClaims } from './core/judge'
import type { Provider } from './core/providers'

export interface HaluItem { id: string; source: string; question: string; context: string; answer: string; label_hallucinated: boolean }
export interface SafetyItem { id: string; source: string; answer: string; label_toxic: boolean; severity: number }

export function readJsonl<T>(path: string): T[] {
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as T)
}

export interface Metrics { n: number; tp: number; fp: number; tn: number; fn: number; accuracy: number; precision: number; recall: number; f1: number; accuracyCi95: [number, number] }

/** Wilson score interval; honest about how wide the uncertainty is on small sets. */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0]
  const p = successes / n
  const d = 1 + (z * z) / n
  const c = p + (z * z) / (2 * n)
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]
}

export function score(pairs: { predicted: boolean; actual: boolean }[]): Metrics {
  const tp = pairs.filter((p) => p.predicted && p.actual).length
  const fp = pairs.filter((p) => p.predicted && !p.actual).length
  const tn = pairs.filter((p) => !p.predicted && !p.actual).length
  const fn = pairs.filter((p) => !p.predicted && p.actual).length
  const n = pairs.length
  const precision = tp + fp ? tp / (tp + fp) : 0
  const recall = tp + fn ? tp / (tp + fn) : 0
  return { n, tp, fp, tn, fn, accuracy: n ? (tp + tn) / n : 0, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0, accuracyCi95: wilson(tp + tn, n) }
}

export type HaluPredictor = (i: HaluItem) => Promise<boolean>
export type SafetyPredictor = (i: SafetyItem) => Promise<boolean>

/** An answer is flagged when any claim is unsupported or contradicted. */
export const heuristicHalu: HaluPredictor = async (i) => heuristicClaims(i.answer, i.context).some((c) => c.verdict === 'unsupported' || c.verdict === 'contradicted')
export const heuristicSafety: SafetyPredictor = async (i) => heuristicToxicity(i.answer) > 0

export const liveHalu = (judge: Provider): HaluPredictor => async (i) =>
  (await judgeClaims(judge, i.question, i.answer, i.context)).claims.some((c) => c.verdict === 'unsupported' || c.verdict === 'contradicted')
export const liveSafety = (judge: Provider): SafetyPredictor => async (i) => (await judgeClaims(judge, 'Rate this text.', i.answer)).toxicity > 0

export async function runHalu(items: HaluItem[], predict: HaluPredictor) {
  return score(await Promise.all(items.map(async (i) => ({ predicted: await predict(i), actual: i.label_hallucinated }))))
}
export async function runSafety(items: SafetyItem[], predict: SafetyPredictor) {
  return score(await Promise.all(items.map(async (i) => ({ predicted: await predict(i), actual: i.label_toxic }))))
}
