import { afterEach, describe, expect, test } from 'bun:test'

import { getBooliApiKey, getBooliUrl, getDataSourceType, getRedisUrl, isCacheEnabled } from '../env'

describe('getBooliUrl', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('returns URL when set', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.booli.se/graphql'
    expect(getBooliUrl()).toBe('https://api.booli.se/graphql')
  })

  test('throws when not set', () => {
    delete process.env.BOOLI_GRAPHQL_URL
    expect(() => getBooliUrl()).toThrow('BOOLI_GRAPHQL_URL is not configured')
  })

  test('throws for empty string', () => {
    process.env.BOOLI_GRAPHQL_URL = ''
    expect(() => getBooliUrl()).toThrow('BOOLI_GRAPHQL_URL is not configured')
  })
})

describe('getBooliApiKey', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('returns key when set', () => {
    process.env.BOOLI_API_KEY = 'test-key-123'
    expect(getBooliApiKey()).toBe('test-key-123')
  })

  test('returns null when not set', () => {
    delete process.env.BOOLI_API_KEY
    expect(getBooliApiKey()).toBeNull()
  })
})

describe('isCacheEnabled', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('returns true by default', () => {
    delete process.env.CACHE_ENABLED
    expect(isCacheEnabled()).toBe(true)
  })

  test('returns true when set to "true"', () => {
    process.env.CACHE_ENABLED = 'true'
    expect(isCacheEnabled()).toBe(true)
  })

  test('returns false when set to "false"', () => {
    process.env.CACHE_ENABLED = 'false'
    expect(isCacheEnabled()).toBe(false)
  })
})

describe('getRedisUrl', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('returns URL when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    expect(getRedisUrl()).toBe('redis://localhost:6379')
  })

  test('returns null when REDIS_URL is not set', () => {
    delete process.env.REDIS_URL
    expect(getRedisUrl()).toBeNull()
  })

  test('returns null for empty string', () => {
    process.env.REDIS_URL = ''
    expect(getRedisUrl()).toBeNull()
  })
})

describe('getDataSourceType', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('returns booli-graphql by default', () => {
    delete process.env.DATA_SOURCE
    expect(getDataSourceType()).toBe('booli-graphql')
  })

  test('returns booli-graphql when set explicitly', () => {
    process.env.DATA_SOURCE = 'booli-graphql'
    expect(getDataSourceType()).toBe('booli-graphql')
  })

  test('returns scraper when set to scraper', () => {
    process.env.DATA_SOURCE = 'scraper'
    expect(getDataSourceType()).toBe('scraper')
  })

  test('returns booli-graphql for unknown values', () => {
    process.env.DATA_SOURCE = 'something-else'
    expect(getDataSourceType()).toBe('booli-graphql')
  })

  test('returns booli-graphql for empty string', () => {
    process.env.DATA_SOURCE = ''
    expect(getDataSourceType()).toBe('booli-graphql')
  })
})
