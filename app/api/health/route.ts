import { OPENAI_COMPATIBLE_PRESETS } from '@/lib/core/providers'

export const dynamic = 'force-dynamic'

export function GET() {
  const serverKeys = process.env.TRUSTLLM_ALLOW_SERVER_KEYS === '1'
  return Response.json(
    {
      ok: true,
      service: 'trustllm',
      reportSchema: 'trustllm.report/v1',
      modes: ['demo', 'live'],
      presets: Object.entries(OPENAI_COMPATIBLE_PRESETS).map(([id, p]) => ({ id, label: p.label })),
      serverKeys: serverKeys ? { openai: !!process.env.OPENAI_API_KEY, anthropic: !!process.env.ANTHROPIC_API_KEY } : { openai: false, anthropic: false },
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
