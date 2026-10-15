import { DEFAULT_RULES, RulesSchema, type Rule } from '@/lib/core/guardrails'
import type { Report } from '@/lib/core/types'

/**
 * Browser-only persistence. Stores guardrail rules, non-secret preferences and saved
 * reports. API keys are never passed to this module and reports never contain them.
 */

const RULES_KEY = 'trustllm.rules.v1'
const HISTORY_KEY = 'trustllm.history.v1'
const PREFS_KEY = 'trustllm.prefs.v1'
export const MAX_HISTORY = 30

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadRules(): Rule[] {
  const parsed = RulesSchema.safeParse(read<unknown>(RULES_KEY))
  return parsed.success && parsed.data.length ? parsed.data : DEFAULT_RULES
}
export const saveRules = (rules: Rule[]) => write(RULES_KEY, rules)
export function resetRules(): Rule[] {
  try {
    window.localStorage.removeItem(RULES_KEY)
  } catch {
    /* ignore */
  }
  return DEFAULT_RULES
}

export interface SavedRun {
  id: string
  savedAt: string
  report: Report
}

export function loadHistory(): SavedRun[] {
  const h = read<SavedRun[]>(HISTORY_KEY)
  return Array.isArray(h) ? h.filter((r) => r?.report?.schema === 'trustllm.report/v1') : []
}

export function addRun(report: Report): SavedRun[] {
  const run: SavedRun = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, savedAt: new Date().toISOString(), report }
  const next = [run, ...loadHistory()].slice(0, MAX_HISTORY)
  write(HISTORY_KEY, next)
  return next
}

export function deleteRun(id: string): SavedRun[] {
  const next = loadHistory().filter((r) => r.id !== id)
  write(HISTORY_KEY, next)
  return next
}

export function clearHistory() {
  try {
    window.localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* ignore */
  }
}

/** Non-secret preferences only (never keys). */
export interface Prefs {
  mode: 'demo' | 'live'
  providerId: string
  models: string
  judgeModel: string
  samples: number
  saveHistory: boolean
}
export const DEFAULT_PREFS: Prefs = { mode: 'demo', providerId: 'openai', models: 'gpt-4o-mini', judgeModel: '', samples: 3, saveHistory: true }
export const loadPrefs = (): Prefs => ({ ...DEFAULT_PREFS, ...(read<Partial<Prefs>>(PREFS_KEY) ?? {}) })
export const savePrefs = (p: Prefs) => write(PREFS_KEY, p)

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
