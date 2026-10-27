import { CatDetailLink } from '@/components/cat-detail-link'
import type { Cat } from '@/payload-types'
import { CatPhoto } from '@/components/cat-photo'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function CatGrid({ cats }: { cats: Cat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cats.map((cat) => (
        <Card key={cat.id} className="relative">
          <CardHeader>
            <CardTitle>
              <CatDetailLink id={cat.id}>{cat.name || `Cat ${cat.id}`}</CatDetailLink>
            </CardTitle>
            <CardDescription>WCF ID: {cat.wcfId || '—'}</CardDescription>
          </CardHeader>
          <CardContent>
            <CatPhoto cat={cat} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt>Breed</dt>
              <dd>{cat.breed || '—'}</dd>
              <dt>Sex</dt>
              <dd>{cat.sex || '—'}</dd>
              <dt>Color</dt>
              <dd>{cat.color || '—'}</dd>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
