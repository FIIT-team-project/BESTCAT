/** Fetch distinct, validated photos, including when the API returns fewer than requested. */
export async function fetchCatImages(count: number): Promise<string[]> {
  const urls = new Set<string>()
  const limit = process.env.CAT_API_KEY ? 100 : 10
  for (let page = 0; urls.size < count && page < count * 2; page++) {
    const response = await fetch(
      `https://api.thecatapi.com/v1/images/search?limit=${limit}&mime_types=jpg,png&order=ASC&page=${page}`,
      {
        headers: process.env.CAT_API_KEY ? { 'x-api-key': process.env.CAT_API_KEY } : {},
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!response.ok) throw new Error(`The Cat API image search failed (${response.status})`)
    const images: unknown = await response.json()
    if (!Array.isArray(images) || !images.length)
      throw new Error('The Cat API returned no usable cat images')
    let usable = false
    for (const image of images) {
      if (!image || typeof image.url !== 'string') continue
      try {
        const url = new URL(image.url)
        if (url.protocol === 'https:' && url.hostname === 'cdn2.thecatapi.com') {
          urls.add(url.href)
          usable = true
        }
      } catch {
        // Ignore malformed URLs from the remote response.
      }
    }
    if (!usable) throw new Error('The Cat API returned no usable cat images')
  }
  if (urls.size < count) throw new Error('The Cat API returned too few distinct cat images')
  return [...urls].slice(0, count)
}
