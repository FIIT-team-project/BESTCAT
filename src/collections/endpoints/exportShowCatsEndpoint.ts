import type { Endpoint, PayloadRequest } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { renderCatsPDF } from '@/lib/cat-export/renderPDF'
import { catsHTML } from '@/lib/cat-export/template'
import type { Cat, Show } from '@/payload-types'

const errorResponse = (status: number, message: string) =>
  Response.json({ errors: [{ message }] }, { status })

async function pdfResponse(req: PayloadRequest, cats: Cat[], show: Show) {
  try {
    const generatedAt = new Date()
    const pdf = await renderCatsPDF(catsHTML(cats, generatedAt, show))
    const prefix = `show-${show.id}-cats`
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${prefix}-${generatedAt.toISOString().slice(0, 10)}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    req.payload.logger.error({ err: error }, 'Cat PDF export failed')
    return errorResponse(503, 'PDF export is unavailable. Please contact the administrator.')
  }
}

/** Finds distinct cats through this show's table and ring judging entries. */
export const exportShowCatsEndpoint: Endpoint = {
  path: '/:id/export-pdf',
  method: 'get',
  handler: async (req) => {
    if (!isAdmin({ req })) {
      return errorResponse(403, 'Only administrators can export cats.')
    }
    const id = Number(req.routeParams?.id)
    if (!Number.isSafeInteger(id) || id < 1) return errorResponse(400, 'Invalid show ID.')
    const { docs: shows } = await req.payload.find({
      collection: 'shows',
      where: { id: { equals: id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req,
    })
    const show = shows[0]
    if (!show) return errorResponse(404, 'Show not found.')

    const catIDs = new Set<number>()
    let page = 1
    let hasNextPage: boolean
    do {
      const entries = await req.payload.find({
        collection: 'cat-event-entries',
        where: { 'event.show': { equals: id } },
        select: { cat: true },
        sort: 'id',
        limit: 1000,
        page,
        depth: 0,
        overrideAccess: false,
        req,
      })
      for (const entry of entries.docs) {
        catIDs.add(typeof entry.cat === 'object' ? entry.cat.id : entry.cat)
      }
      if (catIDs.size > 5000) {
        return errorResponse(422, 'PDF export supports up to 5,000 cats at a time.')
      }
      hasNextPage = entries.hasNextPage
      page++
    } while (hasNextPage)

    if (catIDs.size === 0) return errorResponse(400, 'There are no cats entered in this show.')
    const { docs } = await req.payload.find({
      collection: 'cats',
      where: { id: { in: [...catIDs] } },
      sort: ['catalog_number', 'id'],
      limit: 5000,
      depth: 1,
      populate: { users: { name: true } },
      overrideAccess: false,
      req,
    })
    return pdfResponse(req, docs, show)
  },
}
