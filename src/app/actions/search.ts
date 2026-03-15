'use server'

import { generateCacheKey, withCache } from '@/lib/cache'
import { getDataSource } from '@/lib/data-source'
import { searchSwedishLocations } from '@/lib/data-source/locations'
import type { Location, Pagination, SearchFilters, SearchResults } from '@/types'

export async function searchLocationsAction(
  query: string,
): Promise<Location[]> {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  // Location autocomplete uses static Swedish geographic reference data.
  // This is not mock data — it's a curated list of real cities and neighborhoods.
  return searchSwedishLocations(trimmed)
}

export async function searchPropertiesAction(
  filters: SearchFilters,
  pagination?: Pagination,
  forceRefresh = false,
): Promise<SearchResults> {
  const key = generateCacheKey('properties', { ...filters, ...pagination })

  return withCache(
    () => getDataSource().searchProperties(filters, pagination),
    key,
    { strategy: 'short', forceRefresh },
  )
}
