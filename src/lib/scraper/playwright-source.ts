import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { applyPropertyFilters } from '@/lib/filters'
import { normalizePropertyType } from '@/lib/normalize'
import type { Location, LocationType, Pagination, Property, SearchFilters, SearchResults } from '@/types'

import type { DataSource } from '../data-source/types'

/**
 * DataSource that talks to the Playwright scraper sidecar service.
 * The sidecar runs headless Chromium in Docker and exposes a simple HTTP API.
 * This bypasses anti-bot protections that block server-side fetch().
 */
export class PlaywrightSource implements DataSource {
  constructor(
    private scraperUrl: string = process.env.SCRAPER_URL || 'http://localhost:3001',
    private fetchFn: typeof fetch = fetch,
  ) {}

  async searchLocations(query: string, limit = 5): Promise<Location[]> {
    if (!query.trim()) return []

    try {
      const url = `${this.scraperUrl}/search/locations?q=${encodeURIComponent(query)}&limit=${limit}`
      const response = await this.fetchFn(url, { signal: AbortSignal.timeout(30000) })

      if (!response.ok) return []

      const data: RawLocation[] = await response.json()
      return data
        .slice(0, limit)
        .map((item) => ({
          id: String(item.id || item.name || ''),
          name: String(item.name || ''),
          type: (item.type as LocationType) || 'stad',
          slug: item.slug,
          parentName: item.parentName,
        }))
        .filter((loc) => loc.id && loc.name)
    } catch {
      return []
    }
  }

  async searchProperties(
    filters: SearchFilters,
    pagination: Pagination = { offset: 0, limit: DEFAULT_PAGE_SIZE },
  ): Promise<SearchResults> {
    const empty: SearchResults = { properties: [], totalCount: 0, pagination, filters }

    try {
      const query = filters.query || filters.locationId || ''
      if (!query) return empty

      const url = `${this.scraperUrl}/search/properties?q=${encodeURIComponent(query)}`
      const response = await this.fetchFn(url, { signal: AbortSignal.timeout(60000) })

      if (!response.ok) return empty

      const data: RawProperty[] = await response.json()
      if (!Array.isArray(data)) return empty

      const MINIMUM_LISTING_PRICE = 100_000

      const properties: Property[] = data
        .map((raw) => this.mapProperty(raw))
        .filter((p): p is Property => p !== null)
        .filter((p) => {
          // Filter out properties with no address
          if (!p.address) return false
          // Filter out zero-price listings
          if (p.price === 0) return false
          // Filter out prices below 100,000 kr — likely monthly rent or fees,
          // not actual listing prices (e.g. 35,000 kr for an apartment)
          if (p.price < MINIMUM_LISTING_PRICE) return false
          return true
        })

      // Apply client-side filters (scraper returns everything for the query)
      const filtered = applyPropertyFilters(properties, filters)
      const paged = filtered.slice(pagination.offset, pagination.offset + pagination.limit)

      return {
        properties: paged,
        totalCount: filtered.length,
        pagination,
        filters,
      }
    } catch {
      return empty
    }
  }

  private mapProperty(raw: RawProperty): Property | null {
    const booliId = raw.booliId
    if (!booliId) return null

    return {
      id: String(booliId),
      booliId,
      address: raw.address || '',
      area: raw.area || raw.location?.namedAreas?.[0] || '',
      municipality: raw.municipality || raw.location?.region?.municipalityName || '',
      price: raw.price || raw.listPrice || 0,
      pricePerSqm: raw.pricePerSqm || (raw.livingArea && raw.price ? Math.round(raw.price / raw.livingArea) : undefined),
      livingArea: raw.livingArea || 0,
      rooms: raw.rooms || 0,
      floor: raw.floor,
      totalFloors: raw.totalFloors,
      constructionYear: raw.constructionYear,
      monthlyFee: raw.monthlyFee || raw.rent,
      propertyType: normalizePropertyType(raw.objectType || raw.type),
      coordinates: {
        latitude: raw.location?.position?.latitude || raw.latitude || 0,
        longitude: raw.location?.position?.longitude || raw.longitude || 0,
      },
      images: raw.images?.map((img: { url: string }) => ({ url: img.url })) || [],
      url: raw.url || `https://www.booli.se/annons/${booliId}`,
      publishedAt: raw.publishedDate || new Date().toISOString().split('T')[0],
      daysOnMarket: raw.daysOnBooli || raw.daysActive || 0,
    }
  }

}

type RawLocation = {
  id?: string; name?: string; type?: string
  slug?: string; parentName?: string
}

type RawProperty = {
  booliId?: number; address?: string; area?: string; municipality?: string
  price?: number; listPrice?: number; pricePerSqm?: number
  livingArea?: number; rooms?: number; floor?: number; totalFloors?: number
  constructionYear?: number; monthlyFee?: number; rent?: number
  objectType?: string; type?: string
  location?: { namedAreas?: string[]; region?: { municipalityName?: string }; position?: { latitude?: number; longitude?: number } }
  latitude?: number; longitude?: number
  images?: { url: string }[]; url?: string
  publishedDate?: string; daysOnBooli?: number; daysActive?: number
}
