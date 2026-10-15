import type { Report } from '@/lib/core/types'
import { REPORT_SCHEMA } from '@/lib/core/types'

/**
 * Shareable report links. The whole report is compressed and stored in the URL
 * fragment (after the #). Browsers never send the fragment to a server, so nothing is
 * stored or transmitted: whoever has the link has the report. Do not share a link for
 * a report that contains confidential text.
 */

const toB64Url = (bytes: Uint8Array): string => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromB64Url = (s: string): Uint8Array => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

/** Format: "z." + deflate-raw base64url, or "j." + plain base64url when compression is unavailable. */
export async function encodeReport(report: Report): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(report))
  if (typeof CompressionStream !== 'undefined') return `z.${toB64Url(await pipe(json, new CompressionStream('deflate-raw')))}`
  return `j.${toB64Url(json)}`
}

export async function decodeReport(token: string): Promise<Report> {
  const [kind, body] = [token.slice(0, 2), token.slice(2)]
  let bytes: Uint8Array
  if (kind === 'z.') bytes = await pipe(fromB64Url(body), new DecompressionStream('deflate-raw'))
  else if (kind === 'j.') bytes = fromB64Url(body)
  else throw new Error('This link is not a TrustLLM report link.')
  const parsed = JSON.parse(new TextDecoder().decode(bytes))
  if (parsed?.schema !== REPORT_SCHEMA || !Array.isArray(parsed.results)) throw new Error('The report in this link is not valid.')
  return parsed as Report
}

export async function shareUrl(report: Report, origin: string): Promise<string> {
  return `${origin}/report#${await encodeReport(report)}`
}
