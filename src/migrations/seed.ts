import { fetchCatImages } from '@/lib/fetchCatImages'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import type { User } from '@/payload-types'

// Fictional fixtures, using WCF breed/colour codes and judging terminology:
// https://wcf.de/pdf-en/WCF-EMS_EN.pdf
// https://wcf.de/pdf-en/Showrules_EN_2026.pdf
const breeds = [
  { code: 'PER', colors: ['n', 'a', 'd'] },
  { code: 'BLH', colors: ['a', 'n', 'e'] },
  { code: 'MCO', colors: ['n 22', 'd 22', 'a 22'] },
  { code: 'NFO', colors: ['n 09 23', 'd 09 23', 'a 09 23'] },
  { code: 'BRI', colors: ['a', 'n', 'c'] },
  { code: 'BEN', colors: ['n 24', 'n 22'] },
  { code: 'RUS', colors: ['a'] },
  { code: 'SIA', colors: ['n', 'a', 'b'] },
  { code: 'OSH', colors: ['n', 'a', 'b'] },
  { code: 'SPH', colors: ['n', 'a', 'd'] },
]
const catNames = [
  'Luna',
  'Milo',
  'Bella',
  'Leo',
  'Nala',
  'Oscar',
  'Cleo',
  'Felix',
  'Stella',
  'Jasper',
  'Ruby',
  'Oliver',
  'Iris',
  'Theo',
  'Willow',
]
const catteries = [
  'Silver Meadow',
  'Amber Grove',
  'Moonlit Valley',
  'Velvet Paws',
  'Golden Orchard',
  'Crystal Brook',
  'Autumn Willow',
  'Starlight Garden',
  'Blue Horizon',
  'Snowy Summit',
]
const countries = ['SK', 'CZ', 'HU', 'AT', 'DE']
const firstNames = ['Anna', 'Martin', 'Eva', 'Peter', 'Sofia']
const lastNames = ['Novak', 'Kovac', 'Horvat', 'Bauer']
const catIDs = Array.from({ length: 150 }, (_, i) => `DEMO-${String(i + 1).padStart(4, '0')}`)
const chiefEmails = Array.from({ length: 3 }, (_, i) => `chief-${i + 1}@example.com`)
const judgeEmails = Array.from({ length: 5 }, (_, i) => `judge-${i + 1}@example.com`)
const stewardEmails = Array.from({ length: 5 }, (_, i) => `steward-${i + 1}@example.com`)
const ownerEmails = Array.from({ length: 20 }, (_, i) => `owner-${i + 1}@example.com`)
const eventName = (show: number, table: number) =>
  `Demo show ${show + 1} - ${table < 5 ? `Traditional table ${table + 1}` : 'WCF adult ring'}`
