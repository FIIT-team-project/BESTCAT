/** One cat row of the show import spreadsheet. */
export type ShowImportCat = {
  /** Spreadsheet row number, for error messages. */
  row: number
  catalogNumber: number
  breed: string
  color: string
  sex: string
  showClass: string
  wcfGroup: string
  category: number
  /** Optional columns, imported when the spreadsheet contains them. */
  name?: string
  birthday?: string
  wcfId?: string
  /** Judge code per session, e.g. `{ 'Sobota 1': 'B', 'Nedeľa 2': 'D' }`. */
  judges: Record<string, string>
}

export type ShowImportIssue = {
  /** Spreadsheet row number; absent for problems with the whole file. */
  row?: number
  message: string
}

/** The spreadsheet mapped to plain data, before anything is written to the database. */
export type ShowImportData = {
  cats: ShowImportCat[]
  /** Session column headers in spreadsheet order, e.g. `['Sobota 1', 'Sobota 2', ...]`. */
  sessions: string[]
  /** Judge codes used in the session columns, sorted, e.g. `['A', 'B', 'C', 'D']`. */
  judgeCodes: string[]
  /** Problems that block the import. */
  errors: ShowImportIssue[]
  /** Problems worth showing, which do not block the import. */
  warnings: ShowImportIssue[]
}

/** Choices the admin makes before importing. */
export type ShowImportOptions = {
  /** User ID of the judge for each judge code. */
  judges: Record<string, number>
  /** Optional user ID of the steward for each judge code. */
  stewards?: Record<string, number | null | undefined>
  /** Date (YYYY-MM-DD) of each session. */
  sessionDates: Record<string, string>
}

export type ShowImportResult = {
  cats: number
  events: number
  entries: number
  /** Number of previously imported events of the show that were replaced. */
  replacedEvents: number
}
