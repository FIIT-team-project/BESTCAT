'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ValidationError } from 'payload'

import { requireStaff } from '@/lib/events/currentStaff'
import { QueueError, callEntry, markEntryAbsent, rateEntry, revertEntry } from '@/lib/events/queue'

const getId = (data: FormData, name: string) => {
  const value = Number(data.get(name))
  return Number.isInteger(value) && value > 0 ? value : null
}

const getOptionalNumber = (data: FormData, name: string) => {
  const value = data.get(name)
  if (typeof value !== 'string' || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}

const getText = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

type QueueAction = typeof callEntry

/** Runs a queue change and refreshes the queue. Stale clicks (e.g. two stewards) are ignored. */
async function changeQueue(action: QueueAction, data: FormData) {
  const { payload, user } = await requireStaff()
  const entryId = getId(data, 'entryId')
  const eventId = getId(data, 'eventId')
  if (!entryId || !eventId) return

  try {
    await action(payload, user, entryId)
  } catch (error) {
    if (!(error instanceof QueueError)) throw error
    payload.logger.warn({ msg: error.message, entryId })
  }

  revalidatePath(`/staff/events/${eventId}/steward`)
  revalidatePath('/live-calling')
}

export async function callAction(data: FormData) {
  await changeQueue(callEntry, data)
}

export async function revertAction(data: FormData) {
  await changeQueue(revertEntry, data)
}

export async function absentAction(data: FormData) {
  await changeQueue(markEntryAbsent, data)
}

export type RatingState = { error?: string }

export async function rateAction(_state: RatingState, data: FormData): Promise<RatingState> {
  const { payload, user } = await requireStaff()
  const entryId = getId(data, 'entryId')
  const eventId = getId(data, 'eventId')
  if (!entryId || !eventId) return { error: 'This cat could not be found.' }

  const score = getOptionalNumber(data, 'score')
  const place = getOptionalNumber(data, 'place')
  if (Number.isNaN(score) || Number.isNaN(place)) return { error: 'Enter numbers only.' }

  try {
    await rateEntry(payload, user, entryId, {
      title: getText(data, 'title'),
      score,
      place,
      text_rating: getText(data, 'text_rating'),
    })
  } catch (error) {
    if (error instanceof QueueError) return { error: error.message }
    if (error instanceof ValidationError) {
      return { error: error.data.errors[0]?.message || 'Check the rating values.' }
    }
    throw error
  }

  revalidatePath(`/staff/events/${eventId}/steward`)
  revalidatePath('/live-calling')
  redirect(`/staff/events/${eventId}/steward`)
}
