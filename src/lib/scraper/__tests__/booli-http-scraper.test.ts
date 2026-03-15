import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { BooliHttpScraper } from '../booli-http-scraper'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as typeof fetch
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html' },
  })
}

function nextDataPage(pageProps: Record<string, unknown>): string {
  const payload = JSON.stringify({ props: { pageProps } })
  return `
    <html><head></head><body>
      <div id="__next">rendered content</div>
      <script id="__NEXT_DATA__" type="application/json">${payload}</script>
    </body></html>
  `
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BooliHttpScraper', () => {
  let scraper: BooliHttpScraper

  beforeEach(() => {
    scraper = new BooliHttpScraper('https://test.booli.se')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // -----------------------------------------------------------------------
  // searchLocations
  // -----------------------------------------------------------------------

  describe('searchLocations', () => {
    test('returns locations from API response with result array', async () => {
      mockFetch(async () =>
        jsonResponse({
          result: [
            { id: '1', name: 'Stockholm', type: 'stad', slug: 'stockholm', geo: { lat: 59.33, lng: 18.07 } },
            { id: '2', name: 'Sodermalm', type: 'stadsdel', parentName: 'Stockholm' },
          ],
        }),
      )

      const results = await scraper.searchLocations('stock')

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('1')
      expect(results[0].name).toBe('Stockholm')
      expect(results[0].type).toBe('stad')
      expect(results[0].slug).toBe('stockholm')
      expect(results[0].coordinates).toEqual({ latitude: 59.33, longitude: 18.07 })
      expect(results[1].id).toBe('2')
      expect(results[1].parentName).toBe('Stockholm')
    })

    test('returns locations from direct array response', async () => {
      mockFetch(async () =>
        jsonResponse([
          { id: '10', name: 'Gothenburg', type: 'city' },
        ]),
      )

      const results = await scraper.searchLocations('goth')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Gothenburg')
      expect(results[0].type).toBe('stad')
    })

    test('returns locations from data wrapper', async () => {
      mockFetch(async () =>
        jsonResponse({
          data: [{ id: '5', name: 'Uppsala', type: 'municipality' }],
        }),
      )

      const results = await scraper.searchLocations('upp')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Uppsala')
      expect(results[0].type).toBe('kommun')
    })

    test('respects limit parameter', async () => {
      mockFetch(async () =>
        jsonResponse({
          result: [
            { id: '1', name: 'A', type: 'stad' },
            { id: '2', name: 'B', type: 'stad' },
            { id: '3', name: 'C', type: 'stad' },
          ],
        }),
      )

      const results = await scraper.searchLocations('test', 2)

      expect(results).toHaveLength(2)
    })

    test('returns empty array for empty query', async () => {
      const results = await scraper.searchLocations('')
      expect(results).toEqual([])
    })

    test('returns empty array for whitespace-only query', async () => {
      const results = await scraper.searchLocations('   ')
      expect(results).toEqual([])
    })

    test('returns empty array on HTTP error', async () => {
      mockFetch(async () => jsonResponse({ error: 'Not found' }, 404))

      const results = await scraper.searchLocations('test')
      expect(results).toEqual([])
    })

    test('returns empty array on network failure', async () => {
      mockFetch(async () => {
        throw new Error('ECONNREFUSED')
      })

      const results = await scraper.searchLocations('test')
      expect(results).toEqual([])
    })

    test('skips items without id or name', async () => {
      mockFetch(async () =>
        jsonResponse({
          result: [
            { id: '', name: 'NoId' },
            { id: '1', name: '' },
            { id: '2', name: 'Valid', type: 'stad' },
          ],
        }),
      )

      const results = await scraper.searchLocations('test')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Valid')
    })

    test('uses booliId as fallback id', async () => {
      mockFetch(async () =>
        jsonResponse({
          result: [
            { booliId: '42', name: 'FallbackId', type: 'stad' },
          ],
        }),
      )

      const results = await scraper.searchLocations('test')
      expect(results[0].id).toBe('42')
    })

    test('uses fullName as fallback name', async () => {
      mockFetch(async () =>
        jsonResponse({
          result: [
            { id: '1', fullName: 'Full Name Place', type: 'stad' },
          ],
        }),
      )

      const results = await scraper.searchLocations('test')
      expect(results[0].name).toBe('Full Name Place')
    })

    test('sends correct URL with encoded query', async () => {
      let capturedUrl = ''
      mockFetch(async (url) => {
        capturedUrl = url
        return jsonResponse({ result: [] })
      })

      await scraper.searchLocations('södra station', 3)

      expect(capturedUrl).toBe(
        'https://test.booli.se/api/search?q=s%C3%B6dra%20station&limit=3',
      )
    })

    test('defaults limit to 5', async () => {
      let capturedUrl = ''
      mockFetch(async (url) => {
        capturedUrl = url
        return jsonResponse({ result: [] })
      })

      await scraper.searchLocations('test')

      expect(capturedUrl).toContain('limit=5')
    })

    test('handles non-object response gracefully', async () => {
      mockFetch(async () => jsonResponse('just a string'))

      const results = await scraper.searchLocations('test')
      expect(results).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // searchProperties
  // -----------------------------------------------------------------------

  describe('searchProperties', () => {
    const sampleListings = [
      {
        booliId: 100001,
        listPrice: 4950000,
        livingArea: 60,
        rooms: 2,
        floor: 4,
        totalFloors: 6,
        objectType: 'lagenhet',
        constructionYear: 1925,
        rent: 3200,
        publishedDate: '2024-01-15',
        daysOnBooli: 5,
        pricePerSqm: 82500,
        location: {
          address: { streetAddress: 'Hornsgatan 42', city: 'Stockholm' },
          region: { municipalityName: 'Stockholm' },
          namedAreas: ['Sodermalm'],
          position: { latitude: 59.3171, longitude: 18.0494 },
        },
        images: [{ url: '/img1.jpg', width: 800, height: 600 }],
        description: 'Charming apartment',
        url: 'https://www.booli.se/annons/100001',
      },
      {
        booliId: 100002,
        listPrice: 6800000,
        livingArea: 80,
        rooms: 3,
        objectType: 'apartment',
        location: {
          address: { streetAddress: 'Odengatan 18', city: 'Stockholm' },
          region: { municipalityName: 'Stockholm' },
          namedAreas: ['Vasastan'],
          position: { latitude: 59.343, longitude: 18.052 },
        },
        imageUrls: ['/img2.jpg', '/img3.jpg'],
        url: 'https://www.booli.se/annons/100002',
        daysActive: 12,
      },
    ]

    test('parses properties from __NEXT_DATA__ with listings key', async () => {
      mockFetch(async () =>
        htmlResponse(
          nextDataPage({ listings: sampleListings, totalCount: 42 }),
        ),
      )

      const result = await scraper.searchProperties({})

      expect(result.properties).toHaveLength(2)
      expect(result.totalCount).toBe(42)
      expect(result.properties[0].booliId).toBe(100001)
      expect(result.properties[0].address).toBe('Hornsgatan 42')
      expect(result.properties[0].area).toBe('Sodermalm')
      expect(result.properties[0].municipality).toBe('Stockholm')
      expect(result.properties[0].price).toBe(4950000)
      expect(result.properties[0].pricePerSqm).toBe(82500)
      expect(result.properties[0].livingArea).toBe(60)
      expect(result.properties[0].rooms).toBe(2)
      expect(result.properties[0].floor).toBe(4)
      expect(result.properties[0].totalFloors).toBe(6)
      expect(result.properties[0].constructionYear).toBe(1925)
      expect(result.properties[0].monthlyFee).toBe(3200)
      expect(result.properties[0].propertyType).toBe('apartment')
      expect(result.properties[0].coordinates).toEqual({ latitude: 59.3171, longitude: 18.0494 })
      expect(result.properties[0].images).toEqual([{ url: '/img1.jpg', width: 800, height: 600 }])
      expect(result.properties[0].description).toBe('Charming apartment')
      expect(result.properties[0].publishedAt).toBe('2024-01-15')
      expect(result.properties[0].daysOnMarket).toBe(5)
    })

    test('handles imageUrls array format', async () => {
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: sampleListings })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[1].images).toEqual([
        { url: '/img2.jpg' },
        { url: '/img3.jpg' },
      ])
    })

    test('normalizes Swedish property types', async () => {
      const listings = [
        { ...sampleListings[0], objectType: 'villa', booliId: 1 },
        { ...sampleListings[0], objectType: 'radhus', booliId: 2 },
        { ...sampleListings[0], objectType: 'fritidshus', booliId: 3 },
        { ...sampleListings[0], objectType: 'tomt', booliId: 4 },
        { ...sampleListings[0], objectType: 'lagenhet', booliId: 5 },
      ]

      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].propertyType).toBe('house')
      expect(result.properties[1].propertyType).toBe('townhouse')
      expect(result.properties[2].propertyType).toBe('cottage')
      expect(result.properties[3].propertyType).toBe('plot')
      expect(result.properties[4].propertyType).toBe('apartment')
    })

    test('parses from nested result key', async () => {
      mockFetch(async () =>
        htmlResponse(
          nextDataPage({
            searchResult: { result: [sampleListings[0]] },
            total: 15,
          }),
        ),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties).toHaveLength(1)
      expect(result.totalCount).toBe(15)
    })

    test('parses from properties key', async () => {
      mockFetch(async () =>
        htmlResponse(
          nextDataPage({ properties: [sampleListings[0]] }),
        ),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties).toHaveLength(1)
    })

    test('falls back to JSON-LD when __NEXT_DATA__ has no listings', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'RealEstateListing',
            name: 'Apartment on Gatan',
            url: 'https://www.booli.se/annons/99999',
            description: 'Nice place',
            offers: { price: 3000000 },
            geo: { latitude: 59.33, longitude: 18.07 },
            image: '/photo.jpg',
            datePublished: '2024-06-01',
          })}</script>
        </head><body></body></html>
      `
      mockFetch(async () => htmlResponse(html))

      const result = await scraper.searchProperties({})
      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].booliId).toBe(99999)
      expect(result.properties[0].price).toBe(3000000)
      expect(result.properties[0].description).toBe('Nice place')
      expect(result.properties[0].images).toEqual([{ url: '/photo.jpg' }])
    })

    test('handles JSON-LD ItemList', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'ItemList',
            itemListElement: [
              {
                item: {
                  '@type': 'RealEstateListing',
                  name: 'Apt A',
                  url: 'https://booli.se/annons/111',
                  offers: { price: 2000000 },
                  geo: { latitude: 59.0, longitude: 18.0 },
                  datePublished: '2024-01-01',
                },
              },
              {
                item: {
                  '@type': 'RealEstateListing',
                  name: 'Apt B',
                  url: 'https://booli.se/annons/222',
                  offers: { price: 3000000 },
                  geo: { latitude: 59.1, longitude: 18.1 },
                  datePublished: '2024-02-01',
                },
              },
            ],
          })}</script>
        </head><body></body></html>
      `
      mockFetch(async () => htmlResponse(html))

      const result = await scraper.searchProperties({})
      expect(result.properties).toHaveLength(2)
      expect(result.properties[0].booliId).toBe(111)
      expect(result.properties[1].booliId).toBe(222)
    })

    test('returns empty result on HTTP error', async () => {
      mockFetch(async () => htmlResponse('Server Error', 500))

      const result = await scraper.searchProperties({})
      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('returns empty result on network failure', async () => {
      mockFetch(async () => {
        throw new Error('Network failure')
      })

      const result = await scraper.searchProperties({})
      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('returns empty result when page has no extractable data', async () => {
      mockFetch(async () => htmlResponse('<html><body>No data here</body></html>'))

      const result = await scraper.searchProperties({})
      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('preserves pagination and filters in result', async () => {
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: sampleListings })),
      )

      const filters = { query: 'Stockholm', priceRange: { min: 1000000 } }
      const pagination = { offset: 20, limit: 10 }

      const result = await scraper.searchProperties(filters, pagination)
      expect(result.pagination).toEqual(pagination)
      expect(result.filters).toEqual(filters)
    })

    test('uses default pagination when not provided', async () => {
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.pagination).toEqual({ offset: 0, limit: 20 })
    })

    test('skips listings without booliId', async () => {
      const listings = [
        { listPrice: 5000000, livingArea: 60 }, // no booliId
        { ...sampleListings[0] },
      ]

      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].booliId).toBe(100001)
    })

    test('calculates pricePerSqm when not provided', async () => {
      const listing = {
        ...sampleListings[0],
        pricePerSqm: undefined,
        pricePerM2: undefined,
        listPrice: 6000000,
        livingArea: 75,
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].pricePerSqm).toBe(80000) // 6000000 / 75
    })

    test('uses pricePerM2 as fallback for pricePerSqm', async () => {
      const listing = {
        ...sampleListings[0],
        pricePerSqm: undefined,
        pricePerM2: 90000,
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].pricePerSqm).toBe(90000)
    })

    test('generates url from baseUrl when listing has no url', async () => {
      const listing = {
        ...sampleListings[0],
        url: undefined,
        booliId: 55555,
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].url).toBe('https://test.booli.se/annons/55555')
    })

    test('uses price field when listPrice is absent', async () => {
      const listing = {
        ...sampleListings[0],
        listPrice: undefined,
        price: 7777777,
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].price).toBe(7777777)
    })

    test('uses published field as fallback for publishedDate', async () => {
      const listing = {
        ...sampleListings[0],
        publishedDate: undefined,
        published: '2024-03-20',
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].publishedAt).toBe('2024-03-20')
    })

    test('uses daysActive as fallback for daysOnBooli', async () => {
      const listing = {
        ...sampleListings[0],
        daysOnBooli: undefined,
        daysActive: 33,
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].daysOnMarket).toBe(33)
    })

    test('uses monthlyFee as fallback for rent', async () => {
      const listing = {
        ...sampleListings[0],
        rent: undefined,
        monthlyFee: 4500,
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].monthlyFee).toBe(4500)
    })

    test('uses city as fallback for area when namedAreas is empty', async () => {
      const listing = {
        ...sampleListings[0],
        location: {
          address: { streetAddress: 'Gatan 1', city: 'CityName' },
          region: { municipalityName: 'MuniName' },
          namedAreas: [],
          position: { latitude: 59.0, longitude: 18.0 },
        },
      }
      mockFetch(async () =>
        htmlResponse(nextDataPage({ listings: [listing] })),
      )

      const result = await scraper.searchProperties({})
      expect(result.properties[0].area).toBe('CityName')
    })
  })

  // -----------------------------------------------------------------------
  // buildSearchUrl
  // -----------------------------------------------------------------------

  describe('buildSearchUrl', () => {
    test('builds base URL with no filters', () => {
      const url = scraper.buildSearchUrl({}, { offset: 0, limit: 20 })
      expect(url).toBe('https://test.booli.se/sok/till-salu')
    })

    test('includes price range', () => {
      const url = scraper.buildSearchUrl(
        { priceRange: { min: 1000000, max: 5000000 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('minListPrice=1000000')
      expect(url).toContain('maxListPrice=5000000')
    })

    test('includes rooms range', () => {
      const url = scraper.buildSearchUrl(
        { roomsRange: { min: 2, max: 4 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('minRooms=2')
      expect(url).toContain('maxRooms=4')
    })

    test('includes area range', () => {
      const url = scraper.buildSearchUrl(
        { areaRange: { min: 40, max: 100 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('minLivingArea=40')
      expect(url).toContain('maxLivingArea=100')
    })

    test('includes property types', () => {
      const url = scraper.buildSearchUrl(
        { propertyTypes: ['apartment', 'house'] },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('objectType=apartment%2Chouse')
    })

    test('includes construction year range', () => {
      const url = scraper.buildSearchUrl(
        { constructionYearRange: { min: 1900, max: 2020 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('minConstructionYear=1900')
      expect(url).toContain('maxConstructionYear=2020')
    })

    test('includes maxMonthlyFee as maxRent', () => {
      const url = scraper.buildSearchUrl(
        { maxMonthlyFee: 5000 },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('maxRent=5000')
    })

    test('includes maxPricePerSqm', () => {
      const url = scraper.buildSearchUrl(
        { maxPricePerSqm: 100000 },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('maxPricePerSqm=100000')
    })

    test('includes daysActive', () => {
      const url = scraper.buildSearchUrl(
        { daysActive: 7 },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('daysActive=7')
    })

    test('includes locationId as areaId', () => {
      const url = scraper.buildSearchUrl(
        { locationId: 'loc-123' },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('areaId=loc-123')
    })

    test('includes query as q', () => {
      const url = scraper.buildSearchUrl(
        { query: 'Stockholm' },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('q=Stockholm')
    })

    test('calculates page from offset and limit', () => {
      const url = scraper.buildSearchUrl({}, { offset: 40, limit: 20 })
      expect(url).toContain('page=3')
    })

    test('omits page when it equals 1', () => {
      const url = scraper.buildSearchUrl({}, { offset: 0, limit: 20 })
      expect(url).not.toContain('page=')
    })

    test('combines multiple filters', () => {
      const url = scraper.buildSearchUrl(
        {
          query: 'Stockholm',
          priceRange: { min: 2000000, max: 8000000 },
          roomsRange: { min: 2 },
          propertyTypes: ['apartment'],
        },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('q=Stockholm')
      expect(url).toContain('minListPrice=2000000')
      expect(url).toContain('maxListPrice=8000000')
      expect(url).toContain('minRooms=2')
      expect(url).toContain('objectType=apartment')
    })
  })

  // -----------------------------------------------------------------------
  // parseSearchResults (exposed via public searchProperties for coverage)
  // -----------------------------------------------------------------------

  describe('parseSearchResults', () => {
    test('returns empty result for HTML with no data', () => {
      const result = scraper.parseSearchResults(
        '<html><body></body></html>',
        { offset: 0, limit: 20 },
        {},
      )
      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('extracts from __NEXT_DATA__ directly', () => {
      const html = nextDataPage({
        listings: [
          {
            booliId: 999,
            listPrice: 5000000,
            livingArea: 65,
            rooms: 2,
            objectType: 'apartment',
            location: {
              address: { streetAddress: 'Test 1' },
              region: { municipalityName: 'TestMuni' },
              namedAreas: ['TestArea'],
              position: { latitude: 59.0, longitude: 18.0 },
            },
            images: [],
            url: 'https://booli.se/annons/999',
            publishedDate: '2024-05-01',
            daysOnBooli: 3,
          },
        ],
        totalCount: 100,
      })

      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties).toHaveLength(1)
      expect(result.totalCount).toBe(100)
      expect(result.properties[0].id).toBe('999')
    })

    test('JSON-LD fallback skips entries without numeric ID in URL', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'RealEstateListing',
            name: 'NoId',
            url: 'https://booli.se/some-slug',
            offers: { price: 1000000 },
          })}</script>
        </head><body></body></html>
      `
      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties).toEqual([])
    })

    test('JSON-LD extracts address from structured address object', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'RealEstateListing',
            name: 'Listing',
            url: 'https://booli.se/annons/777',
            address: { streetAddress: 'Structured Gata 5' },
            offers: { price: 2000000 },
            geo: { latitude: 59.5, longitude: 18.5 },
          })}</script>
        </head><body></body></html>
      `
      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties[0].address).toBe('Structured Gata 5')
    })

    test('JSON-LD handles image as array', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'RealEstateListing',
            url: 'https://booli.se/annons/888',
            offers: { price: 1000000 },
            image: ['/first.jpg', '/second.jpg'],
          })}</script>
        </head><body></body></html>
      `
      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties[0].images).toEqual([{ url: '/first.jpg' }])
    })

    test('JSON-LD handles missing image', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'RealEstateListing',
            url: 'https://booli.se/annons/444',
            offers: { price: 1000000 },
          })}</script>
        </head><body></body></html>
      `
      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties[0].images).toEqual([])
    })

    test('JSON-LD handles Product type', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            name: 'ProductListing',
            url: 'https://booli.se/annons/555',
            offers: { price: 4000000 },
          })}</script>
        </head><body></body></html>
      `
      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties).toHaveLength(1)
    })

    test('JSON-LD handles Residence type', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Residence',
            name: 'ResidenceListing',
            url: 'https://booli.se/annons/666',
            offers: { price: 5000000 },
          })}</script>
        </head><body></body></html>
      `
      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties).toHaveLength(1)
    })
  })
})
