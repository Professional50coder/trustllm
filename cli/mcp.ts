import { createInterface } from 'node:readline'
import { z } from 'zod'
import { evaluate } from '../lib/core/evaluate'
import { DEFAULT_RULES, RulesSchema } from '../lib/core/guardrails'
import { PACKS, getPack } from '../lib/core/packs'
import { toMarkdown } from '../lib/core/report'
import type { ProviderSpec } from '../lib/core/types'
import { OPENAI_COMPATIBLE_PRESETS } from '../lib/core/providers'

/**
 * Minimal Model Context Protocol server over stdio (newline-delimited JSON-RPC 2.0).
 * It implements initialize, ping, tools/list and tools/call, which is what an agent
 * needs to use the gate as a tool. It has been tested at the protocol level only, not
 * against a real MCP client.
 */

const SERVER = { name: 'trustllm', version: '0.1.0' }
const DEFAULT_PROTOCOL = '2024-11-05'

const TOOLS = [
  {
    name: 'evaluate',
    description:
      'Check an LLM answer against guardrail rules and return PASS or FAIL with reasons. Demo mode (default) needs no key and uses offline heuristics. Live mode uses OPENAI_API_KEY or ANTHROPIC_API_KEY from the server environment.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The question the answer responds to.' },
        context: { type: 'string', description: 'Source text the answer must be grounded in (recommended).' },
        answer: { type: 'string', description: 'The answer to check. If omitted, models generate it.' },
        mode: { type: 'string', enum: ['demo', 'live'], default: 'demo' },
        provider: { type: 'string', enum: ['openai', 'anthropic'], description: 'Live mode only.' },
        preset: { type: 'string', description: `OpenAI-compatible preset: ${Object.keys(OPENAI_COMPATIBLE_PRESETS).join(', ')}` },
        model: { type: 'string', description: 'Live mode: model to answer with and to judge.' },
        pack: { type: 'string', description: `Guardrail pack id: ${PACKS.map((p) => p.id).join(', ')}` },
        rules: { type: 'array', description: 'Custom guardrail rules (see list_rule_types). Overrides pack.', items: { type: 'object' } },
      },
      required: ['prompt'],
    },
  },
  { name: 'list_packs', description: 'List the ready-made guardrail packs.', inputSchema: { type: 'object', properties: {} } },
  { name: 'list_rule_types', description: 'List the guardrail rule types and their parameters.', inputSchema: { type: 'object', properties: {} } },
]

const RULE_TYPES = [
  { type: 'no_pii', exact: true }, { type: 'no_secrets', exact: true }, { type: 'has_citations', exact: true }, { type: 'valid_json', exact: true },
  { type: 'max_words', value: 'integer', exact: true }, { type: 'min_words', value: 'integer', exact: true },
  { type: 'contains', value: 'string', exact: true }, { type: 'not_contains', value: 'string', exact: true },
  { type: 'regex', pattern: 'string', flags: 'string', mustMatch: 'boolean', exact: true },
  { type: 'min_grounding', value: '0-100', exact: false }, { type: 'max_hallucination_risk', value: '0-100', exact: false },
  { type: 'max_toxicity', value: '0-3', exact: false }, { type: 'min_consistency', value: '0-100', exact: false },
]

const EvalArgs = z.object({
  prompt: z.string().min(1).max(4000),
  context: z.string().max(12000).optional(),
  answer: z.string().max(8000).optional(),
  mode: z.enum(['demo', 'live']).default('demo'),
  provider: z.enum(['openai', 'anthropic']).default('openai'),
  preset: z.string().optional(),
  model: z.string().optional(),
  pack: z.string().optional(),
  rules: RulesSchema.optional(),
})

type Json = Record<string, unknown>
type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Json }

const textResult = (text: string, structured?: unknown, isError = false) => ({
  content: [{ type: 'text', text }],
  ...(structured !== undefined ? { structuredContent: structured } : {}),
  ...(isError ? { isError: true } : {}),
})

async function callTool(name: string, args: Json, env: Record<string, string | undefined>) {
  if (name === 'list_packs') return textResult(JSON.stringify(PACKS.map(({ id, name, audience, description, rules }) => ({ id, name, audience, description, rules })), null, 2))
  if (name === 'list_rule_types') return textResult(JSON.stringify(RULE_TYPES, null, 2))
  if (name !== 'evaluate') throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 })
  const a = EvalArgs.parse(args)
  const pack = a.pack ? getPack(a.pack) : undefined
  if (a.pack && !pack) return textResult(`Unknown pack "${a.pack}". Available: ${PACKS.map((p) => p.id).join(', ')}`, undefined, true)
  const rules = a.rules ?? pack?.rules ?? DEFAULT_RULES
  let models: ProviderSpec[]
  if (a.mode === 'demo') models = [{ kind: 'demo', model: 'demo-careful' }]
  else {
    const key = env[a.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY']
    const baseUrl = a.preset ? OPENAI_COMPATIBLE_PRESETS[a.preset]?.baseUrl : undefined
    if (!a.model) return textResult('Live mode needs a "model".', undefined, true)
    models = [{ kind: a.provider, model: a.model, apiKey: key, baseUrl }]
  }
  const report = await evaluate([{ id: 'mcp', prompt: a.prompt, context: a.context, answer: a.answer }], { mode: a.mode, models, samples: a.mode === 'live' && a.answer === undefined ? 2 : 1, rules })
  return textResult(toMarkdown(report), report)
}

/** Handles one JSON-RPC message. Returns null for notifications. */
export async function handleMcp(msg: Rpc, env: Record<string, string | undefined> = {}): Promise<Json | null> {
  const id = msg.id ?? null
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id, result })
  const err = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })
  if (msg.method === undefined) return err(-32600, 'Invalid request')
  if (msg.id === undefined) return null // notification (e.g. notifications/initialized)
  try {
    switch (msg.method) {
      case 'initialize':
        return ok({ protocolVersion: typeof msg.params?.protocolVersion === 'string' ? msg.params.protocolVersion : DEFAULT_PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER })
      case 'ping':
        return ok({})
      case 'tools/list':
        return ok({ tools: TOOLS })
      case 'tools/call': {
        const p = (msg.params ?? {}) as { name?: string; arguments?: Json }
        return ok(await callTool(String(p.name), p.arguments ?? {}, env))
      }
      default:
        return err(-32601, `Method not found: ${msg.method}`)
    }
  } catch (e) {
    const issues = (e as { issues?: { path: (string | number)[]; message: string }[] }).issues
    if (issues) return ok(textResult(`Invalid arguments: ${issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`, undefined, true))
    const code = (e as { code?: number }).code
    return code ? err(code, (e as Error).message) : ok(textResult(`Evaluation failed: ${e instanceof Error ? e.message : String(e)}`, undefined, true))
  }
}

export function runMcp(env: Record<string, string | undefined>): Promise<void> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin })
    rl.on('line', async (line) => {
      if (!line.trim()) return
      let msg: Rpc
      try {
        msg = JSON.parse(line)
      } catch {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n')
        return
      }
      const res = await handleMcp(msg, env)
      if (res) process.stdout.write(JSON.stringify(res) + '\n')
    })
    rl.on('close', resolve)
  })
}
