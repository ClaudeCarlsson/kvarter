import { SearchSkeleton } from '@/components/loading/search-skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8 space-y-4">
        <div className="h-9 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-full max-w-xl animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-72">
          <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
        </aside>
        <section className="flex-1">
          <SearchSkeleton />
        </section>
      </div>
    </div>
  )
}
