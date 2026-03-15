export function generateCacheKey(
  prefix: string,
  params: Record<string, unknown>,
): string {
  const cleaned: Record<string, unknown> = {}
  const sortedKeys = Object.keys(params).sort()

  for (const key of sortedKeys) {
    const value = params[key]
    if (value !== undefined && value !== null) {
      cleaned[key] = value
    }
  }

  const serialized = JSON.stringify(cleaned)
  // Use djb2 hash — works in both Bun and Next.js server runtime
  let hash = 5381
  for (let i = 0; i < serialized.length; i++) {
    hash = ((hash << 5) + hash + serialized.charCodeAt(i)) >>> 0
  }

  return `${prefix}:${hash.toString(36)}`
}
