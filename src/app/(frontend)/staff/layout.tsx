import { requireStaff } from '@/lib/events/currentStaff'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff()

  return <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">{children}</div>
}
