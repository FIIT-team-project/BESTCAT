'use client'

import { Button, toast, useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState, type CSSProperties } from 'react'

import type { ShowImportIssue, ShowImportOptions, ShowImportResult } from '@/lib/show-import/types'

type Preview = {
  cats: number
  sessions: string[]
  judgeCodes: string[]
  counts: Record<string, Record<string, number>>
  errors: ShowImportIssue[]
  warnings: ShowImportIssue[]
  existingEvents: number
}

type UserOption = { id: number; name?: string | null; email: string }

const styles = {
  row: { display: 'flex', gap: 'var(--base)', alignItems: 'center', flexWrap: 'wrap' },
  table: { borderCollapse: 'collapse', width: '100%' },
  cell: {
    border: '1px solid var(--theme-elevation-150)',
    padding: 'calc(var(--base) / 3) calc(var(--base) / 2)',
    textAlign: 'left',
  },
  input: {
    background: 'var(--theme-input-bg)',
    color: 'var(--theme-elevation-800)',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 'var(--style-radius-s)',
    padding: 'calc(var(--base) / 4) calc(var(--base) / 2)',
    minHeight: 'calc(var(--base) * 1.6)',
  },
  error: { color: 'var(--theme-error-500)' },
  muted: { color: 'var(--theme-elevation-500)' },
} satisfies Record<string, CSSProperties>

const issueText = ({ row, message }: ShowImportIssue) => (row ? `Row ${row}: ${message}` : message)

const userLabel = (user: UserOption) => (user.name ? `${user.name} (${user.email})` : user.email)

const responseErrors = async (response: Response) => {
  const body = await response.json().catch(() => null)
  const messages: string[] = body?.errors?.map((error: { message: string }) => error.message) ?? []
  return messages.length > 0 ? messages : [`Request failed (${response.status}).`]
}

