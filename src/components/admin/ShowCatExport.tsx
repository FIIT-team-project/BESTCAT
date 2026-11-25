'use client'

import { Button, toast, useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

export function ShowCatExport() {
  const { id: showID } = useDocumentInfo()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportPDF = async () => {
    if (!showID) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(
        `${serverURL}${api}/shows/${encodeURIComponent(showID)}/export-pdf`,
        {
          credentials: 'include',
        },
      )
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.errors?.[0]?.message || `Export failed (${response.status}).`)
      }

      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download =
        response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'cats.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Keep the object URL alive until the browser has started the download.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast.success('Cat list exported to PDF.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not export cats. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="cat-export" aria-labelledby="cat-export-heading">
      <h3 id="cat-export-heading">Export cats to PDF</h3>
      <p className="cat-export__description">
        {!showID
          ? 'Save the show first, then export its cat list here.'
          : 'Download the cats entered in this show as an A4 landscape PDF, ordered by catalog number. Each cat is included once.'}
      </p>
      <Button buttonStyle="secondary" disabled={busy || !showID} onClick={exportPDF} margin={false}>
        {busy ? 'Exporting…' : 'Export PDF'}
      </Button>
      {error && (
        <p className="cat-export__error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
