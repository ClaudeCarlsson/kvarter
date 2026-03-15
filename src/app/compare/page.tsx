import Link from 'next/link'
import { Suspense } from 'react'

import { searchPropertiesAction } from '@/app/actions/search'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { RadarChart } from '@/components/compare/radar-chart'
import { SearchSkeleton } from '@/components/loading/search-skeleton'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { Property } from '@/types'

async function fetchProperties(ids: string[]): Promise<Property[]> {
  if (ids.length === 0) return []

  // Fetch all properties and filter by ID
  // In production, this would be a dedicated endpoint
  const results = await searchPropertiesAction({}, { offset: 0, limit: 100 })
  return results.properties.filter((p) => ids.includes(p.id))
}

async function ComparisonContent({ ids }: { ids: string[] }) {
  const properties = await fetchProperties(ids)

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16">
        <div className="mb-3 text-2xl text-[var(--color-text-muted)]">&lt;/&gt;</div>
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">No properties to compare</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Select properties from search results to compare them.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/">Go to search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comparison Table */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Side-by-side Comparison
        </h2>
        <ComparisonTable properties={properties} />
      </section>

      {/* Radar/Score Chart */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
        <RadarChart properties={properties} />
      </section>

      {/* Bottom Line */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Quick Summary</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(() => {
            const cheapest = [...properties].sort((a, b) => a.price - b.price)[0]
            const bestValue = [...properties].sort(
              (a, b) => (a.pricePerSqm ?? Infinity) - (b.pricePerSqm ?? Infinity),
            )[0]
            const biggest = [...properties].sort((a, b) => b.livingArea - a.livingArea)[0]

            return (
              <>
                <div className="rounded-md border border-[var(--color-accent-green)]/20 bg-[var(--color-accent-green)]/5 p-3">
                  <div className="text-xs font-medium text-[var(--color-accent-green)]">Lowest Price</div>
                  <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{cheapest.address}</div>
                  <div className="text-xs font-mono text-[var(--color-text-muted)]">{formatPrice(cheapest.price)}</div>
                </div>
                <div className="rounded-md border border-[var(--color-accent-blue)]/20 bg-[var(--color-accent-blue)]/5 p-3">
                  <div className="text-xs font-medium text-[var(--color-accent-blue)]">Best kr/m&sup2;</div>
                  <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{bestValue.address}</div>
                  <div className="text-xs font-mono text-[var(--color-text-muted)]">{bestValue.pricePerSqm ? formatPrice(bestValue.pricePerSqm) + '/m\u00B2' : '\u2014'}</div>
                </div>
                <div className="rounded-md border border-[var(--color-accent-yellow)]/20 bg-[var(--color-accent-yellow)]/5 p-3">
                  <div className="text-xs font-medium text-[var(--color-accent-yellow)]">Largest</div>
                  <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{biggest.address}</div>
                  <div className="text-xs font-mono text-[var(--color-text-muted)]">{biggest.livingArea} m&sup2;</div>
                </div>
              </>
            )
          })()}
        </div>
      </section>
    </div>
  )
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const idsParam = typeof params.ids === 'string' ? params.ids : ''
  const ids = idsParam.split(',').filter(Boolean)

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Compare Properties</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {ids.length} {ids.length === 1 ? 'property' : 'properties'} selected
          </p>
        </div>
        <Button variant="outline" asChild size="sm">
          <Link href="/">Back to search</Link>
        </Button>
      </div>

      <Suspense fallback={<SearchSkeleton />}>
        <ComparisonContent ids={ids} />
      </Suspense>
    </div>
  )
}
