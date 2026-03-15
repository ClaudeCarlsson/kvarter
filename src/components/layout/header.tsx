import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
          Kvarter
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Search
          </Link>
          <Link
            href="/compare"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Compare
          </Link>
        </nav>
      </div>
    </header>
  )
}
