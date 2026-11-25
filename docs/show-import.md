# Show import

Before a show, the organizer sends an `.xlsx` spreadsheet with the entered cats and the judge
assigned to each cat in every table judging session. The admin imports it on the show's edit page
in the admin dashboard (**Import cats and judging schedule**, below the show fields; the show has
to be saved first).

## Flow

1. **Check file** uploads the spreadsheet to `POST /api/shows/:id/import` with `mode: 'preview'`.
   The server maps it to plain data (`src/lib/show-import/mapRows.ts`) and returns the number of
   cats per session and judge code, errors and warnings. Nothing is saved.
2. The admin chooses a user for each judge code (A, B, …), optionally a steward, and a date for
   each session.
3. **Import** sends the file again with `mode: 'import'` and these choices. The server creates:
   - one `cats` document per row,
   - one `events` document (`event_type: 'table'`) per session and judge code, named e.g.
     `Sobota 1 – Judge A`,
   - one `cat-event-entries` document per cat and session, with `queue_number` in catalog number
     order and status `registered`.

Importing again replaces the show's table judging events, their entries and their cats. This is
refused once any entry of the show has moved past `registered`. The new data is written before the
old data is deleted, and a failed import removes what it created, so the show stays as it was.
Ring and BIS events are not touched.

## Spreadsheet format

The sheet named `Kompletný Zoznam` is read, or else the first sheet with a header row containing
`No` and `Breed`. Other sheets (summaries, per-judge lists) are ignored. Columns are matched by
header (case, diacritics and dots do not matter), so their order does not matter.

| Column                                                | Required  | Stored as             | Example         |
| ----------------------------------------------------- | --------- | --------------------- | --------------- |
| `No`                                                  | yes       | `cats.catalog_number` | `12`            |
| `Breed`                                               | yes       | `cats.breed`          | `SFL`           |
| `Colour` / `Color`                                    | yes       | `cats.color`          | `f 02 21 62 71` |
| `Sex`                                                 | yes       | `cats.sex`            | `Female (Spay)` |
| `Show Class`                                          | yes       | `cats.show_class`     | `P.H. - WC`     |
| `Kategória` / `Category`                              | yes       | `cats.category`       | `1`             |
| `WCF Skupina` / `WCF Group`                           | see below | `cats.wcf_group`      | `Adult Honour`  |
| `Name`                                                | no        | `cats.name`           |                 |
| `Birthday` (`YYYY-MM-DD`, `DD-MM-YYYY`, `DD.MM.YYYY`) | no        | `cats.birthday`       |                 |
| `WCF ID`                                              | no        | `cats.wcf_id`         |                 |
| any other header, e.g. `Sobota 1`                     | –         | one session           | `A`             |

- **WCF group:** the `WCF Skupina` column, or the tick columns (`Adult`, `Adult Honour`, …,
  `Out of competition`). Any non-empty cell except `0`, `-`, `no`, `nie`, `false` counts as a tick,
  so `✓` and `X` both work. If both are present and disagree, `WCF Skupina` wins with a warning.
- **Sessions:** every other column whose values are all short codes (1–3 letters or digits) is a
  judging session; its header becomes the event name. An empty cell means the cat is not judged in
  that session. Other unknown columns are ignored with a warning.

## Future improvements for import file format

- Keep the headers above unchanged; the order may change freely.
- Add `Name`, `Birthday`, `WCF ID` columns (the catalog has them), and owner contact details once
  we support importing owners.
- Include "Out of competition" cats too, or confirm they are left out on purpose. In the 2024
  file, catalog numbers 45–47, 79, 83, 85, 88, 91, 92, 99, 103 and 104 are missing, and cat 3 is
  "Out of competition" in the catalog but `P.H. - WC` in the spreadsheet.
- The tick columns are redundant with `WCF Skupina` and can be dropped.

## Temporary simplifications (revisit later)

- `cats.name`, `cats.birthday`, `cats.owner` and `cats.wcf_id` are optional because the spreadsheet
  does not contain them. Make them required again once the import provides them (or the admin
  fills them in), and decide how owners (exhibitor accounts) are created.
- `events.steward` is optional; stewards can be chosen during import or set later.
- Sessions are only distinguished by the event name (`Sobota 1 – Judge A`), there is no session
  field on events.
- `catalog_number`, `show_class`, `wcf_group` and `category` live on `cats`, which assumes the cat
  data is recreated for every show.
- Judges are not checked for breed qualifications; users have no roles yet.
