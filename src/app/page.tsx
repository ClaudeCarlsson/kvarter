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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20">
      <svg
        className="mb-4 h-16 w-16 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
      <h2 className="text-xl font-semibold text-gray-900">
        Find your next home
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        Search by city, neighborhood, or address to get started.
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseSearchParams(params)
  const hasSearch = Boolean(filters.locationId || filters.query)

  return (
    <div className="container mx-auto px-4 py-6">
      <section className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Find your next home
        </h1>
        <Suspense>
          <SearchBar />
        </Suspense>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-72">
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
