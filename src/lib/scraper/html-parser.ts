/**
 * Utility functions for extracting structured data from HTML responses.
 *
 * Booli.se is a Next.js application. Pages often embed their data payload
 * in a `<script id="__NEXT_DATA__">` tag or in JSON-LD `<script>` blocks.
 * Parsing these is far more reliable (and cheaper) than scraping the DOM.
 *
 * Hemnet.se is a Rails application. Listings can be extracted from JSON-LD
 * structured data or by parsing the HTML listing card elements.
 */

import type { HemnetListingData } from './hemnet-scraper'

/**
 * Extract the `__NEXT_DATA__` JSON payload embedded by Next.js SSR pages.
 *
 * Returns `null` when the tag is missing or the JSON is malformed.
 */
export function extractNextData<T = unknown>(html: string): T | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  )
  if (!match) return null

  try {
    return JSON.parse(match[1]) as T
  } catch {
    return null
  }
}

/**
 * Extract all JSON-LD blocks from the page.
 *
 * Pages can contain multiple `<script type="application/ld+json">` tags.
 * Malformed entries are silently skipped.
 */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g

  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      results.push(parsed as Record<string, unknown>)
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }

  return results
}

/**
 * Extract the contents of a `<meta>` tag by name or property.
 */
export function extractMetaContent(
  html: string,
  nameOrProperty: string,
): string | null {
  // Try name= first, then property= (OpenGraph uses property)
  const patterns = [
    new RegExp(
      `<meta\\s+name="${nameOrProperty}"\\s+content="([^"]*)"`,
      'i',
    ),
    new RegExp(
      `<meta\\s+content="([^"]*)"\\s+name="${nameOrProperty}"`,
      'i',
    ),
    new RegExp(
      `<meta\\s+property="${nameOrProperty}"\\s+content="([^"]*)"`,
      'i',
    ),
    new RegExp(
      `<meta\\s+content="([^"]*)"\\s+property="${nameOrProperty}"`,
      'i',
    ),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1]
  }

  return null
}

// ---------------------------------------------------------------------------
// Hemnet listing extraction
// ---------------------------------------------------------------------------

/**
 * Extract listing data from Hemnet HTML listing cards.
 *
 * Hemnet renders listing results as `<li>` elements with class
 * `normal-results__hit` (or similar) containing `<a>` links and
 * data attributes with property details.
 *
 * Falls back to parsing `data-` attributes on listing containers
 * when the structure varies.
 */
export function extractHemnetListings(html: string): HemnetListingData[] {
  const listings: HemnetListingData[] = []

  // Strategy 1: Look for listing elements with data attributes
  // Hemnet uses patterns like:
  //   <div class="js-listing-card" data-listing-id="..." data-price="...">
  //   or <li class="normal-results__hit js-normal-list-item">
  const listingBlockRegex =
    /<(?:li|div|article)\s+[^>]*(?:class="[^"]*(?:listing-card|normal-results__hit|search-result-item|js-listing-card)[^"]*"|data-listing-id="[^"]*")[^>]*>([\s\S]*?)<\/(?:li|div|article)>/gi

  let blockMatch: RegExpExecArray | null
  while ((blockMatch = listingBlockRegex.exec(html)) !== null) {
    const fullMatch = blockMatch[0]
    const innerHtml = blockMatch[1]

    const listing = parseListingBlock(fullMatch, innerHtml)
    if (listing && listing.id) {
      listings.push(listing)
    }
  }

  return listings
}

/**
 * Parse a single Hemnet listing block (the outer element + its inner HTML)
 * and extract property data.
 */
