export function getBooliUrl(): string {
  const url = process.env.BOOLI_GRAPHQL_URL
  if (!url) {
    throw new Error('BOOLI_GRAPHQL_URL is not configured')
  }
  return url
}

export function getBooliApiKey(): string | null {
  return process.env.BOOLI_API_KEY || null
}

export function isCacheEnabled(): boolean {
  return process.env.CACHE_ENABLED !== 'false'
}

export function getRedisUrl(): string | null {
  return process.env.REDIS_URL || null
}

export type DataSourceType = 'booli-graphql' | 'scraper' | 'hemnet' | 'playwright' | 'mock'

export function getDataSourceType(): DataSourceType {
  const value = process.env.DATA_SOURCE
  if (value === 'scraper') return 'scraper'
  if (value === 'hemnet') return 'hemnet'
  if (value === 'playwright') return 'playwright'
  if (value === 'mock') return 'mock'
  return 'booli-graphql'
}
