import type { Location } from '@/types'

/**
 * Swedish location reference data for search autocomplete.
 * Comprehensive coverage of Stockholm stadsdelar, plus major cities.
 */
export const SWEDISH_LOCATIONS: Location[] = [
  // Stockholm stad
  { id: 'Stockholm', name: 'Stockholm', type: 'stad', coordinates: { latitude: 59.3293, longitude: 18.0686 } },

  // Stockholm inner city
  { id: 'Södermalm', name: 'Södermalm', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3150, longitude: 18.0710 } },
  { id: 'Vasastan', name: 'Vasastan', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3450, longitude: 18.0500 } },
  { id: 'Östermalm', name: 'Östermalm', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3380, longitude: 18.0830 } },
  { id: 'Kungsholmen', name: 'Kungsholmen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3320, longitude: 18.0290 } },
  { id: 'Norrmalm', name: 'Norrmalm', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3370, longitude: 18.0640 } },
  { id: 'Gamla Stan', name: 'Gamla Stan', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3251, longitude: 18.0711 } },

  // Stockholm south
  { id: 'Gröndal', name: 'Gröndal', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3160, longitude: 18.0020 } },
  { id: 'Midsommarkransen', name: 'Midsommarkransen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3020, longitude: 18.0120 } },
  { id: 'Liljeholmen', name: 'Liljeholmen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3100, longitude: 18.0230 } },
  { id: 'Hägersten', name: 'Hägersten', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2960, longitude: 18.0100 } },
  { id: 'Telefonplan', name: 'Telefonplan', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2980, longitude: 18.0060 } },
  { id: 'Fruängen', name: 'Fruängen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2850, longitude: 17.9680 } },
  { id: 'Årsta', name: 'Årsta', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2980, longitude: 18.0530 } },
  { id: 'Enskede', name: 'Enskede', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2830, longitude: 18.0720 } },
  { id: 'Bandhagen', name: 'Bandhagen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2710, longitude: 18.0480 } },
  { id: 'Högdalen', name: 'Högdalen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2620, longitude: 18.0400 } },
  { id: 'Farsta', name: 'Farsta', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2430, longitude: 18.0930 } },
  { id: 'Skärholmen', name: 'Skärholmen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.2770, longitude: 17.9280 } },
  { id: 'Aspudden', name: 'Aspudden', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3080, longitude: 18.0150 } },
  { id: 'Hornstull', name: 'Hornstull', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3150, longitude: 18.0350 } },
  { id: 'Tanto', name: 'Tanto', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3080, longitude: 18.0540 } },

  // Stockholm west
  { id: 'Bromma', name: 'Bromma', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3380, longitude: 17.9400 } },
  { id: 'Alvik', name: 'Alvik', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3340, longitude: 17.9680 } },
  { id: 'Abrahamsberg', name: 'Abrahamsberg', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3370, longitude: 17.9540 } },
  { id: 'Stora Essingen', name: 'Stora Essingen', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3210, longitude: 18.0010 } },
  { id: 'Fredhäll', name: 'Fredhäll', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3310, longitude: 18.0070 } },

  // Stockholm east
  { id: 'Hammarby Sjöstad', name: 'Hammarby Sjöstad', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3040, longitude: 18.0970 } },
  { id: 'Nacka', name: 'Nacka', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.3100, longitude: 18.1640 } },
  { id: 'Djurgården', name: 'Djurgården', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3270, longitude: 18.1100 } },
  { id: 'Gärdet', name: 'Gärdet', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3430, longitude: 18.1000 } },

  // Stockholm north
  { id: 'Solna', name: 'Solna', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.3600, longitude: 18.0000 } },
  { id: 'Sundbyberg', name: 'Sundbyberg', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.3620, longitude: 17.9710 } },
  { id: 'Täby', name: 'Täby', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.4330, longitude: 18.0700 } },
  { id: 'Danderyd', name: 'Danderyd', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.3930, longitude: 18.0310 } },
  { id: 'Lidingö', name: 'Lidingö', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.3660, longitude: 18.1380 } },
  { id: 'Kista', name: 'Kista', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.4030, longitude: 17.9370 } },
  { id: 'Huddinge', name: 'Huddinge', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.2360, longitude: 17.9810 } },
  { id: 'Haninge', name: 'Haninge', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.1740, longitude: 18.1380 } },
  { id: 'Tyresö', name: 'Tyresö', type: 'kommun', parentName: 'Stockholm', coordinates: { latitude: 59.2440, longitude: 18.2280 } },
  { id: 'Vällingby', name: 'Vällingby', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3640, longitude: 17.8740 } },
  { id: 'Hässelby', name: 'Hässelby', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3630, longitude: 17.8350 } },
  { id: 'Spånga', name: 'Spånga', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3830, longitude: 17.9020 } },
  { id: 'Tensta', name: 'Tensta', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3950, longitude: 17.9150 } },
  { id: 'Rinkeby', name: 'Rinkeby', type: 'stadsdel', parentName: 'Stockholm', coordinates: { latitude: 59.3880, longitude: 17.9280 } },

  // Gothenburg
  { id: 'Göteborg', name: 'Göteborg', type: 'stad', coordinates: { latitude: 57.7089, longitude: 11.9746 } },
  { id: 'Gothenburg', name: 'Gothenburg', type: 'stad', coordinates: { latitude: 57.7089, longitude: 11.9746 } },
  { id: 'Linné', name: 'Linné', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.6960, longitude: 11.9540 } },
  { id: 'Haga', name: 'Haga', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.6990, longitude: 11.9500 } },
  { id: 'Eriksberg', name: 'Eriksberg', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.7010, longitude: 11.9230 } },
  { id: 'Majorna', name: 'Majorna', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.6920, longitude: 11.9290 } },
  { id: 'Johanneberg', name: 'Johanneberg', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.6890, longitude: 11.9800 } },
  { id: 'Örgryte', name: 'Örgryte', type: 'stadsdel', parentName: 'Göteborg', coordinates: { latitude: 57.6970, longitude: 12.0100 } },
  { id: 'Mölndal', name: 'Mölndal', type: 'kommun', parentName: 'Göteborg', coordinates: { latitude: 57.6560, longitude: 12.0140 } },

  // Malmö
  { id: 'Malmö', name: 'Malmö', type: 'stad', coordinates: { latitude: 55.6050, longitude: 13.0038 } },
  { id: 'Möllevången', name: 'Möllevången', type: 'stadsdel', parentName: 'Malmö', coordinates: { latitude: 55.5890, longitude: 13.0060 } },
  { id: 'Västra Hamnen', name: 'Västra Hamnen', type: 'stadsdel', parentName: 'Malmö', coordinates: { latitude: 55.6130, longitude: 12.9790 } },
  { id: 'Davidshall', name: 'Davidshall', type: 'stadsdel', parentName: 'Malmö', coordinates: { latitude: 55.5960, longitude: 12.9930 } },
  { id: 'Limhamn', name: 'Limhamn', type: 'stadsdel', parentName: 'Malmö', coordinates: { latitude: 55.5830, longitude: 12.9350 } },

  // Other cities
  { id: 'Uppsala', name: 'Uppsala', type: 'stad', coordinates: { latitude: 59.8586, longitude: 17.6389 } },
  { id: 'Lund', name: 'Lund', type: 'stad', coordinates: { latitude: 55.7047, longitude: 13.1910 } },
  { id: 'Linköping', name: 'Linköping', type: 'stad', coordinates: { latitude: 58.4108, longitude: 15.6214 } },
  { id: 'Norrköping', name: 'Norrköping', type: 'stad', coordinates: { latitude: 58.5942, longitude: 16.1826 } },
  { id: 'Örebro', name: 'Örebro', type: 'stad', coordinates: { latitude: 59.2753, longitude: 15.2134 } },
  { id: 'Västerås', name: 'Västerås', type: 'stad', coordinates: { latitude: 59.6099, longitude: 16.5448 } },
  { id: 'Helsingborg', name: 'Helsingborg', type: 'stad', coordinates: { latitude: 56.0465, longitude: 12.6945 } },
  { id: 'Jönköping', name: 'Jönköping', type: 'stad', coordinates: { latitude: 57.7826, longitude: 14.1618 } },
  { id: 'Umeå', name: 'Umeå', type: 'stad', coordinates: { latitude: 63.8258, longitude: 20.2630 } },
  { id: 'Luleå', name: 'Luleå', type: 'stad', coordinates: { latitude: 65.5848, longitude: 22.1547 } },
  { id: 'Karlstad', name: 'Karlstad', type: 'stad', coordinates: { latitude: 59.3793, longitude: 13.5036 } },
  { id: 'Gävle', name: 'Gävle', type: 'stad', coordinates: { latitude: 60.6749, longitude: 17.1413 } },
  { id: 'Växjö', name: 'Växjö', type: 'stad', coordinates: { latitude: 56.8777, longitude: 14.8091 } },
  { id: 'Halmstad', name: 'Halmstad', type: 'stad', coordinates: { latitude: 56.6745, longitude: 12.8568 } },
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
