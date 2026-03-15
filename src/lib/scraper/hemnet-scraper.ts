/**
 * HTTP-based Hemnet.se scraper.
 *
 * This DataSource implementation fetches pages from hemnet.se using plain
 * `fetch()` calls and extracts listing data from JSON-LD structured data
 * or from the HTML listing cards.  No browser binary is required.
 *
 * Rate-limit and error handling are built in -- the scraper will never
 * crash the application.
 *
 * A custom `fetchFn` can be injected via the constructor for testing.
 */

import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { normalizeLocationType, normalizePropertyType } from '@/lib/normalize'
import type { Location, Pagination, Property, SearchFilters, SearchResults } from '@/types'

import type { DataSource } from '../data-source/types'

import { extractHemnetListings, extractJsonLd } from './html-parser'

// ---------------------------------------------------------------------------
// Internal types for the raw Hemnet location API response
// ---------------------------------------------------------------------------

type HemnetLocationResult = {
  id?: number
  name?: string
  location_id?: string
  type?: string
  parent_location?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEMNET_BASE_URL = 'https://www.hemnet.se'

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (compatible; Kvarter/1.0)',
  Accept: 'text/html,application/json',
  'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
}

/** Minimum delay between consecutive requests (ms). */
const REQUEST_DELAY_MS = 200

// ---------------------------------------------------------------------------
// Hemnet property type -> URL slug mapping
// ---------------------------------------------------------------------------

const HEMNET_PROPERTY_TYPE_SLUGS: Record<string, string> = {
  apartment: 'bostadsratt',
  house: 'villa',
  townhouse: 'radhus',
  plot: 'tomt',
  cottage: 'fritidshus',
}

// ---------------------------------------------------------------------------
// FetchFn type for dependency injection
// ---------------------------------------------------------------------------

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

// ---------------------------------------------------------------------------
// HemnetScraper
// ---------------------------------------------------------------------------

export class HemnetScraper implements DataSource {
  private baseUrl: string
  private fetchFn: FetchFn
  private lastRequestTime = 0

  constructor(baseUrl: string = HEMNET_BASE_URL, fetchFn: FetchFn = fetch) {
    this.baseUrl = baseUrl
    this.fetchFn = fetchFn
  }

  // -----------------------------------------------------------------------
  // DataSource: searchLocations
  // -----------------------------------------------------------------------

  async searchLocations(query: string, limit = 5): Promise<Location[]> {
    if (!query.trim()) return []

    try {
      const url = `${this.baseUrl}/locations/show?q=${encodeURIComponent(query)}`
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

    if (filters.locationId) {
      params.append('location_ids[]', filters.locationId)
    }

    if (filters.priceRange?.min) params.set('price_min', String(filters.priceRange.min))
    if (filters.priceRange?.max) params.set('price_max', String(filters.priceRange.max))

    if (filters.roomsRange?.min) params.set('rooms_min', String(filters.roomsRange.min))
    if (filters.roomsRange?.max) params.set('rooms_max', String(filters.roomsRange.max))

    if (filters.areaRange?.min) params.set('living_area_min', String(filters.areaRange.min))
    if (filters.areaRange?.max) params.set('living_area_max', String(filters.areaRange.max))

    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      for (const pt of filters.propertyTypes) {
        const slug = HEMNET_PROPERTY_TYPE_SLUGS[pt] ?? pt
        params.append('item_types[]', slug)
      }
    }

    if (filters.maxMonthlyFee) params.set('fee_max', String(filters.maxMonthlyFee))
    if (filters.maxPricePerSqm) params.set('price_per_sqm_max', String(filters.maxPricePerSqm))

    if (filters.constructionYearRange?.min) {
      params.set('construction_year_min', String(filters.constructionYearRange.min))
    }
    if (filters.constructionYearRange?.max) {
      params.set('construction_year_max', String(filters.constructionYearRange.max))
    }

    const page = Math.floor(pagination.offset / pagination.limit) + 1
    if (page > 1) params.set('page', String(page))

    const qs = params.toString()
    return `${this.baseUrl}/bostader${qs ? `?${qs}` : ''}`
  }

  // -----------------------------------------------------------------------
  // Response parsing
  // -----------------------------------------------------------------------

