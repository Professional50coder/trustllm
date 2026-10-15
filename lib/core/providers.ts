import type { ProviderSpec } from './types'

export interface ChatRequest {
  system?: string
  user: string
  temperature: number
  maxTokens: number
}

export interface Provider {
  label: string
  complete(req: ChatRequest): Promise<string>
}

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'ProviderError'
  }
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface ProviderOptions {
  fetch?: FetchLike
  timeoutMs?: number
  /** Called after each successful completion with token counts when the provider reports them. */
  onUsage?: (u: { input: number | null; output: number | null }) => void
}

/** Known OpenAI-compatible endpoints. The server only accepts these presets, never a free-form URL. */
export const OPENAI_COMPATIBLE_PRESETS: Record<string, { label: string; baseUrl: string }> = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  together: { label: 'Together AI', baseUrl: 'https://api.together.xyz/v1' },
  mistral: { label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1' },
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
}

/** Remove the key (and anything key-shaped) from text before it is shown or thrown. */
export function redact(text: string, key?: string): string {
  let out = text
  if (key && key.length > 6) out = out.split(key).join('***')
  // Providers echo a masked copy of a bad key ("sk-abcd1234*****wxyz"); drop that too.
  out = out.replace(/[A-Za-z0-9_-]*[A-Za-z0-9]\*{3,}[A-Za-z0-9]*/g, '***')
  return out.replace(/\b(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]*/g, '$1***')
}

async function post(url: string, headers: Record<string, string>, body: unknown, key: string | undefined, opts: ProviderOptions) {
  const f = opts.fetch ?? (fetch as FetchLike)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000)
  try {
    const res = await f(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text: redact(text, key) }
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? 'request timed out' : redact(e instanceof Error ? e.message : String(e), key)
    throw new ProviderError(`Network error: ${msg}`)
  } finally {
    clearTimeout(timer)
  }
}

function explain(status: number, text: string): string {
  const hint =
    status === 401 || status === 403 ? 'The API key was rejected. Check the key and that it belongs to this provider.'
    : status === 404 ? 'Model or endpoint not found. Check the model name.'
    : status === 429 ? 'Rate limited or out of quota. Wait, or check the billing/quota of this key.'
    : status >= 500 ? 'The provider had a server error. Try again.'
    : ''
  let detail = text.slice(0, 300)
  try {
    const j = JSON.parse(text)
    detail = j?.error?.message ?? j?.message ?? detail
  } catch {
    /* keep raw text */
  }
  return `Provider returned ${status}. ${hint} ${detail}`.trim()
}

export function createOpenAICompatible(spec: ProviderSpec, opts: ProviderOptions = {}): Provider {
  const base = (spec.baseUrl ?? OPENAI_COMPATIBLE_PRESETS.openai.baseUrl).replace(/\/+$/, '')
  return {
    label: spec.model,
    async complete(req) {
      const body: Record<string, unknown> = {
        model: spec.model,
        messages: [...(req.system ? [{ role: 'system', content: req.system }] : []), { role: 'user', content: req.user }],
        temperature: req.temperature,
        max_tokens: req.maxTokens,
      }
      const headers = { authorization: `Bearer ${spec.apiKey ?? ''}` }
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await post(`${base}/chat/completions`, headers, body, spec.apiKey, opts)
        if (r.ok) {
          const j = JSON.parse(r.text)
          const text = j?.choices?.[0]?.message?.content
          if (typeof text !== 'string') throw new ProviderError('Provider returned no text.')
          opts.onUsage?.({ input: j?.usage?.prompt_tokens ?? null, output: j?.usage?.completion_tokens ?? null })
          return text
        }
        // Some newer models reject max_tokens or a custom temperature; adapt once per problem.
        if (r.status === 400 && /max_completion_tokens/i.test(r.text) && 'max_tokens' in body) {
          body.max_completion_tokens = body.max_tokens
          delete body.max_tokens
          continue
        }
        if (r.status === 400 && /temperature/i.test(r.text) && 'temperature' in body) {
          delete body.temperature
          continue
        }
        throw new ProviderError(explain(r.status, r.text), r.status)
      }
      throw new ProviderError('Provider rejected the request parameters.')
    },
  }
}

export function createAnthropic(spec: ProviderSpec, opts: ProviderOptions = {}): Provider {
  return {
    label: spec.model,
    async complete(req) {
      const body: Record<string, unknown> = {
        model: spec.model,
        max_tokens: req.maxTokens,
        temperature: req.temperature,
        ...(req.system ? { system: req.system } : {}),
        messages: [{ role: 'user', content: req.user }],
      }
      const headers = { 'x-api-key': spec.apiKey ?? '', 'anthropic-version': '2023-06-01' }
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await post('https://api.anthropic.com/v1/messages', headers, body, spec.apiKey, opts)
        if (r.ok) {
          const j = JSON.parse(r.text)
          const blocks = j?.content
          const text = Array.isArray(blocks) ? blocks.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('') : ''
          if (!text) throw new ProviderError('Provider returned no text.')
          opts.onUsage?.({ input: j?.usage?.input_tokens ?? null, output: j?.usage?.output_tokens ?? null })
          return text
        }
        if (r.status === 400 && /temperature/i.test(r.text) && 'temperature' in body) {
          delete body.temperature
          continue
        }
        throw new ProviderError(explain(r.status, r.text), r.status)
      }
      throw new ProviderError('Provider rejected the request parameters.')
    },
  }
}

export function createProvider(spec: ProviderSpec, opts: ProviderOptions = {}): Provider {
  if (spec.kind === 'demo') throw new ProviderError('The demo provider is handled by the offline engine, not over the network.')
  if (!spec.apiKey) throw new ProviderError(`No API key for ${spec.kind}. Provide one (environment variable in the CLI, key field in the web app).`)
  return spec.kind === 'anthropic' ? createAnthropic(spec, opts) : createOpenAICompatible(spec, opts)
}
