import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

const PORT = 3001
const MAX_LISTINGS_PER_SEARCH = 15
const RATE_LIMIT_MS = 1500
const SEARCH_PAGE_TIMEOUT = 30_000
const LISTING_PAGE_TIMEOUT = 20_000

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browser
}

function createContext(b: Browser): Promise<BrowserContext> {
  return b.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    locale: 'sv-SE',
    viewport: { width: 1920, height: 1080 },
  })
}

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface ScrapedListing {
  booliId: number
  address: string
  area: string
  municipality: string
  price: number
  livingArea: number
  rooms: number
  floor: number | undefined
  constructionYear: number | undefined
  monthlyFee: number
  objectType: string
  location: {
    position: { latitude: number; longitude: number }
    namedAreas: string[]
    region: { municipalityName: string }
  }
  url: string
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function toNumber(val: unknown): number {
  if (typeof val === 'number' && !isNaN(val)) return val
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/\s/g, '').replace(',', '.'))
    return isNaN(n) ? 0 : n
  }
  return 0
}

function extractIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)(?:[/?#]|$)/)
  return match ? parseInt(match[1], 10) : 0
}

function capitalize(s: string): string {
  return s
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Step 1: Extract listing URLs from search results page
// Also collect /bostad/<id> URLs which Booli uses for some listings
// ---------------------------------------------------------------------------

async function extractListingUrls(page: Page): Promise<string[]> {
  // Strategy A: Get URLs from JSON-LD ItemList (most reliable)
  const jsonLdUrls: string[] = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || '{}')
        if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
          return data.itemListElement
            .map((item: { url?: string }) => item.url)
            .filter((u: string | undefined): u is string => typeof u === 'string' && u.length > 0)
        }
      } catch { /* skip */ }
    }
    return []
  })

  if (jsonLdUrls.length > 0) {
    // Filter to only listing pages (annons or bostad), skip external links
    const filtered = jsonLdUrls
      .filter((u) => u.includes('booli.se') && (u.includes('/annons/') || u.includes('/bostad/')))
      .slice(0, MAX_LISTINGS_PER_SEARCH)
    if (filtered.length > 0) return filtered
  }

  // Strategy B: Get URLs from DOM links
  return page.evaluate((max: number) => {
    const links = document.querySelectorAll('a[href*="/annons/"], a[href*="/bostad/"]')
    const urls = new Set<string>()
    links.forEach((link) => {
      const href = link.getAttribute('href')
      if (!href) return
      if (href.includes('/annons/') || href.includes('/bostad/')) {
        const full = href.startsWith('http') ? href : 'https://www.booli.se' + href
        // Only include if it ends with a numeric ID
        if (/\/\d+\/?$/.test(full)) {
          urls.add(full)
        }
      }
    })
    return [...urls].slice(0, max)
  }, MAX_LISTINGS_PER_SEARCH)
}

// ---------------------------------------------------------------------------
// Step 2: Scrape an individual listing page
//
// Extraction priority:
//   1. JSON-LD (Product + Place + BreadcrumbList schemas)
//   2. Apollo State in __NEXT_DATA__ (for coordinates, area info)
//   3. DOM fact list elements (Boarea, Rum, Avgift, etc.)
// ---------------------------------------------------------------------------

