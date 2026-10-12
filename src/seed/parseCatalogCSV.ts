export type CatalogEntry = {
  catalogNumber: number
  catName: string
  group: string
  emsCode: string
  showClass: string
  breedCode: string
  breedName: string
  colorCode: string
  colorDescription: string
  sex: 'male' | 'female' | 'male-neuter' | 'female-spay' | 'unknown'
  birthDate?: string
  sire?: string
  dam?: string
  ownerName: string
  ringTypes: string[]
  wcfId?: string
}

const groupNames = new Set(['LONGHAIR', 'SEMILONGHAIR', 'SHORTHAIR', 'ORIENTAL GROUP', 'HAIRLESS'])

function parseRow(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

const clean = (value = '') => value.replace(/^\uFEFF/, '').replace(/\u00a0/g, ' ').trim()

function valueAfterLabel(value: string, label: string): string | undefined {
  const cleaned = clean(value)
  const result = cleaned.startsWith(label) ? cleaned.slice(label.length).trim() : cleaned
  return result && result !== '-' ? result : undefined
}

function splitDescription(value: string): [string, string] {
  const [code, ...description] = clean(value).split(' - ')
  return [code, description.join(' - ')]
}

function parseDate(value: string): string | undefined {
  const raw = valueAfterLabel(value, 'Birthday (Day-Month-Year):')
  const match = raw?.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z` : undefined
}

function parseSex(value: string): CatalogEntry['sex'] {
  const normalized = clean(value).toLowerCase()
  if (normalized.includes('female') && normalized.includes('spay')) return 'female-spay'
  if (normalized.includes('male') && normalized.includes('neuter')) return 'male-neuter'
  if (normalized.startsWith('female')) return 'female'
  if (normalized.startsWith('male')) return 'male'
  return 'unknown'
}

export function parseCatalogCSV(input: string): CatalogEntry[] {
  const rows = input.split(/\r?\n/).map(parseRow)
  const entries: CatalogEntry[] = []
  let currentGroup = ''
  let currentEmsCode = ''

  for (let index = 0; index < rows.length; index += 1) {
    const first = clean(rows[index]?.[0])
    const second = clean(rows[index]?.[1])

    if (groupNames.has(first.toUpperCase())) {
      currentGroup = first.toUpperCase()
      continue
    }

    const nextIsEntry = /^\d+$/.test(clean(rows[index + 1]?.[0])) && Boolean(clean(rows[index + 1]?.[1]))
    if (nextIsEntry && first && !first.toLowerCase().startsWith('wcf id:')) {
      currentEmsCode = first
    }

    if (!/^\d+$/.test(first) || !second) continue

    const showClass = clean(rows[index + 2]?.[0])
    const [breedCode, breedName] = splitDescription(rows[index + 3]?.[0] ?? '')
    const [colorCode, colorDescription] = splitDescription(rows[index + 4]?.[0] ?? '')
    const rings = valueAfterLabel(rows[index + 10]?.[0] ?? '', 'Ring Type:')

    if (!currentGroup || !currentEmsCode || !showClass || !breedCode || !breedName) {
      throw new Error(`Neúplný katalógový záznam pri čísle ${first}.`)
    }

    entries.push({
      catalogNumber: Number(first),
      catName: second,
      group: currentGroup,
      emsCode: currentEmsCode,
      showClass,
      breedCode,
      breedName,
      colorCode,
      colorDescription,
      sex: parseSex(rows[index + 5]?.[0] ?? ''),
      birthDate: parseDate(rows[index + 6]?.[0] ?? ''),
      sire: valueAfterLabel(rows[index + 7]?.[0] ?? '', 'Father:'),
      dam: valueAfterLabel(rows[index + 8]?.[0] ?? '', 'Mother:'),
      ownerName: valueAfterLabel(rows[index + 9]?.[0] ?? '', 'Owner:') ?? 'Neznámy majiteľ',
      ringTypes: rings ? rings.split(',').map((ring) => ring.trim()).filter(Boolean) : [],
      wcfId: valueAfterLabel(rows[index + 11]?.[0] ?? '', 'WCF ID:'),
    })
  }

  return entries
}
