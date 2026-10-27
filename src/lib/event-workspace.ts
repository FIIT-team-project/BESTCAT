import type { CatEventEntry } from '@/payload-types'

export function orderedEntries(entries: CatEventEntry[]) {
  return [...entries].sort(
    (a, b) =>
      (a.queuePosition ?? Number.MAX_SAFE_INTEGER) - (b.queuePosition ?? Number.MAX_SAFE_INTEGER) ||
      a.id - b.id,
  )
}

export function catName(entry: CatEventEntry) {
  return typeof entry.catId === 'object'
    ? entry.catId.name || `Cat ${entry.catId.id}`
    : `Cat ${entry.catId}`
}

export function isWaiting(entry: CatEventEntry) {
  return !['judging', 'completed'].includes(entry.status || '')
}