async function scrapeListingPage(
  context: BrowserContext,
  url: string,
): Promise<ScrapedListing | null> {
  const page = await context.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: LISTING_PAGE_TIMEOUT })

    const booliId = extractIdFromUrl(url)

    const rawData = await page.evaluate(() => {
      // ===================================================================
      // A. Parse all JSON-LD blocks
      // ===================================================================
      interface JsonLdProduct {
        '@type': string
        name?: string
        mpn?: string
        brand?: string
        description?: string
        offers?: {
          price?: number
          priceCurrency?: string
        }
      }
      interface JsonLdPlace {
        '@type': string
        address?: {
          streetAddress?: string
          addressLocality?: string
          addressRegion?: string
          postalCode?: string
        }
        geo?: {
          latitude?: number | string
          longitude?: number | string
        }
      }
      interface JsonLdBreadcrumb {
        '@type': string
        itemListElement?: Array<{
          name?: string
          position?: number
        }>
      }

      let product: JsonLdProduct | null = null
      let place: JsonLdPlace | null = null
      let breadcrumb: JsonLdBreadcrumb | null = null

      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]')
      for (const s of ldScripts) {
        try {
          const data = JSON.parse(s.textContent || '{}')
          if (data['@type'] === 'Product' && !product) product = data
          if (data['@type'] === 'Place' && !place) place = data
          if (data['@type'] === 'BreadcrumbList' && !breadcrumb) breadcrumb = data
        } catch { /* skip malformed JSON-LD */ }
      }

      // ===================================================================
      // B. Parse Apollo state from __NEXT_DATA__ for coordinates & areas
      // ===================================================================
      let apolloListing: Record<string, unknown> | null = null
      let apolloAreas: Array<{ name: string; type: string; parent: string }> = []
      let apolloLat = 0
      let apolloLng = 0

      try {
        const nextDataEl = document.getElementById('__NEXT_DATA__')
        if (nextDataEl) {
          const nextData = JSON.parse(nextDataEl.textContent || '{}')
          const apolloState: Record<string, unknown> =
            nextData?.props?.pageProps?.['__APOLLO_STATE__'] || {}

          for (const [key, val] of Object.entries(apolloState)) {
            if (!val || typeof val !== 'object') continue
            const obj = val as Record<string, unknown>

            // Find the listing object (keys like Listing:6043802 or Property:123)
            if (
              (key.startsWith('Listing:') || key.startsWith('Property:')) &&
              !apolloListing
            ) {
              apolloListing = obj
            }

            // Collect Area_V3 entries for municipality/area resolution
            if (key.startsWith('Area_V3:') && typeof obj.name === 'string') {
              apolloAreas.push({
                name: obj.name as string,
                type: (obj.type as string) || '',
                parent: String(obj.parent || ''),
              })
            }
          }

          // Extract coordinates from apollo listing
          if (apolloListing) {
            // Coordinates might be nested in position or location
            const pos = apolloListing.position as Record<string, unknown> | undefined
            if (pos) {
              apolloLat = parseFloat(String(pos.latitude || pos.lat || 0)) || 0
              apolloLng = parseFloat(String(pos.longitude || pos.lng || 0)) || 0
            }
            const loc = apolloListing.location as Record<string, unknown> | undefined
            if (loc && apolloLat === 0) {
              const locPos = loc.position as Record<string, unknown> | undefined
              if (locPos) {
                apolloLat = parseFloat(String(locPos.latitude || 0)) || 0
                apolloLng = parseFloat(String(locPos.longitude || 0)) || 0
              }
            }
          }
        }
      } catch { /* skip */ }

      // ===================================================================
      // C. Extract data from DOM (fact list items)
      //
      // Booli listing pages show property facts in <li class="flex flex-col">
      // elements. Each li has a small label child and a value child, but
      // they are concatenated in textContent. We look at child elements:
      //   <li>
      //     <span class="...">Boarea</span>
      //     <p class="...">86,5 m2</p>
      //   </li>
      // ===================================================================
      function findFactValue(...labels: string[]): string | null {
        for (const label of labels) {
          const lower = label.toLowerCase()

          // Search all list items and flex-col containers for label/value pairs
          const containers = document.querySelectorAll('li, div.flex.flex-col, div[class*="flex-col"]')
          for (const container of containers) {
            const children = container.children
            if (children.length < 2) continue

            // Check if the first child's text matches the label
            const firstText = children[0]?.textContent?.trim().toLowerCase() || ''
            if (firstText === lower || firstText.startsWith(lower)) {
              const val = children[1]?.textContent?.trim()
              if (val && val.length < 100) return val
            }
          }

          // Also check dt/dd pairs
          const dts = document.querySelectorAll('dt')
          for (const dt of dts) {
            if (dt.textContent?.trim().toLowerCase().startsWith(lower)) {
              const dd = dt.nextElementSibling
              if (dd?.tagName === 'DD') {
                const val = dd.textContent?.trim()
                if (val) return val
              }
            }
          }

          // Check labeled spans/divs with sibling values
          const labelEls = document.querySelectorAll('span, label, strong, p')
          for (const el of labelEls) {
            const text = el.textContent?.trim()
            if (!text) continue
            if (text.toLowerCase() !== lower && !text.toLowerCase().startsWith(lower + '\n')) continue
            // Must be a small label element, not a container
            if (text.length > label.length + 5) continue

            const next = el.nextElementSibling
            if (next) {
              const val = next.textContent?.trim()
              if (val && val.length < 100) return val
            }
          }
        }
        return null
      }

      // Address from h1
      const h1 = document.querySelector('h1')
      const domAddress = h1?.textContent?.trim() || ''

      // DOM fact extraction
      const domPrice = findFactValue('Utropspris', 'Begärt pris', 'Utgångspris', 'Pris')
      const domFee = findFactValue('Avgift', 'Månadsavgift')
      const domArea = findFactValue('Boarea', 'Boyta', 'Bostadsyta')
      const domRooms = findFactValue('Antal rum', 'Rum')
      const domFloor = findFactValue('Våning', 'Våningsplan')
      const domYear = findFactValue('Byggår', 'Byggnadsår')
      const domType = findFactValue('Bostadstyp', 'Objekttyp', 'Typ av bostad')

      // If DOM fact extraction missed price, try the large price display
      let domPriceFallback = ''
      if (!domPrice) {
        const priceEl = document.querySelector(
          '.object-card__price--logo, [class*="price"] span.heading-2, span.heading-2, [class*="Price"] span',
        )
        if (priceEl) {
          domPriceFallback = priceEl.textContent?.trim() || ''
        }
      }

      // ===================================================================
      // D. Assemble results to return from page.evaluate
      // ===================================================================
      return {
        // JSON-LD data
        jsonLd: {
          price: product?.offers?.price ?? null,
          name: product?.name ?? null,
          mpn: product?.mpn ?? null,
          brand: product?.brand ?? null,
          description: product?.description ?? null,
          streetAddress: place?.address?.streetAddress ?? null,
          addressLocality: place?.address?.addressLocality ?? null,
          addressRegion: place?.address?.addressRegion ?? null,
          postalCode: place?.address?.postalCode ?? null,
          geoLat: place?.geo ? parseFloat(String(place.geo.latitude)) || 0 : 0,
          geoLng: place?.geo ? parseFloat(String(place.geo.longitude)) || 0 : 0,
          breadcrumbItems: breadcrumb?.itemListElement?.map((i) => i.name || '') || [],
        },
        // Apollo data
        apollo: {
          listPrice: apolloListing
            ? parseFloat(String((apolloListing as Record<string, unknown>).listPrice || 0)) || 0
            : 0,
          rent: apolloListing
            ? parseFloat(String((apolloListing as Record<string, unknown>).rent || 0)) || 0
            : 0,
          livingArea: apolloListing
            ? parseFloat(String((apolloListing as Record<string, unknown>).livingArea || 0)) || 0
            : 0,
          rooms: apolloListing
            ? parseFloat(String((apolloListing as Record<string, unknown>).rooms || 0)) || 0
            : 0,
          floor: apolloListing
            ? parseFloat(String((apolloListing as Record<string, unknown>).floor || 0)) || 0
            : 0,
          constructionYear: apolloListing
            ? parseInt(String((apolloListing as Record<string, unknown>).constructionYear || 0), 10) || 0
            : 0,
          objectType: apolloListing
            ? String((apolloListing as Record<string, unknown>).objectType || '')
            : '',
          streetAddress: apolloListing
            ? String((apolloListing as Record<string, unknown>).streetAddress || '')
            : '',
          lat: apolloLat,
          lng: apolloLng,
          areas: apolloAreas,
        },
        // DOM data
        dom: {
          address: domAddress,
          price: domPrice || domPriceFallback || '',
          fee: domFee || '',
          area: domArea || '',
          rooms: domRooms || '',
          floor: domFloor || '',
          year: domYear || '',
          type: domType || '',
        },
      }
    })

    // ===================================================================
    // Merge data from all sources with priority: JSON-LD > Apollo > DOM
    // ===================================================================
    const jl = rawData.jsonLd
    const ap = rawData.apollo
    const dm = rawData.dom

    // Price: JSON-LD Product.offers.price is the most reliable
    const price =
      (jl.price && jl.price > 0 ? jl.price : 0) ||
      (ap.listPrice > 0 ? ap.listPrice : 0) ||
      parseDomNumber(dm.price)

    // Address
    const address = jl.streetAddress || ap.streetAddress || jl.name || dm.address || ''

    // Monthly fee
    const monthlyFee =
      (ap.rent > 0 ? ap.rent : 0) ||
      parseDomFee(dm.fee)

    // Living area
    const livingArea =
      (ap.livingArea > 0 ? ap.livingArea : 0) ||
      parseDomDecimal(dm.area)

    // Rooms
    const rooms =
      (ap.rooms > 0 ? Math.round(ap.rooms) : 0) ||
      parseDomInt(dm.rooms)

    // Floor
    const floorVal =
      (ap.floor > 0 ? ap.floor : 0) ||
      parseDomInt(dm.floor)
    const floor = floorVal > 0 ? floorVal : undefined

    // Construction year
    const yearVal =
      (ap.constructionYear > 1600 && ap.constructionYear < 2100 ? ap.constructionYear : 0) ||
      parseDomYear(dm.year)
    const constructionYear = yearVal > 0 ? yearVal : undefined

    // Object type
    const objectType = ap.objectType || dm.type || 'Lagenhet'

    // Coordinates: Apollo > JSON-LD Place.geo
    const lat = (ap.lat && ap.lat !== 0 ? ap.lat : 0) || jl.geoLat || 0
    const lng = (ap.lng && ap.lng !== 0 ? ap.lng : 0) || jl.geoLng || 0

    // Area and municipality from Apollo Area_V3 hierarchy or JSON-LD
    let areaName = ''
    let municipality = ''

    // From JSON-LD breadcrumbs: typically [County, Municipality/kommun, Street, BRF]
    if (jl.breadcrumbItems.length >= 2) {
      // The second item is typically the municipality (e.g. "Ostersunds kommun")
      const muni = jl.breadcrumbItems[1] || ''
      municipality = muni.replace(/s?\s*kommun$/i, '').trim()
    }

    // From Apollo Area_V3: find municipality and userDefined (neighborhood) areas
    if (ap.areas.length > 0) {
      const muniArea = ap.areas.find((a) => a.type === 'municipality')
      const userArea = ap.areas.find((a) => a.type === 'userDefined')
      const popArea = ap.areas.find((a) => a.type === 'populatedArea')

      if (muniArea) municipality = municipality || muniArea.name
      if (userArea) areaName = userArea.name
      else if (popArea) areaName = popArea.name
    }

    // From JSON-LD Place.addressLocality as fallback
    municipality = municipality || jl.addressLocality || ''
    areaName = areaName || ''

    // Last resort: parse URL segments
    if (!municipality) {
      const urlPath = new URL(url).pathname
      const parts = urlPath.split('/').filter(Boolean)
      // /annons/<id> or /bostad/<id> -- not much info
      // But sometimes: /annons/<municipality>/<area>/<address>/<id>
      if (parts.length >= 4 && (parts[0] === 'annons' || parts[0] === 'bostad')) {
        municipality = capitalize(parts[1].replace(/-/g, ' '))
        if (parts.length >= 5) {
          areaName = areaName || capitalize(parts[2].replace(/-/g, ' '))
        }
      }
    }

    console.log(
      `[scraper]   ${address || 'unknown'} | ${price} kr | ${livingArea} m2 | ${rooms} rum | ${municipality}/${areaName}`,
    )

    return {
      booliId,
      address,
      area: areaName,
      municipality,
      price,
      livingArea,
      rooms,
      floor,
      constructionYear,
      monthlyFee,
      objectType,
      location: {
        position: { latitude: lat, longitude: lng },
        namedAreas: areaName ? [areaName] : [],
        region: { municipalityName: municipality },
      },
      url,
    }
  } catch (err) {
    console.error(`[scraper] Failed to scrape listing ${url}:`, err)
    return null
  } finally {
    await page.close()
  }
}

