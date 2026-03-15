import type { Location } from '@/types'

/**
 * Swedish location reference data for search autocomplete.
 * This is static geographic reference data (city/neighborhood names),
 * not mock property listings.
 */
export const SWEDISH_LOCATIONS: Location[] = [
  { id: 'Stockholm', name: 'Stockholm', type: 'stad', coordinates: { latitude: 59.3293, longitude: 18.0686 } },
  { id: 'Södermalm', name: 'Södermalm', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3150, longitude: 18.0710 } },
  { id: 'Vasastan', name: 'Vasastan', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3450, longitude: 18.0500 } },
  { id: 'Östermalm', name: 'Östermalm', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3380, longitude: 18.0830 } },
  { id: 'Kungsholmen', name: 'Kungsholmen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3320, longitude: 18.0290 } },
  { id: 'Norrmalm', name: 'Norrmalm', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3370, longitude: 18.0640 } },
  { id: 'Bromma', name: 'Bromma', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3380, longitude: 17.9400 } },
  { id: 'Hägersten', name: 'Hägersten', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2960, longitude: 18.0100 } },
  { id: 'Hammarby Sjöstad', name: 'Hammarby Sjöstad', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3040, longitude: 18.0970 } },
  { id: 'Solna', name: 'Solna', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.3600, longitude: 18.0000 } },
  { id: 'Täby', name: 'Täby', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.4330, longitude: 18.0700 } },
  { id: 'Gothenburg', name: 'Gothenburg', type: 'stad', coordinates: { latitude: 57.7089, longitude: 11.9746 } },
  { id: 'Göteborg', name: 'Göteborg', type: 'stad', coordinates: { latitude: 57.7089, longitude: 11.9746 } },
  { id: 'Linné', name: 'Linné', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.6960, longitude: 11.9540 } },
  { id: 'Haga', name: 'Haga', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.6990, longitude: 11.9500 } },
  { id: 'Eriksberg', name: 'Eriksberg', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.7010, longitude: 11.9230 } },
  { id: 'Malmö', name: 'Malmö', type: 'stad', coordinates: { latitude: 55.6050, longitude: 13.0038 } },
  { id: 'Möllevången', name: 'Möllevången', type: 'stadsdel', parentName: 'Malmö', coordinates: { latitude: 55.5890, longitude: 13.0060 } },
  { id: 'Västra Hamnen', name: 'Västra Hamnen', type: 'stadsdel', parentName: 'Malmö', coordinates: { latitude: 55.6130, longitude: 12.9790 } },
  { id: 'Uppsala', name: 'Uppsala', type: 'stad', coordinates: { latitude: 59.8586, longitude: 17.6389 } },
  { id: 'Lund', name: 'Lund', type: 'stad', coordinates: { latitude: 55.7047, longitude: 13.1910 } },
  { id: 'Linköping', name: 'Linköping', type: 'stad', coordinates: { latitude: 58.4108, longitude: 15.6214 } },
  { id: 'Örebro', name: 'Örebro', type: 'stad', coordinates: { latitude: 59.2753, longitude: 15.2134 } },
  { id: 'Västerås', name: 'Västerås', type: 'stad', coordinates: { latitude: 59.6099, longitude: 16.5448 } },
  { id: 'Helsingborg', name: 'Helsingborg', type: 'stad', coordinates: { latitude: 56.0465, longitude: 12.6945 } },
]

export function searchSwedishLocations(query: string, limit = 5): Location[] {
  const q = query.toLowerCase()
  return SWEDISH_LOCATIONS
    .filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.parentName?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, limit)
}
