'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from 'react'

type Drafts = { queue?: number[]; ratings: Record<number, string> }
const DraftContext = createContext<{
  drafts: Drafts
  setDrafts: Dispatch<SetStateAction<Drafts>>
} | null>(null)

export function EventWorkspaceDrafts({
  children,
  eventPath,
}: {
  children: ReactNode
  eventPath?: string
}) {
  const [drafts, setDrafts] = useState<Drafts>({ ratings: {} })
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (drafts.queue || Object.keys(drafts.ratings).length) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    function leave(event: MouseEvent) {
      if (!eventPath || !(event.target instanceof Element)) return
      const link = event.target.closest('a')
      if (
        !link ||
        link.target === '_blank' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const url = new URL(link.href)
      if (
        url.origin === window.location.origin &&
        (url.pathname === eventPath || url.pathname.startsWith(`${eventPath}/`))
      )
        return
      if (
        (drafts.queue || Object.keys(drafts.ratings).length) &&
        !window.confirm('Leave this event? Your unsaved rating and queue changes will be lost.')
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    document.addEventListener('click', leave, true)
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      document.removeEventListener('click', leave, true)
    }
  }, [eventPath, drafts])
  return <DraftContext.Provider value={{ drafts, setDrafts }}>{children}</DraftContext.Provider>
}

export function useWorkspaceDrafts() {
  const [local, setLocal] = useState<Drafts>({ ratings: {} })
  const shared = useContext(DraftContext)
  const drafts = shared?.drafts ?? local
  const setDrafts = shared?.setDrafts ?? setLocal
  function setQueue(queue: number[] | undefined) {
    setDrafts((old) => ({ ...old, queue }))
  }
  function setRating(id: number, rating: string | undefined) {
    setDrafts((old) => {
      const ratings = { ...old.ratings }
      if (rating === undefined) delete ratings[id]
      else ratings[id] = rating
      return { ...old, ratings }
    })
  }
  return { current: drafts, setQueue, setRating }
}
