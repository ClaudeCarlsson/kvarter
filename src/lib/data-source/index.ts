import { booliRequest } from '../booli/client'
import { getDataSourceType } from '../env'
import { BooliHttpScraper } from '../scraper/booli-http-scraper'
import { HemnetScraper } from '../scraper/hemnet-scraper'
import { PlaywrightSource } from '../scraper/playwright-source'

import { BooliGraphQLSource } from './booli-source'
import { FallbackDataSource } from './fallback-source'
import { MockDataSource } from './mock-source'
import type { DataSource } from './types'

let instance: DataSource | null = null

export function getDataSource(): DataSource {
  if (instance) return instance

  const sourceType = getDataSourceType()

  switch (sourceType) {
    case 'scraper':
      instance = new BooliHttpScraper()
      break
    case 'hemnet':
      instance = new HemnetScraper()
      break
    case 'playwright':
      // Playwright scraper sidecar (Docker) with mock fallback
      instance = new FallbackDataSource(
        new PlaywrightSource(),
        new MockDataSource(),
      )
      break
    case 'mock':
      instance = new MockDataSource()
      break
    default:
      // GraphQL with playwright fallback, with mock as last resort
      instance = new FallbackDataSource(
        new FallbackDataSource(
          new BooliGraphQLSource(booliRequest),
          new PlaywrightSource(),
        ),
        new MockDataSource(),
      )
      break
  }

  return instance
}

/** @internal Reset singleton for testing */
export function _resetDataSource(): void {
  instance = null
}

/** @internal Override the singleton for testing */
export function _setDataSource(source: DataSource): void {
  instance = source
}

export type { DataSource } from './types'
export { BooliGraphQLSource } from './booli-source'
export { BooliHttpScraper } from '../scraper/booli-http-scraper'
export { HemnetScraper } from '../scraper/hemnet-scraper'
export { MockDataSource } from './mock-source'
