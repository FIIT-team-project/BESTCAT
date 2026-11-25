import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireExhibitor } from '@/lib/exhibitor/currentUser'
import { eventTypeLabels, formatTime, getCatStatus } from '@/lib/catStatus'
import { type ExhibitorEntry, findExhibitorEntries } from '@/lib/exhibitor/entries'

export const metadata: Metadata = { title: 'My cats' }

function EntryDetail({ entry }: { entry: ExhibitorEntry }) {
  switch (entry.cat_status) {
    case 'waiting':
      return <>Queue number {entry.queue_number}</>
    case 'called':
      return (
        <>
          Called to: {entry.event.name}
          {entry.called_at && <> · {formatTime(entry.called_at)}</>}
        </>
      )
    case 'rated':
      return <>View rating</>
    default:
      return <>{getCatStatus(entry.cat_status).description}</>
  }
}

export default async function MyCatsPage() {
  const { payload, user } = await requireExhibitor()
  const entries = await findExhibitorEntries(payload, user.id)
  const show = entries[0]?.event.show

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">My cats</h1>
        {show && <p className="text-sm text-muted-foreground">{show.show_name}</p>}
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You have no cats registered in the current show.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/my-cats/${entry.id}`} className="block rounded-xl">
                <Card size="sm" className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle>
                      <h2>
                        #{entry.cat.catalog_number} {entry.cat.name}
                      </h2>
                    </CardTitle>
                    <CardDescription>
                      {entry.cat.breed} · {entry.event.name} (
                      {eventTypeLabels[entry.event.event_type]})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-2">
                    <Badge variant={entry.cat_status === 'called' ? 'default' : 'secondary'}>
                      {getCatStatus(entry.cat_status).label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      <EntryDetail entry={entry} />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
