import config from '@payload-config'
import { getPayload } from 'payload'
import { EventWorkspaceData } from '@/components/event-workspace-data'
import { requireEventAssignment } from '@/lib/requireEventAssignment'
import { requireUser } from '@/lib/getCurrentUser'
import { relationshipID } from '@/collections/access/shows'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>
}) {
  const { eventId } = await params
  const event = await requireEventAssignment(eventId, 'steward')
  const user = await requireUser()
  const canJudge = relationshipID(event.judgeId) === user.id
  const payload = await getPayload({ config })
  // Assignment is checked above; expose only this event's assigned staff name.
  const { docs: staff } = await payload.find({
    collection: 'users',
    where: { id: { equals: relationshipID(canJudge ? event.stewardId : event.judgeId) } },
    select: { name: true },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const eventPath = `/shows/${relationshipID(event.showId)}/events/${event.id}`

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{event.name || `Event ${event.id}`}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canJudge ? 'Your Steward' : 'Your Judge'}: {staff[0]?.name || 'Name unavailable'}
          </p>
        </div>
      </div>
      <EventWorkspaceData
        eventID={event.id}
        view="steward"
        eventPath={eventPath}
        canJudge={canJudge}
      />
    </div>
  )
}
