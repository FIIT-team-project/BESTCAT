import type { Cat, Show } from '@/payload-types'

const escapeHTML = (value: string | number | null | undefined) =>
  String(value ?? '—').replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })

export function catsHTML(
  cats: Cat[],
  generatedAt: Date,
  show: Pick<Show, 'show_name' | 'city' | 'country' | 'license_number'>,
) {
  const date = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Europe/Bratislava',
  }).format(generatedAt)

  const rows = cats.map((cat) => {
    const owner = typeof cat.owner === 'object' ? cat.owner?.name : null
    return `<tr>
      <td class="number">${escapeHTML(cat.catalog_number)}</td>
      <td class="name">${escapeHTML(cat.name)}</td>
      <td>${escapeHTML(cat.breed)}</td>
      <td>${escapeHTML(cat.color)}</td>
      <td>${escapeHTML(cat.sex)}</td>
      <td>${escapeHTML(cat.show_class)}</td>
      <td>${escapeHTML(cat.wcf_group)}</td>
      <td>${escapeHTML(owner)}</td>
      <td>${escapeHTML(cat.wcf_id)}</td>
    </tr>`
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'" />
  <title>BESTCAT — ${escapeHTML(show.show_name)}</title>
  <style>
    @page { size: A4 landscape; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #202020; font: 9pt/1.4 Arial, "Liberation Sans", sans-serif; }
    h1 { margin: 0 0 4mm; font-size: 20pt; overflow-wrap: anywhere; }
    .brand { margin: 0 0 2mm; font-size: 9pt; font-weight: bold; letter-spacing: 1.5pt; }
    .summary { margin: 0 0 6mm; color: #555; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td { padding: 2.5mm 2mm; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #e9e9e9; font-size: 8pt; border-bottom: 1pt solid #aaa; }
    td { border-bottom: 0.5pt solid #ddd; }
    .number { font-weight: bold; }
    .name { font-weight: bold; }
    html { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  </style>
</head>
<body>
  <p class="brand">BESTCAT</p>
  <h1>${escapeHTML(show.show_name)}</h1>
  <p class="summary">${escapeHTML(show.city)}, ${escapeHTML(show.country)} · License: ${escapeHTML(show.license_number)}</p>
  <p class="summary">${cats.length} cats · Cats entered in this show, ordered by catalog number · Exported ${escapeHTML(date)}</p>
  <table>
    <colgroup>
      <col style="width:5%" /><col style="width:20%" /><col style="width:7%" />
      <col style="width:11%" /><col style="width:9%" /><col style="width:10%" />
      <col style="width:12%" /><col style="width:17%" /><col style="width:9%" />
    </colgroup>
    <thead><tr>
      <th>No.</th><th>Name</th><th>Breed</th><th>Colour</th><th>Sex</th>
      <th>Show class</th><th>WCF group</th><th>Owner</th><th>WCF ID</th>
    </tr></thead>
    <tbody>${rows.join('\n')}</tbody>
  </table>
</body>
</html>`
}
