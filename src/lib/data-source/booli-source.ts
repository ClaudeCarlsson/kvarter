import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { Location, Pagination, SearchFilters, SearchResults } from '@/types'

import {
  mapBooliLocationToDomain,
  mapBooliPropertyToDomain,
  mapSearchFiltersToBooliVariables,
} from '../booli/mappers'
import type { BooliSearchLocationsResponse, BooliSearchPropertiesResponse } from '../booli/types'

import type { DataSource } from './types'

const SEARCH_LOCATIONS_QUERY = `
  query SearchLocations($query: String!, $limit: Int) {
    searchLocations(query: $query, limit: $limit) {
      id
      name
      type
      slug
      coordinates {
        latitude
        longitude
      }
      parentName
    }
  }
`

const SEARCH_PROPERTIES_QUERY = `
  query SearchProperties(
    $query: String
    $locationId: String
    $minPrice: Int
    $maxPrice: Int
    $minRooms: Int
    $maxRooms: Int
    $minArea: Int
    $maxArea: Int
    $propertyType: String
    $maxRent: Int
    $daysActive: Int
    $limit: Int
    $offset: Int
  ) {
    searchProperties(
      query: $query
      locationId: $locationId
      minPrice: $minPrice
      maxPrice: $maxPrice
      minRooms: $minRooms
      maxRooms: $maxRooms
      minArea: $minArea
      maxArea: $maxArea
      propertyType: $propertyType
      maxRent: $maxRent
      daysActive: $daysActive
      limit: $limit
      offset: $offset
    ) {
      totalCount
      properties {
        booliId
        address
        area
        municipality
        price
        pricePerSqm
        livingArea
        rooms
        floor
        totalFloors
        constructionYear
        monthlyFee
        propertyType
        coordinates {
          latitude
          longitude
        }
        images {
          url
          width
          height
        }
        description
        url
        publishedAt
        daysOnMarket
      }
    }
  }
`

export type GraphQLRequestFn =
  (document: string, variables?: Record<string, unknown>) => Promise<unknown>

export class BooliGraphQLSource implements DataSource {
  constructor(private request: GraphQLRequestFn) {}

  async searchLocations(query: string, limit = 5): Promise<Location[]> {
    const data = (await this.request(
      SEARCH_LOCATIONS_QUERY,
      { query, limit },
    )) as BooliSearchLocationsResponse
    return data.searchLocations.map(mapBooliLocationToDomain)
  }

  async searchProperties(
    filters: SearchFilters,
    pagination: Pagination = { offset: 0, limit: DEFAULT_PAGE_SIZE },
  ): Promise<SearchResults> {
    const variables = mapSearchFiltersToBooliVariables(filters, pagination)
    const data = (await this.request(
      SEARCH_PROPERTIES_QUERY,
      variables,
    )) as BooliSearchPropertiesResponse
    return {
      properties: data.searchProperties.properties.map(mapBooliPropertyToDomain),
      totalCount: data.searchProperties.totalCount,
      pagination,
      filters,
    }
  }
}
