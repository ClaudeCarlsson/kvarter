import { afterEach, describe, expect, test } from 'bun:test'

import { _resetDataSource, _setDataSource } from '@/lib/data-source'
import { MockDataSource } from '@/lib/data-source/mock-source'

import { searchLocations, searchProperties } from '../operations'

describe('searchLocations (via DataSource)', () => {
  afterEach(() => {
    _resetDataSource()
  })

  test('returns matching locations for "stock"', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchLocations('stock')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.name.toLowerCase().includes('stock'))).toBe(true)
  })

  test('returns matching locations for "soder"', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchLocations('söder')
    expect(results.length).toBeGreaterThan(0)
  })

  test('respects limit parameter', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchLocations('s', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  test('returns empty array for non-matching query', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchLocations('xyznonexistent')
    expect(results).toHaveLength(0)
  })

  test('case-insensitive search', async () => {
    _setDataSource(new MockDataSource())
    const lower = await searchLocations('stockholm')
    _resetDataSource()
    _setDataSource(new MockDataSource())
    const upper = await searchLocations('Stockholm')
    expect(lower.length).toBe(upper.length)
  })

  test('returns Location objects with correct shape', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchLocations('stockholm')
    for (const loc of results) {
      expect(typeof loc.id).toBe('string')
      expect(typeof loc.name).toBe('string')
      expect(typeof loc.type).toBe('string')
    }
  })

  test('uses default limit of 5', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchLocations('s')
    expect(results.length).toBeLessThanOrEqual(5)
  })
})

describe('searchProperties (via DataSource)', () => {
  afterEach(() => {
    _resetDataSource()
  })

  test('returns all properties with empty filters', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({})
    expect(results.totalCount).toBeGreaterThan(0)
    expect(results.properties.length).toBeGreaterThan(0)
  })

  test('filters by locationId', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({ locationId: 'loc-2' })
    for (const prop of results.properties) {
      expect(
        prop.area.toLowerCase() === 'södermalm' ||
        prop.municipality.toLowerCase() === 'södermalm',
      ).toBe(true)
    }
  })

  test('filters by query string', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({ query: 'Södermalm' })
    expect(results.totalCount).toBeGreaterThan(0)
    for (const prop of results.properties) {
      const matchesQuery =
        prop.address.toLowerCase().includes('södermalm') ||
        prop.area.toLowerCase().includes('södermalm') ||
        prop.municipality.toLowerCase().includes('södermalm')
      expect(matchesQuery).toBe(true)
    }
  })

  test('filters by price range', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({
      priceRange: { min: 3000000, max: 5000000 },
    })
    for (const prop of results.properties) {
      expect(prop.price).toBeGreaterThanOrEqual(3000000)
      expect(prop.price).toBeLessThanOrEqual(5000000)
    }
  })

  test('filters by rooms range', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({
      roomsRange: { min: 3, max: 4 },
    })
    for (const prop of results.properties) {
      expect(prop.rooms).toBeGreaterThanOrEqual(3)
      expect(prop.rooms).toBeLessThanOrEqual(4)
    }
  })

  test('filters by area range', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({
      areaRange: { min: 60, max: 100 },
    })
    for (const prop of results.properties) {
      expect(prop.livingArea).toBeGreaterThanOrEqual(60)
      expect(prop.livingArea).toBeLessThanOrEqual(100)
    }
  })

  test('filters by property type', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({
      propertyTypes: ['house'],
    })
    for (const prop of results.properties) {
      expect(prop.propertyType).toBe('house')
    }
  })

  test('filters by max monthly fee', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({
      maxMonthlyFee: 3000,
    })
    for (const prop of results.properties) {
      expect(prop.monthlyFee ?? 0).toBeLessThanOrEqual(3000)
    }
  })

  test('respects pagination', async () => {
    _setDataSource(new MockDataSource())
    const page1 = await searchProperties({}, { offset: 0, limit: 5 })
    _resetDataSource()
    _setDataSource(new MockDataSource())
    const page2 = await searchProperties({}, { offset: 5, limit: 5 })

    expect(page1.properties.length).toBeLessThanOrEqual(5)
    expect(page1.pagination.offset).toBe(0)
    expect(page1.pagination.limit).toBe(5)

    if (page1.totalCount > 5) {
      expect(page2.properties.length).toBeGreaterThan(0)
      expect(page1.properties[0].id).not.toBe(page2.properties[0].id)
    }
  })

  test('returns correct totalCount with filters', async () => {
    _setDataSource(new MockDataSource())
    const all = await searchProperties({})
    _resetDataSource()
    _setDataSource(new MockDataSource())
    const filtered = await searchProperties({
      propertyTypes: ['house'],
    })
    expect(filtered.totalCount).toBeLessThanOrEqual(all.totalCount)
  })

  test('combines multiple filters', async () => {
    _setDataSource(new MockDataSource())
    const results = await searchProperties({
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
    _setDataSource(new MockDataSource())
    const results = await searchProperties({})
    expect(typeof results.totalCount).toBe('number')
    expect(Array.isArray(results.properties)).toBe(true)
    expect(results.pagination).toBeDefined()
    expect(results.filters).toBeDefined()
  })
})
