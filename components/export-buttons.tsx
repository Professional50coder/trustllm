'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { Report } from '@/lib/core/types'
import { toCsv, toJson, toMarkdown } from '@/lib/core/report'
import { download } from '@/lib/client/storage'

export function ExportButtons({ report }: { report: Report }) {
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
    </div>
  )
}
