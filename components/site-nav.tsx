'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/docs', label: 'Docs' },
]

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <a href="https://github.com/Professional50coder/trustllm" className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            GitHub
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button size="sm" className="rounded-full px-4">Open the app</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
