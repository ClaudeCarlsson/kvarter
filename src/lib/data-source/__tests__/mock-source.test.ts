import { describe, expect, test } from 'bun:test'

import { MOCK_LOCATIONS, MOCK_PROPERTIES } from '../../booli/mock-data'
import { MockDataSource } from '../mock-source'

describe('MockDataSource', () => {
  const source = new MockDataSource()

  describe('searchLocations', () => {
    test('returns matching locations for "stock"', async () => {
      const results = await source.searchLocations('stock')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.name.toLowerCase().includes('stock'))).toBe(true)
    })

    test('matches on parentName', async () => {
      // Södermalm has parentName "Stockholm"
      const results = await source.searchLocations('stockholm')
      const names = results.map((r) => r.name)
      // Should include districts with parentName Stockholm
      expect(names.length).toBeGreaterThan(1)
    })

    test('respects limit parameter', async () => {
      const results = await source.searchLocations('s', 2)
      expect(results.length).toBeLessThanOrEqual(2)
    })

    test('uses default limit of 5', async () => {
      const results = await source.searchLocations('s')
      expect(results.length).toBeLessThanOrEqual(5)
    })

    test('returns empty array for non-matching query', async () => {
      const results = await source.searchLocations('xyznonexistent')
      expect(results).toHaveLength(0)
    })

    test('case-insensitive search', async () => {
      const lower = await source.searchLocations('stockholm')
      const upper = await source.searchLocations('Stockholm')
      expect(lower.length).toBe(upper.length)
    })

    test('returns Location objects with correct shape', async () => {
      const results = await source.searchLocations('stockholm')
      for (const loc of results) {
        expect(typeof loc.id).toBe('string')
        expect(typeof loc.name).toBe('string')
        expect(typeof loc.type).toBe('string')
      }
    })

    test('handles location with no parentName', async () => {
      // Stockholm itself has no parentName
      const results = await source.searchLocations('malmö')
      expect(results.length).toBeGreaterThan(0)
      const malmo = results.find((r) => r.name === 'Malmö')
      expect(malmo).toBeDefined()
      expect(malmo!.parentName).toBeUndefined()
    })
  })

  describe('searchProperties', () => {
    test('returns all properties with empty filters', async () => {
      const results = await source.searchProperties({})
      expect(results.totalCount).toBeGreaterThan(0)
      expect(results.properties.length).toBeGreaterThan(0)
    })

    test('uses default pagination when not provided', async () => {
      const results = await source.searchProperties({})
      expect(results.pagination.offset).toBe(0)
      expect(results.pagination.limit).toBe(20)
    })

    test('filters by locationId', async () => {
      const results = await source.searchProperties({ locationId: 'loc-2' })
      for (const prop of results.properties) {
        expect(
          prop.area.toLowerCase() === 'södermalm' ||
          prop.municipality.toLowerCase() === 'södermalm',
        ).toBe(true)
      }
    })

    test('filters by locationId with no matching location returns all', async () => {
      const results = await source.searchProperties({ locationId: 'loc-nonexistent' })
      // locationId doesn't match any location, so no location filter is applied
      // but since the location lookup fails, results should be all properties
      expect(results.totalCount).toBe(MOCK_PROPERTIES.length)
    })

    test('filters by query string', async () => {
      const results = await source.searchProperties({ query: 'Södermalm' })
      expect(results.totalCount).toBeGreaterThan(0)
      for (const prop of results.properties) {
        const matchesQuery =
          prop.address.toLowerCase().includes('södermalm') ||
          prop.area.toLowerCase().includes('södermalm') ||
          prop.municipality.toLowerCase().includes('södermalm')
        expect(matchesQuery).toBe(true)
      }
    })

    test('filters by price range min only', async () => {
      const results = await source.searchProperties({
        priceRange: { min: 8000000 },
      })
      for (const prop of results.properties) {
        expect(prop.price).toBeGreaterThanOrEqual(8000000)
      }
    })

    test('filters by price range max only', async () => {
      const results = await source.searchProperties({
        priceRange: { max: 3000000 },
      })
      for (const prop of results.properties) {
        expect(prop.price).toBeLessThanOrEqual(3000000)
      }
    })

    test('filters by price range min and max', async () => {
      const results = await source.searchProperties({
        priceRange: { min: 3000000, max: 5000000 },
      })
      for (const prop of results.properties) {
        expect(prop.price).toBeGreaterThanOrEqual(3000000)
        expect(prop.price).toBeLessThanOrEqual(5000000)
      }
    })

    test('filters by rooms range min only', async () => {
      const results = await source.searchProperties({
        roomsRange: { min: 4 },
      })
      for (const prop of results.properties) {
        expect(prop.rooms).toBeGreaterThanOrEqual(4)
      }
    })

    test('filters by rooms range max only', async () => {
      const results = await source.searchProperties({
        roomsRange: { max: 2 },
      })
      for (const prop of results.properties) {
        expect(prop.rooms).toBeLessThanOrEqual(2)
      }
    })

    test('filters by rooms range min and max', async () => {
      const results = await source.searchProperties({
        roomsRange: { min: 3, max: 4 },
      })
      for (const prop of results.properties) {
        expect(prop.rooms).toBeGreaterThanOrEqual(3)
        expect(prop.rooms).toBeLessThanOrEqual(4)
      }
    })

    test('filters by area range min only', async () => {
      const results = await source.searchProperties({
        areaRange: { min: 100 },
      })
      for (const prop of results.properties) {
        expect(prop.livingArea).toBeGreaterThanOrEqual(100)
      }
    })

    test('filters by area range max only', async () => {
      const results = await source.searchProperties({
        areaRange: { max: 50 },
      })
      for (const prop of results.properties) {
        expect(prop.livingArea).toBeLessThanOrEqual(50)
      }
    })

    test('filters by area range min and max', async () => {
      const results = await source.searchProperties({
        areaRange: { min: 60, max: 100 },
      })
      for (const prop of results.properties) {
        expect(prop.livingArea).toBeGreaterThanOrEqual(60)
        expect(prop.livingArea).toBeLessThanOrEqual(100)
      }
    })

    test('filters by property type', async () => {
      const results = await source.searchProperties({
        propertyTypes: ['house'],
      })
      for (const prop of results.properties) {
        expect(prop.propertyType).toBe('house')
      }
    })

    test('filters by multiple property types', async () => {
      const results = await source.searchProperties({
        propertyTypes: ['house', 'townhouse'],
      })
      for (const prop of results.properties) {
        expect(['house', 'townhouse']).toContain(prop.propertyType)
      }
    })

    test('empty propertyTypes array does not filter', async () => {
      const all = await source.searchProperties({})
      const withEmpty = await source.searchProperties({ propertyTypes: [] })
      expect(all.totalCount).toBe(withEmpty.totalCount)
    })

    test('filters by max monthly fee', async () => {
      const results = await source.searchProperties({
        maxMonthlyFee: 3000,
      })
      for (const prop of results.properties) {
        expect(prop.monthlyFee ?? 0).toBeLessThanOrEqual(3000)
      }
    })

    test('respects pagination', async () => {
      const page1 = await source.searchProperties({}, { offset: 0, limit: 5 })
      const page2 = await source.searchProperties({}, { offset: 5, limit: 5 })

      expect(page1.properties.length).toBeLessThanOrEqual(5)
      expect(page1.pagination.offset).toBe(0)
      expect(page1.pagination.limit).toBe(5)

      if (page1.totalCount > 5) {
        expect(page2.properties.length).toBeGreaterThan(0)
        expect(page1.properties[0].id).not.toBe(page2.properties[0].id)
      }
    })

    test('totalCount reflects pre-pagination count', async () => {
      const all = await source.searchProperties({})
      const paged = await source.searchProperties({}, { offset: 0, limit: 2 })
      expect(paged.totalCount).toBe(all.totalCount)
      expect(paged.properties.length).toBe(2)
    })

    test('combines multiple filters', async () => {
      const results = await source.searchProperties({
        priceRange: { min: 2000000, max: 6000000 },
        roomsRange: { min: 2 },
        propertyTypes: ['apartment'],
      })
      for (const prop of results.properties) {
        expect(prop.price).toBeGreaterThanOrEqual(2000000)
        expect(prop.price).toBeLessThanOrEqual(6000000)
        expect(prop.rooms).toBeGreaterThanOrEqual(2)
        expect(prop.propertyType).toBe('apartment')
      }
    })

    test('returns SearchResults with correct shape', async () => {
      const results = await source.searchProperties({})
      expect(typeof results.totalCount).toBe('number')
      expect(Array.isArray(results.properties)).toBe(true)
      expect(results.pagination).toBeDefined()
      expect(results.filters).toBeDefined()
    })

    test('returns correct filters in result', async () => {
      const filters = { query: 'test', priceRange: { min: 1000 } }
      const results = await source.searchProperties(filters)
      expect(results.filters).toEqual(filters)
    })
  })
})
