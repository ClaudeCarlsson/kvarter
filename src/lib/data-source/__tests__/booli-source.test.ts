import { describe, expect, mock, test } from 'bun:test'

import { DEFAULT_PAGE_SIZE } from '../../constants'
import { BooliGraphQLSource } from '../booli-source'
import type { GraphQLRequestFn } from '../booli-source'

function createMockRequest(response: unknown): GraphQLRequestFn & { calls: [string, Record<string, unknown> | undefined][] } {
  const calls: [string, Record<string, unknown> | undefined][] = []
  const fn = async (document: string, variables?: Record<string, unknown>) => {
    calls.push([document, variables])
    return response
  }
  ;(fn as unknown as { calls: typeof calls }).calls = calls
  return fn as GraphQLRequestFn & { calls: typeof calls }
}

function createFailingRequest(error: Error): GraphQLRequestFn {
  return async () => {
    throw error
  }
}

describe('BooliGraphQLSource', () => {
  describe('searchLocations', () => {
    test('calls request with correct query and variables', async () => {
      const mockRequest = createMockRequest({
        searchLocations: [
          {
            id: 'loc-1',
            name: 'Stockholm',
            type: 'stad',
            slug: 'stockholm',
            coordinates: { latitude: 59.3293, longitude: 18.0686 },
          },
        ],
      })

      const source = new BooliGraphQLSource(mockRequest)
      await source.searchLocations('stock', 3)

      expect(mockRequest.calls).toHaveLength(1)
      const [doc, vars] = mockRequest.calls[0]
      expect(doc).toContain('SearchLocations')
      expect(vars).toEqual({ query: 'stock', limit: 3 })
    })

    test('maps raw locations to domain objects', async () => {
      const mockRequest = createMockRequest({
        searchLocations: [
          {
            id: 'loc-1',
            name: 'Stockholm',
            type: 'stad',
            slug: 'stockholm',
            coordinates: { latitude: 59.3293, longitude: 18.0686 },
          },
          {
            id: 'loc-2',
            name: 'Sodermalm',
            type: 'stadsdel',
            parentName: 'Stockholm',
          },
        ],
      })

      const source = new BooliGraphQLSource(mockRequest)
      const results = await source.searchLocations('stock')

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('loc-1')
      expect(results[0].name).toBe('Stockholm')
      expect(results[0].type).toBe('stad')
      expect(results[0].coordinates).toEqual({ latitude: 59.3293, longitude: 18.0686 })
      expect(results[1].id).toBe('loc-2')
      expect(results[1].parentName).toBe('Stockholm')
    })

    test('uses default limit of 5', async () => {
      const mockRequest = createMockRequest({ searchLocations: [] })

      const source = new BooliGraphQLSource(mockRequest)
      await source.searchLocations('test')

      const [, vars] = mockRequest.calls[0]
      expect(vars).toEqual({ query: 'test', limit: 5 })
    })

    test('returns empty array when API returns no results', async () => {
      const mockRequest = createMockRequest({ searchLocations: [] })

      const source = new BooliGraphQLSource(mockRequest)
      const results = await source.searchLocations('nothing')

      expect(results).toHaveLength(0)
    })

    test('propagates errors from request function', async () => {
      const mockRequest = createFailingRequest(new Error('Network failure'))

      const source = new BooliGraphQLSource(mockRequest)

      try {
        await source.searchLocations('test')
        expect.unreachable('should throw')
      } catch (error) {
        expect((error as Error).message).toBe('Network failure')
      }
    })
  })

  describe('searchProperties', () => {
    const mockPropertyResponse = {
      searchProperties: {
        totalCount: 2,
        properties: [
          {
            booliId: 100001,
            address: 'Hornsgatan 42',
            area: 'Sodermalm',
            municipality: 'Stockholm',
            price: 4950000,
            pricePerSqm: 82500,
            livingArea: 60,
            rooms: 2,
            floor: 4,
            totalFloors: 6,
            constructionYear: 1925,
            monthlyFee: 3200,
            propertyType: 'apartment',
            coordinates: { latitude: 59.3171, longitude: 18.0494 },
            images: [{ url: '/test.jpg', width: 800, height: 600 }],
            description: 'Test',
            url: 'https://booli.se/annons/100001',
            publishedAt: '2024-01-01',
            daysOnMarket: 5,
          },
          {
            booliId: 100002,
            address: 'Odengatan 18',
            area: 'Vasastan',
            municipality: 'Stockholm',
            price: 6800000,
            livingArea: 80,
            rooms: 3,
            propertyType: 'lagenhet',
            coordinates: { latitude: 59.343, longitude: 18.052 },
            images: [],
            url: 'https://booli.se/annons/100002',
            publishedAt: '2024-01-02',
            daysOnMarket: 12,
          },
        ],
      },
    }

    test('calls request with mapped variables', async () => {
      const mockRequest = createMockRequest(mockPropertyResponse)

      const source = new BooliGraphQLSource(mockRequest)
      await source.searchProperties(
        {
          query: 'Stockholm',
          locationId: 'loc-1',
          priceRange: { min: 1000000, max: 10000000 },
        },
        { offset: 0, limit: 10 },
      )

      expect(mockRequest.calls).toHaveLength(1)
      const [doc, vars] = mockRequest.calls[0]
      expect(doc).toContain('SearchProperties')
      expect(vars).toMatchObject({
        query: 'Stockholm',
        locationId: 'loc-1',
        minPrice: 1000000,
        maxPrice: 10000000,
        offset: 0,
        limit: 10,
      })
    })

    test('maps raw properties to domain objects', async () => {
      const mockRequest = createMockRequest(mockPropertyResponse)

      const source = new BooliGraphQLSource(mockRequest)
      const results = await source.searchProperties({})

      expect(results.properties).toHaveLength(2)
      expect(results.properties[0].id).toBe('100001')
      expect(results.properties[0].address).toBe('Hornsgatan 42')
      expect(results.properties[0].propertyType).toBe('apartment')
      // Swedish property type should be normalized
      expect(results.properties[1].propertyType).toBe('apartment')
    })

    test('returns correct totalCount', async () => {
      const mockRequest = createMockRequest(mockPropertyResponse)

      const source = new BooliGraphQLSource(mockRequest)
      const results = await source.searchProperties({})

      expect(results.totalCount).toBe(2)
    })

    test('returns pagination and filters in result', async () => {
      const mockRequest = createMockRequest(mockPropertyResponse)
      const filters = { query: 'test' }
      const pagination = { offset: 10, limit: 5 }

      const source = new BooliGraphQLSource(mockRequest)
      const results = await source.searchProperties(filters, pagination)

      expect(results.pagination).toEqual(pagination)
      expect(results.filters).toEqual(filters)
    })

    test('uses default pagination when not provided', async () => {
      const mockRequest = createMockRequest(mockPropertyResponse)

      const source = new BooliGraphQLSource(mockRequest)
      const results = await source.searchProperties({})

      expect(results.pagination).toEqual({ offset: 0, limit: DEFAULT_PAGE_SIZE })
    })

    test('propagates errors from request function', async () => {
      const mockRequest = createFailingRequest(new Error('Server error'))

      const source = new BooliGraphQLSource(mockRequest)

      try {
        await source.searchProperties({})
        expect.unreachable('should throw')
      } catch (error) {
        expect((error as Error).message).toBe('Server error')
      }
    })
  })
})
