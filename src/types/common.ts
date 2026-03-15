export type Coordinates = {
  latitude: number
  longitude: number
}

export type PriceRange = {
  min?: number
  max?: number
}

export type IntRange = {
  min?: number
  max?: number
}

export type Pagination = {
  offset: number
  limit: number
}

export type SortDirection = 'asc' | 'desc'