  private parseLocationApiResponse(data: unknown, limit: number): Location[] {
    if (!data || typeof data !== 'object') return []

    // Hemnet returns an array directly from /locations/show
    const candidates: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>).locations)
        ? (data as Record<string, unknown>).locations as unknown[]
        : Array.isArray((data as Record<string, unknown>).result)
          ? (data as Record<string, unknown>).result as unknown[]
          : []

    const locations: Location[] = []

    for (const item of candidates) {
      if (locations.length >= limit) break
      const raw = item as HemnetLocationResult
      const loc = this.mapRawLocation(raw)
      if (loc) locations.push(loc)
    }

    return locations
  }

  private mapRawLocation(raw: HemnetLocationResult): Location | null {
    const id = String(raw.location_id ?? raw.id ?? '')
    const name = raw.name ?? ''
    if (!id || !name) return null

    return {
      id,
      name,
      type: normalizeLocationType(raw.type),
      parentName: raw.parent_location ? String(raw.parent_location) : undefined,
    }
  }

  /** @internal Exposed for testing. */
  parseSearchResults(
    html: string,
    pagination: Pagination,
    filters: SearchFilters,
  ): SearchResults {
    const empty: SearchResults = { properties: [], totalCount: 0, pagination, filters }

    // Strategy 1: JSON-LD structured data (Hemnet embeds these as Product or Residence)
    const jsonLdBlocks = extractJsonLd(html)
    if (jsonLdBlocks.length > 0) {
      const properties = this.extractFromJsonLd(jsonLdBlocks)
      if (properties.length > 0) {
        const totalCount = this.extractTotalCount(html) ?? properties.length
        return {
          properties,
          totalCount,
          pagination,
          filters,
        }
      }
    }

    // Strategy 2: parse the HTML listing cards
    const hemnetListings = extractHemnetListings(html)
    if (hemnetListings.length > 0) {
      const properties = hemnetListings
        .map((listing) => this.mapHemnetListing(listing))
        .filter((p): p is Property => p !== null)

      if (properties.length > 0) {
        const totalCount = this.extractTotalCount(html) ?? properties.length
        return {
          properties,
          totalCount,
          pagination,
          filters,
        }
      }
    }

    return empty
  }

  // -----------------------------------------------------------------------
  // JSON-LD extraction
  // -----------------------------------------------------------------------

  private extractFromJsonLd(blocks: Record<string, unknown>[]): Property[] {
    const properties: Property[] = []

    for (const block of blocks) {
      const type = block['@type']
      if (type === 'Product' || type === 'Residence' || type === 'RealEstateListing') {
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

    // Try to extract a numeric ID from the URL (hemnet URLs: /bostad/12345)
    const idMatch = url.match(/\/(\d+)/)
    const hemnetId = idMatch ? Number(idMatch[1]) : 0
    if (hemnetId === 0) return null

    const address =
      typeof ld.address === 'object' && ld.address !== null
        ? String((ld.address as Record<string, unknown>).streetAddress ?? name)
        : name

    const municipality =
      typeof ld.address === 'object' && ld.address !== null
        ? String((ld.address as Record<string, unknown>).addressLocality ?? '')
        : ''

    const geo = ld.geo as Record<string, unknown> | undefined

    const offers = ld.offers as Record<string, unknown> | undefined
    const price = Number(offers?.price ?? ld.price ?? 0)

    const livingArea = Number(ld.floorSize?.valueOf() ?? 0)

    return {
      id: String(hemnetId),
      booliId: hemnetId,
      address,
      area: municipality,
      municipality,
      price,
      livingArea,
      rooms: 0,
      propertyType: normalizePropertyType(ld.propertyType as string | undefined),
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
  // HTML listing card mapper
  // -----------------------------------------------------------------------

  private mapHemnetListing(listing: HemnetListingData): Property | null {
    if (!listing.id) return null

    const hemnetId = Number(listing.id)
    if (isNaN(hemnetId) || hemnetId === 0) return null

    const price = listing.price ?? 0
    const livingArea = listing.livingArea ?? 0
    const pricePerSqm = livingArea > 0 ? Math.round(price / livingArea) : undefined

    return {
      id: String(hemnetId),
      booliId: hemnetId,
      address: listing.address ?? '',
      area: listing.location ?? '',
      municipality: listing.location ?? '',
      price,
      pricePerSqm,
      livingArea,
      rooms: listing.rooms ?? 0,
      monthlyFee: listing.monthlyFee,
      propertyType: normalizePropertyType(listing.propertyType),
      coordinates: {
        latitude: listing.latitude ?? 0,
        longitude: listing.longitude ?? 0,
      },
      images: listing.imageUrl ? [{ url: listing.imageUrl }] : [],
      url: listing.url ?? `${this.baseUrl}/bostad/${hemnetId}`,
      publishedAt: new Date().toISOString().split('T')[0],
      daysOnMarket: 0,
    }
  }

  // -----------------------------------------------------------------------
  // Total count extraction from HTML
  // -----------------------------------------------------------------------

  private extractTotalCount(html: string): number | null {
    // Look for a pattern like "1 234 bostader" or "42 resultat"
    const match = html.match(/(\d[\d\s]*)\s*(?:bost[aä]der|resultat|objekt)/i)
    if (match) {
      const num = parseInt(match[1].replace(/\s/g, ''), 10)
      if (!isNaN(num)) return num
    }
    return null
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
    return this.fetchFn(url, init)
  }
}

// ---------------------------------------------------------------------------
// Type for extracted Hemnet HTML listing data
// (matches the return type of extractHemnetListings in html-parser.ts)
// ---------------------------------------------------------------------------

export type HemnetListingData = {
  id?: string
  address?: string
  price?: number
  rooms?: number
  livingArea?: number
  location?: string
  monthlyFee?: number
  propertyType?: string
  latitude?: number
  longitude?: number
  imageUrl?: string
  url?: string
}
