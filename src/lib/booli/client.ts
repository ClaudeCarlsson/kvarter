import { GraphQLClient } from 'graphql-request'

import { getBooliApiKey, getBooliUrl } from '@/lib/env'

import { BooliApiError, normalizeBooliError } from './errors'

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 200
const TIMEOUT_MS = 10_000

let clientInstance: GraphQLClient | null = null

/** @internal Reset singleton for testing */
export function _resetClient() {
  clientInstance = null
}

export function getBooliClient(): GraphQLClient {
  if (clientInstance) return clientInstance

  let url: string
  try {
    url = getBooliUrl()
  } catch {
    throw new BooliApiError(
      'BOOLI_GRAPHQL_URL is not configured',
      'CONFIG_ERROR',
    )
  }

  const headers: Record<string, string> = {}
  const apiKey = getBooliApiKey()
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  clientInstance = new GraphQLClient(url, {
    headers,
  })

  return clientInstance
}

/**
 * Executes a request function with exponential backoff retry logic.
 * Extracted as a pure function for testability -- no singleton or external dependency.
 */
export async function requestWithRetry<T>(
  requestFn: () => Promise<T>,
  options: { maxRetries?: number; initialDelayMs?: number } = {},
): Promise<T> {
  const { maxRetries = MAX_RETRIES, initialDelayMs = INITIAL_DELAY_MS } = options
  return attemptRequest(requestFn, maxRetries, initialDelayMs, 0)
}

async function attemptRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number,
  initialDelayMs: number,
  attempt: number,
): Promise<T> {
  if (attempt >= maxRetries) throw new BooliApiError('Max retries exhausted', 'RETRY_EXHAUSTED')
  try {
    return await requestFn()
  } catch (error) {
    const normalized = normalizeBooliError(error)
    if (!normalized.isRetryable || attempt >= maxRetries - 1) throw normalized
    await new Promise((r) => setTimeout(r, initialDelayMs * Math.pow(2, attempt)))
    return attemptRequest(requestFn, maxRetries, initialDelayMs, attempt + 1)
  }
}

export async function booliRequest<T>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const client = getBooliClient()

  return requestWithRetry(() =>
    client.request<T>({ document, variables, signal: AbortSignal.timeout(TIMEOUT_MS) }),
  )
}
