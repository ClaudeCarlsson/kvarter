'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { searchLocationsAction } from '@/app/actions/search'
import { Input } from '@/components/ui/input'
import { DEBOUNCE_MS } from '@/lib/constants'
import type { Location } from '@/types'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Location[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearch = useCallback(async (value: string) => {
    if (value.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    const results = await searchLocationsAction(value)
    setSuggestions(results)
    setIsOpen(results.length > 0)
    setActiveIndex(-1)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => handleSearch(value), DEBOUNCE_MS)
    },
    [handleSearch],
  )

  const selectLocation = useCallback(
    (location: Location) => {
      setQuery(location.name)
      setIsOpen(false)
      setSuggestions([])

      const params = new URLSearchParams(searchParams.toString())
      params.set('locationId', location.id)
      params.set('locationName', location.name)
      params.delete('query')
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            selectLocation(suggestions[activeIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          break
      }
    },
    [isOpen, activeIndex, suggestions, selectLocation],
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('locationId')
    params.delete('locationName')
    params.delete('query')
    router.push(`/?${params.toString()}`)
    inputRef.current?.focus()
  }, [router, searchParams])

  // Initialize from URL
  useEffect(() => {
    const locationName = searchParams.get('locationName')
    if (locationName && !query) {
      setQuery(locationName)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search city, neighborhood, or address..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          className="pl-10 pr-10 font-mono text-xs"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-1 shadow-lg shadow-black/30">
          {suggestions.map((location, index) => (
            <button
              key={location.id}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                index === activeIndex
                  ? 'bg-[var(--color-surface-tertiary)] text-[var(--color-accent-blue)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]'
              }`}
              onClick={() => selectLocation(location)}
              onMouseEnter={() => setActiveIndex(index)}
              type="button"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <span className="font-medium text-[var(--color-text-primary)]">{location.name}</span>
                {location.parentName && (
                  <span className="ml-1 text-[var(--color-text-muted)]">{location.parentName}</span>
                )}
                <span className="ml-2 text-xs text-[var(--color-text-muted)] capitalize">{location.type}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
