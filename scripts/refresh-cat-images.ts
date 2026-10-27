import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { fetchCatImages } from '../src/lib/fetchCatImages'

const payload = await getPayload({ config })
try {
  const { docs: cats } = await payload.find({
    collection: 'cats',
    where: { wcfId: { like: 'DEMO-' } },
    pagination: false,
    depth: 0,
    sort: 'id',
    overrideAccess: true,
  })
  const demoCats = cats.filter((cat) => /^DEMO-\d{4}$/.test(cat.wcfId ?? ''))
  const images = await fetchCatImages(demoCats.length)
  for (const [index, cat] of demoCats.entries()) {
    await payload.update({
      collection: 'cats',
      id: cat.id,
      data: { imageUrl: images[index] },
      overrideAccess: true,
    })
  }
  console.log(`Updated ${demoCats.length} demo cats with ${new Set(images).size} distinct photos.`)
} finally {
  await payload.destroy()
}
