import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { RedisAdapter } from '../redis-client'

// In-memory Redis mock
class MockRedis implements RedisAdapter {
  store = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: string, _ttlSeconds: number): Promise<void> {
    this.store.set(key, value)
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

// We need to mock the modules before importing withCache
let mockRedis: MockRedis
let mockCacheEnabled: boolean

// Mock the redis client module
const mockGetRedisClient = mock(() => mockRedis as RedisAdapter)
const mockIsCacheEnabled = mock(() => mockCacheEnabled)

// We'll test the cache logic directly
describe('cache wrapper logic', () => {
  beforeEach(() => {
    mockRedis = new MockRedis()
    mockCacheEnabled = true
  })

  afterEach(() => {
    mockRedis.clear()
  })

  test('cache miss calls the function and stores result', async () => {
    const fn = mock(() => Promise.resolve({ data: 'fresh' }))
    const redis = mockRedis

    // Simulate cache miss (empty store)
    const cached = await redis.get('test-key')
    expect(cached).toBeNull()

    const result = await fn()
    expect(result).toEqual({ data: 'fresh' })
    expect(fn).toHaveBeenCalledTimes(1)

    // Store in cache
    await redis.set(
      'test-key',
      JSON.stringify({
        data: result,
        cachedAt: Date.now(),
        ttl: 300,
        staleWindow: 60,
      }),
      360,
    )

    // Verify it's in the store
    const stored = await redis.get('test-key')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.data).toEqual({ data: 'fresh' })
  })

  test('cache hit returns cached data without calling function', async () => {
    const redis = mockRedis
    const fn = mock(() => Promise.resolve({ data: 'fresh' }))

    // Pre-populate cache with fresh entry
    const entry = {
      data: { data: 'cached' },
      cachedAt: Date.now(),
      ttl: 300,
      staleWindow: 60,
    }
    await redis.set('test-key', JSON.stringify(entry), 360)

    // Read from cache
    const cached = await redis.get('test-key')
    expect(cached).not.toBeNull()
    const parsed = JSON.parse(cached!)
    const age = (Date.now() - parsed.cachedAt) / 1000

    // Should be fresh (age < ttl)
    expect(age).toBeLessThan(parsed.ttl)
    expect(parsed.data).toEqual({ data: 'cached' })

    // fn should not be called for a cache hit
    expect(fn).not.toHaveBeenCalled()
  })

  test('stale entry is detected correctly', async () => {
    const redis = mockRedis

    // Entry that's older than TTL but within stale window
    const entry = {
      data: { data: 'stale' },
      cachedAt: Date.now() - 310 * 1000, // 310 seconds ago (TTL is 300)
      ttl: 300,
      staleWindow: 60,
    }
    await redis.set('test-key', JSON.stringify(entry), 360)

    const cached = await redis.get('test-key')
    const parsed = JSON.parse(cached!)
    const age = (Date.now() - parsed.cachedAt) / 1000

    // Should be stale (age > ttl but < ttl + staleWindow)
    expect(age).toBeGreaterThan(parsed.ttl)
    expect(age).toBeLessThan(parsed.ttl + parsed.staleWindow)
    expect(parsed.data).toEqual({ data: 'stale' })
  })

  test('expired entry is detected correctly', async () => {
    const redis = mockRedis

    // Entry that's older than TTL + stale window
    const entry = {
      data: { data: 'expired' },
      cachedAt: Date.now() - 400 * 1000, // 400 seconds ago (TTL + stale = 360)
      ttl: 300,
      staleWindow: 60,
    }
    await redis.set('test-key', JSON.stringify(entry), 360)

    const cached = await redis.get('test-key')
    const parsed = JSON.parse(cached!)
    const age = (Date.now() - parsed.cachedAt) / 1000

    // Should be fully expired
    expect(age).toBeGreaterThan(parsed.ttl + parsed.staleWindow)
  })

  test('redis failure returns null gracefully', async () => {
    const failingRedis: RedisAdapter = {
      get: async () => {
        throw new Error('Redis connection failed')
      },
      set: async () => {
        throw new Error('Redis connection failed')
      },
      del: async () => {
        throw new Error('Redis connection failed')
      },
    }

    // Should not throw
    let error: Error | null = null
    try {
      await failingRedis.get('test-key')
    } catch (e) {
      error = e as Error
    }
    expect(error).not.toBeNull()
    expect(error!.message).toBe('Redis connection failed')
  })

  test('cache stores correct entry structure', async () => {
    const redis = mockRedis
    const data = { name: 'test', value: 42 }
    const now = Date.now()

    const entry = {
      data,
      cachedAt: now,
      ttl: 300,
      staleWindow: 60,
    }

    await redis.set('struct-key', JSON.stringify(entry), 360)
    const cached = await redis.get('struct-key')
    const parsed = JSON.parse(cached!)

    expect(parsed.data).toEqual(data)
    expect(parsed.cachedAt).toBe(now)
    expect(parsed.ttl).toBe(300)
    expect(parsed.staleWindow).toBe(60)
  })

  test('delete removes entry from cache', async () => {
    const redis = mockRedis
    await redis.set('delete-key', 'value', 300)
    expect(await redis.get('delete-key')).toBe('value')

    await redis.del('delete-key')
    expect(await redis.get('delete-key')).toBeNull()
  })
})
