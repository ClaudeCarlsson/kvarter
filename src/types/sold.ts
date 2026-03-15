import type { Coordinates, PropertyType } from '.'

export type SoldProperty = {
  id: string
  address: string
  area: string
  municipality: string
  askingPrice: number
  soldPrice: number
  soldDate: string
  livingArea: number
  rooms: number
  floor?: number
  constructionYear?: number
  monthlyFee?: number
  propertyType: PropertyType
  coordinates: Coordinates
  pricePerSqm: number
  bidPremium: number
}
