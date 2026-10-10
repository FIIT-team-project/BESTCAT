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
