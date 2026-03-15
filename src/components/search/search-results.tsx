'use client'

import { Suspense, use, useCallback, useState } from 'react'

import { MapSkeleton } from '@/components/loading/map-skeleton'
import type { SearchResults as SearchResultsType } from '@/types'

import { NoResults } from './no-results'
import { PropertyList } from './property-list'
import { ResultsToggle, type ViewMode } from './results-toggle'

function MapView({ results }: { results: SearchResultsType }) {
  // Dynamic import of map to avoid SSR issues
  const MapContainer = use(
    import('@/components/map/map-container').then((mod) => mod),
  )

  return <MapContainer.PropertyMap properties={results.properties} />
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {results.totalCount} {results.totalCount === 1 ? 'property' : 'properties'} found
        </p>
        <ResultsToggle onChange={handleViewChange} />
      </div>

      {viewMode === 'list' ? (
        <PropertyList properties={results.properties} />
      ) : (
        <Suspense fallback={<MapSkeleton />}>
          <MapView results={results} />
        </Suspense>
      )}
    </div>
  )
}

export function SearchResultsView({ resultsPromise }: { resultsPromise: Promise<SearchResultsType> }) {
  return <ResultsContent resultsPromise={resultsPromise} />
}
