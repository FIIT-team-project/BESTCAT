import type { Metadata } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { formatScheduleDate } from '@/lib/event-schedule'
import { requireExhibitor } from '@/lib/exhibitor/currentUser'
import { findActiveShow } from '@/lib/shows'

import { AuthForm } from '../../(auth)/auth-form'

export const metadata: Metadata = { title: 'Current show' }

export default async function ShowHomePage() {
  const { payload, user } = await requireExhibitor()
  const show = await findActiveShow(payload, user)
  const start = show?.start_date && formatScheduleDate(show.start_date)
  const end = show?.end_date && formatScheduleDate(show.end_date)

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Current show</h1>
        <AuthForm mode="logout" />
      </header>

      {show ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{show.show_name}</h2>
            </CardTitle>
            <CardDescription>
              {start && end
                ? start === end
                  ? start
                  : `${start} – ${end}`
                : 'Show dates to be announced.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/show-event" className={buttonVariants()}>
              View all events
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No show is currently active.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}
