'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import { useCallback, useMemo, useState } from 'react'
import { Map, Marker, Popup } from 'react-map-gl/maplibre'

import { STOCKHOLM_CENTER } from '@/lib/constants'
import { formatPriceCompact } from '@/lib/utils'
import type { Property } from '@/types'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

function getBounds(properties: Property[]) {
  if (properties.length === 0) return null

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const p of properties) {
    minLat = Math.min(minLat, p.coordinates.latitude)
    maxLat = Math.max(maxLat, p.coordinates.latitude)
    minLng = Math.min(minLng, p.coordinates.longitude)
    maxLng = Math.max(maxLng, p.coordinates.longitude)
  }

  const pad = 0.02
  return {
    longitude: (minLng + maxLng) / 2,
    latitude: (minLat + maxLat) / 2,
    zoom: properties.length === 1 ? 14 : 11,
  }
}

export function PropertyMap({ properties }: { properties: Property[] }) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const initialViewState = useMemo(() => {
    const bounds = getBounds(properties)
    return bounds ?? {
      longitude: STOCKHOLM_CENTER.longitude,
      latitude: STOCKHOLM_CENTER.latitude,
      zoom: 12,
    }
  }, [properties])

  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedProperty(property)
  }, [])

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-xl border border-gray-200">
      <Map
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        {properties.map((property) => (
          <Marker
            key={property.id}
            longitude={property.coordinates.longitude}
            latitude={property.coordinates.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              handleMarkerClick(property)
            }}
          >
            <div className="cursor-pointer rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white shadow-md transition-transform hover:scale-110">
              {formatPriceCompact(property.price)}
            </div>
          </Marker>
        ))}

        {selectedProperty && (
          <Popup
            longitude={selectedProperty.coordinates.longitude}
            latitude={selectedProperty.coordinates.latitude}
            anchor="bottom"
            onClose={() => setSelectedProperty(null)}
            closeOnClick={false}
            offset={30}
          >
            <div className="min-w-[200px] p-1">
              <h3 className="font-semibold text-gray-900">{selectedProperty.address}</h3>
              <p className="text-sm text-gray-500">
                {selectedProperty.area}, {selectedProperty.municipality}
              </p>
              <p className="mt-1 text-sm">
                {selectedProperty.rooms} rooms &middot; {selectedProperty.livingArea} m&sup2;
              </p>
              <p className="mt-1 font-bold text-gray-900">
                {formatPriceCompact(selectedProperty.price)}
              </p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
