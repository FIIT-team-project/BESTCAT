import 'dotenv/config'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { parseCatalogCSV } from '@/seed/parseCatalogCSV'

const csvPath = path.resolve(process.env.SEED_CATALOG_CSV_PATH || '../judges(format 2).csv')
const pdfPath = path.resolve(process.env.SEED_CATALOG_PDF_PATH || '../Catalog_20241228.pdf')

async function findOne(payload: Payload, collection: string, field: string, value: string | number) {
  const result = await payload.find({
    collection: collection as never,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return result.docs[0] as { id: number } | undefined
}

async function upsert(
  payload: Payload,
  collection: string,
  field: string,
  value: string | number,
  data: Record<string, unknown>,
) {
  const existing = await findOne(payload, collection, field, value)
  if (existing) {
    return payload.update({ collection: collection as never, id: existing.id, data: data as never, depth: 0, overrideAccess: true }) as Promise<{ id: number }>
  }
  return payload.create({ collection: collection as never, data: data as never, depth: 0, overrideAccess: true }) as Promise<{ id: number }>
}

async function uploadSource(payload: Payload, filePath: string, documentType: 'catalog' | 'import') {
  const name = path.basename(filePath)
  const existing = await findOne(payload, 'media', 'filename', name)
  if (existing) return existing

  const data = await readFile(filePath)
  const mimetype = path.extname(filePath).toLowerCase() === '.pdf' ? 'application/pdf' : 'text/csv'
  return payload.create({
    collection: 'media',
    data: { alt: name, documentType },
    file: { data, mimetype, name, size: data.byteLength },
    overrideAccess: true,
  })
}

async function seed() {
  const payload = await getPayload({ config })
  const csv = await readFile(csvPath, 'utf8')
  const entries = parseCatalogCSV(csv)

  if (entries.length !== 121) {
    throw new Error(`Očakával som 121 prihlášok, parser našiel ${entries.length}. Seed bol zastavený.`)
  }

  const admin = await upsert(payload, 'users', 'email', process.env.AUTH_EMAIL || 'admin@bestcat.sk', {
    email: process.env.AUTH_EMAIL || 'admin@bestcat.sk',
    password: process.env.AUTH_PASSWORD || 'Bestcat123!',
    name: process.env.AUTH_NAME || 'BESTCAT Admin',
    role: 'admin',
    active: true,
  })

  const club = await upsert(payload, 'clubs', 'code', 'TFS SK-0393', {
    name: 'Terra Felis Slovakia',
    code: 'TFS SK-0393',
    federation: 'WCF',
    country: 'Slovakia',
    region: 'Trnavský kraj',
    active: true,
  })

  await payload.update({ collection: 'users', id: admin.id, data: { club: club.id }, overrideAccess: true })

  const catalogMedia = await uploadSource(payload, pdfPath, 'catalog')
  const csvMedia = await uploadSource(payload, csvPath, 'import')

  const exhibition = await upsert(payload, 'exhibitions', 'slug', 'jubilee-show-2024', {
    title: 'Jubilee Show',
    slug: 'jubilee-show-2024',
    club: club.id,
    startDate: '2024-12-28T00:00:00.000Z',
    endDate: '2024-12-29T00:00:00.000Z',
    licenseNumber: 'L#244205',
    city: 'Hrnčiarovce nad Parnou',
    country: 'Slovakia',
    region: 'Trnavský kraj',
    status: 'completed',
    catalog: catalogMedia.id,
  })

  await upsert(payload, 'import-batches', 'key', 'jubilee-show-2024-pdf', {
    key: 'jubilee-show-2024-pdf',
    exhibition: exhibition.id,
    sourceName: path.basename(pdfPath),
    sourceType: 'pdf',
    sourceFile: catalogMedia.id,
    status: 'completed',
    totalRows: 0,
    successfulRows: 0,
    failedRows: 0,
    messages: [{ level: 'info', message: 'PDF katalóg bol uložený ako zdrojový dokument výstavy.' }],
  })

  const csvBatch = await upsert(payload, 'import-batches', 'key', 'jubilee-show-2024-csv', {
    key: 'jubilee-show-2024-csv',
    exhibition: exhibition.id,
    sourceName: path.basename(csvPath),
    sourceType: 'csv',
    sourceFile: csvMedia.id,
    status: 'processing',
    totalRows: entries.length,
    successfulRows: 0,
    failedRows: 0,
    messages: [{ level: 'info', message: 'Katalógové dáta boli načítané z dodaného CSV súboru.' }],
  })

  const groupOrder = new Map([
    ['LONGHAIR', 10],
    ['SEMILONGHAIR', 20],
    ['SHORTHAIR', 30],
    ['ORIENTAL GROUP', 40],
    ['HAIRLESS', 50],
  ])
  const groups = new Map<string, number>()
  const breeds = new Map<string, number>()
  const owners = new Map<string, number>()

  for (const entry of entries) {
    if (!groups.has(entry.group)) {
      const group = await upsert(payload, 'breed-groups', 'slug', entry.group.toLowerCase().replaceAll(' ', '-'), {
        name: entry.group,
        slug: entry.group.toLowerCase().replaceAll(' ', '-'),
        sortOrder: groupOrder.get(entry.group) ?? 100,
      })
      groups.set(entry.group, group.id)
    }

    if (!breeds.has(entry.breedCode)) {
      const breed = await upsert(payload, 'breeds', 'code', entry.breedCode, {
        code: entry.breedCode,
        name: entry.breedName,
        group: groups.get(entry.group),
        recognizedByWcf: true,
      })
      breeds.set(entry.breedCode, breed.id)
    }

    if (!owners.has(entry.ownerName)) {
      const owner = await upsert(payload, 'owners', 'name', entry.ownerName, { name: entry.ownerName })
      owners.set(entry.ownerName, owner.id)
    }

    const cat = await upsert(payload, 'cats', entry.wcfId ? 'wcfId' : 'name', entry.wcfId || entry.catName, {
      name: entry.catName,
      wcfId: entry.wcfId,
      breed: breeds.get(entry.breedCode),
      emsCode: entry.colorCode,
      colorDescription: entry.colorDescription,
      sex: entry.sex,
      birthDate: entry.birthDate,
      sire: entry.sire,
      dam: entry.dam,
      owner: owners.get(entry.ownerName),
      sourceSystem: 'wcf',
    })

    await upsert(payload, 'entries', 'externalKey', `jubilee-show-2024-${entry.catalogNumber}`, {
      externalKey: `jubilee-show-2024-${entry.catalogNumber}`,
      exhibition: exhibition.id,
      cat: cat.id,
      catalogNumber: entry.catalogNumber,
      showClass: entry.showClass,
      emsCode: entry.emsCode,
      ringTypes: entry.ringTypes.map((value) => ({ value })),
      status: 'completed',
      importBatch: csvBatch.id,
    })
  }

  await payload.update({
    collection: 'import-batches',
    id: csvBatch.id,
    data: { status: 'completed', successfulRows: entries.length, failedRows: 0 },
    overrideAccess: true,
  })

  payload.logger.info(`BESTCAT seed hotový: ${entries.length} prihlášok, ${breeds.size} plemien, ${owners.size} majiteľov.`)
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
