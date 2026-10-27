import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'
import { hasRole } from './roles'

export function relationshipID(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    return relationshipID(value.id)
  }
  return undefined
}

export async function isShowAdministrator(req: PayloadRequest): Promise<boolean> {
  if (hasRole(req.user, 'admin')) return true
  if (!req.user) return false

  // Permission lookups intentionally bypass access to avoid recursive checks.
  const { totalDocs } = await req.payload.count({
    collection: 'shows',
    where: { chiefStewardId: { equals: req.user.id } },
    overrideAccess: true,
    req,
  })
  return totalDocs > 0
}

export const showAdministrators = ({ req }: { req: PayloadRequest }) => isShowAdministrator(req)

export const manageShows: Access = ({ req: { user } }) => {
  if (hasRole(user, 'admin')) return true
  if (!user) return false
  return { chiefStewardId: { equals: user.id } }
}

export function eventScope(userID: number, prefix = ''): Where {
  return {
    or: [
      { [`${prefix}showId.chiefStewardId`]: { equals: userID } },
      { [`${prefix}judgeId`]: { equals: userID } },
      { [`${prefix}stewardId`]: { equals: userID } },
    ],
  }
}

export const readShows: Access = async ({ req }) => {
  if (hasRole(req.user, 'admin')) return true
  if (!req.user) return false

  const { docs } = await req.payload.find({
    collection: 'events',
    where: {
      or: [{ judgeId: { equals: req.user.id } }, { stewardId: { equals: req.user.id } }],
    },
    select: { showId: true },
    depth: 0,
    pagination: false,
    limit: 0,
    overrideAccess: true,
    req,
  })
  const scope: Where = {
    or: [
      { chiefStewardId: { equals: req.user.id } },
      { id: { in: docs.map((event) => relationshipID(event.showId)) } },
    ],
  }
  return scope
}

export const readEvents: Access = ({ req: { user } }) => {
  if (hasRole(user, 'admin')) return true
  return user ? eventScope(user.id) : false
}

export const manageEvents: Access = ({ req: { user } }) => {
  if (hasRole(user, 'admin')) return true
  if (!user) return false
  return { 'showId.chiefStewardId': { equals: user.id } }
}

export const createEvent: Access = async ({ req, data }) => {
  if (hasRole(req.user, 'admin')) return true
  if (!data) return isShowAdministrator(req)
  const showID = relationshipID(data?.showId)
  if (!req.user || showID === undefined) return false

  const { totalDocs } = await req.payload.count({
    collection: 'shows',
    where: {
      and: [{ id: { equals: showID } }, { chiefStewardId: { equals: req.user.id } }],
    },
    overrideAccess: true,
    req,
  })
  return totalDocs > 0
}

export const readEntries: Access = ({ req: { user } }) => {
  if (hasRole(user, 'admin')) return true
  return user ? eventScope(user.id, 'eventId.') : false
}

export const manageEntries: Access = ({ req: { user } }) => {
  if (hasRole(user, 'admin')) return true
  if (!user) return false
  return { 'eventId.showId.chiefStewardId': { equals: user.id } }
}

async function canEditEntry(
  req: PayloadRequest,
  eventID: unknown,
  staff?: 'judgeId' | 'stewardId',
): Promise<boolean> {
  if (hasRole(req.user, 'admin')) return true
  const id = relationshipID(eventID)
  if (!req.user || id === undefined) return false

  const permissions: Where[] = [{ 'showId.chiefStewardId': { equals: req.user.id } }]
  if (staff) permissions.push({ [staff]: { equals: req.user.id } })

  const { totalDocs } = await req.payload.count({
    collection: 'events',
    where: { and: [{ id: { equals: id } }, { or: permissions }] },
    overrideAccess: true,
    req,
  })
  return totalDocs > 0
}

export const createEntry: Access = ({ req, data }) =>
  data ? canEditEntry(req, data.eventId) : isShowAdministrator(req)

// On update, use the stored document so submitted relationship IDs cannot grant access.
export const editEntryCat: FieldAccess = ({ req, doc }) => canEditEntry(req, doc?.eventId)
export const rateEntry: FieldAccess = ({ req, doc }) => canEditEntry(req, doc?.eventId, 'judgeId')
export const queueEntry: FieldAccess = ({ req, doc }) =>
  canEditEntry(req, doc?.eventId, 'stewardId')
