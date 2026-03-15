import { describe, expect, test } from 'bun:test'

import type { PropertyType } from '@/types'

import type { FetchFn } from '../hemnet-scraper'
import { HemnetScraper } from '../hemnet-scraper'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

function createScraper(handler: FetchFn): HemnetScraper {
  return new HemnetScraper('https://test.hemnet.se', handler)
}

// ---------------------------------------------------------------------------
// Mock HTML containing Hemnet listing cards
// ---------------------------------------------------------------------------

function hemnetListingHtml(listings: Array<{
  id: string
  address: string
  price: string
  rooms: string
  area: string
  location: string
  fee?: string
  lat?: string
  lng?: string
  type?: string
  imageUrl?: string
}>): string {
  const items = listings.map((l) => `
    <li class="normal-results__hit js-normal-list-item"
        data-listing-id="${l.id}"
        data-address="${l.address}"
        data-price="${l.price}"
        data-rooms="${l.rooms}"
        data-living-area="${l.area}"
        data-location="${l.location}"
        data-item-type="${l.type ?? 'bostadsratt'}"
        ${l.lat ? `data-latitude="${l.lat}"` : ''}
        ${l.lng ? `data-longitude="${l.lng}"` : ''}>
      <a href="https://www.hemnet.se/bostad/${l.id}">
        ${l.imageUrl ? `<img src="${l.imageUrl}" alt="${l.address}">` : ''}
        <span class="listing-card__street-address">${l.address}</span>
        <span class="listing-card__location-name">${l.location}</span>
        <span class="listing-card__attribute--price">${l.price} kr</span>
        ${l.fee ? `<span class="listing-card__attribute">${l.fee} kr/man</span>` : ''}
      </a>
    </li>
  `).join('\n')

  return `
    <html>
    <head></head>
    <body>
      <div class="search-results">
        <span class="search-results__total">42 bostader</span>
        <ul class="normal-results">
          ${items}
        </ul>
      </div>
    </body>
    </html>
  `
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HemnetScraper', () => {
  // -----------------------------------------------------------------------
  // searchLocations
  // -----------------------------------------------------------------------

  describe('searchLocations', () => {
    test('returns locations from Hemnet location API array response', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse([
          { id: 101, name: 'Stockholm', type: 'municipality', location_id: 'loc-101' },
          { id: 102, name: 'Sodermalm', type: 'district', parent_location: 'Stockholm', location_id: 'loc-102' },
        ])

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('stock')

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('loc-101')
      expect(results[0].name).toBe('Stockholm')
      expect(results[0].type).toBe('kommun')
      expect(results[1].id).toBe('loc-102')
      expect(results[1].name).toBe('Sodermalm')
      expect(results[1].type).toBe('stadsdel')
      expect(results[1].parentName).toBe('Stockholm')
    })

    test('returns locations from { locations: [...] } wrapper', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse({
          locations: [
            { id: 200, name: 'Gothenburg', type: 'city', location_id: 'loc-200' },
          ],
        })

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('goth')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Gothenburg')
      expect(results[0].type).toBe('stad')
    })

    test('returns locations from { result: [...] } wrapper', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse({
          result: [
            { id: 300, name: 'Uppsala', type: 'municipality', location_id: 'loc-300' },
          ],
        })

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('upp')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Uppsala')
      expect(results[0].type).toBe('kommun')
    })

    test('falls back to id when location_id is absent', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse([
          { id: 42, name: 'FallbackId', type: 'area' },
        ])

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test')

      expect(results[0].id).toBe('42')
    })

    test('respects limit parameter', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse([
          { id: 1, name: 'A', type: 'city', location_id: 'a' },
          { id: 2, name: 'B', type: 'city', location_id: 'b' },
          { id: 3, name: 'C', type: 'city', location_id: 'c' },
        ])

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test', 2)

      expect(results).toHaveLength(2)
    })

    test('returns empty array for empty query', async () => {
      const mockFetch: FetchFn = async () => {
        throw new Error('should not be called')
      }

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('')
      expect(results).toEqual([])
    })

    test('returns empty array for whitespace-only query', async () => {
      const mockFetch: FetchFn = async () => {
        throw new Error('should not be called')
      }

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('   ')
      expect(results).toEqual([])
    })

    test('returns empty array on HTTP error', async () => {
      const mockFetch: FetchFn = async () => jsonResponse({ error: 'Not found' }, 404)

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test')
      expect(results).toEqual([])
    })

    test('returns empty array on network failure', async () => {
      const mockFetch: FetchFn = async () => {
        throw new Error('ECONNREFUSED')
      }

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test')
      expect(results).toEqual([])
    })

    test('skips items without id or name', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse([
          { id: null, name: 'NoId' },
          { id: 1, name: '' },
          { id: 2, name: 'Valid', type: 'city', location_id: 'v' },
        ])

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Valid')
    })

    test('sends correct URL with encoded query', async () => {
      let capturedUrl = ''
      const mockFetch: FetchFn = async (url) => {
        capturedUrl = url
        return jsonResponse([])
      }

      const scraper = createScraper(mockFetch)
      await scraper.searchLocations('sodra station')

      expect(capturedUrl).toBe(
        'https://test.hemnet.se/locations/show?q=sodra%20station',
      )
    })

    test('defaults limit to 5', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse([
          { id: 1, name: 'A', type: 'city', location_id: '1' },
          { id: 2, name: 'B', type: 'city', location_id: '2' },
          { id: 3, name: 'C', type: 'city', location_id: '3' },
          { id: 4, name: 'D', type: 'city', location_id: '4' },
          { id: 5, name: 'E', type: 'city', location_id: '5' },
          { id: 6, name: 'F', type: 'city', location_id: '6' },
        ])

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test')

      expect(results).toHaveLength(5)
    })

    test('handles non-object response gracefully', async () => {
      const mockFetch: FetchFn = async () => jsonResponse('just a string')

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test')
      expect(results).toEqual([])
    })

    test('normalizes location types correctly', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse([
          { id: 1, name: 'Kommun', type: 'municipality', location_id: '1' },
          { id: 2, name: 'Stadsdel', type: 'district', location_id: '2' },
          { id: 3, name: 'Region', type: 'region', location_id: '3' },
          { id: 4, name: 'Street', type: 'street', location_id: '4' },
          { id: 5, name: 'Area', type: 'area', location_id: '5' },
          { id: 6, name: 'Unknown', type: 'unknown_type', location_id: '6' },
        ])

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test', 10)

      expect(results[0].type).toBe('kommun')
      expect(results[1].type).toBe('stadsdel')
      expect(results[2].type).toBe('lan')
      expect(results[3].type).toBe('adress')
      expect(results[4].type).toBe('omrade')
      expect(results[5].type).toBe('omrade') // unknown falls back to omrade
    })

    test('handles missing parent_location', async () => {
      const mockFetch: FetchFn = async () =>
        jsonResponse([
          { id: 1, name: 'NoParent', type: 'city', location_id: '1' },
        ])

      const scraper = createScraper(mockFetch)
      const results = await scraper.searchLocations('test')

      expect(results[0].parentName).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // searchProperties
  // -----------------------------------------------------------------------

  describe('searchProperties', () => {
    test('parses properties from JSON-LD Product blocks', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            name: 'Hornsgatan 42, Stockholm',
            url: 'https://www.hemnet.se/bostad/12345',
            description: 'Charming apartment',
            offers: { price: 4950000 },
            geo: { latitude: 59.3171, longitude: 18.0494 },
            image: '/photo.jpg',
            datePublished: '2024-01-15',
            address: { streetAddress: 'Hornsgatan 42', addressLocality: 'Stockholm' },
          })}</script>
        </head><body><span>42 bostader</span></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].id).toBe('12345')
      expect(result.properties[0].booliId).toBe(12345)
      expect(result.properties[0].address).toBe('Hornsgatan 42')
      expect(result.properties[0].municipality).toBe('Stockholm')
      expect(result.properties[0].price).toBe(4950000)
      expect(result.properties[0].coordinates).toEqual({ latitude: 59.3171, longitude: 18.0494 })
      expect(result.properties[0].images).toEqual([{ url: '/photo.jpg' }])
      expect(result.properties[0].description).toBe('Charming apartment')
      expect(result.totalCount).toBe(42)
    })

    test('parses properties from JSON-LD Residence blocks', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Residence',
            name: 'Villa listing',
            url: 'https://www.hemnet.se/bostad/99999',
            offers: { price: 8000000 },
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].booliId).toBe(99999)
    })

    test('parses properties from JSON-LD RealEstateListing blocks', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'RealEstateListing',
            name: 'RealEstate listing',
            url: 'https://www.hemnet.se/bostad/77777',
            offers: { price: 3000000 },
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].booliId).toBe(77777)
    })

    test('handles JSON-LD ItemList', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'ItemList',
            itemListElement: [
              {
                item: {
                  '@type': 'Product',
                  name: 'Apt A',
                  url: 'https://hemnet.se/bostad/111',
                  offers: { price: 2000000 },
                },
              },
              {
                item: {
                  '@type': 'Product',
                  name: 'Apt B',
                  url: 'https://hemnet.se/bostad/222',
                  offers: { price: 3000000 },
                },
              },
            ],
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toHaveLength(2)
      expect(result.properties[0].booliId).toBe(111)
      expect(result.properties[1].booliId).toBe(222)
    })

    test('parses properties from HTML listing cards when no JSON-LD', async () => {
      const html = hemnetListingHtml([
        {
          id: '55555',
          address: 'Odengatan 18',
          price: '6800000',
          rooms: '3',
          area: '80',
          location: 'Vasastan, Stockholm',
          fee: '3200',
          lat: '59.343',
          lng: '18.052',
          type: 'bostadsratt',
          imageUrl: 'https://img.hemnet.se/photo.jpg',
        },
      ])

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].id).toBe('55555')
      expect(result.properties[0].address).toBe('Odengatan 18')
      expect(result.properties[0].price).toBe(6800000)
      expect(result.properties[0].rooms).toBe(3)
      expect(result.properties[0].livingArea).toBe(80)
      expect(result.properties[0].area).toBe('Vasastan, Stockholm')
      expect(result.properties[0].monthlyFee).toBe(3200)
      expect(result.properties[0].propertyType).toBe('apartment')
      expect(result.properties[0].coordinates).toEqual({ latitude: 59.343, longitude: 18.052 })
      expect(result.properties[0].images).toEqual([{ url: 'https://img.hemnet.se/photo.jpg' }])
      expect(result.properties[0].url).toBe('https://www.hemnet.se/bostad/55555')
      expect(result.totalCount).toBe(42)
    })

    test('parses multiple HTML listing cards', async () => {
      const html = hemnetListingHtml([
        { id: '111', address: 'Gatan 1', price: '2000000', rooms: '2', area: '50', location: 'Area A' },
        { id: '222', address: 'Gatan 2', price: '3000000', rooms: '3', area: '70', location: 'Area B' },
      ])

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toHaveLength(2)
    })

    test('calculates pricePerSqm from HTML listing data', async () => {
      const html = hemnetListingHtml([
        { id: '111', address: 'Gatan 1', price: '6000000', rooms: '2', area: '75', location: 'Area' },
      ])

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].pricePerSqm).toBe(80000) // 6000000 / 75
    })

    test('returns empty result on HTTP error', async () => {
      const mockFetch: FetchFn = async () => htmlResponse('Server Error', 500)

      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('returns empty result on network failure', async () => {
      const mockFetch: FetchFn = async () => {
        throw new Error('Network failure')
      }

      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('returns empty result when page has no extractable data', async () => {
      const mockFetch: FetchFn = async () => htmlResponse('<html><body>No data here</body></html>')

      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('preserves pagination and filters in result', async () => {
      const html = hemnetListingHtml([
        { id: '111', address: 'Gatan 1', price: '2000000', rooms: '2', area: '50', location: 'A' },
      ])

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)

      const filters = { query: 'Stockholm', priceRange: { min: 1000000 } }
      const pagination = { offset: 20, limit: 10 }
      const result = await scraper.searchProperties(filters, pagination)

      expect(result.pagination).toEqual(pagination)
      expect(result.filters).toEqual(filters)
    })

    test('uses default pagination when not provided', async () => {
      const mockFetch: FetchFn = async () => htmlResponse('<html><body></body></html>')

      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.pagination).toEqual({ offset: 0, limit: 20 })
    })

    test('JSON-LD skips entries without numeric ID in URL', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            name: 'NoId',
            url: 'https://hemnet.se/some-slug',
            offers: { price: 1000000 },
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toEqual([])
    })

    test('JSON-LD handles image as array', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            url: 'https://hemnet.se/bostad/888',
            offers: { price: 1000000 },
            image: ['/first.jpg', '/second.jpg'],
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].images).toEqual([{ url: '/first.jpg' }])
    })

    test('JSON-LD handles missing image', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            url: 'https://hemnet.se/bostad/444',
            offers: { price: 1000000 },
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].images).toEqual([])
    })

    test('JSON-LD extracts address from structured address object', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            name: 'Listing Name',
            url: 'https://hemnet.se/bostad/777',
            address: { streetAddress: 'Structured Gata 5', addressLocality: 'Malmo' },
            offers: { price: 2000000 },
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].address).toBe('Structured Gata 5')
      expect(result.properties[0].municipality).toBe('Malmo')
    })

    test('JSON-LD falls back to name when no address object', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            name: 'Listing From Name',
            url: 'https://hemnet.se/bostad/666',
            offers: { price: 2000000 },
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].address).toBe('Listing From Name')
    })

    test('generates url from baseUrl when listing card has no href', async () => {
      const html = `
        <html><body>
          <span>10 bostader</span>
          <li class="normal-results__hit"
              data-listing-id="99999"
              data-address="TestGatan 1"
              data-price="5000000"
              data-rooms="3"
              data-living-area="80"
              data-location="TestArea">
            <span class="listing-card__street-address">TestGatan 1</span>
          </li>
        </body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].url).toBe('https://test.hemnet.se/bostad/99999')
    })

    test('normalizes Swedish property types from HTML data', async () => {
      const types: Array<{ type: string; expected: PropertyType }> = [
        { type: 'bostadsratt', expected: 'apartment' },
        { type: 'villa', expected: 'house' },
        { type: 'radhus', expected: 'townhouse' },
        { type: 'fritidshus', expected: 'cottage' },
        { type: 'tomt', expected: 'plot' },
      ]

      for (const { type, expected } of types) {
        const html = hemnetListingHtml([
          { id: '111', address: 'G 1', price: '1000000', rooms: '1', area: '30', location: 'A', type },
        ])

        const mockFetch: FetchFn = async () => htmlResponse(html)
        const scraper = createScraper(mockFetch)
        const result = await scraper.searchProperties({})

        expect(result.properties[0].propertyType).toBe(expected)
      }
    })

    test('extracts total count from HTML with "bostader" pattern', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            url: 'https://hemnet.se/bostad/123',
            offers: { price: 1000000 },
          })}</script>
        </head><body>
          <span>1 234 bostader</span>
        </body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.totalCount).toBe(1234)
    })

    test('extracts total count from HTML with "resultat" pattern', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            url: 'https://hemnet.se/bostad/123',
            offers: { price: 1000000 },
          })}</script>
        </head><body>
          <span>56 resultat</span>
        </body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.totalCount).toBe(56)
    })

    test('falls back to properties.length when no total count in HTML', async () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            url: 'https://hemnet.se/bostad/123',
            offers: { price: 1000000 },
          })}</script>
        </head><body></body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.totalCount).toBe(1) // 1 property found
    })

    test('handles malformed HTML gracefully', async () => {
      const html = '<html><body><div class="listing-card">broken incomplete'

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('handles listing card without coordinates', async () => {
      const html = hemnetListingHtml([
        { id: '111', address: 'NoCoords', price: '2000000', rooms: '2', area: '50', location: 'Area' },
      ])

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].coordinates).toEqual({ latitude: 0, longitude: 0 })
    })

    test('handles listing card without image', async () => {
      const html = `
        <html><body>
          <span>5 bostader</span>
          <li class="normal-results__hit"
              data-listing-id="111"
              data-address="NoImg"
              data-price="1000000"
              data-rooms="1"
              data-living-area="30"
              data-location="Area">
            <a href="https://www.hemnet.se/bostad/111">
              <span class="listing-card__street-address">NoImg</span>
            </a>
          </li>
        </body></html>
      `

      const mockFetch: FetchFn = async () => htmlResponse(html)
      const scraper = createScraper(mockFetch)
      const result = await scraper.searchProperties({})

      expect(result.properties[0].images).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // buildSearchUrl
  // -----------------------------------------------------------------------

  describe('buildSearchUrl', () => {
    const scraper = new HemnetScraper('https://test.hemnet.se')

    test('builds base URL with no filters', () => {
      const url = scraper.buildSearchUrl({}, { offset: 0, limit: 20 })
      expect(url).toBe('https://test.hemnet.se/bostader')
    })

    test('includes location_ids[] for locationId', () => {
      const url = scraper.buildSearchUrl(
        { locationId: '12345' },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('location_ids%5B%5D=12345')
    })

    test('includes price range', () => {
      const url = scraper.buildSearchUrl(
        { priceRange: { min: 1000000, max: 5000000 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('price_min=1000000')
      expect(url).toContain('price_max=5000000')
    })

    test('includes rooms range', () => {
      const url = scraper.buildSearchUrl(
        { roomsRange: { min: 2, max: 4 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('rooms_min=2')
      expect(url).toContain('rooms_max=4')
    })

    test('includes area range', () => {
      const url = scraper.buildSearchUrl(
        { areaRange: { min: 40, max: 100 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('living_area_min=40')
      expect(url).toContain('living_area_max=100')
    })

    test('includes property types as item_types[] params', () => {
      const url = scraper.buildSearchUrl(
        { propertyTypes: ['apartment', 'house'] },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('item_types%5B%5D=bostadsratt')
      expect(url).toContain('item_types%5B%5D=villa')
    })

    test('includes construction year range', () => {
      const url = scraper.buildSearchUrl(
        { constructionYearRange: { min: 1900, max: 2020 } },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('construction_year_min=1900')
      expect(url).toContain('construction_year_max=2020')
    })

    test('includes maxMonthlyFee as fee_max', () => {
      const url = scraper.buildSearchUrl(
        { maxMonthlyFee: 5000 },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('fee_max=5000')
    })

    test('includes maxPricePerSqm', () => {
      const url = scraper.buildSearchUrl(
        { maxPricePerSqm: 100000 },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('price_per_sqm_max=100000')
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
          locationId: 'loc-1',
          priceRange: { min: 2000000, max: 8000000 },
          roomsRange: { min: 2 },
          propertyTypes: ['apartment'],
        },
        { offset: 0, limit: 20 },
      )
      expect(url).toContain('location_ids%5B%5D=loc-1')
      expect(url).toContain('price_min=2000000')
      expect(url).toContain('price_max=8000000')
      expect(url).toContain('rooms_min=2')
      expect(url).toContain('item_types%5B%5D=bostadsratt')
    })
  })

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------

  describe('rate limiting', () => {
    test('throttles consecutive requests', async () => {
      const callTimes: number[] = []
      const mockFetch: FetchFn = async () => {
        callTimes.push(Date.now())
        return jsonResponse([])
      }

      const scraper = createScraper(mockFetch)
      await scraper.searchLocations('a')
      await scraper.searchLocations('b')

      expect(callTimes).toHaveLength(2)
      // Second call should be at least ~200ms after the first
      // (allow some slack for timing)
      const diff = callTimes[1] - callTimes[0]
      expect(diff).toBeGreaterThanOrEqual(150) // 200ms target with slack
    })
  })

  // -----------------------------------------------------------------------
  // parseSearchResults (internal, exposed for testing)
  // -----------------------------------------------------------------------

  describe('parseSearchResults', () => {
    const scraper = new HemnetScraper('https://test.hemnet.se')

    test('returns empty result for HTML with no data', () => {
      const result = scraper.parseSearchResults(
        '<html><body></body></html>',
        { offset: 0, limit: 20 },
        {},
      )
      expect(result.properties).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    test('prefers JSON-LD over HTML listing cards', () => {
      // HTML that has both JSON-LD and listing cards
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Product',
            name: 'JSON-LD Listing',
            url: 'https://hemnet.se/bostad/111',
            offers: { price: 5000000 },
          })}</script>
        </head><body>
          <li class="normal-results__hit"
              data-listing-id="222"
              data-address="HTML Listing"
              data-price="3000000"
              data-rooms="2"
              data-living-area="50"
              data-location="Area">
          </li>
        </body></html>
      `

      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      // Should return the JSON-LD listing, not the HTML one
      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].booliId).toBe(111)
    })

    test('falls back to HTML cards when JSON-LD has no valid entries', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">${JSON.stringify({
            '@type': 'Organization',
            name: 'Hemnet',
          })}</script>
        </head><body>
          <span>5 bostader</span>
          <li class="normal-results__hit"
              data-listing-id="333"
              data-address="HTML Fallback"
              data-price="4000000"
              data-rooms="3"
              data-living-area="70"
              data-location="FallbackArea">
            <a href="https://www.hemnet.se/bostad/333">
              <span class="listing-card__street-address">HTML Fallback</span>
            </a>
          </li>
        </body></html>
      `

      const result = scraper.parseSearchResults(html, { offset: 0, limit: 20 }, {})
      expect(result.properties).toHaveLength(1)
      expect(result.properties[0].id).toBe('333')
      expect(result.properties[0].address).toBe('HTML Fallback')
    })
  })

  // -----------------------------------------------------------------------
  // Constructor defaults
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    test('uses default base URL when not provided', () => {
      const scraper = new HemnetScraper()
      const url = scraper.buildSearchUrl({}, { offset: 0, limit: 20 })
      expect(url).toBe('https://www.hemnet.se/bostader')
    })
  })
})
