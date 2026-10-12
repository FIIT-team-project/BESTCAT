# BESTCAT Exhibition System

BESTCAT Exhibition System je tímový projekt zameraný na podporu výstav a posudzovania zvierat.

Cieľom systému je vytvoriť webovú aplikáciu, ktorá bude podporovať najmä:

- správu výstav,
- import výstavných údajov,
- správu používateľov a rolí,
- vyvolávanie zvierat na posúdenie,
- posudzovanie pri stole,
- posudzovanie v kruhu,
- Best in Show workflow,
- notifikácie pre vystavovateľov,
- zobrazovanie aktuálneho priebehu výstavy,
- štatistiky a reporty,
- export výsledkov a údajov späť do systému BESTCAT.

Projekt bude postupne rozširovaný podľa požiadaviek zadania a potrieb tímu.

## Prihlásenie

Projekt obsahuje responzívny React frontend podľa návrhu **BESTCAT Web UI Design** a
Node.js backend s prihlasovacím API. Používatelia aj session sú uložené v PostgreSQL,
session identifikátor je v `HttpOnly` cookie a heslá sú uložené ako `scrypt` hash.
Používateľská rola sa získava výhradne z databázy.

Pre lokálne spustenie:

```bash
cp .env.example .env
pnpm install
docker compose up -d db
pnpm db:setup
pnpm dev


testovaci user:
admin@bestcat.sk
Bestcat123!

```

Frontend bude dostupný na `http://localhost:5173`, API na
`http://localhost:3000`. Predvolené lokálne demo údaje z `.env.example` sú:

```text
E-mail: admin@bestcat.sk
Heslo:  Bestcat123!
```

`pnpm db:setup` aplikuje migrácie a vloží alebo aktualizuje DEV používateľa podľa
premenných `AUTH_EMAIL`, `AUTH_PASSWORD`, `AUTH_NAME` a `AUTH_ROLE`.

### Prepínanie databázy

Backend používa iba pripojenie z `DATABASE_URL`. Lokálna DEV konfigurácia je:

```env
DATABASE_URL=postgresql://bestcat:bestcat_dev@localhost:5433/bestcat_dev
DATABASE_SSL=disable
```

Pri neskoršom nasadení sa kód nemení. V produkčnom ENV sa nastaví produkčná URL a
režim SSL, napríklad:

```env
DATABASE_URL=postgresql://user:password@production-host:5432/bestcat
DATABASE_SSL=verify-full
```

Podporované hodnoty `DATABASE_SSL` sú `disable`, `require` a `verify-full`.
Produkcia vyžaduje aj náhodný `SESSION_SECRET` s dĺžkou aspoň 32 znakov. Hodnoty
z `.env.example` sú určené iba na lokálny vývoj.

Produkčný build a spustenie:

```bash
pnpm db:migrate
pnpm build
NODE_ENV=production pnpm start
```

## Development environment

Odporúčané verzie pre vývoj:

```text
Node.js:      22.x
pnpm:         12.11.2
TypeScript:   6.0.2
ESLint:       10.x
```

Verzia `pnpm` je definovaná priamo v `package.json`:

```json
{
  "packageManager": "pnpm@12.11.2"
}
```

V CI preto verziu `pnpm` nenastavujeme duplicitne. Pipeline ju načíta z `package.json`.

Pred začatím práce je vhodné overiť lokálne verzie:

```bash
node --version
pnpm --version
```

## Lokálna kontrola projektu

Pred vytvorením Pull Requestu spustite:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Všetky kontroly musia prejsť bez chyby.

## Git workflow

Hlavná vetva projektu je:

```text
main
```

Do vetvy `main` sa **nepushuje priamo**.

Každá zmena musí byť vytvorená v samostatnej vetve a následne pridaná do `main` cez Pull Request.

Odporúčaný workflow:

```text
main
  |
  +--- feature/nova-funkcionalita
            |
            +--- commits
            |
            +--- Pull Request
                      |
                      +--- CI checks
                      |
                      +--- main
```

## Vytvorenie novej vetvy

Pred začatím práce si aktualizujte lokálnu vetvu `main`:

```bash
git checkout main
git pull
```

Následne vytvorte novú vetvu:

```bash
git checkout -b feature/nazov-funkcionality
```

Odporúčaný formát názvov:

```text
feature/...
fix/...
refactor/...
docs/...
```

Príklady:

```text
feature/exhibition-import
feature/judge-dashboard
feature/notifications

fix/login-error
fix/queue-order

refactor/permissions
docs/readme
```

## Commit a push

Počas práce commitujte zmeny do svojej vetvy:

```bash
git add .
git commit -m "Add judge dashboard"
```

Následne odošlite vetvu na GitHub:

```bash
git push -u origin feature/judge-dashboard
```

Potom vytvorte Pull Request do `main`.

## CI pipeline

Pri každom Pull Requeste do `main` a po každom pushi do `main` sa automaticky spustí GitHub Actions pipeline.

Aktuálne vykonáva:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
```

Ak niektorá kontrola zlyhá, Pull Request by sa nemal mergeovať.

Workflow sa nachádza v:

```text
.github/workflows/ci.yaml
```

## Pravidlá práce s repozitárom

1. **Nepushovať priamo do `main`.**
2. Každá funkcionalita alebo oprava musí mať vlastnú vetvu.
3. Zmeny sa do `main` pridávajú iba cez Pull Request.
4. Pred začatím práce si aktualizujte `main`.
5. Pred Pull Requestom spustite `pnpm lint` a `pnpm typecheck`.
6. Pull Request má obsahovať iba zmeny súvisiace s danou úlohou.
7. Nerobte v jednom Pull Requeste viac nesúvisiacich funkcionalít.
8. Používajte stručné a zrozumiteľné commit správy.
9. Necommitujte heslá, API kľúče, `.env` súbory ani iné citlivé údaje.
10. Necommitujte lokálne alebo generované súbory patriace do `.gitignore`.
11. Pred merge skontrolujte úspešné CI checks.
12. Nemažte alebo výrazne neprepisujte cudziu funkcionalitu bez dohody s tímom.

## Aktualizácia vlastnej vetvy

Ak sa počas práce zmení `main`:

```bash
git checkout main
git pull

git checkout feature/nazov-funkcionality
git merge main
```

Prípadné konflikty vyriešte vo svojej vetve pred merge Pull Requestu.

## Commit messages

Dobré príklady:

```text
Add exhibition import
Add judge dashboard
Add notification system
Fix animal queue ordering
Fix login redirect
Refactor exhibition service
Update README
```

Nevhodné príklady:

```text
fix
changes
update
asdf
final
final2
works
```

## Pull Request

Pri Pull Requeste stručne uveďte:

- čo bolo implementované,
- čo bolo upravené,
- čo je potrebné otestovať.

Príklad:

```text
Add judge dashboard

- added assigned animal list
- added judging status
- added evaluation form
- added permission checks
```

## Dôležité

`main` reprezentuje hlavnú stabilnú verziu projektu.

Každá zmena musí prejsť cez:

```text
branch -> Pull Request -> CI -> main
```
