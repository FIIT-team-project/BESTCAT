import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { eventTypeLabels } from '@/lib/catStatus'
import { eventStatusLabels, formatScheduleDate, isEventTime } from '@/lib/event-schedule'
import { requireExhibitor } from '@/lib/exhibitor/currentUser'
import { findActiveShow, findShowEvents } from '@/lib/shows'

export const metadata: Metadata = { title: 'Show events' }

type SearchParams = Record<string, string | string[] | undefined>

const queryValue = (value: SearchParams[string]) => (typeof value === 'string' ? value.trim() : '')

export default async function ShowEventPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { payload, user } = await requireExhibitor()
  const show = await findActiveShow(payload, user)
  const params = await searchParams
  const q = queryValue(params.q)
  const date = queryValue(params.date)
  const fromTime = queryValue(params.fromTime)
  const toTime = queryValue(params.toTime)
  const type = queryValue(params.type)
  const filters = {
    date,
    fromTime: isEventTime(fromTime) ? fromTime : '',
    toTime: isEventTime(toTime) ? toTime : '',
    type: Object.hasOwn(eventTypeLabels, type) ? type : '',
  }
  const hasFilters = Object.values(filters).some(Boolean)
  const invalidTimeRange = filters.fromTime && filters.toTime && filters.fromTime > filters.toTime
  const search = q.toLowerCase()
  const events = show ? await findShowEvents(payload, user, show.id) : []
  const results = events.filter((event) => {
    const eventTime = event.event_time
    return (
      event.name.toLowerCase().includes(search) &&
      (!filters.date || event.event_date.slice(0, 10) === filters.date) &&
      (!filters.type || event.event_type === filters.type) &&
      (!filters.fromTime || (eventTime && eventTime >= filters.fromTime)) &&
      (!filters.toTime || (eventTime && eventTime <= filters.toTime))
    )
  })

  return (
    <>
      <header>
        <Link href="/exhibitor" className="text-sm underline-offset-4 hover:underline">
          ← Current show
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Show events</h1>
        {show && <p className="text-sm text-muted-foreground">{show.show_name}</p>}
      </header>

      {show && (
        <div className="flex items-center gap-2">
          <Form action="/exhibitor/events" className="min-w-0 flex-1" role="search" key={q}>
            {Object.entries(filters).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="event-search" className="sr-only">
                  Search events
                </FieldLabel>
                <Input
                  id="event-search"
                  name="q"
                  type="search"
                  placeholder="Search events"
                  defaultValue={q}
                />
                <Button type="submit">Search</Button>
              </Field>
            </FieldGroup>
          </Form>

          <Popover key={JSON.stringify(filters)}>
            <PopoverTrigger render={<Button variant={hasFilters ? 'secondary' : 'outline'} />}>
              Filters
            </PopoverTrigger>
            <PopoverContent align="end">
              <PopoverTitle>Filter events</PopoverTitle>
              <Form action="/exhibitor/events">
                <input type="hidden" name="q" value={q} />
                <FieldGroup className="gap-3">
                  <Field>
                    <FieldLabel htmlFor="event-date">Date</FieldLabel>
                    <Input id="event-date" name="date" type="date" defaultValue={filters.date} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="event-from">From time</FieldLabel>
                    <Input
                      id="event-from"
                      name="fromTime"
                      type="time"
                      defaultValue={filters.fromTime}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="event-to">To time</FieldLabel>
                    <Input id="event-to" name="toTime" type="time" defaultValue={filters.toTime} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="event-type">Event type</FieldLabel>
                    <NativeSelect id="event-type" name="type" defaultValue={filters.type}>
                      <NativeSelectOption value="">All types</NativeSelectOption>
                      {Object.entries(eventTypeLabels).map(([value, label]) => (
                        <NativeSelectOption key={value} value={value}>
                          {label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit">Apply filters</Button>
                    {hasFilters && (
                      <Link
                        href={{ pathname: '/exhibitor/events', query: q ? { q } : undefined }}
                        className={buttonVariants({ variant: 'outline' })}
                      >
                        Clear filters
                      </Link>
                    )}
                  </div>
                </FieldGroup>
              </Form>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {invalidTimeRange ? (
        <p role="alert" className="text-sm text-destructive">
          To time must be at or after from time.
        </p>
      ) : results.length ? (
        <ol aria-label="Event schedule" className="flex flex-col gap-3">
          {results.map((event) => (
            <li key={event.id}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>
                    <h2>{event.name}</h2>
                  </CardTitle>
                  <CardDescription>
                    <time dateTime={event.event_date.slice(0, 10)}>
                      {formatScheduleDate(event.event_date)}
                    </time>
                    {' · '}
                    {event.event_time ? <time>{event.event_time}</time> : 'Time to be announced'}
                    {' · '}
                    {eventTypeLabels[event.event_type]}
                  </CardDescription>
                  <CardAction>
                    <Badge variant={event.status === 'ongoing' ? 'default' : 'secondary'}>
                      {eventStatusLabels[event.status]}
                    </Badge>
                  </CardAction>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {!show
                ? 'No show is currently active.'
                : hasFilters || q
                  ? 'No events match your search or filters.'
                  : 'No events are scheduled.'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}
