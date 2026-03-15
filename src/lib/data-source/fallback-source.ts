import type { Location, Pagination, SearchFilters, SearchResults, SoldProperty } from '@/types'

import type { DataSource } from './types'

export class FallbackDataSource implements DataSource {
  constructor(
    private primary: DataSource,
    private fallback: DataSource,
  ) {}

  async searchLocations(query: string, limit?: number): Promise<Location[]> {
    try {
      return await this.primary.searchLocations(query, limit)
    } catch {
      return this.fallback.searchLocations(query, limit)
    }
  }

  async searchProperties(
    filters: SearchFilters,
    pagination?: Pagination,
  ): Promise<SearchResults> {
    try {
      return await this.primary.searchProperties(filters, pagination)
    } catch {
      return this.fallback.searchProperties(filters, pagination)
    }
  }

  async getSoldProperties(area?: string): Promise<SoldProperty[]> {
    try {
      if (this.primary.getSoldProperties) {
        return await this.primary.getSoldProperties(area)
      }
    } catch {
      /* fall through */
    }
    if (this.fallback.getSoldProperties) {
      return this.fallback.getSoldProperties(area)
    }
    return []
  }
}
