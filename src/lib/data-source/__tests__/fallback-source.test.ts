import { describe, expect, mock, test } from 'bun:test'

import type { DataSource } from '../types'
import { FallbackDataSource } from '../fallback-source'

function createMockSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    searchLocations: mock(async () => []),
    searchProperties: mock(async () => ({
      properties: [],
      totalCount: 0,
      pagination: { offset: 0, limit: 20 },
      filters: {},
    })),
    ...overrides,
  }
}

describe('FallbackDataSource', () => {
  describe('searchLocations', () => {
    test('returns primary results when primary succeeds', async () => {
      const primary = createMockSource({
        searchLocations: mock(async () => [
          { id: '1', name: 'Stockholm', type: 'stad' as const },
        ]),
      })
      const fallback = createMockSource()

      const source = new FallbackDataSource(primary, fallback)
      const results = await source.searchLocations('stock')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Stockholm')
      expect(fallback.searchLocations).not.toHaveBeenCalled()
    })

    test('falls back when primary throws', async () => {
      const primary = createMockSource({
        searchLocations: mock(async () => {
          throw new Error('API is down')
        }),
      })
      const fallback = createMockSource({
        searchLocations: mock(async () => [
          { id: '2', name: 'Fallback', type: 'stad' as const },
        ]),
      })

      const source = new FallbackDataSource(primary, fallback)
      const results = await source.searchLocations('test')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Fallback')
    })

    test('passes query and limit to both sources', async () => {
      const primary = createMockSource({
        searchLocations: mock(async () => {
          throw new Error('fail')
        }),
      })
      const fallback = createMockSource({
        searchLocations: mock(async () => []),
      })

      const source = new FallbackDataSource(primary, fallback)
      await source.searchLocations('malmö', 3)

      expect(primary.searchLocations).toHaveBeenCalledWith('malmö', 3)
      expect(fallback.searchLocations).toHaveBeenCalledWith('malmö', 3)
    })
  })

  describe('searchProperties', () => {
    test('returns primary results when primary succeeds', async () => {
      const primary = createMockSource({
        searchProperties: mock(async () => ({
          properties: [{ id: '1' }] as never,
          totalCount: 1,
          pagination: { offset: 0, limit: 20 },
          filters: {},
        })),
      })
      const fallback = createMockSource()

      const source = new FallbackDataSource(primary, fallback)
      const results = await source.searchProperties({})

      expect(results.totalCount).toBe(1)
      expect(fallback.searchProperties).not.toHaveBeenCalled()
    })

    test('falls back when primary throws', async () => {
      const primary = createMockSource({
        searchProperties: mock(async () => {
          throw new Error('404')
        }),
      })
      const fallback = createMockSource({
        searchProperties: mock(async () => ({
          properties: [{ id: 'fb' }] as never,
          totalCount: 1,
          pagination: { offset: 0, limit: 20 },
          filters: {},
        })),
      })

      const source = new FallbackDataSource(primary, fallback)
      const results = await source.searchProperties({ query: 'test' })

      expect(results.totalCount).toBe(1)
    })

    test('passes filters and pagination to both sources', async () => {
      const filters = { query: 'stockholm', priceRange: { min: 1000000 } }
      const pagination = { offset: 10, limit: 5 }

      const primary = createMockSource({
        searchProperties: mock(async () => {
          throw new Error('fail')
        }),
      })
      const fallback = createMockSource()

      const source = new FallbackDataSource(primary, fallback)
      await source.searchProperties(filters, pagination)

      expect(primary.searchProperties).toHaveBeenCalledWith(filters, pagination)
      expect(fallback.searchProperties).toHaveBeenCalledWith(filters, pagination)
    })

    test('falls back to fallback searchProperties on primary error', async () => {
      const primary = createMockSource({
        searchProperties: mock(async () => { throw new Error('fail') }),
      })
      const fallback = createMockSource()
      const source = new FallbackDataSource(primary, fallback)
      await source.searchProperties({})
      expect(fallback.searchProperties).toHaveBeenCalled()
    })

    test('propagates fallback error if both fail', async () => {
      const primary = createMockSource({
        searchProperties: mock(async () => {
          throw new Error('primary down')
        }),
      })
      const fallback = createMockSource({
        searchProperties: mock(async () => {
          throw new Error('fallback also down')
        }),
      })

      const source = new FallbackDataSource(primary, fallback)

      try {
        await source.searchProperties({})
        expect.unreachable('should throw')
      } catch (error) {
        expect((error as Error).message).toBe('fallback also down')
      }
    })
  })

  describe('getSoldProperties', () => {
    test('returns primary sold data when available', async () => {
      const primary = createMockSource({
        getSoldProperties: mock(async () => [{ id: 'sold-1' }] as never),
      })
      const fallback = createMockSource()
      const source = new FallbackDataSource(primary, fallback)
      const results = await source.getSoldProperties('Stockholm')
      expect(results).toHaveLength(1)
    })

    test('falls back when primary has no getSoldProperties', async () => {
      const primary = createMockSource()
      const fallback = createMockSource({
        getSoldProperties: mock(async () => [{ id: 'fb-1' }] as never),
      })
      const source = new FallbackDataSource(primary, fallback)
      const results = await source.getSoldProperties()
      expect(results).toHaveLength(1)
    })

    test('falls back when primary getSoldProperties throws', async () => {
      const primary = createMockSource({
        getSoldProperties: mock(async () => { throw new Error('fail') }),
      })
      const fallback = createMockSource({
        getSoldProperties: mock(async () => [{ id: 'fb-2' }] as never),
      })
      const source = new FallbackDataSource(primary, fallback)
      const results = await source.getSoldProperties('test')
      expect(results).toHaveLength(1)
    })

    test('returns empty when neither source has getSoldProperties', async () => {
      const primary = createMockSource()
      const fallback = createMockSource()
      const source = new FallbackDataSource(primary, fallback)
      const results = await source.getSoldProperties()
      expect(results).toEqual([])
    })
  })
})