/** Imports cats and table judging events of a show from the organizer's spreadsheet. */
export function ShowImport() {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [judges, setJudges] = useState<Record<string, string>>({})
  const [stewards, setStewards] = useState<Record<string, string>>({})
  const [dates, setDates] = useState<Record<string, string>>({})
  const [requestErrors, setRequestErrors] = useState<string[]>([])
  const [result, setResult] = useState<ShowImportResult | null>(null)
  const [pending, setPending] = useState<'preview' | 'import' | null>(null)
  const busy = pending !== null
  const importing = pending === 'import'

  useEffect(() => {
    if (!id) return
    fetch(`${serverURL}${api}/users?limit=0&depth=0&sort=name`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { docs: [] }))
      .then((body: { docs: UserOption[] }) => setUsers(body.docs))
      .catch(() => setUsers([]))
  }, [api, id, serverURL])

  if (!id) {
    return (
      <div className="show-import">
        <h3>Import cats and judging schedule</h3>
        <p style={styles.muted}>Save the show first, then import its spreadsheet here.</p>
      </div>
    )
  }

  const send = async (mode: 'preview' | 'import', options?: ShowImportOptions) => {
    if (!file) return null
    const body = new FormData()
    body.append('file', file)
    body.append('_payload', JSON.stringify({ mode, options }))
    const response = await fetch(`${serverURL}${api}/shows/${id}/import`, {
      method: 'POST',
      body,
      credentials: 'include',
    })
    if (!response.ok) {
      setRequestErrors(await responseErrors(response))
      return null
    }
    setRequestErrors([])
    return response.json()
  }

  const checkFile = async () => {
    setPending('preview')
    setResult(null)
    try {
      setPreview((await send('preview')) as Preview | null)
    } finally {
      setPending(null)
    }
  }

  const runImport = async () => {
    if (!preview) return
    const options: ShowImportOptions = {
      judges: Object.fromEntries(preview.judgeCodes.map((code) => [code, Number(judges[code])])),
      stewards: Object.fromEntries(
        preview.judgeCodes.map((code) => [code, stewards[code] ? Number(stewards[code]) : null]),
      ),
      sessionDates: Object.fromEntries(
        preview.sessions.map((session) => [session, dates[session]]),
      ),
    }
    setPending('import')
    try {
      const imported = (await send('import', options)) as ShowImportResult | null
      if (imported) {
        setResult(imported)
        setPreview(null)
        toast.success(`Imported ${imported.cats} cats into ${imported.events} events.`)
      }
    } finally {
      setPending(null)
    }
  }

  const missingChoices =
    !preview ||
    preview.judgeCodes.some((code) => !judges[code]) ||
    preview.sessions.some((session) => !dates[session])

  const userSelect = (
    value: string | undefined,
    onChange: (value: string) => void,
    placeholder: string,
  ) => (
    <select style={styles.input} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {userLabel(user)}
        </option>
      ))}
    </select>
  )

  return (
    <div className="show-import">
      <h3>Import cats and judging schedule</h3>
      <p style={styles.muted}>
        Upload the organizer&apos;s .xlsx file. Each session column (e.g. &quot;Sobota 1&quot;)
        becomes one table judging event per judge code.
      </p>

      <div style={styles.row}>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ maxWidth: '100%' }}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setPreview(null)
            setResult(null)
            setRequestErrors([])
          }}
        />
        <Button buttonStyle="secondary" disabled={!file || busy} onClick={checkFile} margin={false}>
          Check file
        </Button>
      </div>

      {requestErrors.length > 0 && (
        <ul style={styles.error}>
          {requestErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {result && (
        <p>
          Imported {result.cats} cats, {result.events} events and {result.entries} queue entries.
          {result.replacedEvents > 0 && ` Replaced ${result.replacedEvents} previous events.`}
        </p>
      )}

      {preview && (
        <>
          <p>
            Found <strong>{preview.cats}</strong> cats in {preview.sessions.length} sessions with
            judge codes {preview.judgeCodes.join(', ') || '–'}.
          </p>

          {preview.errors.length > 0 && (
            <>
              <p style={styles.error}>Fix these problems in the file and check it again:</p>
              <ul style={styles.error}>
                {preview.errors.map((issue, index) => (
                  <li key={index}>{issueText(issue)}</li>
                ))}
              </ul>
            </>
          )}

          {preview.warnings.length > 0 && (
            <details>
              <summary>{preview.warnings.length} warnings</summary>
              <ul>
                {preview.warnings.map((issue, index) => (
                  <li key={index}>{issueText(issue)}</li>
                ))}
              </ul>
            </details>
          )}

          {preview.errors.length === 0 && (
            <>
              <div style={{ justifySelf: 'stretch', overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.cell}>Code</th>
                      <th style={styles.cell}>Judge</th>
                      <th style={styles.cell}>Steward (optional)</th>
                      {preview.sessions.map((session) => (
                        <th key={session} style={styles.cell}>
                          {session}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.judgeCodes.map((code) => (
                      <tr key={code}>
                        <td style={styles.cell}>{code}</td>
                        <td style={styles.cell}>
                          {userSelect(
                            judges[code],
                            (value) => setJudges({ ...judges, [code]: value }),
                            'Choose judge',
                          )}
                        </td>
                        <td style={styles.cell}>
                          {userSelect(
                            stewards[code],
                            (value) => setStewards({ ...stewards, [code]: value }),
                            'No steward',
                          )}
                        </td>
                        {preview.sessions.map((session) => (
                          <td key={session} style={styles.cell}>
                            {preview.counts[session]?.[code] ?? 0} cats
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td style={styles.cell} colSpan={3}>
                        Date
                      </td>
                      {preview.sessions.map((session) => (
                        <td key={session} style={styles.cell}>
                          <input
                            type="date"
                            style={styles.input}
                            value={dates[session] ?? ''}
                            onChange={(e) => setDates({ ...dates, [session]: e.target.value })}
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {preview.existingEvents > 0 && (
                <p style={styles.error}>
                  This show already has {preview.existingEvents} table judging events. Importing
                  replaces them together with their queue entries and cats.
                </p>
              )}

              <Button disabled={missingChoices || busy} onClick={runImport} margin={false}>
                {importing ? 'Importing…' : 'Import'}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}
