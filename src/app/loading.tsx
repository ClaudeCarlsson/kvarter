import { SearchSkeleton } from '@/components/loading/search-skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="mb-4 space-y-3">
        <div className="h-9 w-full max-w-xl animate-pulse rounded-md bg-[var(--color-surface-tertiary)]" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="h-80 animate-pulse rounded-lg bg-[var(--color-surface-secondary)]" />
        </aside>
        <section className="flex-1">
          <SearchSkeleton />
        </section>
      </div>
    </div>
  )
}
