import { getDataSource } from '@/lib/data-source'
import type { Location, Pagination, SearchFilters, SearchResults } from '@/types'

export async function searchLocations(
  query: string,
  limit = 5,
): Promise<Location[]> {
  return getDataSource().searchLocations(query, limit)
}

export async function searchProperties(
  filters: SearchFilters,
  pagination?: Pagination,
): Promise<SearchResults> {
  return getDataSource().searchProperties(filters, pagination)
}
