import { z } from 'zod'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { CheckResult, Signals } from './types'
import { countWords } from './text'
import { findPii, findSecrets, hasCitations, isValidJson } from './checks'

const base = {
  id: z.string().min(1).max(60).optional(),
  name: z.string().max(120).optional(),
  /** A failing blocking rule fails the gate. Non-blocking rules are reported as warnings. */
  blocking: z.boolean().default(true),
}

const num = (min: number, max: number) => z.number().min(min).max(max)

export const RuleSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('max_words'), value: z.number().int().min(1).max(100000) }),
  z.object({ ...base, type: z.literal('min_words'), value: z.number().int().min(1).max(100000) }),
  z.object({ ...base, type: z.literal('contains'), value: z.string().min(1).max(500), ignoreCase: z.boolean().default(true) }),
  z.object({ ...base, type: z.literal('not_contains'), value: z.string().min(1).max(500), ignoreCase: z.boolean().default(true) }),
  z.object({ ...base, type: z.literal('regex'), pattern: z.string().min(1).max(300), flags: z.string().max(6).default('i'), mustMatch: z.boolean().default(true) }),
  z.object({ ...base, type: z.literal('no_pii') }),
  z.object({ ...base, type: z.literal('no_secrets') }),
  z.object({ ...base, type: z.literal('valid_json') }),
  z.object({ ...base, type: z.literal('has_citations') }),
  z.object({ ...base, type: z.literal('min_grounding'), value: num(0, 100) }),
  z.object({ ...base, type: z.literal('max_hallucination_risk'), value: num(0, 100) }),
  z.object({ ...base, type: z.literal('max_toxicity'), value: z.number().int().min(0).max(3) }),
  z.object({ ...base, type: z.literal('min_consistency'), value: num(0, 100) }),
])

export type Rule = z.infer<typeof RuleSchema>
export const RulesSchema = z.array(RuleSchema).max(50)

/** Types whose result depends on a scoring signal (judge or heuristic) rather than on the text alone. */
export const JUDGE_TYPES = ['min_grounding', 'max_hallucination_risk', 'max_toxicity', 'min_consistency']

export const DEFAULT_RULES: Rule[] = [
  { id: 'no-pii', type: 'no_pii', blocking: true, name: 'No personal data (email, phone, SSN, card number)' },
  { id: 'no-secrets', type: 'no_secrets', blocking: true, name: 'No API keys or private keys' },
  { id: 'toxicity', type: 'max_toxicity', value: 0, blocking: true, name: 'No toxic language' },
  { id: 'grounding', type: 'min_grounding', value: 80, blocking: true, name: 'At least 80% of claims supported by the context' },
  { id: 'hallucination', type: 'max_hallucination_risk', value: 15, blocking: true, name: 'At most 15% unsupported claims' },
  { id: 'consistency', type: 'min_consistency', value: 70, blocking: false, name: 'Repeated samples agree' },
]

export function ruleId(rule: Rule, index: number): string {
  return rule.id ?? `${rule.type}-${index + 1}`
}

export function ruleName(rule: Rule): string {
  if (rule.name) return rule.name
  switch (rule.type) {
    case 'max_words': return `At most ${rule.value} words`
    case 'min_words': return `At least ${rule.value} words`
    case 'contains': return `Must contain "${rule.value}"`
    case 'not_contains': return `Must not contain "${rule.value}"`
    case 'regex': return `${rule.mustMatch ? 'Must match' : 'Must not match'} /${rule.pattern}/`
    case 'no_pii': return 'No personal data'
    case 'no_secrets': return 'No secrets'
    case 'valid_json': return 'Answer is valid JSON'
    case 'has_citations': return 'Cites a source'
    case 'min_grounding': return `Grounding at least ${rule.value}%`
    case 'max_hallucination_risk': return `Unsupported claims at most ${rule.value}%`
    case 'max_toxicity': return `Toxicity at most ${TOX_LABEL[rule.value]}`
    case 'min_consistency': return `Consistency at least ${rule.value}%`
  }
}

export const TOX_LABEL = ['none', 'mild', 'clear', 'severe'] as const

export function parseRules(text: string): Rule[] {
  const raw = text.trim().startsWith('[') || text.trim().startsWith('{') ? JSON.parse(text) : parseYaml(text)
  const list = Array.isArray(raw) ? raw : (raw?.guardrails ?? [])
  return RulesSchema.parse(list)
}

export function rulesToYaml(rules: Rule[]): string {
  return stringifyYaml({ guardrails: rules })
}

const pass = (r: Omit<CheckResult, 'status' | 'reason'>, reason: string): CheckResult => ({ ...r, status: 'pass', reason })
const fail = (r: Omit<CheckResult, 'status' | 'reason'>, reason: string): CheckResult => ({ ...r, status: 'fail', reason })
const skip = (r: Omit<CheckResult, 'status' | 'reason'>, reason: string): CheckResult => ({ ...r, status: 'skip', reason })

