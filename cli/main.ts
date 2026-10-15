import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { parseConfig } from '../lib/core/config'
import { evaluate } from '../lib/core/evaluate'
import { toJson, toMarkdown } from '../lib/core/report'
import { PACKS, getPack } from '../lib/core/packs'
import { stringify } from 'yaml'
import { runMcp } from './mcp'

export const EXAMPLE_CONFIG = `# trustllm.yaml  - run with: node dist/cli.cjs run trustllm.yaml
# mode: demo works offline with no keys. Switch to "live" and add models + an API key env var.
mode: demo
samples: 3            # extra samples per answer, used for the consistency check

# models:             # live mode only
#   - provider: openai          # openai | anthropic (openai also covers any OpenAI-compatible server)
#     model: gpt-4o-mini
#     # base_url: openrouter    # preset name or full URL
# judge:                         # optional; defaults to the first model. Prefer a different model family.
#   provider: anthropic
#   model: claude-haiku-4-5

cases:
  - id: refund-policy
    prompt: How long do customers have to request a refund?
    context: >
      Customers may request a refund within 30 days of purchase. Refunds are issued
      to the original payment method within 5 business days. Digital gift cards
      are not refundable.

guardrails:
  - { id: no-pii, type: no_pii }
  - { id: no-secrets, type: no_secrets }
  - { id: toxicity, type: max_toxicity, value: 0 }
  - { id: grounding, type: min_grounding, value: 80 }
  - { id: unsupported, type: max_hallucination_risk, value: 15 }
  - { id: consistency, type: min_consistency, value: 70, blocking: false }
`

/** Example config with the guardrails section swapped for a named pack. */
export function exampleConfig(packId?: string): string {
  if (!packId) return EXAMPLE_CONFIG
  const pack = getPack(packId)
  if (!pack) throw new Error(`Unknown pack "${packId}". Available: ${PACKS.map((p) => p.id).join(', ')}`)
  const head = EXAMPLE_CONFIG.slice(0, EXAMPLE_CONFIG.indexOf('guardrails:'))
  return `${head}# pack: ${pack.id} (${pack.name})
${stringify({ guardrails: pack.rules })}`
}

const HELP = `trustllm - release gate for LLM answers

Usage:
  trustllm run <config.yaml> [--json report.json] [--md report.md] [--quiet]
  trustllm init [trustllm.yaml] [--pack ${PACKS.map((p) => p.id).join('|')}]
  trustllm mcp                       start an MCP server on stdio (tools: evaluate, list_packs, list_rule_types)

Exit codes: 0 gate passed, 1 gate failed, 2 error (bad config, provider failure).
Keys are read from environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY or api_key_env) and are never written anywhere.
`

export async function main(argv: string[], env: Record<string, string | undefined> = process.env): Promise<number> {
  const [cmd, ...rest] = argv
  if (cmd === 'mcp') {
    await runMcp(env)
    return 0
  }
  if (cmd === 'init') {
    const file = rest[0] && !rest[0].startsWith('--') ? rest[0] : 'trustllm.yaml'
    if (existsSync(file)) {
      console.error(`${file} already exists; not overwriting.`)
      return 2
    }
    const pi = rest.indexOf('--pack')
    try {
      writeFileSync(file, exampleConfig(pi >= 0 ? rest[pi + 1] : undefined))
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`)
      return 2
    }
    console.log(`Wrote ${file}. Run: trustllm run ${file}`)
    return 0
  }
  if (cmd !== 'run' || !rest[0]) {
    console.log(HELP)
    return cmd === undefined || cmd === '--help' || cmd === 'help' ? 0 : 2
  }
  const flag = (name: string) => {
    const i = rest.indexOf(name)
    return i >= 0 ? rest[i + 1] : undefined
  }
  try {
    const cfg = parseConfig(readFileSync(rest[0], 'utf8'), env)
    const report = await evaluate(cfg.cases, { mode: cfg.mode, models: cfg.models, judge: cfg.judge, samples: cfg.samples, rules: cfg.rules })
    const jsonPath = flag('--json')
    const mdPath = flag('--md')
    if (jsonPath) writeFileSync(jsonPath, toJson(report))
    if (mdPath) writeFileSync(mdPath, toMarkdown(report))
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, toMarkdown(report))
    if (!rest.includes('--quiet')) {
      if (report.mode === 'demo') console.log('DEMO MODE: offline heuristics, no model called. Not a measurement of any real model.\n')
      for (const r of report.results) {
        console.log(`${r.decision.padEnd(5)} ${r.caseId} / ${r.model}${r.overall !== null ? `  overall ${r.overall}` : ''}`)
        if (r.error) console.log(`      error: ${r.error}`)
        for (const c of r.checks) if (c.status === 'fail') console.log(`      ${c.blocking ? 'FAIL' : 'WARN'} ${c.name}: ${c.reason}`)
      }
      const s = report.summary
      console.log(`\nGate: ${s.gate} (${s.passed} passed, ${s.failed} failed, ${s.errors} errors)`)
    }
    if (report.summary.errors > 0) return 2
    return report.summary.gate === 'PASS' ? 0 : 1
  } catch (e) {
    const issues = (e as { issues?: { path: (string | number)[]; message: string }[] }).issues
    const msg = issues ? issues.map((i) => `${i.path.join('.') || 'config'}: ${i.message}`).join('\n') : e instanceof Error ? e.message : String(e)
    console.error(`Error: ${msg}`)
    return 2
  }
}

if (process.argv[1] && /cli[\\/]main\.(ts|js)$|dist[\\/]cli\.cjs$/.test(process.argv[1])) {
  main(process.argv.slice(2)).then((code) => process.exit(code))
}
