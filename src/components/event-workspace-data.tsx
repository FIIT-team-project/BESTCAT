import config from '@payload-config'
import { getPayload } from 'payload'
import { requireUser } from '@/lib/getCurrentUser'
import { EventWorkspace } from './event-workspace'

export async function EventWorkspaceData({
  eventID,
  view,
  eventPath,
  canJudge,
}: {
  eventID: number
  view: 'judge' | 'steward'
  eventPath?: string
  canJudge?: boolean
}) {
  const user = await requireUser()
  const payload = await getPayload({ config })
  const { docs: entries } = await payload.find({
    collection: 'catEventEntries',
    where: {
      and: [
        { eventId: { equals: eventID } },
        ...(view === 'judge' ? [{ status: { equals: 'judging' } }] : []),
      ],
    },
    user,
    overrideAccess: false,
    depth: 1,
    pagination: view === 'judge',
    ...(view === 'judge' ? { limit: 1 } : {}),
    sort: ['queuePosition', 'id'],
  })
  return (
    <EventWorkspace
      key={JSON.stringify(entries)}
      eventID={eventID}
      entries={entries}
      view={view}
      eventPath={eventPath}
      canJudge={canJudge}
    />
  )
}
