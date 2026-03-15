import { describe, expect, mock, test } from 'bun:test'

import { PlaywrightSource } from '../playwright-source'

function mockFetch(data: unknown, ok = true): typeof fetch {
  return mock(async () => ({
    ok,
    json: async () => data,
  })) as unknown as typeof fetch
}

function mockFetchFail(): typeof fetch {
  return mock(async () => {
    throw new Error('Network error')
  }) as unknown as typeof fetch
}

describe('PlaywrightSource', () => {
  describe('searchLocations', () => {
    test('returns parsed locations from scraper API', async () => {
      const data = [
        { id: '1', name: 'Stockholm', type: 'stad' },
        { id: '2', name: 'Södermalm', type: 'stadsdel', parentName: 'Stockholm' },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))

      const results = await source.searchLocations('stock')
      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('Stockholm')
      expect(results[1].parentName).toBe('Stockholm')
    })

    test('returns empty for empty query', async () => {
      const source = new PlaywrightSource('http://scraper:3001', mockFetch([]))
      expect(await source.searchLocations('')).toEqual([])
      expect(await source.searchLocations('  ')).toEqual([])
    })

    test('respects limit', async () => {
      const data = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
        { id: '3', name: 'C' },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchLocations('test', 2)
      expect(results).toHaveLength(2)
    })

    test('returns empty on non-ok response', async () => {
      const source = new PlaywrightSource('http://scraper:3001', mockFetch([], false))
      expect(await source.searchLocations('test')).toEqual([])
    })

    test('returns empty on network error', async () => {
      const source = new PlaywrightSource('http://scraper:3001', mockFetchFail())
      expect(await source.searchLocations('test')).toEqual([])
    })

    test('filters out locations without name', async () => {
      const data = [
        { id: '1', name: 'Good' },
        { name: '' },
        { id: '3' },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchLocations('test')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Good')
    })
  })

  describe('searchProperties', () => {
    test('returns parsed properties from scraper API', async () => {
      const data = [
        {
          booliId: 100,
          address: 'Testgatan 1',
          area: 'Södermalm',
          municipality: 'Stockholm',
          price: 3500000,
          livingArea: 50,
          rooms: 2,
          objectType: 'lägenhet',
        },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({ query: 'Stockholm' })

      expect(results.properties).toHaveLength(1)
      expect(results.properties[0].address).toBe('Testgatan 1')
      expect(results.properties[0].propertyType).toBe('apartment')
      expect(results.totalCount).toBe(1)
    })

    test('returns empty for empty query and no locationId', async () => {
      const source = new PlaywrightSource('http://scraper:3001', mockFetch([]))
      const results = await source.searchProperties({})
      expect(results.properties).toEqual([])
    })

    test('uses locationId as query', async () => {
      const fetchFn = mockFetch([{ booliId: 1, address: 'A', price: 1000000, livingArea: 30, rooms: 1 }])
      const source = new PlaywrightSource('http://scraper:3001', fetchFn)
      await source.searchProperties({ locationId: 'loc-1' })
      expect(fetchFn).toHaveBeenCalled()
    })

    test('returns empty on non-ok response', async () => {
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(null, false))
      const results = await source.searchProperties({ query: 'test' })
      expect(results.properties).toEqual([])
    })

    test('returns empty on network error', async () => {
      const source = new PlaywrightSource('http://scraper:3001', mockFetchFail())
      const results = await source.searchProperties({ query: 'test' })
      expect(results.properties).toEqual([])
    })

    test('returns empty when response is not array', async () => {
      const source = new PlaywrightSource('http://scraper:3001', mockFetch({ error: 'bad' }))
      const results = await source.searchProperties({ query: 'test' })
      expect(results.properties).toEqual([])
    })

    test('skips properties without booliId', async () => {
      const data = [
        { booliId: 1, address: 'Good', price: 1000000, livingArea: 30, rooms: 1 },
        { address: 'No ID', price: 2000000 },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({ query: 'test' })
      expect(results.properties).toHaveLength(1)
    })

    test('applies price filter', async () => {
      const data = [
        { booliId: 1, address: 'Cheap', price: 1000000, livingArea: 30, rooms: 1 },
        { booliId: 2, address: 'Expensive', price: 5000000, livingArea: 80, rooms: 3 },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({
        query: 'test',
        priceRange: { max: 2000000 },
      })
      expect(results.properties).toHaveLength(1)
      expect(results.properties[0].address).toBe('Cheap')
    })

    test('applies rooms filter', async () => {
      const data = [
        { booliId: 1, address: 'Small', price: 1000000, livingArea: 30, rooms: 1 },
        { booliId: 2, address: 'Big', price: 3000000, livingArea: 80, rooms: 3 },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({
        query: 'test',
        roomsRange: { min: 2 },
      })
      expect(results.properties).toHaveLength(1)
      expect(results.properties[0].address).toBe('Big')
    })

    test('applies property type filter', async () => {
      const data = [
        { booliId: 1, address: 'Apt', price: 1000000, livingArea: 30, rooms: 1, objectType: 'lägenhet' },
        { booliId: 2, address: 'House', price: 5000000, livingArea: 150, rooms: 5, objectType: 'villa' },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({
        query: 'test',
        propertyTypes: ['house'],
      })
      expect(results.properties).toHaveLength(1)
      expect(results.properties[0].address).toBe('House')
    })

    test('applies monthly fee filter', async () => {
      const data = [
        { booliId: 1, address: 'Low', price: 1000000, livingArea: 30, rooms: 1, monthlyFee: 2000 },
        { booliId: 2, address: 'High', price: 3000000, livingArea: 80, rooms: 3, monthlyFee: 6000 },
      ]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({
        query: 'test',
        maxMonthlyFee: 3000,
      })
      expect(results.properties).toHaveLength(1)
    })

    test('respects pagination', async () => {
      const data = Array.from({ length: 5 }, (_, i) => ({
        booliId: i + 1,
        address: `Addr ${i + 1}`,
        price: 1000000,
        livingArea: 30,
        rooms: 1,
      }))
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties(
        { query: 'test' },
        { offset: 2, limit: 2 },
      )
      expect(results.properties).toHaveLength(2)
      expect(results.properties[0].address).toBe('Addr 3')
      expect(results.totalCount).toBe(5)
    })

    test('maps location fields from nested structure', async () => {
      const data = [{
        booliId: 1,
        address: 'Testgatan 5',
        price: 1000000,
        livingArea: 50,
        rooms: 2,
        location: {
          namedAreas: ['Södermalm'],
          region: { municipalityName: 'Stockholm' },
          position: { latitude: 59.315, longitude: 18.071 },
        },
      }]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({ query: 'test' })
      expect(results.properties[0].area).toBe('Södermalm')
      expect(results.properties[0].municipality).toBe('Stockholm')
      expect(results.properties[0].coordinates.latitude).toBe(59.315)
    })

    test('maps rent to monthlyFee', async () => {
      const data = [{
        booliId: 1, address: 'Testgatan 6', price: 1000000, livingArea: 30, rooms: 1, rent: 3500,
      }]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({ query: 'test' })
      expect(results.properties[0].monthlyFee).toBe(3500)
    })

    test('calculates pricePerSqm when not provided', async () => {
      const data = [{
        booliId: 1, address: 'Testgatan 7', price: 3000000, livingArea: 60, rooms: 2,
      }]
      const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
      const results = await source.searchProperties({ query: 'test' })
      expect(results.properties[0].pricePerSqm).toBe(50000)
    })

    test('normalizes property types', async () => {
      const types = [
        ['lägenhet', 'apartment'],
        ['villa', 'house'],
        ['radhus', 'townhouse'],
        ['tomt', 'plot'],
        ['fritidshus', 'cottage'],
        ['unknown', 'apartment'],
        [undefined, 'apartment'],
      ]
      for (const [input, expected] of types) {
        const data = [{ booliId: 1, address: 'Testgatan 8', price: 1000000, livingArea: 1, rooms: 1, objectType: input }]
        const source = new PlaywrightSource('http://scraper:3001', mockFetch(data))
        const results = await source.searchProperties({ query: 'test' })
        expect(results.properties[0].propertyType).toBe(expected as import('@/types').PropertyType)
      }
    })

    test('uses default scraper URL from constructor', () => {
      const source = new PlaywrightSource()
      expect(source).toBeDefined()
    })
  })
})
