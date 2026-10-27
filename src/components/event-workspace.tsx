'use client'

import { CatPhoto } from '@/components/cat-photo'
import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useWorkspaceDrafts } from './event-workspace-drafts'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Check, GripVertical, RefreshCw } from 'lucide-react'
import type { CatEventEntry } from '@/payload-types'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { catName, isWaiting, orderedEntries } from '@/lib/event-workspace'
import { updateEventWorkspace } from '@/app/(frontend)/shows/[id]/events/[eventId]/actions'

export function EventWorkspace({
  eventID,
  entries,
  view,
  eventPath,
  canJudge = false,
}: {
  eventID: number
  entries: CatEventEntry[]
  view: 'judge' | 'steward'
  eventPath?: string
  canJudge?: boolean
}) {
  const router = useRouter()
  const ordered = orderedEntries(entries)
  const current = ordered.find(({ status }) => status === 'judging')
  const waiting = ordered.filter(isWaiting)
  const completed = ordered.filter(({ status }) => status === 'completed')
  const drafts = useWorkspaceDrafts()
  const [queue, updateQueue] = useState(() => {
    const ids = drafts.current.queue
    // Ignore a saved draft if another user changed the waiting cats.
    return ids && ids.length === waiting.length && waiting.every(({ id }) => ids.includes(id))
      ? ids.map((id) => waiting.find((entry) => entry.id === id)!)
      : waiting
  })
  function setQueue(next: CatEventEntry[]) {
    updateQueue(next)
    drafts.setQueue(
      next.some((entry, index) => entry.id !== waiting[index]?.id)
        ? next.map(({ id }) => id)
        : undefined,
    )
  }
  const [rating, setRating] = useState(
    (current && drafts.current.ratings[current.id]) ?? current?.rating ?? '',
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const dragging = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const dirty = queue.some((entry, index) => entry.id !== waiting[index]?.id)

  function move(from: number, to: number) {
    if (pending || to < 0 || to >= queue.length || from === to) return
    const next = [...queue]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setQueue(next)
    setMessage('Queue reordered. Save to update the event.')
  }

  function save(operation: Parameters<typeof updateEventWorkspace>[1], success: string) {
    setError('')
    startTransition(async () => {
      try {
        const result = await updateEventWorkspace(eventID, operation)
        if (result.error) setError(result.error)
        else {
          if (operation.type === 'reorder') drafts.setQueue(undefined)
          if (operation.type === 'rate') drafts.setRating(operation.entryID, undefined)
          setMessage(success)
          router.refresh()
        }
      } catch {
        setError('Unable to save. Please refresh and try again.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canJudge && eventPath && (
          <nav aria-label="Event workspace" className="inline-flex gap-1 rounded-lg bg-muted p-1">
            {(['judge', 'steward'] as const).map((mode) => (
              <Button
                key={mode}
                render={<Link href={`${eventPath}/${mode}`} scroll={false} />}
                nativeButton={false}
                role="link"
                variant={view === mode ? 'default' : 'ghost'}
                size="sm"
                aria-current={view === mode ? 'page' : undefined}
                disabled={pending}
              >
                {mode === 'judge' ? 'Judging' : 'Stewarding'}
              </Button>
            ))}
          </nav>
        )}
        {view === 'steward' && (
          <p className="text-sm text-muted-foreground">
            {completed.length} of {entries.length} cats completed · {waiting.length} waiting
          </p>
        )}
        <Button
          className="ml-auto"
          variant="outline"
          disabled={pending || dirty}
          onClick={() => router.refresh()}
        >
          <RefreshCw data-icon="inline-start" /> Refresh
        </Button>
      </div>
      {view === 'steward' && (
        <progress
          className="h-2 w-full overflow-hidden rounded-full appearance-none [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
          value={completed.length}
          max={entries.length || 1}
          aria-label="Judging progress"
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {message}
      </p>
      <div
        className={cn(
          'grid items-start gap-6',
          view === 'steward' && 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]',
        )}
      >
        <Card className={cn(view === 'steward' && 'lg:order-last')}>
          <CardHeader>
            <CardDescription>
              {view === 'judge' ? 'NOW JUDGING' : 'AT THE JUDGING TABLE'}
            </CardDescription>
            <CardTitle>{current ? catName(current) : 'Waiting for the next cat'}</CardTitle>
          </CardHeader>
          <CardContent>
            {current ? (
              <CatDetails entry={current} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {view === 'judge'
                  ? 'Your steward will send the next cat to the judging table.'
                  : waiting.length
                    ? 'Send a cat from the stewarding queue to begin judging.'
                    : entries.length
                      ? 'All cats in this event have been judged.'
                      : 'No cats have been entered in this event.'}
              </p>
            )}
          </CardContent>
          {eventPath && canJudge && !current && view === 'judge' && (
            <CardFooter>
              <Button
                render={<Link href={`${eventPath}/steward`} scroll={false} />}
                nativeButton={false}
                role="link"
                variant="outline"
                disabled={pending}
              >
                Open queue
              </Button>
            </CardFooter>
          )}
          {eventPath && canJudge && current && view === 'steward' && (
            <CardFooter>
              <Button
                render={<Link href={`${eventPath}/judge`} scroll={false} />}
                nativeButton={false}
                role="link"
                variant="outline"
                disabled={pending}
              >
                Go to judging
              </Button>
            </CardFooter>
          )}
          {view === 'judge' && current && (
            <CardFooter>
              <form
                className="w-full"
                onSubmit={(event) => {
                  event.preventDefault()
                  save(
                    { type: 'rate', entryID: current.id, rating },
                    'Rating saved. Ready for the next cat.',
                  )
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="cat-rating">Rating</FieldLabel>
                    <Input
                      id="cat-rating"
                      value={rating}
                      onChange={(event) => {
                        setRating(event.target.value)
                        if (event.target.value === (current.rating || ''))
                          drafts.setRating(current.id, undefined)
                        else drafts.setRating(current.id, event.target.value)
                      }}
                      required
                      maxLength={200}
                      disabled={pending}
                      placeholder="Enter the cat’s rating"
                    />
                  </Field>
                  <Button type="submit" disabled={pending || !rating.trim()}>
                    <Check data-icon="inline-start" />
                    {pending ? 'Saving…' : 'Save & finish judging'}
                  </Button>
                </FieldGroup>
              </form>
            </CardFooter>
          )}
        </Card>
        {view === 'steward' && (
          <Card>
            <CardHeader>
              <CardTitle>{view === 'steward' ? 'Cat queue' : 'Up next'}</CardTitle>
              <CardDescription>
                {view === 'steward'
                  ? 'Drag the handle to reorder waiting cats, or use the arrow buttons.'
                  : 'The steward manages the order and sends the next cat to the table.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cats waiting.</p>
              ) : (
                <ol className="flex flex-col gap-2" aria-label="Waiting cats">
                  {queue.map((entry, index) => (
                    <li
                      key={entry.id}
                      data-queue-index={index}
                      className={cn(
                        'flex flex-wrap items-center gap-3 rounded-lg border p-3',
                        over === index && 'border-primary bg-accent',
                      )}
                    >
                      {view === 'steward' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="touch-none cursor-grab"
                          disabled={pending}
                          aria-label={`Drag ${catName(entry)}`}
                          onPointerDown={(event) => {
                            if (event.button !== 0) return
                            dragging.current = index
                            event.currentTarget.setPointerCapture(event.pointerId)
                          }}
                          onPointerMove={(event) => {
                            if (dragging.current === null) return
                            const target = document
                              .elementFromPoint(event.clientX, event.clientY)
                              ?.closest('[data-queue-index]')
                            setOver(target ? Number(target.getAttribute('data-queue-index')) : null)
                            if (event.clientY > window.innerHeight - 80) window.scrollBy(0, 12)
                            if (event.clientY < 80) window.scrollBy(0, -12)
                          }}
                          onPointerUp={(event) => {
                            const target = document
                              .elementFromPoint(event.clientX, event.clientY)
                              ?.closest('[data-queue-index]')
                            if (dragging.current !== null && target)
                              move(
                                dragging.current,
                                Number(target.getAttribute('data-queue-index')),
                              )
                            dragging.current = null
                            setOver(null)
                          }}
                          onPointerCancel={() => {
                            dragging.current = null
                            setOver(null)
                          }}
                        >
                          <GripVertical />
                        </Button>
                      )}
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <CatPhoto
                        cat={typeof entry.catId === 'object' ? entry.catId : undefined}
                        thumbnail
                      />
                      <div className="min-w-0 flex-1 basis-32">
                        <p className="break-words text-sm font-medium">{catName(entry)}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeof entry.catId === 'object'
                            ? entry.catId.breed || 'Breed unavailable'
                            : 'Cat details unavailable'}{' '}
                          · {entry.status || 'queued'}
                        </p>
                      </div>
                      {view === 'steward' && (
                        <div className="ml-auto flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${catName(entry)} up`}
                            disabled={pending || index === 0}
                            onClick={() => move(index, index - 1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${catName(entry)} down`}
                            disabled={pending || index === queue.length - 1}
                            onClick={() => move(index, index + 1)}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending || !!current || dirty}
                            onClick={() =>
                              save(
                                { type: 'call', entryID: entry.id },
                                `${catName(entry)} sent to the judging table.`,
                              )
                            }
                          >
                            Send to table
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
            {view === 'steward' && queue.length > 0 && (
              <CardFooter className="flex-wrap justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {dirty ? 'Unsaved queue changes' : 'Queue is up to date'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={pending || !dirty}
                    onClick={() => setQueue(waiting)}
                  >
                    Reset
                  </Button>
                  <Button
                    disabled={pending || !dirty}
                    onClick={() =>
                      save({ type: 'reorder', ids: queue.map(({ id }) => id) }, 'Queue saved.')
                    }
                  >
                    {pending ? 'Saving…' : 'Save queue'}
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
      {view === 'steward' && completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed cats</CardTitle>
            <CardDescription>{completed.length} judged</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 text-sm">
                  <CatPhoto
                    cat={typeof entry.catId === 'object' ? entry.catId : undefined}
                    thumbnail
                  />
                  <Check className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    {catName(entry)}
                    <p className="text-muted-foreground">{entry.rating || 'No rating recorded'}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CatDetails({ entry }: { entry: CatEventEntry }) {
  const cat = typeof entry.catId === 'object' ? entry.catId : undefined
  return (
    <>
      <CatPhoto cat={cat} />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        {[
          ['WCF ID', cat?.wcfId],
          ['Breed', cat?.breed],
          ['Sex', cat?.sex],
          ['Color', cat?.color],
          ['Date of birth', cat?.birthday?.slice(0, 10)],
          ['Country', cat?.country],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
