import { contentWords, splitSentences } from './text'

/**
 * Deterministic stand-ins for model calls, used only in DEMO mode. They are not
 * language models. Each one builds an answer from the context passage so that the
 * offline scorer has something realistic to grade:
 *   demo-careful  extractive answer, stays inside the context
 *   demo-sloppy   same, plus an invented statistic that varies between samples
 *   demo-rude     same, plus an insult
 */

export const DEMO_MODELS = [
  { id: 'demo-careful', label: 'Demo careful', blurb: 'Quotes only what the context says' },
  { id: 'demo-sloppy', label: 'Demo sloppy', blurb: 'Adds an invented statistic' },
  { id: 'demo-rude', label: 'Demo rude', blurb: 'Adds an insult' },
] as const

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function topSentences(prompt: string, context: string, n: number): string[] {
  const q = new Set(contentWords(prompt))
  const sents = splitSentences(context)
  return sents
    .map((s, i) => ({ s, i, score: contentWords(s).filter((w) => q.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, n)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
}

/** sampleIndex 0 is the main answer; later indexes are the extra samples. */
export function demoGenerate(modelId: string, prompt: string, context: string | undefined, sampleIndex: number): string {
  if (!context?.trim()) {
    return 'Demo models answer from a context passage. Add a context passage to this case, or switch to a live provider.'
  }
  let sents = topSentences(prompt, context, 3)
  if (sampleIndex > 0 && sents.length > 1 && hash(prompt + sampleIndex) % 3 === 0) sents = sents.slice(0, -1)
  const out = [...sents]
  const h = hash(`${prompt}|${sampleIndex}`)
  if (modelId === 'demo-sloppy') {
    out.push(`According to a ${2012 + (h % 12)} industry survey, ${55 + (h % 40)}% of experts agree with this.`)
  } else if (modelId === 'demo-rude') {
    out.push('Honestly, only an idiot would need this explained.')
  }
  return out.join(' ')
}
