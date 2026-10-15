'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LINKS = [
  { href: '/dashboard', label: 'Evaluate' },
  { href: '/guardrails', label: 'Guardrails' },
  { href: '/audit-logs', label: 'History' },
  { href: '/docs', label: 'Docs' },
]

export function Navigation() {
  const path = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">T</span>
          </div>
          <span className="hidden font-bold text-foreground sm:inline">TrustLLM</span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path === l.href ? 'page' : undefined}
              className={`text-xs transition-colors hover:text-foreground sm:text-sm ${path === l.href ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              {l.label}
            </Link>
          ))}
          <a href="https://github.com/Professional50coder/trustllm" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
            GitHub
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Toggle light or dark theme" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            {mounted && resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link href="/dashboard" className="hidden sm:block">
            <Button size="sm">Run an evaluation</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