export function evaluateRules(rules: Rule[], answer: string, s: Signals): CheckResult[] {
  return rules.map((rule, i) => {
    const meta = {
      ruleId: ruleId(rule, i),
      name: ruleName(rule),
      type: rule.type,
      kind: (JUDGE_TYPES.includes(rule.type) ? 'judge' : 'deterministic') as 'judge' | 'deterministic',
      blocking: rule.blocking,
    }
    switch (rule.type) {
      case 'max_words': {
        const n = countWords(answer)
        return n <= rule.value ? pass(meta, `${n} words, within the limit of ${rule.value}.`) : fail(meta, `${n} words, over the limit of ${rule.value}.`)
      }
      case 'min_words': {
        const n = countWords(answer)
        return n >= rule.value ? pass(meta, `${n} words, meets the minimum of ${rule.value}.`) : fail(meta, `${n} words, below the minimum of ${rule.value}.`)
      }
      case 'contains': {
        const ok = rule.ignoreCase ? answer.toLowerCase().includes(rule.value.toLowerCase()) : answer.includes(rule.value)
        return ok ? pass(meta, `The required text "${rule.value}" is present.`) : fail(meta, `The required text "${rule.value}" is missing.`)
      }
      case 'not_contains': {
        const bad = rule.ignoreCase ? answer.toLowerCase().includes(rule.value.toLowerCase()) : answer.includes(rule.value)
        return bad ? fail(meta, `The forbidden text "${rule.value}" appears in the answer.`) : pass(meta, `The forbidden text "${rule.value}" does not appear.`)
      }
      case 'regex': {
        let re: RegExp
        try {
          re = new RegExp(rule.pattern, rule.flags)
        } catch {
          return fail(meta, `The pattern /${rule.pattern}/ is not a valid regular expression.`)
        }
        const hit = re.test(answer)
        return hit === rule.mustMatch ? pass(meta, `Pattern check satisfied.`) : fail(meta, rule.mustMatch ? `The answer does not match /${rule.pattern}/.` : `The answer matches the forbidden pattern /${rule.pattern}/.`)
      }
      case 'no_pii': {
        const f = findPii(answer)
        return f.length ? fail(meta, `Possible personal data found: ${f.join(', ')}.`) : pass(meta, 'No email, phone, SSN or card number patterns found.')
      }
      case 'no_secrets': {
        const f = findSecrets(answer)
        return f.length ? fail(meta, `Possible secret found: ${f.join(', ')}.`) : pass(meta, 'No key or token patterns found.')
      }
      case 'valid_json':
        return isValidJson(answer) ? pass(meta, 'The answer parses as JSON.') : fail(meta, 'The answer is not valid JSON.')
      case 'has_citations':
        return hasCitations(answer) ? pass(meta, 'The answer cites a source.') : fail(meta, 'No citation, link or "source:" marker found.')
      case 'min_grounding':
        if (s.grounding === null) return skip(meta, 'Skipped: no context passage was provided, so grounding cannot be measured.')
        return s.grounding >= rule.value ? pass(meta, `${s.grounding}% of claims are supported by the context (needs ${rule.value}%).`) : fail(meta, `Only ${s.grounding}% of claims are supported by the context (needs ${rule.value}%).`)
      case 'max_hallucination_risk':
        if (s.hallucinationRisk === null) return skip(meta, 'Skipped: unsupported claims cannot be measured without a context passage.')
        return s.hallucinationRisk <= rule.value ? pass(meta, `${s.hallucinationRisk}% of claims are unsupported (limit ${rule.value}%).`) : fail(meta, `${s.hallucinationRisk}% of claims are unsupported by the context (limit ${rule.value}%).`)
      case 'max_toxicity':
        return s.toxicity <= rule.value ? pass(meta, `Toxicity is ${TOX_LABEL[s.toxicity]} (limit ${TOX_LABEL[rule.value]}).`) : fail(meta, `Toxicity is ${TOX_LABEL[s.toxicity]}, above the limit of ${TOX_LABEL[rule.value]}.`)
      case 'min_consistency':
        if (s.consistency === null) return skip(meta, 'Skipped: no extra samples were drawn (use samples >= 2 and generate the answer instead of pasting it).')
        return s.consistency >= rule.value ? pass(meta, `Extra samples agree with the answer ${s.consistency}% (needs ${rule.value}%).`) : fail(meta, `Extra samples agree with the answer only ${s.consistency}% (needs ${rule.value}%).`)
    }
  })
}

/** The gate: every blocking rule that ran must pass. */
export function decide(checks: CheckResult[]): 'PASS' | 'FAIL' {
  return checks.some((c) => c.blocking && c.status === 'fail') ? 'FAIL' : 'PASS'
}
