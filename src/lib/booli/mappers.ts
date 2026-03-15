import type { Location, LocationType, Pagination, Property, PropertyType, SearchFilters } from '@/types'

import type { BooliLocationRaw, BooliPropertyRaw } from './types'

const VALID_PROPERTY_TYPES: PropertyType[] = [
  'apartment',
  'house',
  'townhouse',
  'plot',
  'cottage',
]

const VALID_LOCATION_TYPES: LocationType[] = [
  'kommun',
  'stadsdel',
  'stad',
  'lan',
  'omrade',
  'adress',
]

function normalizePropertyType(raw: string): PropertyType {
  const lower = raw.toLowerCase()
  if (VALID_PROPERTY_TYPES.includes(lower as PropertyType)) {
    return lower as PropertyType
  }
  // Map Swedish terms
  const mapping: Record<string, PropertyType> = {
    lägenhet: 'apartment',
    lagenhet: 'apartment',
    villa: 'house',
    radhus: 'townhouse',
    tomt: 'plot',
    fritidshus: 'cottage',
    stuga: 'cottage',
  }
  return mapping[lower] ?? 'apartment'
}

function normalizeLocationType(raw: string): LocationType {
  const lower = raw.toLowerCase()
  if (VALID_LOCATION_TYPES.includes(lower as LocationType)) {
    return lower as LocationType
  }
  return 'omrade'
}

export function mapBooliPropertyToDomain(raw: BooliPropertyRaw): Property {
  return {
    id: String(raw.booliId),
    booliId: raw.booliId,
    address: raw.address,
    area: raw.area,
    municipality: raw.municipality,
    price: raw.price,
    pricePerSqm: raw.pricePerSqm ?? (raw.livingArea > 0 ? Math.round(raw.price / raw.livingArea) : undefined),
    livingArea: raw.livingArea,
    rooms: raw.rooms,
    floor: raw.floor,
    totalFloors: raw.totalFloors,
    constructionYear: raw.constructionYear,
    monthlyFee: raw.monthlyFee,
    propertyType: normalizePropertyType(raw.propertyType),
    coordinates: {
      latitude: raw.coordinates.latitude,
      longitude: raw.coordinates.longitude,
    },
    images: raw.images.map((img) => ({
      url: img.url,
      width: img.width,
      height: img.height,
    })),
    description: raw.description,
    url: raw.url,
    publishedAt: raw.publishedAt,
    daysOnMarket: raw.daysOnMarket,
  }
}

export function mapBooliLocationToDomain(raw: BooliLocationRaw): Location {
  return {
    id: raw.id,
    name: raw.name,
    type: normalizeLocationType(raw.type),
    slug: raw.slug,
    coordinates: raw.coordinates
      ? {
          latitude: raw.coordinates.latitude,
          longitude: raw.coordinates.longitude,
        }
      : undefined,
    parentName: raw.parentName,
  }
}

export function mapSearchFiltersToBooliVariables(
  filters: SearchFilters,
  pagination?: Pagination,
): Record<string, unknown> {
  return {
    query: filters.query,
    locationId: filters.locationId,
    minPrice: filters.priceRange?.min,
    maxPrice: filters.priceRange?.max,
    minRooms: filters.roomsRange?.min,
    maxRooms: filters.roomsRange?.max,
    minArea: filters.areaRange?.min,
    maxArea: filters.areaRange?.max,
    propertyType: filters.propertyTypes?.[0],
    minConstructionYear: filters.constructionYearRange?.min,
    maxConstructionYear: filters.constructionYearRange?.max,
    maxRent: filters.maxMonthlyFee,
    minPricePerSqm: undefined,
    maxPricePerSqm: filters.maxPricePerSqm,
    daysActive: filters.daysActive,
    limit: pagination?.limit,
    offset: pagination?.offset,
  }
}
