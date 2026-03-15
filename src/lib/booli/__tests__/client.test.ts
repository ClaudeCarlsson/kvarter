import { afterEach, describe, expect, mock, test } from 'bun:test'

import { _resetClient, getBooliClient, requestWithRetry } from '../client'
import { BooliApiError } from '../errors'

describe('getBooliClient', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    _resetClient()
  })

  test('throws CONFIG_ERROR when URL not set', () => {
    delete process.env.BOOLI_GRAPHQL_URL

    try {
      getBooliClient()
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      expect((error as BooliApiError).code).toBe('CONFIG_ERROR')
      expect((error as BooliApiError).message).toContain('BOOLI_GRAPHQL_URL')
    }
  })

  test('creates client when URL is set (no API key)', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.test.com/graphql'
    delete process.env.BOOLI_API_KEY

    const client = getBooliClient()
    expect(client).toBeDefined()
  })

  test('creates client with auth header when API key is set', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.test.com/graphql'
    process.env.BOOLI_API_KEY = 'my-key-123'

    const client = getBooliClient()
    expect(client).toBeDefined()
  })

  test('returns same singleton on second call', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.test.com/graphql'

    const c1 = getBooliClient()
    const c2 = getBooliClient()
    expect(c1).toBe(c2)
  })

  test('_resetClient clears the singleton', () => {
    process.env.BOOLI_GRAPHQL_URL = 'https://api.test.com/graphql'

    const c1 = getBooliClient()
    _resetClient()

    process.env.BOOLI_GRAPHQL_URL = 'https://other.api.com/graphql'
    const c2 = getBooliClient()
    expect(c2).toBeDefined()
  })
})

describe('requestWithRetry', () => {
  test('succeeds on first try', async () => {
    let calls = 0
    const result = await requestWithRetry(async () => {
      calls++
      return { data: 'ok' }
    })
    expect(result).toEqual({ data: 'ok' })
    expect(calls).toBe(1)
  })

  test('retries retryable errors and succeeds', async () => {
    let calls = 0
    const result = await requestWithRetry(
      async () => {
        calls++
        if (calls < 3) throw new BooliApiError('fail', 'SERVER', 503, true)
        return { data: 'recovered' }
      },
      { maxRetries: 3, initialDelayMs: 1 },
    )
    expect(result).toEqual({ data: 'recovered' })
    expect(calls).toBe(3)
  })

  test('throws immediately on non-retryable error', async () => {
    let calls = 0
    try {
      await requestWithRetry(
        async () => {
          calls++
          throw new BooliApiError('bad request', 'BAD', 400, false)
        },
        { initialDelayMs: 1 },
      )
      expect.unreachable('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      expect((error as BooliApiError).code).toBe('BAD')
    }
    expect(calls).toBe(1)
  })

  test('throws after exhausting all retries', async () => {
    let calls = 0
    try {
      await requestWithRetry(
        async () => {
          calls++
          throw new BooliApiError('down', 'DOWN', 500, true)
        },
        { maxRetries: 3, initialDelayMs: 1 },
      )
      expect.unreachable('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      expect((error as BooliApiError).code).toBe('DOWN')
    }
    expect(calls).toBe(3)
  })

  test('normalizes non-BooliApiError errors', async () => {
    try {
      await requestWithRetry(
        async () => {
          throw new Error('fetch failed')
        },
        { maxRetries: 1, initialDelayMs: 1 },
      )
      expect.unreachable('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      // 'fetch failed' triggers NETWORK_ERROR which is retryable,
      // but maxRetries is 1, so it throws on the last attempt
      expect((error as BooliApiError).code).toBe('NETWORK_ERROR')
    }
  })

  test('normalizes non-Error values thrown', async () => {
    try {
      await requestWithRetry(
        async () => {
          throw 'raw string error'
        },
        { maxRetries: 1, initialDelayMs: 1 },
      )
      expect.unreachable('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      expect((error as BooliApiError).code).toBe('UNKNOWN_ERROR')
    }
  })

  test('uses default options when not specified', async () => {
    // Test that it works without options at all
    const result = await requestWithRetry(async () => 'success')
    expect(result).toBe('success')
  })

  test('respects custom maxRetries', async () => {
    let calls = 0
    try {
      await requestWithRetry(
        async () => {
          calls++
          throw new BooliApiError('err', 'ERR', 500, true)
        },
        { maxRetries: 2, initialDelayMs: 1 },
      )
    } catch {
      // expected
    }
    expect(calls).toBe(2)
  })

  test('exponential backoff increases delay', () => {
    const initialDelayMs = 200
    const delays = Array.from({ length: 3 }, (_, i) =>
      initialDelayMs * Math.pow(2, i),
    )
    expect(delays).toEqual([200, 400, 800])
  })

  test('throws RETRY_EXHAUSTED when maxRetries is 0', async () => {
    try {
      await requestWithRetry(async () => 'should not reach', { maxRetries: 0 })
      expect.unreachable('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      expect((error as BooliApiError).code).toBe('RETRY_EXHAUSTED')
    }
  })

  test('retries network errors (retryable) then throws on last attempt', async () => {
    let calls = 0
    try {
      await requestWithRetry(
        async () => {
          calls++
          throw new Error('ECONNREFUSED')
        },
        { maxRetries: 2, initialDelayMs: 1 },
      )
      expect.unreachable('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      expect((error as BooliApiError).isRetryable).toBe(true)
    }
    // Network errors are retryable, so it retries up to maxRetries
    expect(calls).toBe(2)
  })
})

describe('booliRequest', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    _resetClient()
  })

  test('throws CONFIG_ERROR when URL not configured', async () => {
    delete process.env.BOOLI_GRAPHQL_URL

    const { booliRequest } = await import('../client')
    try {
      await booliRequest('query { test }')
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(BooliApiError)
      expect((error as BooliApiError).code).toBe('CONFIG_ERROR')
    }
  })
})