function parseListingBlock(outerHtml: string, innerHtml: string): HemnetListingData | null {
  // Extract listing ID from data attributes or href
  const id = extractAttribute(outerHtml, 'data-listing-id')
    ?? extractAttribute(outerHtml, 'data-item-id')
    ?? extractIdFromHref(innerHtml)

  if (!id) return null

  // Extract address from link text or data attribute
  const address = extractAttribute(outerHtml, 'data-address')
    ?? extractTextFromSelector(innerHtml, 'listing-card__street-address')
    ?? extractTextFromSelector(innerHtml, 'item-result-meta-attribute-is-bold')
    ?? extractLinkText(innerHtml)

  // Extract price
  const priceStr = extractAttribute(outerHtml, 'data-price')
    ?? extractTextContent(innerHtml, 'listing-card__attribute--price')
    ?? extractTextContent(innerHtml, 'item-result-price')
  const price = parseSwedishNumber(priceStr)

  // Extract rooms
  const roomsStr = extractAttribute(outerHtml, 'data-rooms')
    ?? extractMatchFromText(innerHtml, /(\d+(?:[,.]\d+)?)\s*(?:rum|r\b)/i)
  const rooms = roomsStr ? parseFloat(roomsStr.replace(',', '.')) : undefined

  // Extract living area
  const areaStr = extractAttribute(outerHtml, 'data-living-area')
    ?? extractMatchFromText(innerHtml, /(\d+(?:[,.]\d+)?)\s*(?:m\u00B2|kvm)/i)
  const livingArea = areaStr ? parseFloat(areaStr.replace(',', '.')) : undefined

  // Extract location / area name
  const location = extractAttribute(outerHtml, 'data-location')
    ?? extractTextFromSelector(innerHtml, 'listing-card__location-name')
    ?? extractTextContent(innerHtml, 'item-result-meta-attribute-is-dimmed')

  // Extract monthly fee (avgift)
  const feeStr = extractMatchFromText(innerHtml, /(\d[\d\s]*)\s*kr\/m[aå]n/i)
  const monthlyFee = feeStr ? parseSwedishNumber(feeStr) : undefined

  // Extract property type
  const propertyType = extractAttribute(outerHtml, 'data-item-type')
    ?? extractTextFromSelector(innerHtml, 'listing-card__property-type')

  // Extract coordinates
  const latStr = extractAttribute(outerHtml, 'data-latitude')
  const lngStr = extractAttribute(outerHtml, 'data-longitude')
  const latitude = latStr ? parseFloat(latStr) : undefined
  const longitude = lngStr ? parseFloat(lngStr) : undefined

  // Extract image URL
  const imageUrl = extractImageSrc(innerHtml)

  // Extract listing URL
  const url = extractHref(innerHtml)

  return {
    id,
    address: address ?? undefined,
    price,
    rooms,
    livingArea,
    location: location ?? undefined,
    monthlyFee,
    propertyType: propertyType ?? undefined,
    latitude,
    longitude,
    imageUrl: imageUrl ?? undefined,
    url: url ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// HTML extraction helpers
// ---------------------------------------------------------------------------

function extractAttribute(html: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i')
  const match = html.match(regex)
  return match ? match[1] : null
}

function extractIdFromHref(html: string): string | null {
  const match = html.match(/href="[^"]*\/bostad[er]*\/[^"]*?(\d+)"/)
  return match ? match[1] : null
}

function extractTextFromSelector(html: string, className: string): string | null {
  const regex = new RegExp(
    `class="[^"]*${className}[^"]*"[^>]*>([^<]*)`,
    'i',
  )
  const match = html.match(regex)
  return match ? match[1].trim() || null : null
}

function extractTextContent(html: string, className: string): string | null {
  const regex = new RegExp(
    `class="[^"]*${className}[^"]*"[^>]*>\\s*([^<]+)`,
    'i',
  )
  const match = html.match(regex)
  return match ? match[1].trim() || null : null
}

function extractLinkText(html: string): string | null {
  const match = html.match(/<a\s+[^>]*href="[^"]*\/bostad[^"]*"[^>]*>([^<]+)/)
  return match ? match[1].trim() || null : null
}

function extractMatchFromText(html: string, regex: RegExp): string | null {
  const match = html.match(regex)
  return match ? match[1] : null
}

function extractImageSrc(html: string): string | null {
  // Try data-src first (lazy loading), then src
  const dataSrc = html.match(/data-src="(https?:\/\/[^"]+)"/)
  if (dataSrc) return dataSrc[1]

  const src = html.match(/<img[^>]+src="(https?:\/\/[^"]+)"/)
  return src ? src[1] : null
}

function extractHref(html: string): string | null {
  const match = html.match(/href="(https?:\/\/[^"]*\/bostad[^"]*)"/)
  return match ? match[1] : null
}

/**
 * Parse a Swedish-formatted number string.
 * Swedish uses spaces as thousands separators: "4 950 000 kr" -> 4950000
 */
function parseSwedishNumber(str: string | null): number | undefined {
  if (!str) return undefined
  const cleaned = str.replace(/[^\d]/g, '')
  if (!cleaned) return undefined
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? undefined : num
}
