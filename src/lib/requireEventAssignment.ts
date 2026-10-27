import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { requireUser } from './getCurrentUser'

export async function requireEventAssignment(id: string, view: 'judge' | 'steward') {
  const user = await requireUser()
  const eventID = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(eventID) || eventID <= 0) notFound()

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'events',
    where: {
      and: [
        { id: { equals: eventID } },
        view === 'judge'
          ? { judgeId: { equals: user.id } }
          : { or: [{ judgeId: { equals: user.id } }, { stewardId: { equals: user.id } }] },
      ],
    },
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
  })
  if (!docs[0]) notFound()
  return docs[0]
}
