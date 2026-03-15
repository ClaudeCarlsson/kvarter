import type { IntRange, Pagination, PriceRange, SortDirection } from './common'
import type { Location } from './location'
import type { Property, PropertyType } from './property'

export type SearchFilters = {
  locationId?: string
  query?: string
  priceRange?: PriceRange
  areaRange?: IntRange
  roomsRange?: IntRange
  propertyTypes?: PropertyType[]
  constructionYearRange?: IntRange
  maxMonthlyFee?: number
  maxPricePerSqm?: number
  floorRange?: IntRange
  daysActive?: number
}

export type SearchSort = {
  field: 'price' | 'area' | 'rooms' | 'publishedAt' | 'pricePerSqm'
  direction: SortDirection
}

export type SearchResults = {
  properties: Property[]
  totalCount: number
  pagination: Pagination
  filters: SearchFilters
}

export type LocationSearchResults = {
  locations: Location[]
}
