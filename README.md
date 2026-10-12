# BESTCAT CMS

BESTCAT je výstavný a vyvolávací systém postavený na Payload CMS 3, Next.js, Reacte a PostgreSQL. Pôvodný BESTCAT login dizajn zostal zachovaný; prihlasovanie, používateľské roly, REST API aj administračné rozhranie teraz poskytuje Payload.

## Čo projekt obsahuje

- používateľské roly: administrátor, klub, editor, divák, posudzovateľ, steward, hlavný steward a vystavovateľ,
- správu klubov, výstav, posudzovateľov a majiteľov,
- skupiny plemien, plemená, mačky a výstavné prihlášky,
- ročné štatistiky plemien podľa klubu a regiónu vrátane WCF, LO a RIEX údajov,
- kruhy, fronty vyvolávania a výsledky posudzovania,
- evidenciu importov a zdrojových PDF/CSV/Excel súborov,
- Payload CMS na `/admin`,
- BESTCAT frontend na `/`,
- REST API na `/api` a GraphQL na `/api/graphql`.

## DEV spustenie

Požiadavky: Node.js 20.18.1+, pnpm 12 a Docker.

```bash
cp .env.example .env
pnpm install
docker compose up -d db
pnpm db:setup
pnpm dev
```

Otvorte:

- aplikácia: `http://localhost:3000`
- Payload CMS: `http://localhost:3000/admin`

Predvolený lokálny účet zo `.env.example`:

```text
E-mail: admin@bestcat.sk
Heslo:  Bestcat123!
```

Tieto údaje sú iba pre lokálny vývoj. Pred nasadením zmeňte heslo aj `PAYLOAD_SECRET`.

## Seed katalógu

Seed používa dva dodané vstupy:

```env
SEED_CATALOG_CSV_PATH=../judges(format 2).csv
SEED_CATALOG_PDF_PATH=../Catalog_20241228.pdf
```

Napriek názvu obsahuje súbor `judges(format 2).csv` katalóg výstavy, nie zoznam posudzovateľov. Seed preto vytvorí katalógové dáta; nevymýšľa posudzovateľov, ktorí vo vstupoch nie sú jednoznačne uvedení.

Aktuálny seed vytvára alebo aktualizuje:

- klub Terra Felis Slovakia,
- výstavu Jubilee Show, 28.–29. 12. 2024,
- 5 skupín plemien,
- 22 plemien,
- 59 majiteľov,
- 121 mačiek a 121 prihlášok,
- PDF katalóg, CSV zdroj a dve importné dávky.

Seed je idempotentný, takže `pnpm db:seed` možno spustiť opakovane bez duplikovania záznamov.

## Databáza a prostredia

Aplikácia sa pripája výhradne cez `DATABASE_URL`. Lokálna DEV databáza je samostatná databáza `bestcat_payload_dev`:

```env
DATABASE_URL=postgresql://bestcat:bestcat_dev@localhost:5433/bestcat_payload_dev
DATABASE_SSL=disable
DATABASE_POOL_SIZE=10
```

V produkcii sa kód nemení. Nastavia sa produkčné ENV hodnoty, napríklad:

```env
DATABASE_URL=postgresql://user:password@production-host:5432/bestcat
DATABASE_SSL=verify-full
DATABASE_POOL_SIZE=10
PAYLOAD_SECRET=dlhy-nahodny-produkcny-kluc
```

`DATABASE_SSL` podporuje `disable`, `require` a `verify-full`.

Payload počas lokálneho vývoja synchronizuje schému. Verziovaná počiatočná migrácia je v `src/migrations`. Produkčný postup:

```bash
pnpm db:migrate
pnpm build
pnpm start
```

Po budúcej zmene kolekcií vytvorte novú migráciu:

```bash
pnpm db:migrate:create nazov-zmeny
```

## Kontroly

```bash
pnpm generate:types
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Generované Payload typy sa ukladajú do `src/payload-types.ts`.
