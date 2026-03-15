export type CacheStrategy = 'short' | 'long' | 'none'

export type CacheEntry<T> = {
  data: T
  cachedAt: number
  ttl: number
  staleWindow: number
}

export type CacheOptions = {
  strategy: CacheStrategy
  forceRefresh?: boolean
  keyPrefix?: string
}
