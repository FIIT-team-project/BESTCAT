import config from '@payload-config'
import { getPayload } from 'payload'
import { relationshipID } from '@/collections/access/shows'
import { EventWorkspaceData } from '@/components/event-workspace-data'
import { requireEventAssignment } from '@/lib/requireEventAssignment'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>
}) {
  const { eventId } = await params
  const event = await requireEventAssignment(eventId, 'judge')
  const payload = await getPayload({ config })
  // Assignment is checked above; expose only this event's assigned steward name.
  const { docs: stewards } = await payload.find({
    collection: 'users',
    where: { id: { equals: relationshipID(event.stewardId) } },
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
            Your Steward: {stewards[0]?.name || 'Name unavailable'}
          </p>
        </div>
      </div>
      <EventWorkspaceData eventID={event.id} view="judge" eventPath={eventPath} canJudge />
    </div>
  )
}
