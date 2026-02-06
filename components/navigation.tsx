'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-bold text-foreground">TrustLLM</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </Link>
          <Link href="#architecture" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Architecture
          </Link>
        </nav>

        <Link href="/dashboard">
          <Button size="sm" className="gap-2">
            Try the Playground
          </Button>
        </Link>
      </div>
    </header>
  )
}
