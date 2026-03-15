import type { LocationType, PropertyType } from '@/types'

const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  lagenhet: 'apartment',
  lägenhet: 'apartment',
  apartment: 'apartment',
  bostadsrätt: 'apartment',
  bostadsratt: 'apartment',
  villa: 'house',
  house: 'house',
  radhus: 'townhouse',
  townhouse: 'townhouse',
  kedjehus: 'townhouse',
  parhus: 'townhouse',
  tomt: 'plot',
  'tomt/mark': 'plot',
  plot: 'plot',
  fritidshus: 'cottage',
  fritidsboende: 'cottage',
  stuga: 'cottage',
  cottage: 'cottage',
}

export function normalizePropertyType(raw: string | undefined): PropertyType {
  if (!raw) return 'apartment'
  return PROPERTY_TYPE_MAP[raw.toLowerCase()] ?? 'apartment'
}

const LOCATION_TYPE_MAP: Record<string, LocationType> = {
  kommun: 'kommun',
  municipality: 'kommun',
  stadsdel: 'stadsdel',
  district: 'stadsdel',
  stad: 'stad',
  city: 'stad',
  lan: 'lan',
  county: 'lan',
  region: 'lan',
  omrade: 'omrade',
  area: 'omrade',
  street: 'adress',
  adress: 'adress',
  address: 'adress',
}

export function normalizeLocationType(raw: string | undefined): LocationType {
  if (!raw) return 'omrade'
  return LOCATION_TYPE_MAP[raw.toLowerCase()] ?? 'omrade'
}
