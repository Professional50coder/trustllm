import { ImageResponse } from 'next/og'

export const alt = 'TrustLLM: a release gate for LLM answers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0e1116', color: '#f2f4f7' }}>
        <div style={{ fontSize: 40, color: '#2d9cff', marginBottom: 24 }}>TrustLLM</div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>A release gate for LLM answers</div>
        <div style={{ fontSize: 32, color: '#a8b0bd', marginTop: 28 }}>Written guardrails. PASS or FAIL with reasons. Browser, CLI and CI.</div>
      </div>
    ),
    size,
  )
}
