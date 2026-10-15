import Link from 'next/link'

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="TrustLLM">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M9 16.5l4.5 4.5L23 11" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
      <path d="M8 8h16" strokeWidth="2" strokeLinecap="round" className="stroke-primary-foreground opacity-50" />
    </svg>
  )
}

export function Logo({ href = '/', showText = true }: { href?: string; showText?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark />
      {showText && <span className="text-[17px] font-semibold tracking-tight text-foreground">TrustLLM</span>}
    </Link>
  )
}
