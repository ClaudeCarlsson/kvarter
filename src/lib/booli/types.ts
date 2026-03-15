// Internal types — NEVER export from this module's index.ts

export type BooliCoordinatesRaw = {
  latitude: number
  longitude: number
}

export type BooliImageRaw = {
  url: string
  width?: number
  height?: number
}

export type BooliPropertyRaw = {
  booliId: number
  address: string
  area: string
  municipality: string
  price: number
  pricePerSqm?: number
  livingArea: number
  rooms: number
  floor?: number
  totalFloors?: number
  constructionYear?: number
  monthlyFee?: number
  propertyType: string
  coordinates: BooliCoordinatesRaw
  images: BooliImageRaw[]
  description?: string
  url: string
  publishedAt: string
  daysOnMarket: number
}

export type BooliLocationRaw = {
  id: string
  name: string
  type: string
  slug?: string
  coordinates?: BooliCoordinatesRaw
  parentName?: string
}

export type BooliSearchPropertiesResponse = {
  searchProperties: {
    totalCount: number
    properties: BooliPropertyRaw[]
  }
}

export type BooliSearchLocationsResponse = {
  searchLocations: BooliLocationRaw[]
}
