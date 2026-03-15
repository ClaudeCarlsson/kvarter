export class BooliApiError extends Error {
  code: string
  statusCode?: number
  isRetryable: boolean

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    isRetryable = false,
  ) {
    super(message)
    this.name = 'BooliApiError'
    this.code = code
    this.statusCode = statusCode
    this.isRetryable = isRetryable
  }
}

export function normalizeBooliError(error: unknown): BooliApiError {
  if (error instanceof BooliApiError) return error

  if (error instanceof Error) {
    const isNetwork =
      error.message.includes('fetch') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    const isTimeout = error.message.includes('timeout')

    if (isNetwork || isTimeout) {
      return new BooliApiError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        undefined,
        true,
      )
    }

    // graphql-request ClientError
    if ('response' in error) {
      const response = (error as { response: { status?: number; errors?: { message: string }[] } }).response
      const status = response?.status
      const gqlErrors = response?.errors
      const message = gqlErrors?.[0]?.message ?? error.message

      return new BooliApiError(
        message,
        'GRAPHQL_ERROR',
        status,
        status ? status >= 500 : false,
      )
    }

    return new BooliApiError(error.message, 'UNKNOWN_ERROR')
  }

  return new BooliApiError('An unknown error occurred', 'UNKNOWN_ERROR')
}
