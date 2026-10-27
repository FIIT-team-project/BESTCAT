import { requireUser } from '@/lib/getCurrentUser'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <>
      <div>You are: {user.email}</div>
      {children}
    </>
  )
}
