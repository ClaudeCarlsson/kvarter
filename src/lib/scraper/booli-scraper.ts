/**
 * Playwright-based Booli.se scraper.
 *
 * Uses a real browser to navigate booli.se, which handles JavaScript
 * rendering and any anti-bot protections.  Falls back gracefully to
 * the HTTP scraper when Playwright browsers are not installed.
 *
 * Usage:
 *   const scraper = new BooliScraper()
 *   const locations = await scraper.searchLocations('Stockholm')
 *
 * The browser is launched lazily on first use and reused across calls.
 * Call `close()` to shut it down cleanly.
 */

import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type {
  Location,
  LocationType,
  Pagination,
  Property,
  PropertyType,
  SearchFilters,
  SearchResults,
} from '@/types'

import type { DataSource } from '../data-source/types'

import { extractNextData } from './html-parser'

// ---------------------------------------------------------------------------
// Types for Playwright (lazy-loaded)
// ---------------------------------------------------------------------------

type PlaywrightBrowser = {
  newPage(): Promise<PlaywrightPage>
  close(): Promise<void>
}

type PlaywrightPage = {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>
  content(): Promise<string>
  waitForSelector(selector: string, options?: Record<string, unknown>): Promise<unknown>
  evaluate<T>(fn: () => T): Promise<T>
  fill(selector: string, value: string): Promise<void>
  click(selector: string): Promise<void>
  close(): Promise<void>
  $$eval<T>(selector: string, fn: (elements: Element[]) => T): Promise<T>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOLI_BASE_URL = 'https://www.booli.se'

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
// BooliScraper
// ---------------------------------------------------------------------------

export class BooliScraper implements DataSource {
  private browser: PlaywrightBrowser | null = null
  private browserPromise: Promise<PlaywrightBrowser | null> | null = null

  private baseUrl: string

  constructor(baseUrl: string = BOOLI_BASE_URL) {
    this.baseUrl = baseUrl
  }

  // -----------------------------------------------------------------------
  // DataSource: searchLocations
  // -----------------------------------------------------------------------

  async searchLocations(query: string, limit = 5): Promise<Location[]> {
    if (!query.trim()) return []

    const page = await this.acquirePage()
    if (!page) return []

    try {
      await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' })

      // Type into the search field
      const searchSelector = 'input[type="search"], input[name="q"], input[placeholder*="Sök"]'
      await page.waitForSelector(searchSelector, { timeout: 5000 })
      await page.fill(searchSelector, query)

      // Wait for autocomplete suggestions to appear
      const suggestSelector = '[class*="suggestion"], [class*="autocomplete"], [role="listbox"], [role="option"]'
      try {
        await page.waitForSelector(suggestSelector, { timeout: 3000 })
      } catch {
        // Suggestions may not appear for short/invalid queries
        return []
      }

      // Extract suggestion data from the DOM
      const suggestions = await page.$$eval(
        `${suggestSelector} a, ${suggestSelector} li, [role="option"]`,
        (elements: Element[]) =>
          elements.map((el) => ({
            text: el.textContent?.trim() ?? '',
            href: el.getAttribute('href') ?? '',
            dataId: el.getAttribute('data-id') ?? '',
            dataType: el.getAttribute('data-type') ?? '',
          })),
      )

      const locations: Location[] = []
      for (const s of suggestions) {
        if (locations.length >= limit) break
        if (!s.text) continue

        const slugMatch = s.href.match(/\/([^/]+)\/?$/)
        const idMatch = s.href.match(/\/(\d+)/) ?? s.dataId.match(/\d+/)

        locations.push({
          id: idMatch?.[1] ?? (s.dataId || s.text.toLowerCase().replace(/\s+/g, '-')),
          name: s.text,
          type: normalizeLocationType(s.dataType),
          slug: slugMatch?.[1],
        })
      }

      return locations
    } catch {
      return []
    } finally {
      await page.close()
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

    const page = await this.acquirePage()
    if (!page) return emptyResult

    try {
      const url = this.buildSearchUrl(filters, pagination)
      await page.goto(url, { waitUntil: 'domcontentloaded' })

      // Try extracting data from __NEXT_DATA__ first
      const html = await page.content()
      const nextData = extractNextData<NextDataPayload>(html)
      if (nextData?.props?.pageProps) {
        const result = this.extractFromPageProps(nextData.props.pageProps)
        if (result) {
          return { ...result, pagination, filters }
        }
      }

      // Fall back to evaluating in-page JavaScript
      const pageData = await page.evaluate(() => {
        const nextDataEl = document.getElementById('__NEXT_DATA__')
        if (nextDataEl) {
          try {
            return JSON.parse(nextDataEl.textContent ?? '')
          } catch {
            return null
          }
        }
        return null
      })

      if (pageData?.props?.pageProps) {
        const result = this.extractFromPageProps(
          pageData.props.pageProps as Record<string, unknown>,
        )
        if (result) {
          return { ...result, pagination, filters }
        }
      }

      return emptyResult
    } catch {
      return emptyResult
    } finally {
      await page.close()
    }
  }

  // -----------------------------------------------------------------------
  // Browser lifecycle
  // -----------------------------------------------------------------------

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.browserPromise = null
    }
  }

  private async acquirePage(): Promise<PlaywrightPage | null> {
    const browser = await this.getOrLaunchBrowser()
    if (!browser) return null

    try {
      return await browser.newPage()
    } catch {
      // Browser may have crashed -- try once more
      this.browser = null
      this.browserPromise = null
      const retryBrowser = await this.getOrLaunchBrowser()
      if (!retryBrowser) return null
      return retryBrowser.newPage()
    }
  }

  private async getOrLaunchBrowser(): Promise<PlaywrightBrowser | null> {
    if (this.browser) return this.browser

    // Deduplicate concurrent launch calls
    if (!this.browserPromise) {
      this.browserPromise = this.launchBrowser()
    }

    return this.browserPromise
  }

  private async launchBrowser(): Promise<PlaywrightBrowser | null> {
    try {
      // Dynamic import -- playwright may not be installed or browsers
      // may not be available.
      const pw = await import('playwright')
      const browser = await pw.chromium.launch({ headless: true })
      this.browser = browser as unknown as PlaywrightBrowser
      return this.browser
    } catch {
      // Playwright browsers not installed -- the caller should fall back
      // to BooliHttpScraper.
      return null
    }
  }

  // -----------------------------------------------------------------------
  // URL construction
  // -----------------------------------------------------------------------

  private buildSearchUrl(filters: SearchFilters, pagination: Pagination): string {
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

    if (filters.maxMonthlyFee) params.set('maxRent', String(filters.maxMonthlyFee))
    if (filters.daysActive) params.set('daysActive', String(filters.daysActive))

    const page = Math.floor(pagination.offset / pagination.limit) + 1
    if (page > 1) params.set('page', String(page))

    const qs = params.toString()
    return `${this.baseUrl}/sok/till-salu${qs ? `?${qs}` : ''}`
  }

  // -----------------------------------------------------------------------
  // Extraction helpers
  // -----------------------------------------------------------------------

  private extractFromPageProps(
    pageProps: Record<string, unknown>,
  ): { properties: Property[]; totalCount: number } | null {
    const rawListings = this.findListingsInObject(pageProps)
    if (!rawListings || rawListings.length === 0) return null

    const totalCount =
      (pageProps.totalCount as number | undefined) ??
      (pageProps.total as number | undefined) ??
      rawListings.length

    const properties = rawListings
      .map((raw) => this.mapRawProperty(raw))
      .filter((p): p is Property => p !== null)

    return { properties, totalCount }
  }

  private findListingsInObject(
    obj: unknown,
  ): RawListingProperty[] | null {
    if (!obj || typeof obj !== 'object') return null

    if (Array.isArray(obj)) {
      if (obj.length > 0 && this.looksLikeListing(obj[0])) {
        return obj as RawListingProperty[]
      }
      for (const item of obj) {
        const found = this.findListingsInObject(item)
        if (found) return found
      }
      return null
    }

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
    return (
      keys.includes('booliId') ||
      (keys.includes('listPrice') && keys.includes('livingArea')) ||
      (keys.includes('price') && keys.includes('rooms'))
    )
  }

  private mapRawProperty(raw: RawListingProperty): Property | null {
    const booliId = raw.booliId
    if (!booliId) return null

    const address = raw.location?.address?.streetAddress ?? ''
    const area = raw.location?.namedAreas?.[0] ?? raw.location?.address?.city ?? ''
    const municipality = raw.location?.region?.municipalityName ?? ''
    const lat = raw.location?.position?.latitude ?? 0
    const lng = raw.location?.position?.longitude ?? 0
    const price = raw.listPrice ?? raw.price ?? 0
    const livingArea = raw.livingArea ?? 0
    const pricePerSqm =
      raw.pricePerSqm ??
      raw.pricePerM2 ??
      (livingArea > 0 ? Math.round(price / livingArea) : undefined)
    const publishedAt = raw.publishedDate ?? raw.published ?? new Date().toISOString().split('T')[0]
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
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type NextDataPayload = {
  props?: {
    pageProps?: Record<string, unknown>
    [key: string]: unknown
  }
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
