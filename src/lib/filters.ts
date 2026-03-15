import type { Property, SearchFilters } from '@/types'

export function applyPropertyFilters(properties: Property[], filters: SearchFilters): Property[] {
  let result = properties
  if (filters.priceRange?.min) result = result.filter((p) => p.price >= filters.priceRange!.min!)
  if (filters.priceRange?.max) result = result.filter((p) => p.price <= filters.priceRange!.max!)
  if (filters.roomsRange?.min) result = result.filter((p) => p.rooms >= filters.roomsRange!.min!)
  if (filters.roomsRange?.max) result = result.filter((p) => p.rooms <= filters.roomsRange!.max!)
  if (filters.areaRange?.min) result = result.filter((p) => p.livingArea >= filters.areaRange!.min!)
  if (filters.areaRange?.max) result = result.filter((p) => p.livingArea <= filters.areaRange!.max!)
  if (filters.propertyTypes?.length) result = result.filter((p) => filters.propertyTypes!.includes(p.propertyType))
  if (filters.maxMonthlyFee) result = result.filter((p) => (p.monthlyFee ?? 0) <= filters.maxMonthlyFee!)
  return result
}
