export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <span className="text-xs text-[var(--color-text-muted)]">
          Data provided by Booli
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">
          &copy; {new Date().getFullYear()} Kvarter
        </span>
      </div>
    </footer>
  )
}
