/** Deterministic, offline checks. These return the same answer every time. */

export const PII_PATTERNS: Record<string, RegExp> = {
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  phone: /(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}(?!\d)/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
}

export function luhn(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export function findPii(text: string): string[] {
  const found: string[] = []
  for (const [k, r] of Object.entries(PII_PATTERNS)) if (r.test(text)) found.push(k)
  for (const m of text.match(/\b(?:\d[ -]?){13,19}\b/g) ?? []) {
    const d = m.replace(/\D/g, '')
    if (d.length >= 13 && d.length <= 19 && luhn(d)) {
      found.push('credit card')
      break
    }
  }
  return found
}

const SECRET_PATTERNS: [string, RegExp][] = [
  ['OpenAI-style key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
]

export function findSecrets(text: string): string[] {
  return SECRET_PATTERNS.filter(([, r]) => r.test(text)).map(([n]) => n)
}

export function hasCitations(text: string): boolean {
  return /\[\d+\]|\(\w[\w\s.&,-]*,?\s*\d{4}\)|https?:\/\/\S+|\bsource:/i.test(text)
}

export function isValidJson(text: string): boolean {
  const t = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}
