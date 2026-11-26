export const eventStatusLabels = {
  planned: 'Planned',
  ongoing: 'Ongoing',
  finished: 'Finished',
} as const

export const isEventTime = (value: unknown) =>
  typeof value === 'string' && value.length === 5 && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)

const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

export const formatScheduleDate = (date: string) => dateFormatter.format(new Date(date))
