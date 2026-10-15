'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, History, ListChecks, Lock, Play } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

const ITEMS = [
  { href: '/dashboard', label: 'Evaluate', icon: Play },
  { href: '/guardrails', label: 'Guardrails', icon: ListChecks },
  { href: '/audit-logs', label: 'History', icon: History },
  { href: '/docs', label: 'Docs', icon: BookOpen },
]

export function AppShell({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col" aria-label="Sidebar">
        <div className="flex h-16 items-center px-5"><Logo /></div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="App">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            )
          })}
        </nav>
        <div className="m-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><Lock className="h-3 w-3" /> Your key stays private</div>
          Held in this tab&apos;s memory only. Never stored, logged or exported.
        </div>
        <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-2">
          <Link href="/" className="px-2 text-xs text-muted-foreground hover:text-foreground">Home page</Link>
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:h-16">
            <div className="flex items-center gap-3 lg:hidden"><Logo showText={false} /></div>
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h1>
            <div className="flex items-center gap-2">{actions}<div className="lg:hidden"><ThemeToggle /></div></div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-1.5 lg:hidden" aria-label="App">
            {ITEMS.map(({ href, label, icon: Icon }) => {
              const active = path === href
              return (
                <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground'}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </Link>
              )
            })}
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
          {children}
        </main>
      </div>
    </div>
  )
}
