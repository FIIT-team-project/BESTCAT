# Cat PDF export

Administrators can download the cat list from **Shows → show detail → Export PDF**, below the import.
The button uses the same Payload controls and theme variables as the show import.

Rows are ordered by catalog number, then record ID. It includes name, breed, colour, sex,
show class, WCF group, owner name and WCF ID. Missing optional values are shown as a dash.

This export includes only cats entered in that show through table, ring or BIS judging events.
A cat entered in multiple sessions appears once. The PDF includes the show's name, location
and license number; its filename starts with `show-{id}-cats-`. Save a new show before exporting.
Cats without any judging entries cannot be associated with a show by the current data model.

## Local setup

After installing project dependencies, download Chromium once:

```sh
pnpm pdf:install-browser
```

Run this again after upgrading `playwright-core`. The dependency is pinned to the same
version as the existing Playwright test tooling. Alternatively, set `PDF_CHROMIUM_PATH`
to a compatible system Chromium executable. No browser download happens during a request.

The Docker image installs Alpine's system Chromium and Liberation fonts and sets
`PDF_CHROMIUM_PATH=/usr/bin/chromium-browser`. A separate PDF service is not required.
The Alpine/system-browser deployment needs a smoke test when its Chromium package is
upgraded; Playwright primarily tests against its bundled browser builds.

## Rendering and access

- `GET /api/shows/:id/export-pdf` requires an authenticated administrator, including when called
  outside the admin interface. Reads use the Local API with access checks enabled. It reads distinct cat IDs
  from the show's judging entries in batches. Invalid IDs return HTTP 400, missing shows
  return HTTP 404, and shows without entered cats return HTTP 400.
- `src/lib/cat-export/template.ts` defines the self-contained HTML/CSS template: A4 landscape,
  repeated table headings, wrapping text and rows kept together where they fit on a page.
- `src/lib/cat-export/renderPDF.ts` uses server-side Chromium to render selectable text,
  background fills and page numbering. JavaScript and external requests are disabled.
  All database strings are escaped before being included in HTML.
- The response is a PDF attachment with private/no-store caching. Browser instances are
  closed after each export, including failed renders.
- Exports above 5,000 records return HTTP 422 rather
  than silently truncating the list. Rendering failures return a generic HTTP 503 message;
  details are recorded in the server log.

This is a PDF for download and ordinary printing. It does not implement PDF/X or colour
profiles for professional prepress.

## Verification

```sh
pnpm exec vitest run --config vitest.config.mts tests/int/cat-export.int.spec.ts
pnpm exec playwright test tests/e2e/cat-export.e2e.spec.ts --project=chromium
```

The integration test uses a temporary database. Like the existing browser tests, the
browser test uses the local development database and removes only its own fixture records.
