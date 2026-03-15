export function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16">
      <div className="mb-3 text-2xl text-[var(--color-text-muted)]">/</div>
      <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">No results found</h3>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Try adjusting your filters or searching a different area.
      </p>
    </div>
  )
}
