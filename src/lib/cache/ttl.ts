import type { CacheStrategy } from './types'

export const TTL_SHORT = 5 * 60 // 5 minutes — active listings
export const TTL_LONG = 24 * 60 * 60 // 24 hours — location data

export const STALE_WINDOW_SHORT = 60 // 1 minute grace
export const STALE_WINDOW_LONG = 60 * 60 // 1 hour grace

export function getTtlForStrategy(strategy: CacheStrategy): {
  ttl: number
  staleWindow: number
} {
  switch (strategy) {
    case 'short':
      return { ttl: TTL_SHORT, staleWindow: STALE_WINDOW_SHORT }
    case 'long':
      return { ttl: TTL_LONG, staleWindow: STALE_WINDOW_LONG }
    case 'none':
      return { ttl: 0, staleWindow: 0 }
  }
}
