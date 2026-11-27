import type { Metadata } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { findPublicTableQueues } from '@/lib/events/public-queues'
import { getFrontendSession } from '@/lib/frontend-session'
import { findActiveShow, findShowEvents } from '@/lib/shows'

export const metadata: Metadata = { title: 'Live Calling' }

export default async function CallingBoardPage() {
  const { payload } = await getFrontendSession()
  const show = await findActiveShow(payload)
  const events = show ? await findShowEvents(payload, show.id) : []
  const ongoing = events.filter((event) => event.status === 'ongoing')
  const queues = await findPublicTableQueues(
    payload,
    ongoing.filter((event) => event.event_type === 'table').map((event) => event.id),
  )

  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-4 p-4 sm:p-6">
      <nav aria-label="Show views" className="flex flex-wrap gap-1">
        <Link
          href="/live-calling"
          aria-current="page"
          className={buttonVariants({ variant: 'secondary' })}
        >
          Live Calling
        </Link>
        <Link href="/schedule" className={buttonVariants({ variant: 'ghost' })}>
          Schedule
        </Link>
      </nav>

      {ongoing.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {ongoing.map((event) => {
            const queue = queues.get(event.id)

            return (
              <li key={event.id} className="min-w-0">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <h2 className="text-xl font-semibold">{event.name}</h2>
                    </CardTitle>
                  </CardHeader>
                  {queue && (
                    <CardContent className="flex flex-col gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Now called</p>
                        {queue.current === null ? (
                          <p className="text-lg">No cat called</p>
                        ) : (
                          <p className="text-5xl font-semibold tabular-nums lg:text-6xl">
                            #{queue.current}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Up next</p>
                        {queue.upcoming.length > 0 ? (
                          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-2xl font-semibold tabular-nums">
                            {queue.upcoming.map((number, index) => (
                              <li key={`${number}-${index}`}>#{number}</li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-lg">No cats waiting</p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {show ? 'No events are ongoing.' : 'No show is currently active.'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
