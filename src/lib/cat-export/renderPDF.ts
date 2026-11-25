import { chromium } from 'playwright-core'

/** Renders only our self-contained HTML; no application pages or remote assets are loaded. */
export async function renderCatsPDF(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    executablePath: process.env.PDF_CHROMIUM_PATH || undefined,
    timeout: 30_000,
  })
  const deadline = setTimeout(() => void browser.close().catch(() => {}), 30_000)

  try {
    const context = await browser.newContext({ javaScriptEnabled: false })
    await context.route('**/*', (route) => route.abort())
    const page = await context.newPage()
    page.setDefaultTimeout(30_000)
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)

    return await page.pdf({
      format: 'A4',
      landscape: true,
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '16mm', left: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;margin:0 12mm;font:8px Arial;color:#666;display:flex;justify-content:space-between"><span>BESTCAT · Cat list</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    })
  } finally {
    clearTimeout(deadline)
    await browser.close()
  }
}
