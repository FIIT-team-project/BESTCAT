import { requireExhibitor } from '@/lib/exhibitor/currentUser'

export default async function ExhibitorLayout({ children }: { children: React.ReactNode }) {
  await requireExhibitor()

  return <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">{children}</div>
}
