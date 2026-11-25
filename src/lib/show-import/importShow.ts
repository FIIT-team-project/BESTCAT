import type { Payload, PayloadRequest } from 'payload'

import type { Show } from '@/payload-types'

import type { ShowImportData, ShowImportOptions, ShowImportResult } from './types'

export class ShowImportError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join(' '))
  }
}

const isDate = (value: string | undefined) =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

/** Event name shown to staff and exhibitors, e.g. "Sobota 1 – Judge A". */
export const eventName = (session: string, judgeCode: string) => `${session} – Judge ${judgeCode}`

async function checkOptions(
  payload: Payload,
  data: ShowImportData,
  options: ShowImportOptions,
  req?: Partial<PayloadRequest>,
) {
  const problems: string[] = []

  if (data.errors.length > 0)
    problems.push('The spreadsheet has errors. Fix them and upload it again.')

  for (const code of data.judgeCodes) {
    if (!options.judges[code]) problems.push(`Choose a judge for code ${code}.`)
  }
  for (const session of data.sessions) {
    if (!isDate(options.sessionDates[session])) problems.push(`Choose a date for "${session}".`)
  }

  const userIds = [
    ...Object.values(options.judges),
    ...Object.values(options.stewards ?? {}),
  ].filter((id): id is number => typeof id === 'number')
  if (userIds.length > 0) {
    const { docs } = await payload.find({
      collection: 'users',
      where: { id: { in: [...new Set(userIds)] } },
      depth: 0,
      limit: 0,
      pagination: false,
      select: {},
      req,
    })
    const found = new Set(docs.map((user) => user.id))
    for (const id of userIds) {
      if (!found.has(id)) problems.push(`User ${id} does not exist.`)
    }
  }

  if (problems.length > 0) throw new ShowImportError([...new Set(problems)])
}

/** Deletes the events of a show, their entries, and cats that are no longer entered anywhere. */
async function deleteEvents(payload: Payload, eventIds: number[], req?: Partial<PayloadRequest>) {
  if (eventIds.length === 0) return

  const { docs: entries } = await payload.find({
    collection: 'cat-event-entries',
    where: { event: { in: eventIds } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const catIds = [...new Set(entries.map((entry) => entry.cat as number))]

  await payload.delete({ collection: 'cat-event-entries', where: { event: { in: eventIds } }, req })
  await payload.delete({ collection: 'events', where: { id: { in: eventIds } }, req })

  if (catIds.length === 0) return
  const { docs: remaining } = await payload.find({
    collection: 'cat-event-entries',
    where: { cat: { in: catIds } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const stillEntered = new Set(remaining.map((entry) => entry.cat as number))
  const orphanCatIds = catIds.filter((id) => !stillEntered.has(id))
  if (orphanCatIds.length > 0) {
    await payload.delete({ collection: 'cats', where: { id: { in: orphanCatIds } }, req })
  }
}

/**
 * Creates the cats, table judging events and queue entries of a show from imported data.
 *
 * Events previously imported into the show are replaced, together with their entries and cats.
 * The new data is written first and the old data is deleted only after that succeeds, so a failed
 * import leaves the show as it was.
 */
export async function importShow(
  payload: Payload,
  {
    show,
    data,
    options,
    req,
  }: {
    show: Pick<Show, 'id'>
    data: ShowImportData
    options: ShowImportOptions
    req?: Partial<PayloadRequest>
  },
): Promise<ShowImportResult> {
  await checkOptions(payload, data, options, req)

  // Only table judging is imported; ring and BIS events of the show are left alone.
  const { docs: previousEvents } = await payload.find({
    collection: 'events',
    where: { and: [{ show: { equals: show.id } }, { event_type: { equals: 'table' } }] },
    depth: 0,
    limit: 0,
    pagination: false,
    select: {},
    req,
  })

  if (previousEvents.length > 0) {
    const { totalDocs: startedEntries } = await payload.count({
      collection: 'cat-event-entries',
      where: {
        and: [
          { event: { in: previousEvents.map((event) => event.id) } },
          { cat_status: { not_equals: 'registered' } },
        ],
      },
      req,
    })
    if (startedEntries > 0) {
      throw new ShowImportError([
        'Judging of this show has already started, so its events cannot be replaced by an import.',
      ])
    }
  }

  const created = { cats: [] as number[], events: [] as number[] }

  try {
    const catIds = new Map<number, number>()
    for (const cat of data.cats) {
      const doc = await payload.create({
        collection: 'cats',
        data: {
          catalog_number: cat.catalogNumber,
          breed: cat.breed,
          color: cat.color,
          sex: cat.sex,
          show_class: cat.showClass,
          wcf_group: cat.wcfGroup,
          category: cat.category,
          name: cat.name,
          birthday: cat.birthday,
          wcf_id: cat.wcfId,
        },
        depth: 0,
        req,
      })
      created.cats.push(doc.id)
      catIds.set(cat.catalogNumber, doc.id)
    }

    let entries = 0
    for (const session of data.sessions) {
      for (const code of data.judgeCodes) {
        const cats = data.cats
          .filter((cat) => cat.judges[session] === code)
          .sort((a, b) => a.catalogNumber - b.catalogNumber)
        if (cats.length === 0) continue

        const event = await payload.create({
          collection: 'events',
          data: {
            show: show.id,
            name: eventName(session, code),
            event_type: 'table',
            // Stored like the admin date picker (dayOnly) stores dates: noon UTC.
            event_date: `${options.sessionDates[session]}T12:00:00.000Z`,
            judge: options.judges[code],
            steward: options.stewards?.[code] ?? undefined,
          },
          depth: 0,
          req,
        })
        created.events.push(event.id)

        for (const [index, cat] of cats.entries()) {
          await payload.create({
            collection: 'cat-event-entries',
            data: {
              cat: catIds.get(cat.catalogNumber)!,
              event: event.id,
              queue_number: index + 1,
              cat_status: 'registered',
            },
            depth: 0,
            req,
          })
          entries++
        }
      }
    }

    await deleteEvents(
      payload,
      previousEvents.map((event) => event.id),
      req,
    )

    return {
      cats: created.cats.length,
      events: created.events.length,
      entries,
      replacedEvents: previousEvents.length,
    }
  } catch (error) {
    await deleteEvents(payload, created.events, req)
    // Cats created before the first event have no entries yet.
    if (created.cats.length > 0) {
      await payload.delete({ collection: 'cats', where: { id: { in: created.cats } }, req })
    }
    throw error
  }
}
