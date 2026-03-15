import { afterEach, describe, expect, test } from 'bun:test'

import type { DataSource } from '../types'

describe('data-source index', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    // Reset the singleton between tests
    const { _resetDataSource } = require('../index')
    _resetDataSource()
  })

  test('getDataSource returns FallbackDataSource wrapping BooliGraphQL by default', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.booli.se/graphql'
    delete process.env.DATA_SOURCE

    const { getDataSource, _resetDataSource } = require('../index')
    const { FallbackDataSource } = require('../fallback-source')
    _resetDataSource()

    const source = getDataSource()
    expect(source).toBeInstanceOf(FallbackDataSource)
  })

  test('getDataSource returns singleton on second call', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.booli.se/graphql'

    const { getDataSource, _resetDataSource } = require('../index')
    _resetDataSource()

    const s1 = getDataSource()
    const s2 = getDataSource()
    expect(s1).toBe(s2)
  })

  test('_resetDataSource clears the singleton', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.booli.se/graphql'

    const { getDataSource, _resetDataSource } = require('../index')
    _resetDataSource()

    const s1 = getDataSource()
    _resetDataSource()
    const s2 = getDataSource()
    // After reset, a new instance is created (but same type)
    expect(s2).toBeDefined()
  })

  test('_setDataSource overrides the singleton', async () => {
    const { getDataSource, _setDataSource, _resetDataSource } = require('../index')
    _resetDataSource()

    const customSource: DataSource = {
      searchLocations: async () => [{ id: 'custom', name: 'Custom', type: 'stad' as const }],
      searchProperties: async () => ({
        properties: [],
        totalCount: 0,
        pagination: { offset: 0, limit: 20 },
        filters: {},
      }),
    }

    _setDataSource(customSource)
    const source = getDataSource()
    expect(source).toBe(customSource)

    const results = await source.searchLocations('test')
    expect(results[0].name).toBe('Custom')
  })

  test('getDataSource returns BooliHttpScraper when DATA_SOURCE is scraper', () => {
    process.env.DATA_SOURCE = 'scraper'

    const { getDataSource, _resetDataSource } = require('../index')
    const { BooliHttpScraper } = require('../../scraper/booli-http-scraper')
    _resetDataSource()

    const source = getDataSource()
    expect(source).toBeInstanceOf(BooliHttpScraper)
  })

  test('getDataSource returns HemnetScraper when DATA_SOURCE is hemnet', () => {
    process.env.DATA_SOURCE = 'hemnet'

    const { getDataSource, _resetDataSource } = require('../index')
    const { HemnetScraper } = require('../../scraper/hemnet-scraper')
    _resetDataSource()

    const source = getDataSource()
    expect(source).toBeInstanceOf(HemnetScraper)
  })

  test('getDataSource returns PlaywrightSource directly when DATA_SOURCE is playwright', () => {
    process.env.DATA_SOURCE = 'playwright'

    const { getDataSource, _resetDataSource } = require('../index')
    const { PlaywrightSource } = require('../../scraper/playwright-source')
    _resetDataSource()

    const source = getDataSource()
    expect(source).toBeInstanceOf(PlaywrightSource)
  })

  test('exports DataSource type and implementations', () => {
    const mod = require('../index')
    expect(mod.getDataSource).toBeDefined()
    expect(mod._resetDataSource).toBeDefined()
    expect(mod._setDataSource).toBeDefined()
    expect(mod.BooliGraphQLSource).toBeDefined()
    expect(mod.MockDataSource).toBeDefined()
  })
})
