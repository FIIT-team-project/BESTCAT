import {
  dataColumnForHeader,
  isJudgeCode,
  isTicked,
  requiredColumns,
  wcfGroupForHeader,
  type DataColumn,
} from './columns'
import type { ShowImportCat, ShowImportData, ShowImportIssue } from './types'

/** Cell values as text, with the spreadsheet row number of each row. */
export type SheetTable = {
  headers: string[]
  rows: { row: number; cells: string[] }[]
}

const columnLabels: Record<DataColumn, string> = {
  catalogNumber: 'No',
  breed: 'Breed',
  color: 'Colour',
  sex: 'Sex',
  showClass: 'Show Class',
  category: 'Kategória',
  wcfGroup: 'WCF Skupina',
  name: 'Name',
  birthday: 'Birthday',
  wcfId: 'WCF ID',
}

const parsePositiveInteger = (value: string) => {
  const trimmed = value.trim()
  if (!/^\d+(\.0+)?$/.test(trimmed)) return undefined
  const number = Number(trimmed)
  return Number.isInteger(number) && number >= 1 ? number : undefined
}

/** Accepts YYYY-MM-DD, DD-MM-YYYY and DD.MM.YYYY. Returns YYYY-MM-DD. */
const parseDate = (value: string) => {
  const trimmed = value.trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed)
  const european = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/.exec(trimmed)
  const parts = iso
    ? [iso[1], iso[2], iso[3]]
    : european
      ? [european[3], european[2], european[1]]
      : undefined
  if (!parts) return undefined

  const [year, month, day] = parts
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date) ? date : undefined
}

/**
 * Maps the spreadsheet table to import data and collects every problem found.
 * Nothing is written anywhere; the result can be shown as a preview.
 */
export function mapRows({ headers, rows }: SheetTable): ShowImportData {
  const errors: ShowImportIssue[] = []
  const warnings: ShowImportIssue[] = []

  const dataIndex = new Map<DataColumn, number>()
  const groupIndex = new Map<number, string>()
  const otherIndexes: number[] = []

  headers.forEach((header, index) => {
    if (!header.trim()) return
    const column = dataColumnForHeader(header)
    const group = wcfGroupForHeader(header)
    if (column) {
      if (dataIndex.has(column)) {
        errors.push({ message: `Column "${header}" appears more than once.` })
      } else {
        dataIndex.set(column, index)
      }
    } else if (group) {
      groupIndex.set(index, group)
    } else {
      otherIndexes.push(index)
    }
  })

  for (const column of requiredColumns) {
    if (!dataIndex.has(column)) {
      errors.push({ message: `Required column "${columnLabels[column]}" is missing.` })
    }
  }
  if (!dataIndex.has('wcfGroup') && groupIndex.size === 0) {
    errors.push({ message: 'Column "WCF Skupina" or the WCF group tick columns are missing.' })
  }

  const dataRows = rows.filter(({ cells }) => cells.some((cell) => cell.trim() !== ''))

  // Any other column whose values all look like judge codes is a judging session.
  const sessionIndexes = otherIndexes.filter((index) => {
    const values = dataRows.map(({ cells }) => (cells[index] ?? '').trim()).filter(Boolean)
    return values.length > 0 && values.every(isJudgeCode)
  })
  for (const index of otherIndexes) {
    if (!sessionIndexes.includes(index)) {
      warnings.push({ message: `Column "${headers[index]}" is not recognized and was ignored.` })
    }
  }
  if (sessionIndexes.length === 0) {
    errors.push({ message: 'No session columns with judge codes (e.g. "Sobota 1") were found.' })
  }

  const sessions = sessionIndexes.map((index) => headers[index].trim())
  if (new Set(sessions).size !== sessions.length) {
    errors.push({ message: 'Two session columns have the same header.' })
  }

  if (errors.length > 0) {
    return { cats: [], sessions, judgeCodes: [], errors, warnings }
  }

  const cats: ShowImportCat[] = []
  const judgeCodes = new Set<string>()
  const rowsByCatalogNumber = new Map<number, number>()

  for (const { row, cells } of dataRows) {
    const value = (column: DataColumn) => {
      const index = dataIndex.get(column)
      return index === undefined ? '' : (cells[index] ?? '').trim()
    }
    const rowErrors: string[] = []

    const catalogNumber = parsePositiveInteger(value('catalogNumber'))
    if (catalogNumber === undefined) {
      rowErrors.push(`"No" must be a positive whole number, got "${value('catalogNumber')}".`)
    } else if (rowsByCatalogNumber.has(catalogNumber)) {
      rowErrors.push(
        `Catalog number ${catalogNumber} is already used in row ${rowsByCatalogNumber.get(catalogNumber)}.`,
      )
    } else {
      rowsByCatalogNumber.set(catalogNumber, row)
    }

    for (const column of ['breed', 'color', 'sex', 'showClass'] as const) {
      if (!value(column)) rowErrors.push(`"${columnLabels[column]}" is empty.`)
    }

    const category = parsePositiveInteger(value('category'))
    if (category === undefined) {
      rowErrors.push(`"Kategória" must be a positive whole number, got "${value('category')}".`)
    }

    const tickedGroups = [...groupIndex].filter(([index]) => isTicked(cells[index] ?? ''))
    const groupColumn = value('wcfGroup')
    let wcfGroup = groupColumn
    if (tickedGroups.length > 1) {
      rowErrors.push(
        `More than one WCF group is ticked: ${tickedGroups.map(([, g]) => g).join(', ')}.`,
      )
    } else if (!groupColumn && tickedGroups.length === 1) {
      wcfGroup = tickedGroups[0][1]
    } else if (!groupColumn) {
      rowErrors.push('WCF group is empty.')
    } else if (tickedGroups.length === 1 && tickedGroups[0][1] !== groupColumn) {
      warnings.push({
        row,
        message: `"WCF Skupina" is "${groupColumn}" but "${tickedGroups[0][1]}" is ticked; using "${groupColumn}".`,
      })
    }

    const judges: Record<string, string> = {}
    sessionIndexes.forEach((index, sessionPosition) => {
      const code = (cells[index] ?? '').trim().toUpperCase()
      if (!code) return
      judges[sessions[sessionPosition]] = code
      judgeCodes.add(code)
    })
    if (Object.keys(judges).length === 0) {
      warnings.push({ row, message: 'The cat is not assigned to any judge.' })
    }

    let birthday: string | undefined
    if (value('birthday')) {
      birthday = parseDate(value('birthday'))
      if (!birthday) {
        warnings.push({
          row,
          message: `Birthday "${value('birthday')}" is not a date and was ignored.`,
        })
      }
    }

    if (rowErrors.length > 0 || catalogNumber === undefined || category === undefined) {
      errors.push(...rowErrors.map((message) => ({ row, message })))
      continue
    }

    cats.push({
      row,
      catalogNumber,
      breed: value('breed'),
      color: value('color'),
      sex: value('sex'),
      showClass: value('showClass'),
      wcfGroup,
      category,
      name: value('name') || undefined,
      birthday,
      wcfId: value('wcfId') || undefined,
      judges,
    })
  }

  if (dataRows.length === 0) {
    errors.push({ message: 'The spreadsheet contains no cats.' })
  }

  return {
    cats,
    sessions,
    judgeCodes: [...judgeCodes].sort(),
    errors,
    warnings,
  }
}
