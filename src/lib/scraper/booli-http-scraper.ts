/**
 * HTTP-based Booli.se scraper.
 *
 * This DataSource implementation fetches pages from booli.se using plain
 * `fetch()` calls and extracts listing data from the embedded Next.js
 * `__NEXT_DATA__` payload.  No browser binary is required, making it
 * suitable for environments where Playwright browsers are not installed.
 *
 * Rate-limit and error handling are built in -- the scraper will never
 * crash the application.
 */

import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { Location, LocationType, Pagination, Property, PropertyType, SearchFilters, SearchResults } from '@/types'

import type { DataSource } from '../data-source/types'

import { extractJsonLd, extractNextData } from './html-parser'

// ---------------------------------------------------------------------------
// Internal types for the raw scraped payloads
// ---------------------------------------------------------------------------

type RawLocationSuggestion = {
  id?: string
  booliId?: string
  name?: string
  fullName?: string
  types?: string[]
  type?: string
  slug?: string
  geo?: { lat?: number; lng?: number }
  parentName?: string
  [key: string]: unknown
}

type RawListingProperty = {
  booliId?: number
  listPrice?: number
  price?: number
  livingArea?: number
  rooms?: number
  floor?: number
  totalFloors?: number
  objectType?: string
  type?: string
  publishedDate?: string
  published?: string
  location?: {
    address?: { streetAddress?: string; city?: string; [key: string]: unknown }
    region?: { municipalityName?: string; [key: string]: unknown }
    namedAreas?: string[]
    position?: { latitude?: number; longitude?: number }
    [key: string]: unknown
  }
  constructionYear?: number
  rent?: number
  monthlyFee?: number
  pricePerSqm?: number
  pricePerM2?: number
  images?: Array<{ url?: string; width?: number; height?: number }>
  imageUrls?: string[]
  description?: string
  descriptionFormatted?: string
  url?: string
  daysOnBooli?: number
  daysActive?: number
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOLI_BASE_URL = 'https://www.booli.se'

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (compatible; Kvarter/1.0)',
  Accept: 'text/html,application/json',
  'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
}

const LOCATION_API_PATH = '/api/search'

/** Minimum delay between consecutive requests (ms). */
const REQUEST_DELAY_MS = 200

// ---------------------------------------------------------------------------
// Property-type normalisation (Swedish -> English domain type)
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  lagenhet: 'apartment',
  lägenhet: 'apartment',
  apartment: 'apartment',
  villa: 'house',
  house: 'house',
  radhus: 'townhouse',
  townhouse: 'townhouse',
  tomt: 'plot',
  plot: 'plot',
  fritidshus: 'cottage',
  stuga: 'cottage',
  cottage: 'cottage',
}

function normalizePropertyType(raw: string | undefined): PropertyType {
  if (!raw) return 'apartment'
  return PROPERTY_TYPE_MAP[raw.toLowerCase()] ?? 'apartment'
}

const LOCATION_TYPE_MAP: Record<string, LocationType> = {
  kommun: 'kommun',
  municipality: 'kommun',
  stadsdel: 'stadsdel',
  stad: 'stad',
  city: 'stad',
  lan: 'lan',
  county: 'lan',
  omrade: 'omrade',
  area: 'omrade',
  adress: 'adress',
  address: 'adress',
}

function normalizeLocationType(raw: string | undefined): LocationType {
  if (!raw) return 'omrade'
  return LOCATION_TYPE_MAP[raw.toLowerCase()] ?? 'omrade'
}

// ---------------------------------------------------------------------------
// BooliHttpScraper
// ---------------------------------------------------------------------------

export class BooliHttpScraper implements DataSource {
  private baseUrl: string
  private lastRequestTime = 0

  constructor(baseUrl: string = BOOLI_BASE_URL) {
    this.baseUrl = baseUrl
  }

  // -----------------------------------------------------------------------
  // DataSource: searchLocations
  // -----------------------------------------------------------------------

