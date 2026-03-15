import { describe, expect, test } from 'bun:test'

import { BooliApiError, normalizeBooliError } from '../errors'

describe('BooliApiError', () => {
  test('creates error with all fields', () => {
    const error = new BooliApiError('Test error', 'TEST_CODE', 500, true)

    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.statusCode).toBe(500)
    expect(error.isRetryable).toBe(true)
    expect(error.name).toBe('BooliApiError')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(BooliApiError)
  })

  test('defaults isRetryable to false', () => {
    const error = new BooliApiError('Test', 'CODE')
    expect(error.isRetryable).toBe(false)
    expect(error.statusCode).toBeUndefined()
  })
})

describe('normalizeBooliError', () => {
  test('returns BooliApiError as-is', () => {
    const original = new BooliApiError('Original', 'ORIG', 400)
    const normalized = normalizeBooliError(original)

    expect(normalized).toBe(original)
  })

  test('normalizes network errors as retryable', () => {
    const error = new Error('fetch failed')
    const normalized = normalizeBooliError(error)

    expect(normalized.code).toBe('NETWORK_ERROR')
    expect(normalized.isRetryable).toBe(true)
    expect(normalized.message).toContain('fetch failed')
  })

  test('normalizes ECONNREFUSED as retryable', () => {
    const error = new Error('ECONNREFUSED')
    const normalized = normalizeBooliError(error)

    expect(normalized.code).toBe('NETWORK_ERROR')
    expect(normalized.isRetryable).toBe(true)
  })

  test('normalizes ETIMEDOUT as retryable', () => {
    const error = new Error('ETIMEDOUT')
    const normalized = normalizeBooliError(error)

    expect(normalized.code).toBe('NETWORK_ERROR')
    expect(normalized.isRetryable).toBe(true)
  })

  test('normalizes timeout errors as retryable', () => {
    const error = new Error('Request timeout exceeded')
    const normalized = normalizeBooliError(error)

    expect(normalized.code).toBe('NETWORK_ERROR')
    expect(normalized.isRetryable).toBe(true)
  })

  test('normalizes GraphQL client errors', () => {
    const error = Object.assign(new Error('GraphQL error'), {
      response: {
        status: 400,
        errors: [{ message: 'Invalid query' }],
      },
    })

    const normalized = normalizeBooliError(error)

    expect(normalized.code).toBe('GRAPHQL_ERROR')
    expect(normalized.statusCode).toBe(400)
    expect(normalized.message).toBe('Invalid query')
    expect(normalized.isRetryable).toBe(false)
  })

  test('normalizes 5xx GraphQL errors as retryable', () => {
    const error = Object.assign(new Error('Server error'), {
      response: {
        status: 503,
        errors: [{ message: 'Service unavailable' }],
      },
    })

    const normalized = normalizeBooliError(error)

    expect(normalized.statusCode).toBe(503)
    expect(normalized.isRetryable).toBe(true)
  })

  test('normalizes GraphQL error without error messages', () => {
    const error = Object.assign(new Error('Some error'), {
      response: {
        status: 422,
      },
    })

    const normalized = normalizeBooliError(error)

    expect(normalized.code).toBe('GRAPHQL_ERROR')
    expect(normalized.message).toBe('Some error')
  })

  test('normalizes generic Error', () => {
    const error = new Error('Something broke')
    const normalized = normalizeBooliError(error)

    expect(normalized.code).toBe('UNKNOWN_ERROR')
    expect(normalized.message).toBe('Something broke')
    expect(normalized.isRetryable).toBe(false)
  })

  test('normalizes non-Error values', () => {
    const normalized = normalizeBooliError('string error')

    expect(normalized.code).toBe('UNKNOWN_ERROR')
    expect(normalized.message).toBe('An unknown error occurred')
  })

  test('normalizes null', () => {
    const normalized = normalizeBooliError(null)

    expect(normalized.code).toBe('UNKNOWN_ERROR')
    expect(normalized).toBeInstanceOf(BooliApiError)
  })

  test('normalizes undefined', () => {
    const normalized = normalizeBooliError(undefined)

    expect(normalized.code).toBe('UNKNOWN_ERROR')
    expect(normalized).toBeInstanceOf(BooliApiError)
  })
})
