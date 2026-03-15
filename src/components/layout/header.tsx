import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm font-bold tracking-wider text-[var(--color-accent-blue)] uppercase">
            Kvarter
          </Link>
          <span className="text-xs text-[var(--color-text-muted)]">|</span>
          <span className="text-xs text-[var(--color-text-muted)]">Housing Intelligence</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            Search
          </Link>
          <Link
            href="/sold"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            Sold
          </Link>
          <Link
            href="/compare"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            Compare
          </Link>
        </nav>
      </div>
    </header>
  )
}
