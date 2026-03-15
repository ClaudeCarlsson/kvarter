import Link from 'next/link'
import { Suspense } from 'react'

import { searchPropertiesAction } from '@/app/actions/search'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { RadarChart } from '@/components/compare/radar-chart'
import { SearchSkeleton } from '@/components/loading/search-skeleton'
import { Button } from '@/components/ui/button'
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
        <svg className="mb-4 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900">No properties to compare</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select properties from search results to compare them.
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Go to search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Comparison Table */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Side-by-side Comparison
        </h2>
        <ComparisonTable properties={properties} />
      </section>

      {/* Radar/Score Chart */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <RadarChart properties={properties} />
      </section>

      {/* Bottom Line */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Summary</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(() => {
            const cheapest = [...properties].sort((a, b) => a.price - b.price)[0]
            const bestValue = [...properties].sort(
              (a, b) => (a.pricePerSqm ?? Infinity) - (b.pricePerSqm ?? Infinity),
            )[0]
            const biggest = [...properties].sort((a, b) => b.livingArea - a.livingArea)[0]

            return (
              <>
                <div className="rounded-lg bg-green-50 p-3">
                  <div className="text-xs font-medium text-green-800">Lowest Price</div>
                  <div className="mt-1 text-sm font-semibold text-green-900">{cheapest.address}</div>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="text-xs font-medium text-blue-800">Best kr/m²</div>
                  <div className="mt-1 text-sm font-semibold text-blue-900">{bestValue.address}</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-3">
                  <div className="text-xs font-medium text-purple-800">Largest</div>
                  <div className="mt-1 text-sm font-semibold text-purple-900">{biggest.address}</div>
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
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compare Properties</h1>
          <p className="mt-1 text-sm text-gray-500">
            {ids.length} {ids.length === 1 ? 'property' : 'properties'} selected
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Back to search</Link>
        </Button>
      </div>

      <Suspense fallback={<SearchSkeleton />}>
        <ComparisonContent ids={ids} />
      </Suspense>
    </div>
  )
}
