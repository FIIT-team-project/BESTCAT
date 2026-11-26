// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Cat, Show } from '@/payload-types'
import * as renderer from '@/lib/cat-export/renderPDF'
import { catsHTML } from '@/lib/cat-export/template'

describe('Cat PDF export', () => {
  let payload: Payload
  let databaseDir: string
  let adminToken: string
  let userToken: string
  let userID: number
  let show: Show

  const request = (token?: string, route = `/api/shows/${show.id}/export-pdf`) =>
    handleEndpoints({
      config: payload.config,
      request: new Request(`http://localhost:3000${route}`, {
        headers: token ? { Authorization: `JWT ${token}` } : {},
      }),
    })

  beforeAll(async () => {
    databaseDir = await mkdtemp(path.join(tmpdir(), 'bestcat-cat-export-'))
    const payloadConfig = await config
    payload = await getPayload({
      key: databaseDir,
      disableOnInit: true,
      config: {
        ...payloadConfig,
        secret: 'cat-export-integration-secret',
        db: {
          ...payloadConfig.db,
          init: (args) => ({
            ...payloadConfig.db.init(args),
            clientConfig: { url: `file:${path.join(databaseDir, 'payload.db')}` },
          }),
        },
      },
    })
    const password = 'test-password'
    await payload.create({ collection: 'admins', data: { email: 'admin@example.com', password } })
    userID = (
      await payload.create({
        collection: 'users',
        data: { email: 'user@example.com', password, name: 'Renáta Šťastná' },
      })
    ).id
    show = await payload.create({
      collection: 'shows',
      data: {
        show_name: 'Cat export test show',
        chief_steward: userID,
        organization: 'Test',
        city: 'Bratislava',
        country: 'Slovakia',
        license_number: 'L#123',
        is_active: false,
      },
    })
    adminToken = (
      await payload.login({
        collection: 'admins',
        data: { email: 'admin@example.com', password },
      })
    ).token!
    userToken = (
      await payload.login({
        collection: 'users',
        data: { email: 'user@example.com', password },
      })
    ).token!
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await payload?.destroy()
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true })
  })

  it('denies anonymous visitors and regular users before rendering', async () => {
    const render = vi.spyOn(renderer, 'renderCatsPDF')
    for (const token of [undefined, userToken]) {
      expect((await request(token)).status).toBe(403)
    }
    expect(render).not.toHaveBeenCalled()
    render.mockRestore()
  })

  it('reports a show without entered cats without generating an empty PDF', async () => {
    const response = await request(adminToken)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      errors: [{ message: 'There are no cats entered in this show.' }],
    })
  })

  it('exports every record beyond a list page in catalog order as an actual PDF', async () => {
    const event = await payload.create({
      collection: 'events',
      data: {
        name: 'Test judging',
        show: show.id,
        judge: userID,
        event_type: 'table',
        event_date: '2026-11-25',
      },
    })
    for (let number = 31; number >= 1; number--) {
      const cat = await payload.create({
        collection: 'cats',
        data: {
          catalog_number: number,
          name: `Mačka Žofka ${String(number).padStart(2, '0')}`,
          breed: 'MCO',
          color: 'f 02 21 62 71',
          sex: 'Female',
        },
      })
      await payload.create({
        collection: 'cat-event-entries',
        data: { cat: cat.id, event: event.id, queue_number: number, cat_status: 'registered' },
      })
    }
    const render = vi.spyOn(renderer, 'renderCatsPDF')
    const response = await request(adminToken)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="show-\d+-cats-.*\.pdf"$/,
    )
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    const pdf = Buffer.from(await response.arrayBuffer())
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(1000)
    const html = render.mock.calls[0][0]
    expect(html).toContain('31 cats')
    expect(html.indexOf('Mačka Žofka 01')).toBeLessThan(html.indexOf('Mačka Žofka 31'))
    expect(html.match(/class="number"/g)).toHaveLength(31)
    render.mockRestore()
  }, 60_000)

  it('returns a useful failure without leaking renderer details', async () => {
    const render = vi
      .spyOn(renderer, 'renderCatsPDF')
      .mockRejectedValueOnce(new Error('private path'))
    const response = await request(adminToken)
    expect(response.status).toBe(503)
    const body = await response.text()
    expect(body).toContain('PDF export is unavailable')
    expect(body).not.toContain('private path')
    render.mockRestore()
  })

  it('escapes untrusted names and handles missing optional fields', () => {
    const html = catsHTML(
      [
        {
          id: 1,
          catalog_number: 1,
          name: '<img src="http://example.com" onerror="alert(1)">',
          breed: 'MCO',
          color: 'n',
          sex: 'Male',
          createdAt: '',
          updatedAt: '',
          owner: { name: 'Renáta & Žofia' },
        } as Cat,
      ],
      new Date('2026-11-25T12:00:00Z'),
      show,
    )
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(html).toContain('Renáta &amp; Žofia')
    expect(html).toContain('<td>—</td>')
  })

  it('protects show exports and validates the show ID', async () => {
    for (const token of [undefined, userToken]) {
      expect((await request(token, '/api/shows/999999/export-pdf')).status).toBe(403)
    }
    expect((await request(adminToken, '/api/shows/invalid/export-pdf')).status).toBe(400)
    expect((await request(adminToken, '/api/shows/999999/export-pdf')).status).toBe(404)
  })

  it('exports only the selected show and includes each cat once across all judging events', async () => {
    const createShow = (show_name: string) =>
      payload.create({
        collection: 'shows',
        data: {
          show_name,
          chief_steward: userID,
          organization: 'Test',
          city: 'Žilina',
          country: 'Slovakia',
          license_number: 'L#123',
          is_active: false,
        },
      })
    const show = await createShow('Žilina <Show & test>')
    const otherShow = await createShow('Other show')
    const route = `/api/shows/${show.id}/export-pdf`
    const empty = await request(adminToken, route)
    expect(empty.status).toBe(400)
    expect(await empty.json()).toMatchObject({
      errors: [{ message: 'There are no cats entered in this show.' }],
    })

    const cats = []
    for (const [name, catalog_number] of [
      ['Selected late', 200],
      ['Selected early', 100],
      ['Other show only', 50],
    ] as const) {
      cats.push(
        await payload.create({
          collection: 'cats',
          data: { name, catalog_number, breed: 'MCO', color: 'n', sex: 'Female' },
        }),
      )
    }
    const events = []
    for (const event_type of ['table', 'ring', 'bis'] as const) {
      events.push(
        await payload.create({
          collection: 'events',
          data: {
            name: event_type,
            show: show.id,
            judge: userID,
            event_type,
            event_date: '2026-11-25',
          },
        }),
      )
    }
    const otherEvent = await payload.create({
      collection: 'events',
      data: {
        name: 'Other show',
        show: otherShow.id,
        judge: userID,
        event_type: 'table',
        event_date: '2026-11-25',
      },
    })
    for (const event of events) {
      await payload.create({
        collection: 'cat-event-entries',
        data: { cat: cats[0].id, event: event.id, queue_number: 1, cat_status: 'registered' },
      })
    }
    await payload.create({
      collection: 'cat-event-entries',
      data: { cat: cats[1].id, event: events[1].id, queue_number: 2, cat_status: 'registered' },
    })
    await payload.create({
      collection: 'cat-event-entries',
      data: { cat: cats[2].id, event: otherEvent.id, queue_number: 1, cat_status: 'registered' },
    })

    const render = vi.spyOn(renderer, 'renderCatsPDF')
    try {
      const response = await request(adminToken, route)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Disposition')).toContain(`show-${show.id}-cats-`)
      expect(
        Buffer.from(await response.arrayBuffer())
          .subarray(0, 5)
          .toString(),
      ).toBe('%PDF-')
      const html = render.mock.calls[0][0]
      expect(html).toContain('Žilina &lt;Show &amp; test&gt;')
      expect(html).toContain('2 cats · Cats entered in this show')
      expect(html.match(/class="number"/g)).toHaveLength(2)
      expect(html).not.toContain('Other show only')
      expect(html.indexOf('Selected early')).toBeLessThan(html.indexOf('Selected late'))
    } finally {
      render.mockRestore()
    }
  }, 60_000)
})
