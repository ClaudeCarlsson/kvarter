import { chromium, type Browser } from 'playwright'

const PORT = 3001
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

async function scrapeProperties(query: string): Promise<unknown[]> {
  const b = await getBrowser()
  const context = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    locale: 'sv-SE',
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()

  try {
    const url = `https://www.booli.se/sok/till-salu?q=${encodeURIComponent(query)}`
    console.log(`[scraper] Fetching: ${url}`)

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Strategy 1: __NEXT_DATA__
    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__')
      return el ? JSON.parse(el.textContent || '{}') : null
    })

    if (nextData?.props?.pageProps) {
      const listings = findListings(nextData.props.pageProps)
      if (listings.length > 0) {
        console.log(`[scraper] Found ${listings.length} listings via __NEXT_DATA__`)
        return listings
      }
    }

    // Strategy 2: Intercept network responses containing listing data
    // (Next.js RSC may not have __NEXT_DATA__)
    const content = await page.content()

    // Strategy 3: Extract from DOM
    const domListings = await page.evaluate(() => {
      const results: Record<string, unknown>[] = []
      // Try multiple selectors
      const cards = document.querySelectorAll('[class*="listing"], [class*="result-item"], [class*="property-card"], a[href*="/annons/"]')

      cards.forEach((card) => {
        const el = card as HTMLElement
        const link = el.tagName === 'A' ? el : el.querySelector('a[href*="/annons/"]')
        const href = link?.getAttribute('href') || ''
        const idMatch = href.match(/\/annons\/(\d+)/) || href.match(/\/(\d+)/)
        if (!idMatch) return

        const allText = el.textContent || ''
        const priceMatch = allText.match(/([\d\s]+)\s*kr/)
        const roomMatch = allText.match(/(\d+)\s*rum/)
        const sqmMatch = allText.match(/([\d,.]+)\s*m²/)
        const feeMatch = allText.match(/(\d[\d\s]*)\s*kr\/m[åa]n/)

        // Try to find address - usually in an h2/h3 or first bold text
        const addressEl = el.querySelector('h2, h3, [class*="address"], [class*="street"]')
        const address = addressEl?.textContent?.trim() || ''

        // Try to find area/location
        const areaEl = el.querySelector('[class*="location"], [class*="area"], [class*="subtitle"]')
        const area = areaEl?.textContent?.trim() || ''

        if (priceMatch || address) {
          results.push({
            booliId: Number(idMatch[1]),
            address: address || `Property ${idMatch[1]}`,
            area: area.split(',')[0]?.trim() || '',
            municipality: area.split(',')[1]?.trim() || '',
            price: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : 0,
            rooms: roomMatch ? Number(roomMatch[1]) : 0,
            livingArea: sqmMatch ? Number(sqmMatch[1].replace(',', '.')) : 0,
            monthlyFee: feeMatch ? Number(feeMatch[1].replace(/\s/g, '')) : undefined,
            url: href.startsWith('http') ? href : `https://www.booli.se${href}`,
          })
        }
      })

      return results
    })

    if (domListings.length > 0) {
      console.log(`[scraper] Found ${domListings.length} listings via DOM`)
      return domListings
    }

    // Strategy 4: Check for RSC flight data in script tags
    const rscData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script')
      const results: unknown[] = []
      scripts.forEach((s) => {
        const text = s.textContent || ''
        if (text.includes('booliId') || text.includes('listPrice')) {
          try {
            // Try to parse chunks of JSON from the script
            const matches = text.matchAll(/\{[^{}]*"booliId":\s*\d+[^{}]*\}/g)
            for (const m of matches) {
              try {
                results.push(JSON.parse(m[0]))
              } catch { /* skip */ }
            }
          } catch { /* skip */ }
        }
      })
      return results
    })

    if (rscData.length > 0) {
      console.log(`[scraper] Found ${rscData.length} listings via RSC data`)
      return rscData
    }

    console.log(`[scraper] No listings found for query: ${query}`)
    console.log(`[scraper] Page title: ${await page.title()}`)
    console.log(`[scraper] Page URL: ${page.url()}`)
    return []
  } catch (error) {
    console.error(`[scraper] Error:`, error)
    return []
  } finally {
    await context.close()
  }
}

async function scrapeLocations(query: string): Promise<unknown[]> {
  const b = await getBrowser()
  const context = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    locale: 'sv-SE',
  })
  const page = await context.newPage()

  try {
    console.log(`[scraper] Location search: ${query}`)
    await page.goto('https://www.booli.se/', { waitUntil: 'domcontentloaded', timeout: 20000 })

    // Find and use the search input
    const searchInput = await page.$('input[type="search"], input[type="text"][placeholder*="Sök"], input[name*="search"], input[role="combobox"]')
    if (!searchInput) {
      // Try broader selectors
      const inputs = await page.$$('input[type="text"]')
      if (inputs.length === 0) {
        console.log('[scraper] No search input found')
        return []
      }
      await inputs[0].fill(query)
    } else {
      await searchInput.fill(query)
    }

    await page.waitForTimeout(2000)

    // Extract autocomplete suggestions
    const suggestions = await page.evaluate(() => {
      const items = document.querySelectorAll(
        '[role="option"], [role="listbox"] li, [class*="suggestion"], [class*="autocomplete"] li, [class*="dropdown"] li, [class*="search-result"] a'
      )
      const results: Record<string, unknown>[] = []
      items.forEach((item) => {
        const text = item.textContent?.trim() || ''
        if (!text) return
        const href = item.getAttribute('href') || ''
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
        results.push({
          name: lines[0] || text,
          parentName: lines[1] || undefined,
          id: href || text.replace(/\s/g, '-').toLowerCase(),
          type: text.toLowerCase().includes('kommun') ? 'kommun' : 'stad',
        })
      })
      return results
    })

    console.log(`[scraper] Found ${suggestions.length} location suggestions`)
    return suggestions
  } catch (error) {
    console.error(`[scraper] Location error:`, error)
    return []
  } finally {
    await context.close()
  }
}

function findListings(obj: unknown): unknown[] {
  if (!obj || typeof obj !== 'object') return []
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj[0] && typeof obj[0] === 'object' && ('booliId' in obj[0] || 'listPrice' in obj[0])) {
      return obj
    }
    for (const item of obj) {
      const found = findListings(item)
      if (found.length > 0) return found
    }
    return []
  }
  const record = obj as Record<string, unknown>
  for (const key of ['listings', 'result', 'results', 'properties', 'items', 'data', 'booliListings', 'searchResult']) {
    if (key in record) {
      const found = findListings(record[key])
      if (found.length > 0) return found
    }
  }
  for (const value of Object.values(record)) {
    const found = findListings(value)
    if (found.length > 0) return found
  }
  return []
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', browser: browser?.isConnected() ?? false })
    }

    if (url.pathname === '/search/locations') {
      const query = url.searchParams.get('q') || ''
      if (!query) return Response.json([])
      const results = await scrapeLocations(query)
      return Response.json(results)
    }

    if (url.pathname === '/search/properties') {
      const query = url.searchParams.get('q') || ''
      if (!query) return Response.json([])
      const results = await scrapeProperties(query)
      return Response.json(results)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  },
})

console.log(`[scraper] Server running on http://localhost:${PORT}`)
