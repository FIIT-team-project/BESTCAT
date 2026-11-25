import { addDataAndFileToRequest, type Endpoint } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { importShow, ShowImportError } from '@/lib/show-import/importShow'
import { mapRows } from '@/lib/show-import/mapRows'
import { readSpreadsheet, SpreadsheetError } from '@/lib/show-import/readSpreadsheet'
import type { ShowImportData, ShowImportOptions } from '@/lib/show-import/types'

type ImportRequestBody = {
  /** `preview` only reads and checks the file; `import` writes the data. */
  mode?: 'preview' | 'import'
  options?: ShowImportOptions
}

/** Counts of cats per session and judge code, like the summary sheet of the spreadsheet. */
const countCats = (data: ShowImportData) =>
  Object.fromEntries(
    data.sessions.map((session) => [
      session,
      Object.fromEntries(
        data.judgeCodes.map((code) => [
          code,
          data.cats.filter((cat) => cat.judges[session] === code).length,
        ]),
      ),
    ]),
  )

const errorResponse = (status: number, messages: string[]) =>
  Response.json({ errors: messages.map((message) => ({ message })) }, { status })

/**
 * `POST /api/shows/:id/import` with a multipart body: `file` (.xlsx) and `_payload`
 * (JSON `ImportRequestBody`). Only administrators may call it.
 */
export const importShowEndpoint: Endpoint = {
  path: '/:id/import',
  method: 'post',
  handler: async (req) => {
    if (!isAdmin({ req })) return errorResponse(403, ['Only administrators can import shows.'])

    const id = Number(req.routeParams?.id)
    const show = Number.isInteger(id)
      ? await req.payload.findByID({ collection: 'shows', id, depth: 0, disableErrors: true, req })
      : null
    if (!show) return errorResponse(404, ['Show not found.'])

    await addDataAndFileToRequest(req)
    const body = (req.data ?? {}) as ImportRequestBody
    if (!req.file?.data) return errorResponse(400, ['Upload an .xlsx file.'])

    let data: ShowImportData
    try {
      data = mapRows(await readSpreadsheet(req.file.data))
    } catch (error) {
      if (error instanceof SpreadsheetError) return errorResponse(400, [error.message])
      throw error
    }

    if (body.mode !== 'import') {
      const { totalDocs: existingEvents } = await req.payload.count({
        collection: 'events',
        where: { and: [{ show: { equals: show.id } }, { event_type: { equals: 'table' } }] },
        req,
      })
      return Response.json({
        cats: data.cats.length,
        sessions: data.sessions,
        judgeCodes: data.judgeCodes,
        counts: countCats(data),
        errors: data.errors,
        warnings: data.warnings,
        existingEvents,
      })
    }

    if (!body.options) return errorResponse(400, ['Import options are missing.'])
    try {
      const result = await importShow(req.payload, { show, data, options: body.options, req })
      return Response.json(result)
    } catch (error) {
      if (error instanceof ShowImportError) return errorResponse(400, error.problems)
      throw error
    }
  },
}
