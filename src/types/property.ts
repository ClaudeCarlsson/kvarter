import type { Coordinates } from './common'

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'townhouse'
  | 'plot'
  | 'cottage'

export type PropertyImage = {
  url: string
  width?: number
  height?: number
}

export type Property = {
  id: string
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
  propertyType: PropertyType
  coordinates: Coordinates
  images: PropertyImage[]
  description?: string
  url: string
  publishedAt: string
  daysOnMarket: number
}
