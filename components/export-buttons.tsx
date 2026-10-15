'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Download, Link2 } from 'lucide-react'
import { shareUrl } from '@/lib/client/share'
import type { Report } from '@/lib/core/types'
import { toCsv, toJson, toMarkdown } from '@/lib/core/report'
import { download } from '@/lib/client/storage'

export function ExportButtons({ report }: { report: Report }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const copyLink = async () => {
    const url = await shareUrl(report, window.location.origin)
    setFallbackUrl(url) // always show the link, so it can be copied by hand if the clipboard is blocked
    setCopied('Preparing link...')
    try {
      // The clipboard promise can hang when the page is not focused, so do not wait on it forever.
      await Promise.race([navigator.clipboard.writeText(url), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))])
      setCopied('Link copied. The report is inside the link; nothing was uploaded.')
    } catch {
      setCopied('Copy the link below. The report is inside the link; nothing was uploaded.')
    }
  }
  const stamp = report.generatedAt.slice(0, 19).replace(/[:T]/g, '-')
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" className="gap-1" onClick={() => download(`trustllm-${stamp}.json`, toJson(report), 'application/json')}>
        <Download className="h-3 w-3" /> JSON
      </Button>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => download(`trustllm-${stamp}.md`, toMarkdown(report), 'text/markdown')}>
        <Download className="h-3 w-3" /> Markdown
      </Button>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => download(`trustllm-${stamp}.csv`, toCsv(report), 'text/csv')}>
        <Download className="h-3 w-3" /> CSV
      </Button>
      <Button size="sm" variant="outline" className="gap-1" onClick={copyLink}>
        <Link2 className="h-3 w-3" /> Copy share link
      </Button>
      {copied && <span role="status" className="text-xs text-muted-foreground">{copied}</span>}
      {fallbackUrl && <input readOnly aria-label="Share link" value={fallbackUrl} onFocus={(e) => e.currentTarget.select()} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground" />}
    </div>
  )
}
