import type { Location, Pagination, SearchFilters, SearchResults } from '@/types'

export interface DataSource {
  searchLocations(query: string, limit?: number): Promise<Location[]>
  searchProperties(filters: SearchFilters, pagination?: Pagination): Promise<SearchResults>
}
