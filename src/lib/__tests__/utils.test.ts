import { describe, expect, test } from 'bun:test'

import { cn, formatPrice, formatPriceCompact } from '../utils'

describe('cn', () => {
  test('merges class names', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toContain('px-2')
    expect(result).toContain('py-1')
  })

  test('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', true && 'visible')
    expect(result).toContain('base')
    expect(result).toContain('visible')
    expect(result).not.toContain('hidden')
  })

  test('resolves Tailwind conflicts', () => {
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
    expect(result).not.toContain('px-2')
  })

  test('handles undefined and null inputs', () => {
    const result = cn('base', undefined, null)
    expect(result).toBe('base')
  })

  test('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })
})

describe('formatPrice', () => {
  test('formats price with Swedish number format', () => {
    // Swedish format uses spaces as thousands separator
    const result = formatPrice(2450000)
    expect(result).toContain('kr')
    // Should contain the number in some formatted way
    expect(result).toMatch(/2[\s\u00a0]450[\s\u00a0]000/)
  })

  test('formats small price', () => {
    const result = formatPrice(1000)
    expect(result).toContain('kr')
    expect(result).toMatch(/1[\s\u00a0]000/)
  })

  test('formats zero', () => {
    const result = formatPrice(0)
    expect(result).toContain('kr')
  })
})

describe('formatPriceCompact', () => {
  test('formats millions compactly', () => {
    const result = formatPriceCompact(3500000)
    expect(result).toBe('3.5M kr')
  })

  test('formats even millions without decimal', () => {
    const result = formatPriceCompact(4000000)
    expect(result).toBe('4M kr')
  })

  test('formats sub-million with full format', () => {
    const result = formatPriceCompact(500000)
    expect(result).toContain('kr')
    expect(result).toMatch(/500[\s\u00a0]000/)
  })

  test('formats exactly 1M', () => {
    const result = formatPriceCompact(1000000)
    expect(result).toBe('1M kr')
  })
})