const eventNames = Array.from({ length: 3 }, (_, show) =>
  Array.from({ length: 6 }, (_, table) => eventName(show, table)),
).flat()

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  // Resolve all unique photos before creating any records.
  const imageUrls = await fetchCatImages(catIDs.length)

  const createUser = (
    data: Pick<User, 'email' | 'name' | 'judgingQualifications'> & {
      role?: User['role']
      password?: string
    },
  ) =>
    payload.create({
      collection: 'users',
      data: { role: 'user', password: 'demo1234', ...data },
      overrideAccess: true,
      req,
    })

  await createUser({
    email: 'admin@example.com',
    name: 'Demo Admin',
    role: 'admin',
    password: 'admin',
  })

  const chiefs: User[] = []
  const judges: User[] = []
  const stewards: User[] = []
  const owners: User[] = []
  for (const [i, email] of chiefEmails.entries()) {
    chiefs.push(await createUser({ email, name: `Demo Chief Steward ${i + 1}` }))
  }
  for (const [i, email] of judgeEmails.entries()) {
    judges.push(
      await createUser({
        email,
        name: `Demo Judge ${i + 1}`,
        judgingQualifications: 'AB (Allbreed) - sample qualification',
      }),
    )
  }
  for (const [i, email] of stewardEmails.entries()) {
    stewards.push(await createUser({ email, name: `Demo Steward ${i + 1}` }))
  }
  for (const [i, email] of ownerEmails.entries()) {
    owners.push(
      await createUser({
        email,
        name: `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length)]}`,
      }),
    )
  }

  const cats = []
  for (let i = 0; i < catIDs.length; i++) {
    const breed = breeds[i % breeds.length]
    const variation = Math.floor(i / breeds.length)
    const cat = await payload.create({
      collection: 'cats',
      data: {
        wcfId: catIDs[i],
        name: `${catNames[variation]} of ${catteries[i % catteries.length]}`,
        imageUrl: imageUrls[i],
        birthday: new Date(Date.UTC(2022 + (i % 4), i % 12, 1 + (i % 28))).toISOString(),
        country: countries[i % countries.length],
        club: `Demo Cat Club ${countries[i % countries.length]}`,
        sex: (i + variation) % 2 === 0 ? 'female' : 'male',
        breed: breed.code,
        color: breed.colors[variation % breed.colors.length],
      },
      overrideAccess: true,
      req,
    })
    cats.push(cat)
    await payload.create({
      collection: 'catOwners',
      data: { userId: owners[i % owners.length].id, catId: cat.id },
      overrideAccess: true,
      req,
    })
    // Ten cats have a second owner to exercise shared ownership.
    if (i % 15 === 0) {
      await payload.create({
        collection: 'catOwners',
        data: { userId: owners[(i + 1) % owners.length].id, catId: cat.id },
        overrideAccess: true,
        req,
      })
    }
  }

  // The first show is in progress; the others demonstrate completed and planned queues.
  for (let showIndex = 0; showIndex < 3; showIndex++) {
    const show = await payload.create({
      collection: 'shows',
      data: { chiefStewardId: chiefs[showIndex].id, isActive: showIndex === 0 },
      overrideAccess: true,
      req,
    })
    for (let table = 0; table < 6; table++) {
      const isRing = table === 5
      const event = await payload.create({
        collection: 'events',
        data: {
          showId: show.id,
          judgeId: judges[table % judges.length].id,
          stewardId: stewards[table % stewards.length].id,
          name: eventName(showIndex, table),
          eventType: isRing ? 'wcfRingAdults' : 'traditionalJudging',
          eventRating: isRing ? 'rankingTop10' : 'qualification',
        },
        overrideAccess: true,
        req,
      })
      // Five traditional tables have 30 cats each (under WCF's 40 per judge/day).
      // Thirty adults also enter the optional ring, demonstrating multiple entries.
      const participants = cats.filter((_, i) => i % 5 === (isRing ? 0 : table))
      for (const [position, cat] of participants.entries()) {
        const completed = showIndex === 1 || (showIndex === 0 && !isRing && position < 6)
        const status = completed
          ? 'completed'
          : showIndex === 0 && !isRing && position === 6
            ? 'judging'
            : showIndex === 0 && !isRing && position === 7
              ? 'called'
              : 'queued'
        await payload.create({
          collection: 'catEventEntries',
          data: {
            catId: cat.id,
            eventId: event.id,
            queuePosition: position + 1,
            status,
            rating: completed
              ? isRing
                ? position < 10
                  ? String(position + 1)
                  : null
                : 'Excellent'
              : null,
          },
          overrideAccess: true,
          req,
        })
      }
    }
  }

  payload.logger.info(
    'Seeded 34 users, 150 cats, 160 ownerships, 3 shows, 18 events, and 540 entries.',
  )
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  const events = await payload.find({
    collection: 'events',
    where: { name: { in: eventNames } },
    depth: 0,
    pagination: false,
    limit: 0,
    overrideAccess: true,
    req,
  })
  const eventIDs = events.docs.map((event) => event.id)
  const showIDs = events.docs.map((event) =>
    typeof event.showId === 'object' ? event.showId.id : event.showId,
  )
  await payload.delete({
    collection: 'catEventEntries',
    where: { and: [{ eventId: { in: eventIDs } }, { 'catId.wcfId': { in: catIDs } }] },
    overrideAccess: true,
    req,
  })
  await payload.delete({
    collection: 'catOwners',
    where: { and: [{ 'userId.email': { in: ownerEmails } }, { 'catId.wcfId': { in: catIDs } }] },
    overrideAccess: true,
    req,
  })
  await payload.delete({
    collection: 'events',
    where: { id: { in: eventIDs } },
    overrideAccess: true,
    req,
  })
  await payload.delete({
    collection: 'shows',
    where: { id: { in: showIDs } },
    overrideAccess: true,
    req,
  })
  await payload.delete({
    collection: 'cats',
    where: { wcfId: { in: catIDs } },
    overrideAccess: true,
    req,
  })
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        in: ['admin@example.com', ...chiefEmails, ...judgeEmails, ...stewardEmails, ...ownerEmails],
      },
    },
    overrideAccess: true,
    req,
  })
}
