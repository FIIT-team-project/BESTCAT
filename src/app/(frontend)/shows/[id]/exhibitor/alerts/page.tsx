import { requireUser } from '@/lib/getCurrentUser'

export default async function Page() {
  await requireUser()

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="text-2xl font-semibold">Alerts</h1>
      <p className="text-muted-foreground">
        Alerts will appear here.
      </p>
    </div>
  )
}
