const STOP = new Set(
  'a an the and or but if then of to in on at by for with from as is are was were be been being it its this that these those he she they we you i his her their our your not no do does did has have had will would can could should may might also than so such into over about after before which who whom what when where how there here more most other some any each very just'.split(
    ' ',
  ),
)

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/** Split into sentence-like claims. Bullet lines and headings are treated as their own units. */
export function splitSentences(text: string): string[] {
  const out: string[] = []
  for (const line of text.split(/\n+/)) {
    const clean = line.replace(/^\s*(?:[-*+]|\d+[.)]|#+)\s*/, '').trim()
    if (!clean) continue
    for (const s of clean.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/)) {
      const t = s.trim()
      if (t.split(/\s+/).length >= 3) out.push(t)
    }
  }
  // Short answers ("Delhi", "Arthur's Magazine") are a single claim.
  if (out.length === 0 && text.trim()) return [text.trim()]
  return out
}

function stem(w: string): string {
  return w.length > 4 ? w.replace(/(ing|ed|es|s|ly)$/, '') : w
}

export function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'.%-]*/g) ?? [])
    .map((w) => w.replace(/[.'-]+$/, ''))
    .filter((w) => w && !STOP.has(w))
    .map(stem)
}

export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, '').replace(/\.$/, ''))
}

export type Support = { verdict: 'supported' | 'unsupported' | 'contradicted'; overlap: number }

/**
 * Lexical support: share of a claim's content words found in the reference, plus a
 * number check. This is a cheap offline proxy for entailment, not an NLI model.
 */
export function lexicalSupport(claim: string, reference: string, threshold = 0.6): Support {
  const words = contentWords(claim)
  if (words.length === 0) return { verdict: 'supported', overlap: 1 }
  const ref = new Set(contentWords(reference))
  const hit = words.filter((w) => ref.has(w)).length
  const overlap = hit / words.length
  const refNums = new Set(numbersIn(reference))
  const badNumber = numbersIn(claim).some((n) => !refNums.has(n))
  if (badNumber && overlap >= 0.3) return { verdict: 'contradicted', overlap }
  if (badNumber) return { verdict: 'unsupported', overlap }
  return { verdict: overlap >= threshold ? 'supported' : 'unsupported', overlap }
}
