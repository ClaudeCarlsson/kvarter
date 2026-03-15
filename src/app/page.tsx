import { Suspense } from 'react'

import { searchPropertiesAction } from '@/app/actions/search'
import { SearchSkeleton } from '@/components/loading/search-skeleton'
import { FilterPanel } from '@/components/search/filter-panel'
import { SearchBar } from '@/components/search/search-bar'
import { SearchResultsView } from '@/components/search/search-results'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { PropertyType, SearchFilters } from '@/types'

function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
): SearchFilters {
  const get = (key: string): string | undefined => {
    const val = params[key]
    return typeof val === 'string' ? val : undefined
  }

  return {
    locationId: get('locationId'),
    query: get('query'),
    priceRange: {
      min: get('minPrice') ? Number(get('minPrice')) : undefined,
      max: get('maxPrice') ? Number(get('maxPrice')) : undefined,
    },
    roomsRange: {
      min: get('minRooms') ? Number(get('minRooms')) : undefined,
      max: get('maxRooms') ? Number(get('maxRooms')) : undefined,
    },
    areaRange: {
      min: get('minArea') ? Number(get('minArea')) : undefined,
      max: get('maxArea') ? Number(get('maxArea')) : undefined,
    },
    propertyTypes: get('propertyTypes')
      ? (get('propertyTypes')!.split(',') as PropertyType[])
      : undefined,
    maxMonthlyFee: get('maxMonthlyFee')
      ? Number(get('maxMonthlyFee'))
      : undefined,
  }
}

function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-20">
      <div className="mb-2 text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
        Kvarter Intelligence
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Search by city, neighborhood, or address to explore the market.
      </p>
    </div>
  )
}

async function SearchResultsWrapper({
  filters,
}: {
  filters: SearchFilters
}) {
  const resultsPromise = searchPropertiesAction(filters, {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
  })

  return <SearchResultsView resultsPromise={resultsPromise} />
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseSearchParams(params)
  const hasSearch = Boolean(filters.locationId || filters.query)

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <Suspense>
            <FilterPanel />
          </Suspense>
        </aside>

        <section className="flex-1">
          {hasSearch ? (
            <Suspense fallback={<SearchSkeleton />}>
              <SearchResultsWrapper filters={filters} />
            </Suspense>
          ) : (
            <WelcomeState />
          )}
        </section>
      </div>
    </div>
  )
}
