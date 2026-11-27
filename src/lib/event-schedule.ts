export const eventStatusLabels = {
  planned: 'Planned',
  ongoing: 'Ongoing',
  finished: 'Finished',
} as const

export const isEventTime = (value: unknown) =>
  typeof value === 'string' && value.length === 5 && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)

const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

export const formatScheduleDate = (date: string) => dateFormatter.format(new Date(date))

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
