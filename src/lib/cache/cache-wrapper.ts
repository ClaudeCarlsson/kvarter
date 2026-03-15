import { isCacheEnabled } from '@/lib/env'

import { getRedisClient } from './redis-client'
import { getTtlForStrategy } from './ttl'
import type { CacheEntry, CacheOptions } from './types'

export async function withCache<T>(
  fn: () => Promise<T>,
  key: string,
  options: CacheOptions,
): Promise<T> {
  if (!isCacheEnabled() || options.strategy === 'none' || options.forceRefresh) {
    const data = await fn()
    if (options.strategy !== 'none' && isCacheEnabled()) {
      storeInCache(key, data, options).catch(() => {})
    }
    return data
  }

  const redis = getRedisClient()
  const { ttl, staleWindow } = getTtlForStrategy(options.strategy)

  try {
    const cached = await redis.get(key)
    if (cached) {
      const entry: CacheEntry<T> = JSON.parse(cached)
      const now = Date.now()
      const age = (now - entry.cachedAt) / 1000

      if (age < entry.ttl) {
        return entry.data
      }

      if (age < entry.ttl + entry.staleWindow) {
        // Stale-while-revalidate: return stale data, refresh in background
        fn()
          .then((freshData) => storeInCache(key, freshData, options))
          .catch(() => {})
        return entry.data
      }
    }
  } catch {
    // Redis failure — fall through to source
  }

  const data = await fn()
  storeInCache(key, data, options).catch(() => {})
  return data
}

async function storeInCache<T>(
  key: string,
  data: T,
  options: CacheOptions,
): Promise<void> {
  const redis = getRedisClient()
  const { ttl, staleWindow } = getTtlForStrategy(options.strategy)

  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    ttl,
    staleWindow,
  }

  await redis.set(key, JSON.stringify(entry), ttl + staleWindow)
}
