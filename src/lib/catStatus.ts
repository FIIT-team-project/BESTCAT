import type { CatEventEntry, Event } from '@/payload-types'

export type CatStatus = CatEventEntry['cat_status']

/** The normal progress of a cat through an event, in order. */
export const catStatusSteps = [
  {
    value: 'registered',
    label: 'Registered',
    description: 'Your cat was accepted',
  },
  {
    value: 'waiting',
    label: 'Waiting',
    description: 'Wait until you are called',
  },
  {
    value: 'called',
    label: 'Called',
    description: 'Bring your cat to the judge',
  },
  {
    value: 'exhibited',
    label: 'Exhibited',
    description: 'Wait for the rating',
  },
  {
    value: 'rated',
    label: 'Rated',
    description: 'Your cat received a rating',
  },
] as const satisfies { value: CatStatus; label: string; description: string }[]

export const absentStatus = {
  value: 'absent',
  label: 'Absent',
  description: 'Your cat did not come when called',
} as const satisfies { value: CatStatus; label: string; description: string }

export const getCatStatus = (status: CatStatus) =>
  status === 'absent'
    ? absentStatus
    : (catStatusSteps.find((step) => step.value === status) ?? catStatusSteps[0])

export const eventTypeLabels: Record<Event['event_type'], string> = {
  table: 'Table judging',
  ring: 'Ring',
  bis: 'Best in Show',
}

const timeFormat = new Intl.DateTimeFormat('sk-SK', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Bratislava',
})

export const formatTime = (value?: string | null) =>
  value ? timeFormat.format(new Date(value)) : ''
