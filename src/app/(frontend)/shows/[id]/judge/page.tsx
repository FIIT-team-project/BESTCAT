import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/getCurrentUser'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  redirect(`/shows/${id}/judge/events`)
}
