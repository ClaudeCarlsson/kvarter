export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-sm text-gray-500">
            Data provided by Booli
          </p>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Kvarter
          </p>
        </div>
      </div>
    </footer>
  )
}
