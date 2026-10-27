'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { Cat } from '@/payload-types'
import { cn } from '@/lib/utils'

export function CatPhoto({ cat, thumbnail = false }: { cat?: Cat; thumbnail?: boolean }) {
  const [failedURL, setFailedURL] = useState<string | null>(null)
  const src = cat?.imageUrl

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted',
        thumbnail ? 'size-14 shrink-0' : 'mb-4 aspect-[4/3] w-full sm:max-w-sm',
      )}
    >
      {src && src !== failedURL ? (
        <Image
          src={src}
          alt={`Illustrative photo for ${cat?.name || 'cat'}`}
          fill
          sizes={thumbnail ? '56px' : '(min-width: 640px) 384px, 100vw'}
          className="object-cover"
          onError={() => setFailedURL(src)}
        />
      ) : (
        <span className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
          No photo
        </span>
      )}
    </div>
  )
}
