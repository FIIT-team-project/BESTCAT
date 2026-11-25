/** Lowercase, without diacritics, dots and repeated whitespace; dashes unified. */
export const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/**
 * Accepted headers of the data columns, already normalized.
 * Columns are matched by header, so their order in the spreadsheet does not matter.
 */
export const dataColumns = {
  catalogNumber: ['no', 'number', 'catalog number', 'cislo'],
  breed: ['breed', 'plemeno'],
  color: ['colour', 'color', 'farba'],
  sex: ['sex', 'pohlavie'],
  showClass: ['show class', 'trieda'],
  category: ['kategoria', 'category'],
  wcfGroup: ['wcf skupina', 'wcf group', 'skupina', 'group'],
  // Optional columns, not present in the current spreadsheet.
  name: ['name', 'meno', 'cat name'],
  birthday: ['birthday', 'date of birth', 'datum narodenia'],
  wcfId: ['wcf id'],
} as const

export type DataColumn = keyof typeof dataColumns

export const requiredColumns = [
  'catalogNumber',
  'breed',
  'color',
  'sex',
  'showClass',
  'category',
] as const satisfies DataColumn[]

/**
 * One-hot columns repeating the WCF group of the cat with a tick.
 * They are only used to validate or replace the WCF group column.
 */
export const wcfGroupColumns = [
  'Adult',
  'Adult Honour',
  'Neutered adult',
  'Neutered Honour',
  'Veteran',
  'Junior (6–10 months)',
  'Neutered junior (6–10 months)',
  'Kitten (3–6 months)',
  'Neutered Kitten (3–6 months)',
  'Household pet',
  'Litter',
  'Novice',
  'Out of competition',
]

const normalizedGroupColumns = new Map(wcfGroupColumns.map((name) => [normalizeHeader(name), name]))

/** The WCF group named by a one-hot column header, if it is one. */
export const wcfGroupForHeader = (header: string) =>
  normalizedGroupColumns.get(normalizeHeader(header))

/** The data column a header belongs to, if any. */
export const dataColumnForHeader = (header: string): DataColumn | undefined => {
  const normalized = normalizeHeader(header)
  return (Object.keys(dataColumns) as DataColumn[]).find((column) =>
    (dataColumns[column] as readonly string[]).includes(normalized),
  )
}

/** Any of ✓, ✔, X, x, 1, yes, TRUE marks a ticked cell; blanks and 0/no/false do not. */
export const isTicked = (value: string) => {
  const normalized = value.trim().toLowerCase()
  return normalized !== '' && !['0', '-', 'no', 'nie', 'false'].includes(normalized)
}

/** Judge codes in session columns are short, e.g. A or J12. */
export const isJudgeCode = (value: string) => /^[a-z0-9]{1,3}$/i.test(value.trim())

/** True for the row holding the column headers. */
export const isHeaderRow = (cells: string[]) => {
  const columns = new Set(cells.map(dataColumnForHeader))
  return columns.has('catalogNumber') && columns.has('breed')
}
