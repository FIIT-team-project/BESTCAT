import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { CatPhoto } from '@/components/cat-photo'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BrowseProps } from '@/lib/pagination'

export default async function CatPage({
  params,
  searchParams,
}: { params: Promise<{ id: string }> } & BrowseProps) {
  const search = (await searchParams) ?? {}
  const returnTo =
    typeof search.returnTo === 'string' &&
    /^\/(?:cats|shows)(?:\?|\/\d+(?:[/?]|$)|$)/.test(search.returnTo) &&
    !/[\\\r\n]/.test(search.returnTo)
      ? search.returnTo
      : '/shows'
  const user = await getCurrentUser()
  const { id } = await params
  const catID = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(catID) || catID <= 0) notFound()

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'cats',
    where: { id: { equals: catID } },
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
  })
  const cat = docs[0]
  if (!cat) notFound()

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button
        className="self-start"
        variant="outline"
        render={<Link href={returnTo} />}
        nativeButton={false}
        role="link"
      >
        <ArrowLeft data-icon="inline-start" /> Back to list
      </Button>
      <h1 className="text-2xl font-semibold">{cat.name || `Cat ${cat.id}`}</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Cat details</CardTitle>
        </CardHeader>
        <CardContent>
          <CatPhoto cat={cat} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              ['WCF ID', cat.wcfId],
              ['Breed', cat.breed],
              ['Sex', cat.sex],
              ['Color', cat.color],
              ['Date of birth', cat.birthday?.slice(0, 10)],
              ['Country', cat.country],
              ['Club', cat.club],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="break-words font-medium">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
