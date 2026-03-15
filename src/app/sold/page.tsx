import { Suspense } from 'react'

import { getModelAccuracy, getSoldProperties } from '@/app/actions/sold'
import { ModelStatsPanel } from '@/components/analytics/model-stats'
import { FilterPanel } from '@/components/search/filter-panel'
import { SearchBar } from '@/components/search/search-bar'
import { SoldRow } from '@/components/sold/sold-row'
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

export default async function SoldPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseSearchParams(params)
  const area = filters.locationId || undefined

  const [stats, soldProperties] = await Promise.all([
    getModelAccuracy(area, filters),
    getSoldProperties(area, filters),
  ])

  // Predictions sorted by date, most recent first
  const predictions = stats
    ? [...stats.predictions].sort(
        (a, b) =>
          new Date(b.property.soldDate).getTime() -
          new Date(a.property.soldDate).getTime(),
      )
    : []

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Search bar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Suspense>
          <SearchBar basePath="/sold" />
        </Suspense>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Filter sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <Suspense>
            <FilterPanel basePath="/sold" />
          </Suspense>
        </aside>

        {/* Main content */}
        <section className="flex-1">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Sold Properties
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Model predictions vs actual outcomes
            </p>
          </div>

          {/* Model accuracy stats */}
          {stats && (
            <div className="mb-4">
              <ModelStatsPanel stats={stats} />
            </div>
          )}

          {/* Table header */}
          <div className="rounded-t-lg border border-b-0 border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            <div className="hidden items-center gap-3 px-4 py-2 md:flex">
              <div className="min-w-[180px] flex-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Property
              </div>
              <div className="w-28 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Asking
              </div>
              <div className="w-28 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Sold
              </div>
              <div className="w-16 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                &Delta;
              </div>
              <div className="w-28 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Model
              </div>
              <div className="w-20 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Error
              </div>
              <div className="w-16 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Date
              </div>
            </div>
          </div>

          {/* Property rows */}
          <div className="rounded-b-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            {predictions.length > 0 ? (
              predictions.map((prediction) => (
                <SoldRow key={prediction.property.id} prediction={prediction} />
              ))
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No sold properties found.
                </p>
              </div>
            )}
          </div>

          {/* Footer stats */}
          {predictions.length > 0 && (
            <div className="mt-2 text-right text-[10px] font-mono text-[var(--color-text-muted)]">
              {predictions.length} sold properties
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
