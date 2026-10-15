import { handleEvaluate, makeLimiter, RequestError } from '@/lib/core/api'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const allow = makeLimiter(30, 10 * 60 * 1000)
const headers = { 'cache-control': 'no-store' }

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (!allow(ip)) return Response.json({ error: 'Too many requests. Wait a few minutes and try again.' }, { status: 429, headers })
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > 200_000) return Response.json({ error: 'Request too large.' }, { status: 413, headers })
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body must be JSON.' }, { status: 400, headers })
  }
  try {
    // The request body (which may hold an API key) is never logged or stored.
    const report = await handleEvaluate(body, process.env)
    return Response.json(report, { headers })
  } catch (e) {
    if (e instanceof RequestError) return Response.json({ error: e.message }, { status: 400, headers })
    return Response.json({ error: 'Evaluation failed unexpectedly.' }, { status: 500, headers })
  }
}
