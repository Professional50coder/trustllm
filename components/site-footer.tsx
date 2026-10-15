import Link from 'next/link'
import { Logo } from '@/components/logo'

const REPO = 'https://github.com/Professional50coder/trustllm'

const COLS: { title: string; links: [string, string, boolean?][] }[] = [
  { title: 'Product', links: [['Evaluate', '/dashboard'], ['Guardrails', '/guardrails'], ['History', '/audit-logs']] },
  { title: 'Learn', links: [['Documentation', '/docs'], ['How scoring works', `${REPO}/blob/main/docs/methodology.md`, true], ['Measured results', `${REPO}/blob/main/docs/evaluation.md`, true]] },
  { title: 'Project', links: [['GitHub', REPO, true], ['Comparison with other tools', `${REPO}/blob/main/docs/market-research.md`, true], ['MIT licence', `${REPO}/blob/main/LICENSE`, true]] },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">A release gate for LLM answers. Open source, no account, no telemetry.</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">{c.title}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {c.links.map(([label, href, ext]) => (
                <li key={label}>{ext ? <a href={href} className="hover:text-foreground">{label}</a> : <Link href={href} className="hover:text-foreground">{label}</Link>}</li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>TrustLLM, MIT licensed.</span>
          <span>Demo results are labelled and are not measurements of any real model.</span>
        </div>
      </div>
    </footer>
  )
}
