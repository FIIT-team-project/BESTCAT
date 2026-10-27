import config from '@payload-config'
import { getPayload } from 'payload'
import { getActiveShow } from './getActiveShow'
import { getCurrentUser } from './getCurrentUser'
import { relationshipID } from '@/collections/access/shows'

export async function getFrontendLinks() {
  const user = await getCurrentUser()
  if (!user) return []

  const links: { href: string; label: string }[] = []
  const show = await getActiveShow()
  if (!show) return links

  const payload = await getPayload({ config })
  // These permission lookups bypass collection access, are scoped to this user
  // and show, and expose only navigation links, never the underlying records.
  const [assignments, ownerships] = await Promise.all([
    payload.find({
      collection: 'events',
      where: {
        and: [
          { showId: { equals: show.id } },
          { or: [{ judgeId: { equals: user.id } }, { stewardId: { equals: user.id } }] },
        ],
      },
      select: { judgeId: true, stewardId: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'catOwners',
      where: { userId: { equals: user.id } },
      select: { catId: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  const isJudge = assignments.docs.some((event) => relationshipID(event.judgeId) === user.id)
  const base = `/shows/${show.id}`
  if (isJudge) {
    links.push({ href: `${base}/judge/events`, label: 'Judging' })
  }
  if (assignments.docs.some((event) => relationshipID(event.stewardId) === user.id)) {
    links.push({ href: `${base}/steward/events`, label: 'Stewarding' })
  }
  const catIds = ownerships.docs.map((ownership) => relationshipID(ownership.catId))
  if (catIds.length > 0) {
    const { totalDocs } = await payload.count({
      collection: 'catEventEntries',
      where: {
        and: [{ 'eventId.showId': { equals: show.id } }, { catId: { in: catIds } }],
      },
      overrideAccess: true,
    })
    if (totalDocs > 0) {
      links.push(
        { href: `${base}/exhibitor/entries`, label: 'My Entries' },
        { href: `${base}/exhibitor/alerts`, label: 'Alerts' },
      )
    }
  }
  return links
}

export async function getProfileLinks() {
  const user = await getCurrentUser()
  if (!user) return []
  return [{ href: '/cats', label: 'My Cats' }]
}
