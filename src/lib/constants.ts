import type { Coordinates, PropertyType } from '@/types'

export const STOCKHOLM_CENTER: Coordinates = {
  latitude: 59.3293,
  longitude: 18.0686,
}

export const SWEDEN_CENTER: Coordinates = {
  latitude: 62.0,
  longitude: 15.0,
}

export const DEFAULT_ZOOM = 5
export const CITY_ZOOM = 12
export const DEFAULT_PAGE_SIZE = 20
export const DEBOUNCE_MS = 300

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  plot: 'Plot',
  cottage: 'Cottage',
}
