import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">Page not found</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild size="sm">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  )
}
