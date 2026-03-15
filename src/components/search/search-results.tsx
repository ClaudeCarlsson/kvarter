'use client'

import dynamic from 'next/dynamic'
import { use, useCallback, useState } from 'react'

import { MapSkeleton } from '@/components/loading/map-skeleton'
import { formatPrice, formatPriceCompact } from '@/lib/utils'
import type { SearchResults as SearchResultsType } from '@/types'

import { NoResults } from './no-results'
import { PropertyList } from './property-list'
import { ResultsToggle, type ViewMode } from './results-toggle'

const PropertyMap = dynamic(
  () => import('@/components/map/map-container').then((mod) => mod.PropertyMap),
  { ssr: false, loading: () => <MapSkeleton /> },
)

function StatsBar({ results }: { results: SearchResultsType }) {
  const properties = results.properties
  if (properties.length === 0) return null

  const prices = properties.map((p) => p.price).sort((a, b) => a - b)
  const median = prices[Math.floor(prices.length / 2)]
  const sqmPrices = properties.filter((p) => p.pricePerSqm).map((p) => p.pricePerSqm!)
  const avgSqm = sqmPrices.length > 0
    ? Math.round(sqmPrices.reduce((s, v) => s + v, 0) / sqmPrices.length)
    : null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <span className="font-mono text-[var(--color-text-primary)]">
        {results.totalCount}
        <span className="text-[var(--color-text-muted)] ml-1">properties</span>
      </span>
      <span className="text-[var(--color-border-light)]">|</span>
      <span className="text-[var(--color-text-muted)]">Median:</span>
      <span className="font-mono text-[var(--color-text-secondary)]">{formatPriceCompact(median)}</span>
      {avgSqm && (
        <>
          <span className="text-[var(--color-border-light)]">|</span>
          <span className="text-[var(--color-text-muted)]">Avg:</span>
          <span className="font-mono text-[var(--color-text-secondary)]">{formatPrice(avgSqm)}/m&sup2;</span>
        </>
      )}
    </div>
  )
}

function ResultsContent({ resultsPromise }: { resultsPromise: Promise<SearchResultsType> }) {
  const results = use(resultsPromise)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  if (results.totalCount === 0) {
    return <NoResults />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <StatsBar results={results} />
        <ResultsToggle onChange={handleViewChange} />
      </div>

      {viewMode === 'list' ? (
        <PropertyList properties={results.properties} />
      ) : (
        <PropertyMap properties={results.properties} />
      )}
    </div>
  )
}

export function SearchResultsView({ resultsPromise }: { resultsPromise: Promise<SearchResultsType> }) {
  return <ResultsContent resultsPromise={resultsPromise} />
}
