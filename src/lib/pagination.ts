export type SearchParams = Record<string, string | string[] | undefined>
export type BrowseProps = { searchParams?: Promise<SearchParams> }
export const PAGE_SIZE = 12

export function pageNumber(value: SearchParams[string]): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : 1
}

export function pageHref(path: string, search: SearchParams, key: string, page: number) {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(search)) {
    if (name === key || value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) params.append(name, item)
  }
  if (page > 1) params.set(key, String(page))
  const query = params.toString()
  return `${path}${query ? `?${query}` : ''}`
}

/** Clamp stale or out-of-range page URLs to the last available page. */
export async function paginated<T extends { totalPages: number; page?: number }>(
  requested: number,
  find: (page: number) => Promise<T>,
): Promise<T> {
  const result = await find(requested)
  const last = Math.max(1, result.totalPages)
  return requested > last ? find(last) : result
}
