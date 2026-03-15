'use client'

import { useEffect, useState } from 'react'

export type ViewMode = 'list' | 'map'

export function ResultsToggle({
  onChange,
}: {
  onChange: (mode: ViewMode) => void
}) {
  const [mode, setMode] = useState<ViewMode>('list')

  useEffect(() => {
    const saved = localStorage.getItem('kvarter-view-mode') as ViewMode | null
    if (saved === 'list' || saved === 'map') {
      setMode(saved)
      onChange(saved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (newMode: ViewMode) => {
    setMode(newMode)
    onChange(newMode)
    localStorage.setItem('kvarter-view-mode', newMode)
  }

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => toggle('list')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        List
      </button>
      <button
        type="button"
        onClick={() => toggle('map')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === 'map' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Map
      </button>
    </div>
  )
}
