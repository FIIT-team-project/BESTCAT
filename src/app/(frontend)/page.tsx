import { getActiveShow } from '@/lib/getActiveShow'

export default async function HomePage() {
  const activeShow = await getActiveShow()

  if (!activeShow) {
    return <div>No active shows</div>
  }

  return <div>Active show: {activeShow?.id}</div>
}
