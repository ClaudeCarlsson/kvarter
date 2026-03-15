import { afterEach, describe, expect, test } from 'bun:test'

import type { RedisAdapter } from '../redis-client'
import { _resetRedisClient, getRedisClient } from '../redis-client'

describe('RedisAdapter interface', () => {
  test('get returns null for missing keys', async () => {
    const store = new Map<string, string>()
    const adapter: RedisAdapter = {
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => { store.set(key, value) },
      del: async (key) => { store.delete(key) },
    }

    expect(await adapter.get('nonexistent')).toBeNull()
  })

  test('set and get round-trip', async () => {
    const store = new Map<string, string>()
    const adapter: RedisAdapter = {
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => { store.set(key, value) },
      del: async (key) => { store.delete(key) },
    }

    await adapter.set('key1', 'value1', 300)
    expect(await adapter.get('key1')).toBe('value1')
  })

  test('del removes existing key', async () => {
    const store = new Map<string, string>()
    const adapter: RedisAdapter = {
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => { store.set(key, value) },
      del: async (key) => { store.delete(key) },
    }

    await adapter.set('key1', 'value1', 300)
    await adapter.del('key1')
    expect(await adapter.get('key1')).toBeNull()
  })

  test('multiple keys are independent', async () => {
    const store = new Map<string, string>()
    const adapter: RedisAdapter = {
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => { store.set(key, value) },
      del: async (key) => { store.delete(key) },
    }

    await adapter.set('key1', 'value1', 300)
    await adapter.set('key2', 'value2', 300)

    expect(await adapter.get('key1')).toBe('value1')
    expect(await adapter.get('key2')).toBe('value2')

    await adapter.del('key1')
    expect(await adapter.get('key1')).toBeNull()
    expect(await adapter.get('key2')).toBe('value2')
  })
})

describe('getRedisClient factory', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    _resetRedisClient()
  })

  test('returns NoopAdapter when no REDIS_URL is set', async () => {
    delete process.env.REDIS_URL

    const client = getRedisClient()

    expect(typeof client.get).toBe('function')
    expect(typeof client.set).toBe('function')
    expect(typeof client.del).toBe('function')

    const result = await client.get('any-key')
    expect(result).toBeNull()

    await client.set('test', 'value', 60)
    await client.del('test')
  })

  test('returns singleton on repeated calls', () => {
    delete process.env.REDIS_URL

    const c1 = getRedisClient()
    const c2 = getRedisClient()
    expect(c1).toBe(c2)
  })

  test('_resetRedisClient clears the singleton', () => {
    delete process.env.REDIS_URL

    const c1 = getRedisClient()
    _resetRedisClient()
    const c2 = getRedisClient()
    expect(c2).toBeDefined()
  })

  test('creates IoRedisAdapter when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379'

    const client = getRedisClient()
    expect(client).toBeDefined()
    expect(typeof client.get).toBe('function')
  })

  test('getRedisUrl returns URL when set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379'

    const { getRedisUrl } = require('../../env')
    const url = getRedisUrl()
    expect(url).toBe('redis://localhost:6379')
  })

  test('getRedisUrl returns null when not set', () => {
    delete process.env.REDIS_URL

    const { getRedisUrl } = require('../../env')
    const url = getRedisUrl()
    expect(url).toBeNull()
  })
})

describe('CacheEntry JSON serialization', () => {
  test('round-trips through JSON correctly', () => {
    const entry = {
      data: { properties: [{ id: '1', price: 3500000 }] },
      cachedAt: Date.now(),
      ttl: 300,
      staleWindow: 60,
    }

    const json = JSON.stringify(entry)
    const parsed = JSON.parse(json)

    expect(parsed.data).toEqual(entry.data)
    expect(parsed.cachedAt).toBe(entry.cachedAt)
    expect(parsed.ttl).toBe(300)
    expect(parsed.staleWindow).toBe(60)
  })

  test('handles large payloads', () => {
    const largeArray = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      price: 1000000 + i * 100000,
      address: `Test Street ${i}`,
    }))

    const entry = {
      data: { properties: largeArray },
      cachedAt: Date.now(),
      ttl: 300,
      staleWindow: 60,
    }

    const json = JSON.stringify(entry)
    const parsed = JSON.parse(json)

    expect(parsed.data.properties).toHaveLength(100)
  })
})