// ---------------------------------------------------------------------------
// DOM value parsers (Swedish formatted strings)
// ---------------------------------------------------------------------------

function parseDomNumber(raw: string): number {
  if (!raw) return 0
  // Remove non-breaking spaces, regular spaces, "kr", etc.
  const cleaned = raw.replace(/\u00a0/g, '').replace(/\s/g, '').replace(/kr$/i, '').replace(/[^\d]/g, '')
  const val = parseInt(cleaned, 10)
  return isNaN(val) ? 0 : val
}

function parseDomFee(raw: string): number {
  if (!raw) return 0
  // Fee strings look like "6 197 kr/man" -- extract the number
  const cleaned = raw.replace(/\u00a0/g, '').replace(/\s/g, '').replace(/kr.*$/i, '').replace(/[^\d]/g, '')
  const val = parseInt(cleaned, 10)
  return isNaN(val) ? 0 : val
}

function parseDomDecimal(raw: string): number {
  if (!raw) return 0
  // "86,5 m2" -> 86.5
  const cleaned = raw.replace(/\u00a0/g, ' ').replace(/m[²2].*$/i, '').trim()
  const normalized = cleaned.replace(',', '.').replace(/\s/g, '').replace(/[^\d.]/g, '')
  const val = parseFloat(normalized)
  return isNaN(val) ? 0 : val
}

