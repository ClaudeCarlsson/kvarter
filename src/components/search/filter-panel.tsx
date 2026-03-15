'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PROPERTY_TYPE_LABELS } from '@/lib/constants'
import type { PropertyType, SearchFilters } from '@/types'

const ALL_PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'townhouse', 'plot', 'cottage']

function parseFiltersFromParams(params: URLSearchParams): SearchFilters {
  return {
    locationId: params.get('locationId') ?? undefined,
    query: params.get('query') ?? undefined,
    priceRange: {
      min: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
      max: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    },
    roomsRange: {
      min: params.get('minRooms') ? Number(params.get('minRooms')) : undefined,
      max: params.get('maxRooms') ? Number(params.get('maxRooms')) : undefined,
    },
    areaRange: {
      min: params.get('minArea') ? Number(params.get('minArea')) : undefined,
      max: params.get('maxArea') ? Number(params.get('maxArea')) : undefined,
    },
    propertyTypes: params.get('propertyTypes')
      ? (params.get('propertyTypes')!.split(',') as PropertyType[])
      : undefined,
    maxMonthlyFee: params.get('maxMonthlyFee') ? Number(params.get('maxMonthlyFee')) : undefined,
  }
}

export function FilterPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilters = parseFiltersFromParams(searchParams)

  const [minPrice, setMinPrice] = useState(currentFilters.priceRange?.min?.toString() ?? '')
  const [maxPrice, setMaxPrice] = useState(currentFilters.priceRange?.max?.toString() ?? '')
  const [minRooms, setMinRooms] = useState(currentFilters.roomsRange?.min?.toString() ?? '')
  const [maxRooms, setMaxRooms] = useState(currentFilters.roomsRange?.max?.toString() ?? '')
  const [minArea, setMinArea] = useState(currentFilters.areaRange?.min?.toString() ?? '')
  const [maxArea, setMaxArea] = useState(currentFilters.areaRange?.max?.toString() ?? '')
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(currentFilters.propertyTypes ?? [])
  const [maxMonthlyFee, setMaxMonthlyFee] = useState(currentFilters.maxMonthlyFee?.toString() ?? '')
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleType = useCallback((type: PropertyType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }, [])

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())

    const setOrDelete = (key: string, value: string) => {
      if (value) params.set(key, value)
      else params.delete(key)
    }

    setOrDelete('minPrice', minPrice)
    setOrDelete('maxPrice', maxPrice)
    setOrDelete('minRooms', minRooms)
    setOrDelete('maxRooms', maxRooms)
    setOrDelete('minArea', minArea)
    setOrDelete('maxArea', maxArea)
    setOrDelete('maxMonthlyFee', maxMonthlyFee)

    if (selectedTypes.length > 0) {
      params.set('propertyTypes', selectedTypes.join(','))
    } else {
      params.delete('propertyTypes')
    }

    router.push(`/?${params.toString()}`)
  }, [router, searchParams, minPrice, maxPrice, minRooms, maxRooms, minArea, maxArea, maxMonthlyFee, selectedTypes])

  const resetFilters = useCallback(() => {
    setMinPrice('')
    setMaxPrice('')
    setMinRooms('')
    setMaxRooms('')
    setMinArea('')
    setMaxArea('')
    setSelectedTypes([])
    setMaxMonthlyFee('')

    const params = new URLSearchParams()
    const locationId = searchParams.get('locationId')
    const locationName = searchParams.get('locationName')
    if (locationId) params.set('locationId', locationId)
    if (locationName) params.set('locationName', locationName)
    router.push(`/?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left lg:cursor-default"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Filters</h2>
        <svg
          className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform lg:hidden ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`space-y-4 px-4 pb-4 ${isExpanded ? 'block' : 'hidden lg:block'}`}>
        {/* Price Range */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Price (kr)</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="text-xs font-mono"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Rooms */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Rooms</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minRooms}
              onChange={(e) => setMinRooms(e.target.value)}
              className="text-xs font-mono"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxRooms}
              onChange={(e) => setMaxRooms(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Living Area */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Living area (m&sup2;)</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
              className="text-xs font-mono"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxArea}
              onChange={(e) => setMaxArea(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Property type</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_PROPERTY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)]'
                    : 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {PROPERTY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Fee */}
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Max monthly fee (kr)</label>
          <Input
            type="number"
            placeholder="No limit"
            value={maxMonthlyFee}
            onChange={(e) => setMaxMonthlyFee(e.target.value)}
            className="text-xs font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button onClick={applyFilters} size="sm" className="flex-1">
            Apply
          </Button>
          <Button onClick={resetFilters} variant="outline" size="sm">
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
