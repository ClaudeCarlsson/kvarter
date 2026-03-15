'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
        Something went wrong
      </h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <Button onClick={reset} size="sm">Try again</Button>
    </div>
  )
}
