/** @internal Test-only data source. Not used in production. */

import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { applyPropertyFilters } from '@/lib/filters'
import type { Location, Pagination, Property, SearchFilters, SearchResults, SoldProperty } from '@/types'

import { MOCK_LOCATIONS, MOCK_PROPERTIES } from '../booli/mock-data'

import { SOLD_PROPERTIES } from './sold-data'
import type { DataSource } from './types'

export class MockDataSource implements DataSource {
  async searchLocations(query: string, limit = 5): Promise<Location[]> {
    const q = query.toLowerCase()
    return MOCK_LOCATIONS
      .filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          (loc.parentName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, limit)
  }

  async searchProperties(
    filters: SearchFilters,
    pagination: Pagination = { offset: 0, limit: DEFAULT_PAGE_SIZE },
  ): Promise<SearchResults> {
    let results: Property[] = [...MOCK_PROPERTIES]

    if (filters.locationId) {
      const lid = filters.locationId.toLowerCase()
      const location = MOCK_LOCATIONS.find(
        (l) => l.id === filters.locationId || l.name.toLowerCase() === lid,
      )
      if (location) {
        results = results.filter(
          (p) =>
            p.municipality.toLowerCase() === location.name.toLowerCase() ||
            p.area.toLowerCase() === location.name.toLowerCase(),
        )
      }
    }

    if (filters.query) {
      const q = filters.query.toLowerCase()
      results = results.filter(
        (p) =>
          p.address.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q) ||
          p.municipality.toLowerCase().includes(q),
      )
    }

    results = applyPropertyFilters(results, filters)

    const totalCount = results.length
    const paged = results.slice(pagination.offset, pagination.offset + pagination.limit)

    return {
      properties: paged,
      totalCount,
      pagination,
      filters,
    }
  }

  async getSoldProperties(area?: string): Promise<SoldProperty[]> {
    if (!area) return [...SOLD_PROPERTIES]
    const q = area.toLowerCase()
    return SOLD_PROPERTIES.filter(
      (p) =>
        p.area.toLowerCase().includes(q) ||
        p.municipality.toLowerCase().includes(q),
    )
  }
}