  async searchLocations(query: string, limit = 5): Promise<Location[]> {
    if (!query.trim()) return []

    try {
      const url = `${this.baseUrl}${LOCATION_API_PATH}?q=${encodeURIComponent(query)}&limit=${limit}`
      const response = await this.fetchWithThrottle(url, {
        headers: { ...DEFAULT_HEADERS, Accept: 'application/json' },
      })

      if (!response.ok) return []

      const data: unknown = await response.json()
      return this.parseLocationApiResponse(data, limit)
    } catch {
      // Network / parse failure -- return empty rather than crash
      return []
    }
  }

  // -----------------------------------------------------------------------
  // DataSource: searchProperties
  // -----------------------------------------------------------------------

  async searchProperties(
    filters: SearchFilters,
    pagination: Pagination = { offset: 0, limit: DEFAULT_PAGE_SIZE },
  ): Promise<SearchResults> {
    const emptyResult: SearchResults = {
      properties: [],
      totalCount: 0,
      pagination,
      filters,
    }

    try {
      const url = this.buildSearchUrl(filters, pagination)
      const response = await this.fetchWithThrottle(url, {
        headers: DEFAULT_HEADERS,
      })

      if (!response.ok) return emptyResult

      const html = await response.text()
      return this.parseSearchResults(html, pagination, filters)
    } catch {
      return emptyResult
    }
  }

  // -----------------------------------------------------------------------
  // URL construction
  // -----------------------------------------------------------------------

  /** @internal Exposed for testing. */
  buildSearchUrl(filters: SearchFilters, pagination: Pagination): string {
    const params = new URLSearchParams()

    if (filters.locationId) params.set('areaId', filters.locationId)
    if (filters.query) params.set('q', filters.query)

    if (filters.priceRange?.min) params.set('minListPrice', String(filters.priceRange.min))
    if (filters.priceRange?.max) params.set('maxListPrice', String(filters.priceRange.max))

    if (filters.roomsRange?.min) params.set('minRooms', String(filters.roomsRange.min))
    if (filters.roomsRange?.max) params.set('maxRooms', String(filters.roomsRange.max))

    if (filters.areaRange?.min) params.set('minLivingArea', String(filters.areaRange.min))
    if (filters.areaRange?.max) params.set('maxLivingArea', String(filters.areaRange.max))

    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      params.set('objectType', filters.propertyTypes.join(','))
    }

    if (filters.constructionYearRange?.min) {
      params.set('minConstructionYear', String(filters.constructionYearRange.min))
    }
    if (filters.constructionYearRange?.max) {
      params.set('maxConstructionYear', String(filters.constructionYearRange.max))
    }

    if (filters.maxMonthlyFee) params.set('maxRent', String(filters.maxMonthlyFee))
    if (filters.maxPricePerSqm) params.set('maxPricePerSqm', String(filters.maxPricePerSqm))
    if (filters.daysActive) params.set('daysActive', String(filters.daysActive))

    const page = Math.floor(pagination.offset / pagination.limit) + 1
    if (page > 1) params.set('page', String(page))

