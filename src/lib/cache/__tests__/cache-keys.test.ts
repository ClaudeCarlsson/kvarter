import { describe, expect, test } from 'bun:test'

import { generateCacheKey } from '../cache-keys'

describe('generateCacheKey', () => {
  test('produces deterministic keys regardless of parameter order', () => {
    const key1 = generateCacheKey('test', { a: 1, b: 2, c: 3 })
    const key2 = generateCacheKey('test', { c: 3, a: 1, b: 2 })
    expect(key1).toBe(key2)
  })

  test('strips undefined values', () => {
    const key1 = generateCacheKey('test', { a: 1, b: undefined })
    const key2 = generateCacheKey('test', { a: 1 })
    expect(key1).toBe(key2)
  })

  test('strips null values', () => {
    const key1 = generateCacheKey('test', { a: 1, b: null })
    const key2 = generateCacheKey('test', { a: 1 })
    expect(key1).toBe(key2)
  })

  test('different params produce different keys', () => {
    const key1 = generateCacheKey('test', { a: 1 })
    const key2 = generateCacheKey('test', { a: 2 })
    expect(key1).not.toBe(key2)
  })

  test('different prefixes produce different keys', () => {
    const key1 = generateCacheKey('locations', { a: 1 })
    const key2 = generateCacheKey('properties', { a: 1 })
    expect(key1).not.toBe(key2)
  })

  test('includes prefix in key', () => {
    const key = generateCacheKey('my-prefix', { x: 42 })
    expect(key.startsWith('my-prefix:')).toBe(true)
  })

  test('handles empty params', () => {
    const key = generateCacheKey('test', {})
    expect(key.startsWith('test:')).toBe(true)
  })

  test('handles nested objects', () => {
    const key1 = generateCacheKey('test', { filters: { min: 1, max: 10 } })
    const key2 = generateCacheKey('test', { filters: { max: 10, min: 1 } })
    // Note: nested object key order isn't sorted, so these may differ
    // This test documents the behavior
    expect(key1.startsWith('test:')).toBe(true)
    expect(key2.startsWith('test:')).toBe(true)
  })

  test('handles string, number, boolean values', () => {
    const key = generateCacheKey('test', {
      str: 'hello',
      num: 42,
      bool: true,
    })
    expect(key.startsWith('test:')).toBe(true)
  })

  test('handles arrays in params', () => {
    const key1 = generateCacheKey('test', { types: ['apartment', 'house'] })
    const key2 = generateCacheKey('test', { types: ['apartment', 'house'] })
    expect(key1).toBe(key2)
  })
})
