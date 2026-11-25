import ExcelJS from 'exceljs'

import { isHeaderRow, normalizeHeader } from './columns'
import type { SheetTable } from './mapRows'

/** The sheet with all cats; the other sheets of the current file are summaries. */
const preferredSheetNames = ['kompletny zoznam']

/** Header row is searched for in the first rows of a sheet. */
const headerSearchRows = 20

const cellToString = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((part) => part.text).join('')
    if ('result' in value) return cellToString(value.result as ExcelJS.CellValue)
    if ('text' in value) return String(value.text)
    if ('error' in value) return ''
    return ''
  }
  return String(value)
}

const rowCells = (row: ExcelJS.Row, columnCount: number) =>
  Array.from({ length: columnCount }, (_, index) => cellToString(row.getCell(index + 1).value))

const findHeaderRow = (sheet: ExcelJS.Worksheet) => {
  const last = Math.min(sheet.rowCount, headerSearchRows)
  for (let number = 1; number <= last; number++) {
    if (isHeaderRow(rowCells(sheet.getRow(number), sheet.columnCount))) return number
  }
  return undefined
}

export class SpreadsheetError extends Error {}

/** Reads the cat list sheet of an .xlsx file as text cells. */
export async function readSpreadsheet(data: ArrayBuffer | Uint8Array): Promise<SheetTable> {
  const workbook = new ExcelJS.Workbook()
  try {
    // exceljs is typed for Node's Buffer, but accepts any binary data.
    await workbook.xlsx.load(data as unknown as ArrayBuffer)
  } catch {
    throw new SpreadsheetError('The file is not a valid .xlsx spreadsheet.')
  }

  const sheets = [
    ...workbook.worksheets.filter((sheet) =>
      preferredSheetNames.includes(normalizeHeader(sheet.name)),
    ),
    ...workbook.worksheets,
  ]

  for (const sheet of sheets) {
    const headerRow = findHeaderRow(sheet)
    if (headerRow === undefined) continue

    const columnCount = sheet.columnCount
    const rows: SheetTable['rows'] = []
    for (let number = headerRow + 1; number <= sheet.rowCount; number++) {
      rows.push({ row: number, cells: rowCells(sheet.getRow(number), columnCount) })
    }
    return { headers: rowCells(sheet.getRow(headerRow), columnCount), rows }
  }

  throw new SpreadsheetError('No sheet with a header row containing "No" and "Breed" was found.')
}
