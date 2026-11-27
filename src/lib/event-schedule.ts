export const eventStatusLabels = {
  planned: 'Planned',
  ongoing: 'Ongoing',
  finished: 'Finished',
} as const

const eventSections = [
  { status: 'ongoing', label: 'Ongoing' },
  { status: 'planned', label: 'Upcoming' },
  { status: 'finished', label: 'Finished' },
] as const

export function groupEventsByStatus<T extends { status: keyof typeof eventStatusLabels }>(
  events: T[],
) {
  return eventSections
    .map((section) => ({
      ...section,
      events: events.filter((event) => event.status === section.status),
    }))
    .filter((section) => section.events.length > 0)
}

const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

export const formatScheduleDate = (date: string) => dateFormatter.format(new Date(date))

const eventTimeZone = 'Europe/Bratislava'

const eventDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: eventTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const eventTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: eventTimeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const eventDay = (startsAt: string) => eventDayFormatter.format(new Date(startsAt))

// Payload normalizes dates to ISO timestamps. Reserve this subsecond value for dates
// imported without a time so the schedule can distinguish them from confirmed starts.
const unannouncedTime = 'T12:00:00.001Z'

export const eventStartForDay = (day: string) => `${day}${unannouncedTime}`

export const isEventStartDateOnly = (start: string) => start.endsWith(unannouncedTime)

export const eventTime = (start: string) =>
  isEventStartDateOnly(start) ? null : eventTimeFormatter.format(new Date(start))
