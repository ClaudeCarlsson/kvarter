import { describe, expect, test } from 'bun:test'

import {
  getTtlForStrategy,
  STALE_WINDOW_LONG,
  STALE_WINDOW_SHORT,
  TTL_LONG,
  TTL_SHORT,
} from '../ttl'

describe('TTL constants', () => {
  test('TTL_SHORT is 5 minutes', () => {
    expect(TTL_SHORT).toBe(5 * 60)
  })

  test('TTL_LONG is 24 hours', () => {
    expect(TTL_LONG).toBe(24 * 60 * 60)
  })

  test('STALE_WINDOW_SHORT is 1 minute', () => {
    expect(STALE_WINDOW_SHORT).toBe(60)
  })

  test('STALE_WINDOW_LONG is 1 hour', () => {
    expect(STALE_WINDOW_LONG).toBe(60 * 60)
  })
})

describe('getTtlForStrategy', () => {
  test('returns short TTL and stale window for short strategy', () => {
    const result = getTtlForStrategy('short')
    expect(result.ttl).toBe(TTL_SHORT)
    expect(result.staleWindow).toBe(STALE_WINDOW_SHORT)
  })

  test('returns long TTL and stale window for long strategy', () => {
    const result = getTtlForStrategy('long')
    expect(result.ttl).toBe(TTL_LONG)
    expect(result.staleWindow).toBe(STALE_WINDOW_LONG)
  })

  test('returns zero TTL and stale window for none strategy', () => {
    const result = getTtlForStrategy('none')
    expect(result.ttl).toBe(0)
    expect(result.staleWindow).toBe(0)
  })
})