    const qs = params.toString()
    return `${this.baseUrl}/sok/till-salu${qs ? `?${qs}` : ''}`
  }

  // -----------------------------------------------------------------------
  // Response parsing
  // -----------------------------------------------------------------------

  private parseLocationApiResponse(data: unknown, limit: number): Location[] {
    if (!data || typeof data !== 'object') return []

    // The API may return { result: [...] } or an array directly
    const candidates: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>).result)
        ? (data as Record<string, unknown>).result as unknown[]
        : Array.isArray((data as Record<string, unknown>).data)
          ? (data as Record<string, unknown>).data as unknown[]
          : []

    const locations: Location[] = []

    for (const item of candidates) {
      if (locations.length >= limit) break
      const raw = item as RawLocationSuggestion
      const loc = this.mapRawLocation(raw)
      if (loc) locations.push(loc)
    }

    return locations
  }

  private mapRawLocation(raw: RawLocationSuggestion): Location | null {
    const id = String(raw.id ?? raw.booliId ?? '')
    const name = raw.name ?? raw.fullName ?? ''
    if (!id || !name) return null

    const rawType = raw.type ?? raw.types?.[0] ?? ''

    return {
      id,
      name,
      type: normalizeLocationType(rawType),
      slug: raw.slug,
      coordinates:
        raw.geo?.lat != null && raw.geo?.lng != null
          ? { latitude: raw.geo.lat, longitude: raw.geo.lng }
          : undefined,
      parentName: raw.parentName,
    }
  }

  /** @internal Exposed for testing. */
  parseSearchResults(
    html: string,
    pagination: Pagination,
    filters: SearchFilters,
  ): SearchResults {
    const empty: SearchResults = { properties: [], totalCount: 0, pagination, filters }

    // Strategy 1: __NEXT_DATA__ payload (most reliable)
    const nextData = extractNextData<NextDataPayload>(html)
    if (nextData) {
      const result = this.extractFromNextData(nextData)
      if (result) {
        return {
          properties: result.properties,
          totalCount: result.totalCount,
          pagination,
          filters,
        }
      }
    }

    // Strategy 2: JSON-LD (backup -- less data but structured)
    const jsonLdBlocks = extractJsonLd(html)
    if (jsonLdBlocks.length > 0) {
      const properties = this.extractFromJsonLd(jsonLdBlocks)
      if (properties.length > 0) {
        return {
          properties,
          totalCount: properties.length,
          pagination,
          filters,
        }
      }
    }

    return empty
  }

  // -----------------------------------------------------------------------
  // __NEXT_DATA__ extraction
  // -----------------------------------------------------------------------

  private extractFromNextData(
    payload: NextDataPayload,
  ): { properties: Property[]; totalCount: number } | null {
    // Next.js pages store page data under props.pageProps
    const pageProps = payload?.props?.pageProps
    if (!pageProps) return null

    // Look for listing arrays in common paths
    const rawListings = this.findListingsInObject(pageProps)
    if (!rawListings || rawListings.length === 0) return null

    const totalCount =
      (pageProps as Record<string, unknown>).totalCount as number | undefined ??
      (pageProps as Record<string, unknown>).total as number | undefined ??
      rawListings.length

    const properties = rawListings
      .map((raw) => this.mapRawProperty(raw))
      .filter((p): p is Property => p !== null)

    return { properties, totalCount }
  }

  /**
   * Recursively search an object tree for an array that looks like
   * a listing of properties (has items with booliId / listPrice).
   */
  private findListingsInObject(obj: unknown): RawListingProperty[] | null {
    if (!obj || typeof obj !== 'object') return null

    // If obj is an array, check whether it looks like listings
    if (Array.isArray(obj)) {
      if (obj.length > 0 && this.looksLikeListing(obj[0])) {
        return obj as RawListingProperty[]
      }
      // Search child arrays
      for (const item of obj) {
        const found = this.findListingsInObject(item)
        if (found) return found
      }
      return null
    }

    // obj is a record -- check known keys first for performance
    const record = obj as Record<string, unknown>
    const priorityKeys = [
      'listings',
      'result',
      'results',
      'properties',
      'items',
      'booliListings',
      'searchResult',
      'data',
    ]

    for (const key of priorityKeys) {
      if (key in record) {
        const found = this.findListingsInObject(record[key])
        if (found) return found
      }
    }

    // Fall back to exhaustive search
    for (const [key, value] of Object.entries(record)) {
      if (priorityKeys.includes(key)) continue
      const found = this.findListingsInObject(value)
      if (found) return found
    }

    return null
  }

  private looksLikeListing(item: unknown): boolean {
    if (!item || typeof item !== 'object') return false
    const keys = Object.keys(item as Record<string, unknown>)
    // A listing object typically has booliId and some price or area field
    return (
      keys.includes('booliId') ||
      (keys.includes('listPrice') && keys.includes('livingArea')) ||
      (keys.includes('price') && keys.includes('rooms'))
    )
  }

  // -----------------------------------------------------------------------
  // JSON-LD extraction (fallback)
  // -----------------------------------------------------------------------

  private extractFromJsonLd(blocks: Record<string, unknown>[]): Property[] {
    const properties: Property[] = []

    for (const block of blocks) {
      const type = block['@type']
      if (type === 'RealEstateListing' || type === 'Product' || type === 'Residence') {
        const prop = this.mapJsonLdToProperty(block)
        if (prop) properties.push(prop)
      }

      // Handle ItemList wrapping multiple listings
      if (type === 'ItemList' && Array.isArray(block.itemListElement)) {
        for (const element of block.itemListElement as Record<string, unknown>[]) {
          const item = (element.item ?? element) as Record<string, unknown>
          const prop = this.mapJsonLdToProperty(item)
          if (prop) properties.push(prop)
        }
      }
    }

    return properties
  }

  private mapJsonLdToProperty(ld: Record<string, unknown>): Property | null {
    const name = String(ld.name ?? ld.headline ?? '')
    const url = String(ld.url ?? '')

    // Try to extract a numeric ID from the URL
    const idMatch = url.match(/\/(\d+)/)
    const booliId = idMatch ? Number(idMatch[1]) : 0
    if (booliId === 0) return null

    const address =
      typeof ld.address === 'object' && ld.address !== null
        ? String((ld.address as Record<string, unknown>).streetAddress ?? name)
        : name

    const geo = ld.geo as Record<string, unknown> | undefined

    return {
      id: String(booliId),
      booliId,
      address,
      area: '',
      municipality: '',
      price: Number(
        (ld.offers as Record<string, unknown>)?.price ?? ld.price ?? 0,
      ),
      livingArea: 0,
      rooms: 0,
      propertyType: 'apartment',
      coordinates: {
        latitude: Number(geo?.latitude ?? 0),
        longitude: Number(geo?.longitude ?? 0),
      },
      images: ld.image
        ? [{ url: String(Array.isArray(ld.image) ? ld.image[0] : ld.image) }]
        : [],
      description: String(ld.description ?? ''),
      url,
      publishedAt: String(ld.datePublished ?? new Date().toISOString().split('T')[0]),
      daysOnMarket: 0,
    }
  }

  // -----------------------------------------------------------------------
  // Raw listing -> domain Property mapper
  // -----------------------------------------------------------------------

  private mapRawProperty(raw: RawListingProperty): Property | null {
    const booliId = raw.booliId
    if (!booliId) return null

    const address =
      raw.location?.address?.streetAddress ?? ''
    const area =
      raw.location?.namedAreas?.[0] ?? raw.location?.address?.city ?? ''
    const municipality =
      raw.location?.region?.municipalityName ?? ''
    const lat = raw.location?.position?.latitude ?? 0
    const lng = raw.location?.position?.longitude ?? 0
    const price = raw.listPrice ?? raw.price ?? 0
    const livingArea = raw.livingArea ?? 0
    const pricePerSqm =
      raw.pricePerSqm ?? raw.pricePerM2 ?? (livingArea > 0 ? Math.round(price / livingArea) : undefined)
    const publishedAt =
      raw.publishedDate ?? raw.published ?? new Date().toISOString().split('T')[0]
    const daysOnMarket = raw.daysOnBooli ?? raw.daysActive ?? 0

    const images: Property['images'] = []
    if (raw.images && Array.isArray(raw.images)) {
      for (const img of raw.images) {
        if (img.url) images.push({ url: img.url, width: img.width, height: img.height })
      }
    } else if (raw.imageUrls && Array.isArray(raw.imageUrls)) {
      for (const url of raw.imageUrls) {
        if (url) images.push({ url })
      }
    }

    return {
      id: String(booliId),
      booliId,
      address,
      area,
      municipality,
      price,
      pricePerSqm,
      livingArea,
      rooms: raw.rooms ?? 0,
      floor: raw.floor,
      totalFloors: raw.totalFloors,
      constructionYear: raw.constructionYear,
      monthlyFee: raw.rent ?? raw.monthlyFee,
      propertyType: normalizePropertyType(raw.objectType ?? raw.type),
      coordinates: { latitude: lat, longitude: lng },
      images,
      description: raw.description ?? raw.descriptionFormatted,
      url: raw.url ?? `${this.baseUrl}/annons/${booliId}`,
      publishedAt,
      daysOnMarket,
    }
  }

  // -----------------------------------------------------------------------
  // Throttled fetch
  // -----------------------------------------------------------------------

  private async fetchWithThrottle(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < REQUEST_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed))
    }
    this.lastRequestTime = Date.now()
    return fetch(url, init)
  }
}

// ---------------------------------------------------------------------------
// Internal type for the Next.js data payload structure
// ---------------------------------------------------------------------------

type NextDataPayload = {
  props?: {
    pageProps?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}
