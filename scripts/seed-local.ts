// Run on an empty local SQLite database with `pnpm payload run scripts/seed-local.ts`.
// All demo accounts use password.
import config from '@payload-config'
import { getPayload } from 'payload'

const databaseUrl = process.env.DATABASE_URL || 'file:./payload.db'
if (process.env.NODE_ENV === 'production' || !databaseUrl.startsWith('file:')) {
  throw new Error('This seeder requires a local development SQLite database.')
}

const payload = await getPayload({ config, disableOnInit: true })
const password = 'password'
const startDate = '2026-12-28'
const endDate = '2026-12-29'

const createUser = (email: string, name: string, phone_number?: string) =>
  payload.create({
    collection: 'users',
    data: { email, password, name, phone_number },
  })

try {
  for (const collection of [
    'users',
    'admins',
    'shows',
    'events',
    'cats',
    'cat-event-entries',
  ] as const) {
    const { totalDocs } = await payload.count({ collection })
    if (totalDocs > 0) throw new Error(`The ${collection} collection already contains data.`)
  }

  const owner = await createUser('owner@example.com', 'Owner', '+421 900 123 456')
  const otherOwner = await createUser('other@example.com', 'Other owner', '+421 900 654 321')
  const judge = await createUser('judge@example.com', 'Anna Nováková')
  const steward = await createUser('steward@example.com', 'Peter Steward')

  await payload.create({ collection: 'admins', data: { email: 'admin@example.com', password } })

  const show = await payload.create({
    collection: 'shows',
    data: {
      chief_steward: steward.id,
      organization: 'WORLD CAT FEDERATION',
      show_name: 'Jubilee show',
      city: 'Bratislava',
      country: 'Slovakia',
      license_number: 'L#244205',
      start_date: startDate,
      end_date: endDate,
      date_from: startDate,
      date_to: endDate,
      is_active: true,
    },
  })

  const event = await payload.create({
    collection: 'events',
    data: {
      show: show.id,
      judge: judge.id,
      steward: steward.id,
      name: 'Table 3',
      event_type: 'table',
      event_date: startDate,
      event_time: '10:00',
      status: 'ongoing',
      judgement_number: 1,
    },
  })

  const cats = [
    { name: 'Luna', breed: 'Maine Coon', number: 128, owner, status: 'called' },
    { name: 'Bella', breed: 'Siberian', number: 135, owner, status: 'waiting' },
    { name: 'Mimi', breed: 'British Shorthair', number: 162, owner, status: 'waiting' },
    { name: 'Oskar', breed: 'Ragdoll', number: 101, owner: otherOwner, status: 'waiting' },
    { name: 'Felix', breed: 'Siamese', number: 167, owner: otherOwner, status: 'absent' },
  ] as const

  for (const [index, cat] of cats.entries()) {
    const created = await payload.create({
      collection: 'cats',
      data: {
        name: cat.name,
        breed: cat.breed,
        color: 'Black',
        sex: index % 2 ? 'male' : 'female',
        birthday: '2023-03-18',
        owner: cat.owner.id,
        wcf_id: `WCF-${cat.number}`,
        catalog_number: cat.number,
        show_class: 'CAC',
      },
    })

    await payload.create({
      collection: 'cat-event-entries',
      data: {
        cat: created.id,
        event: event.id,
        queue_number: index + 1,
        cat_status: cat.status,
        called_at: cat.status === 'called' ? new Date().toISOString() : undefined,
      },
    })
  }
} finally {
  await payload.destroy()
}
