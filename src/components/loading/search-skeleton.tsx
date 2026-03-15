import { Skeleton } from '@/components/ui/skeleton'

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-4 py-3">
      <div className="min-w-[220px] flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-12" />
    </div>
  )
}

export function SearchSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface-tertiary)] px-4 py-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-10" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
