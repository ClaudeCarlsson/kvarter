import { describe, expect, test } from 'bun:test'

import { extractHemnetListings, extractJsonLd, extractMetaContent, extractNextData } from '../html-parser'

// ---------------------------------------------------------------------------
// extractNextData
// ---------------------------------------------------------------------------

describe('extractNextData', () => {
  test('extracts valid __NEXT_DATA__ payload', () => {
    const html = `
      <html><head></head><body>
        <div id="__next">content</div>
        <script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"listings":[1,2,3]}}}</script>
      </body></html>
    `
    const result = extractNextData<{ props: { pageProps: { listings: number[] } } }>(html)
    expect(result).not.toBeNull()
    expect(result!.props.pageProps.listings).toEqual([1, 2, 3])
  })

  test('returns null when __NEXT_DATA__ tag is missing', () => {
    const html = '<html><body><p>No next data here</p></body></html>'
    expect(extractNextData(html)).toBeNull()
  })

  test('returns null for malformed JSON in __NEXT_DATA__', () => {
    const html = '<script id="__NEXT_DATA__" type="application/json">{broken json</script>'
    expect(extractNextData(html)).toBeNull()
  })

  test('handles multiline JSON inside __NEXT_DATA__', () => {
    const json = JSON.stringify({
      props: {
        pageProps: {
          title: 'Test',
          description: 'Line 1\nLine 2',
        },
      },
    })
    const html = `<script id="__NEXT_DATA__" type="application/json">${json}</script>`
    const result = extractNextData<{ props: { pageProps: { title: string } } }>(html)
    expect(result!.props.pageProps.title).toBe('Test')
  })

  test('handles empty JSON object', () => {
    const html = '<script id="__NEXT_DATA__" type="application/json">{}</script>'
    const result = extractNextData(html)
    expect(result).toEqual({})
  })

  test('extracts deeply nested data', () => {
    const payload = {
      props: {
        pageProps: {
          searchResult: {
            listings: [
              { booliId: 123, listPrice: 5000000 },
              { booliId: 456, listPrice: 3000000 },
            ],
            totalCount: 42,
          },
        },
      },
    }
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`
    const result = extractNextData<typeof payload>(html)
    expect(result!.props.pageProps.searchResult.listings).toHaveLength(2)
    expect(result!.props.pageProps.searchResult.totalCount).toBe(42)
  })

  test('ignores other script tags', () => {
    const html = `
      <script type="application/json">{"ignore": true}</script>
      <script id="__NEXT_DATA__" type="application/json">{"target": true}</script>
      <script>var x = 1;</script>
    `
    const result = extractNextData<{ target: boolean }>(html)
    expect(result!.target).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// extractJsonLd
// ---------------------------------------------------------------------------

describe('extractJsonLd', () => {
  test('extracts single JSON-LD block', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{"@type":"RealEstateListing","name":"Apartment"}</script>
      </head><body></body></html>
    `
    const results = extractJsonLd(html)
    expect(results).toHaveLength(1)
    expect(results[0]['@type']).toBe('RealEstateListing')
    expect(results[0].name).toBe('Apartment')
  })

  test('extracts multiple JSON-LD blocks', () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization","name":"Booli"}</script>
      <script type="application/ld+json">{"@type":"RealEstateListing","name":"House"}</script>
      <script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script>
    `
    const results = extractJsonLd(html)
    expect(results).toHaveLength(3)
    expect(results[0]['@type']).toBe('Organization')
    expect(results[1]['@type']).toBe('RealEstateListing')
    expect(results[2]['@type']).toBe('BreadcrumbList')
  })

  test('returns empty array when no JSON-LD is present', () => {
    const html = '<html><body><p>No LD here</p></body></html>'
    expect(extractJsonLd(html)).toEqual([])
  })

  test('skips malformed JSON-LD blocks and keeps valid ones', () => {
    const html = `
      <script type="application/ld+json">{not valid json}</script>
      <script type="application/ld+json">{"@type":"Product","name":"Valid"}</script>
      <script type="application/ld+json">{also broken</script>
    `
    const results = extractJsonLd(html)
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Valid')
  })

  test('handles multiline JSON-LD', () => {
    const json = JSON.stringify({
      '@type': 'RealEstateListing',
      description: 'A lovely\napartment',
      address: {
        streetAddress: 'Hornsgatan 42',
        addressLocality: 'Stockholm',
      },
    })
    const html = `<script type="application/ld+json">${json}</script>`
    const results = extractJsonLd(html)
    expect(results).toHaveLength(1)
    expect((results[0].address as Record<string, unknown>).streetAddress).toBe('Hornsgatan 42')
  })

  test('returns empty array for empty HTML', () => {
    expect(extractJsonLd('')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// extractMetaContent
// ---------------------------------------------------------------------------

describe('extractMetaContent', () => {
  test('extracts meta tag by name', () => {
    const html = '<meta name="description" content="A great site">'
    expect(extractMetaContent(html, 'description')).toBe('A great site')
  })

  test('extracts meta tag by property (OpenGraph)', () => {
    const html = '<meta property="og:title" content="My Page">'
    expect(extractMetaContent(html, 'og:title')).toBe('My Page')
  })

  test('handles reversed attribute order (content before name)', () => {
    const html = '<meta content="Reversed" name="title">'
    expect(extractMetaContent(html, 'title')).toBe('Reversed')
  })

  test('handles reversed attribute order (content before property)', () => {
    const html = '<meta content="OG Reversed" property="og:description">'
    expect(extractMetaContent(html, 'og:description')).toBe('OG Reversed')
  })

  test('returns null when meta tag is not found', () => {
    const html = '<html><head><meta name="other" content="value"></head></html>'
    expect(extractMetaContent(html, 'missing')).toBeNull()
  })

  test('returns null for empty HTML', () => {
    expect(extractMetaContent('', 'anything')).toBeNull()
  })

  test('is case-insensitive for tag matching', () => {
    const html = '<META NAME="viewport" CONTENT="width=device-width">'
    expect(extractMetaContent(html, 'viewport')).toBe('width=device-width')
  })
})

// ---------------------------------------------------------------------------
// extractHemnetListings
// ---------------------------------------------------------------------------

describe('extractHemnetListings', () => {
  test('extracts listing from li with normal-results__hit class', () => {
    const html = `
      <ul>
        <li class="normal-results__hit js-normal-list-item"
            data-listing-id="12345"
            data-address="Hornsgatan 42"
            data-price="4950000"
            data-rooms="2"
            data-living-area="60"
            data-location="Sodermalm"
            data-item-type="bostadsratt"
            data-latitude="59.3171"
            data-longitude="18.0494">
          <a href="https://www.hemnet.se/bostad/12345">
            <img src="https://img.hemnet.se/photo.jpg" alt="Photo">
            <span class="listing-card__street-address">Hornsgatan 42</span>
            <span class="listing-card__location-name">Sodermalm</span>
          </a>
        </li>
      </ul>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('12345')
    expect(results[0].address).toBe('Hornsgatan 42')
    expect(results[0].price).toBe(4950000)
    expect(results[0].rooms).toBe(2)
    expect(results[0].livingArea).toBe(60)
    expect(results[0].location).toBe('Sodermalm')
    expect(results[0].propertyType).toBe('bostadsratt')
    expect(results[0].latitude).toBe(59.3171)
    expect(results[0].longitude).toBe(18.0494)
    expect(results[0].imageUrl).toBe('https://img.hemnet.se/photo.jpg')
    expect(results[0].url).toBe('https://www.hemnet.se/bostad/12345')
  })

  test('extracts listing from div with listing-card class', () => {
    const html = `
      <div class="listing-card js-listing-card"
           data-listing-id="99999"
           data-address="Odengatan 18"
           data-price="6800000"
           data-rooms="3"
           data-living-area="80"
           data-location="Vasastan">
        <a href="https://www.hemnet.se/bostad/99999">
          <span class="listing-card__street-address">Odengatan 18</span>
        </a>
      </div>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('99999')
    expect(results[0].address).toBe('Odengatan 18')
    expect(results[0].price).toBe(6800000)
  })

  test('extracts listing from article with search-result-item class', () => {
    const html = `
      <article class="search-result-item"
               data-listing-id="77777"
               data-address="Villa Vagen 5"
               data-price="8500000"
               data-rooms="5"
               data-living-area="150"
               data-location="Lidingo">
        <a href="https://www.hemnet.se/bostad/77777">
          <span class="listing-card__street-address">Villa Vagen 5</span>
        </a>
      </article>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('77777')
  })

  test('extracts listing from element with data-listing-id attribute', () => {
    const html = `
      <div data-listing-id="44444"
           data-address="Test Gata 1"
           data-price="3000000"
           data-rooms="2"
           data-living-area="55"
           data-location="TestArea">
        <a href="https://www.hemnet.se/bostad/44444">Test Gata 1</a>
      </div>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('44444')
  })

  test('extracts multiple listings', () => {
    const html = `
      <ul>
        <li class="normal-results__hit"
            data-listing-id="111"
            data-address="Gatan 1"
            data-price="2000000"
            data-rooms="2"
            data-living-area="50"
            data-location="Area A">
          <a href="https://www.hemnet.se/bostad/111">Gatan 1</a>
        </li>
        <li class="normal-results__hit"
            data-listing-id="222"
            data-address="Gatan 2"
            data-price="3000000"
            data-rooms="3"
            data-living-area="70"
            data-location="Area B">
          <a href="https://www.hemnet.se/bostad/222">Gatan 2</a>
        </li>
      </ul>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('111')
    expect(results[1].id).toBe('222')
  })

  test('returns empty array for HTML without listings', () => {
    const html = '<html><body><p>No listings here</p></body></html>'
    const results = extractHemnetListings(html)
    expect(results).toEqual([])
  })

  test('returns empty array for empty HTML', () => {
    const results = extractHemnetListings('')
    expect(results).toEqual([])
  })

  test('extracts monthly fee from kr/man pattern', () => {
    const html = `
      <li class="normal-results__hit"
          data-listing-id="555"
          data-address="FeeGatan 1"
          data-price="4000000"
          data-rooms="2"
          data-living-area="55"
          data-location="FeeLand">
        <a href="https://www.hemnet.se/bostad/555">
          <span>3 200 kr/man</span>
        </a>
      </li>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].monthlyFee).toBe(3200)
  })

  test('handles listing without coordinates', () => {
    const html = `
      <li class="normal-results__hit"
          data-listing-id="666"
          data-address="NoCoords"
          data-price="2000000"
          data-rooms="1"
          data-living-area="30"
          data-location="Area">
        <a href="https://www.hemnet.se/bostad/666">NoCoords</a>
      </li>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].latitude).toBeUndefined()
    expect(results[0].longitude).toBeUndefined()
  })

  test('extracts image from data-src attribute (lazy loading)', () => {
    const html = `
      <li class="normal-results__hit"
          data-listing-id="777"
          data-address="LazyImg"
          data-price="2000000"
          data-rooms="1"
          data-living-area="30"
          data-location="Area">
        <img data-src="https://img.hemnet.se/lazy.jpg" alt="Lazy">
      </li>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].imageUrl).toBe('https://img.hemnet.se/lazy.jpg')
  })

  test('extracts rooms from text content with rum pattern', () => {
    const html = `
      <li class="normal-results__hit"
          data-listing-id="888"
          data-address="RumGatan"
          data-price="3000000"
          data-living-area="60"
          data-location="Area">
        <span>3 rum</span>
      </li>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].rooms).toBe(3)
  })

  test('extracts living area from text content with m2 pattern', () => {
    const html = `
      <li class="normal-results__hit"
          data-listing-id="999"
          data-address="AreaGatan"
          data-price="3000000"
          data-rooms="2"
          data-location="Area">
        <span>65 m\u00B2</span>
      </li>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].livingArea).toBe(65)
  })

  test('extracts ID from href when data-listing-id is absent', () => {
    const html = `
      <div class="listing-card"
           data-address="HrefId"
           data-price="2000000"
           data-rooms="1"
           data-living-area="30"
           data-location="Area">
        <a href="https://www.hemnet.se/bostad/55555">HrefId</a>
      </div>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('55555')
  })

  test('uses data-item-id as fallback for listing ID', () => {
    const html = `
      <li class="normal-results__hit"
          data-item-id="33333"
          data-address="FallbackId"
          data-price="2000000"
          data-rooms="1"
          data-living-area="30"
          data-location="Area">
        <span>Content</span>
      </li>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('33333')
  })

  test('handles Swedish price format with spaces', () => {
    const html = `
      <li class="normal-results__hit"
          data-listing-id="111"
          data-address="Test"
          data-rooms="2"
          data-living-area="50"
          data-location="Area">
        <span class="listing-card__attribute--price">4 950 000 kr</span>
      </li>
    `

    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].price).toBe(4950000)
  })

  test('falls back to extractLinkText for address when no data-address or class-based address', () => {
    const html = `
      <li class="normal-results__hit js-normal-list-item"
          data-listing-id="777">
        <a href="https://www.hemnet.se/bostad/vagen-42-stockholm-777">Vägen 42</a>
        <span class="listing-card__attribute--price">3 000 000 kr</span>
      </li>
    `
    const results = extractHemnetListings(html)
    expect(results).toHaveLength(1)
    expect(results[0].address).toBe('Vägen 42')
    expect(results[0].id).toBe('777')
  })
})