function parseDomInt(raw: string): number {
  if (!raw) return 0
  // "3 rum" -> 3, "4" -> 4
  const match = raw.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function parseDomYear(raw: string): number {
  if (!raw) return 0
  const match = raw.match(/(1[6-9]\d{2}|20[0-2]\d)/)
  return match ? parseInt(match[1], 10) : 0
}

// ---------------------------------------------------------------------------
// Main property scraper: search page -> individual listing pages
// ---------------------------------------------------------------------------

async function scrapeProperties(query: string): Promise<ScrapedListing[]> {
  const b = await getBrowser()
  const context = await createContext(b)

  try {
    // Step 1: Navigate to search results and collect listing URLs
    const searchPage = await context.newPage()
    const searchUrl = `https://www.booli.se/sok/till-salu?q=${encodeURIComponent(query)}`
    console.log(`[scraper] Searching: ${searchUrl}`)

    await searchPage.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: SEARCH_PAGE_TIMEOUT,
    })
    await searchPage.waitForTimeout(2000)

    const listingUrls = await extractListingUrls(searchPage)
    await searchPage.close()

    console.log(`[scraper] Found ${listingUrls.length} listing URLs for "${query}"`)

    if (listingUrls.length === 0) {
      console.log('[scraper] No listing URLs found on search page.')
      return []
    }

    // Step 2: Scrape each listing page individually
    const results: ScrapedListing[] = []

    for (const url of listingUrls) {
      try {
        const listing = await scrapeListingPage(context, url)
        if (listing) {
          // Filter: sale prices should be > 100k SEK
          if (listing.price > 100_000) {
            // Sanity: monthlyFee must never equal price
            if (listing.monthlyFee === listing.price) {
              listing.monthlyFee = 0
            }
            // Sanity: monthlyFee should be reasonable (under 50k/month)
            if (listing.monthlyFee > 50_000) {
              listing.monthlyFee = 0
            }
            results.push(listing)
          } else if (listing.price > 0) {
            console.log(`[scraper]   Skipping: price ${listing.price} too low (likely rent)`)
          }
        }
      } catch (err) {
        console.error(`[scraper] Error scraping ${url}:`, err)
      }

      // Rate limit between page loads
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS))
    }

    console.log(`[scraper] Returning ${results.length} validated listings for "${query}"`)
    return results
  } catch (error) {
    console.error(`[scraper] scrapeProperties error:`, error)
    return []
  } finally {
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// Location search via autocomplete
// ---------------------------------------------------------------------------

async function scrapeLocations(query: string): Promise<unknown[]> {
  const b = await getBrowser()
  const context = await createContext(b)
  const page = await context.newPage()

  try {
    console.log(`[scraper] Location search: "${query}"`)
    await page.goto('https://www.booli.se/', {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    })

    await page.waitForTimeout(1000)

    // Accept cookies if a consent banner appears
    try {
      const cookieBtn = await page.$(
        'button[id*="accept"], button[class*="accept"], button[class*="consent"], button:has-text("Acceptera"), button:has-text("Godkann")',
      )
      if (cookieBtn) {
        await cookieBtn.click()
        await page.waitForTimeout(500)
      }
    } catch {
      // No cookie banner
    }

    // Find the search input
    const searchSelectors = [
      'input[type="search"]',
      'input[role="combobox"]',
      'input[placeholder*="Sok"]',
      'input[placeholder*="sok"]',
      'input[name*="search"]',
      'input[name*="query"]',
      'input[aria-label*="Sok"]',
      'input[type="text"]',
    ]

    let inputFound = false
    for (const selector of searchSelectors) {
      try {
        const input = await page.$(selector)
        if (input) {
          await input.click()
          await page.waitForTimeout(300)
          await input.fill('')
          await input.type(query, { delay: 80 })
          inputFound = true
          break
        }
      } catch {
        continue
      }
    }

    if (!inputFound) {
      console.log('[scraper] No search input found on booli.se')
      return []
    }

    await page.waitForTimeout(2000)

    // Wait for suggestion elements
    try {
      await page.waitForSelector(
        '[role="option"], [role="listbox"] li, [class*="suggestion"], [class*="autocomplete"], [class*="dropdown"] li, [class*="search-result"], [class*="SearchResult"]',
        { timeout: 5000 },
      )
    } catch {
      // Suggestions may not appear
    }

    const suggestions = await page.evaluate(() => {
      const selectors = [
        '[role="option"]',
        '[role="listbox"] li',
        '[class*="suggestion"] li',
        '[class*="suggestion"] a',
        '[class*="autocomplete"] li',
        '[class*="autocomplete"] a',
        '[class*="dropdown"] li',
        '[class*="dropdown"] a',
        '[class*="search-result"] a',
        '[class*="SearchResult"] a',
        'ul[class*="list"] li',
      ]

      const results: Record<string, unknown>[] = []
      const seen = new Set<string>()

      for (const selector of selectors) {
        const items = document.querySelectorAll(selector)
        items.forEach((item) => {
          const text = item.textContent?.trim() || ''
          if (!text || seen.has(text)) return
          seen.add(text)

          const href =
            item.getAttribute('href') ||
            item.querySelector('a')?.getAttribute('href') ||
            ''

          const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)

          let type = 'stad'
          const lowerText = text.toLowerCase()
          if (lowerText.includes('kommun')) type = 'kommun'
          else if (lowerText.includes('stadsdel') || lowerText.includes('omrade')) type = 'area'
          else if (href.includes('kommun')) type = 'kommun'

          results.push({
            name: lines[0] || text,
            parentName: lines[1] || undefined,
            id: href || text.replace(/\s+/g, '-').toLowerCase(),
            type,
            fullText: text,
          })
        })

        if (results.length > 0) break
      }
      return results
    })

    console.log(`[scraper] Found ${suggestions.length} location suggestions`)
    return suggestions
  } catch (error) {
    console.error(`[scraper] Location search error:`, error)
    return []
  } finally {
    await context.close()
  }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        browser: browser?.isConnected() ?? false,
      })
    }

    if (url.pathname === '/search/locations') {
      const query = url.searchParams.get('q') || ''
      if (!query) return Response.json([])
      try {
        const results = await scrapeLocations(query)
        return Response.json(results)
      } catch (error) {
        console.error('[scraper] /search/locations error:', error)
        return Response.json({ error: 'Scrape failed' }, { status: 500 })
      }
    }

    if (url.pathname === '/search/properties') {
      const query = url.searchParams.get('q') || ''
      if (!query) return Response.json([])
      try {
        const results = await scrapeProperties(query)
        return Response.json(results)
      } catch (error) {
        console.error('[scraper] /search/properties error:', error)
        return Response.json({ error: 'Scrape failed' }, { status: 500 })
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  },
})

console.log(`[scraper] Server running on http://localhost:${PORT}`)
