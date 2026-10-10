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

Projekt bude postupne rozširovaný o ďalšie funkcionality podľa požiadaviek zadania a potrieb tímu.

## Git workflow

Hlavná vetva projektu je:

```text
main
```

Do vetvy `main` sa **nepushuje priamo**.

Každá zmena musí byť vytvorená v samostatnej vetve a následne pridaná do `main` cez Pull Request.

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

Príklady názvov vetiev:

```text
feature/exhibition-import
feature/judge-dashboard
feature/notifications
feature/statistics

fix/login-error
fix/queue-order
fix/permissions

refactor/exhibition-service
refactor/database-model
```

Odporúčaný formát:

```text
feature/...
fix/...
refactor/...
docs/...
```

## Práca na funkcionalite

Počas práce commitujte zmeny do svojej vetvy:

```bash
git add .
git commit -m "Add judge dashboard"
```

Po dokončení práce odošlite vetvu na remote repository:

```bash
git push -u origin feature/judge-dashboard
```

Následne vytvorte Pull Request do:

```text
main
```

Workflow:

```text
main
  |
  +--- feature/nova-funkcionalita
            |
            +--- commits
            |
            +--- Pull Request
                      |
                      +--- main
```

## Pravidlá práce s repozitárom

1. **Nepushovať priamo do `main`.**
2. Každá funkcionalita alebo oprava musí mať vlastnú vetvu.
3. Zmeny sa do `main` pridávajú iba cez Pull Request.
4. Pred začatím novej práce si vždy aktualizujte `main`.
5. Pred vytvorením Pull Requestu skontrolujte, či je vaša vetva aktuálna voči `main`.
6. Pull Request by mal obsahovať iba zmeny súvisiace s danou úlohou.
7. Nerobte v jednom Pull Requeste viac nesúvisiacich funkcionalít.
8. Commity by mali mať stručný a zrozumiteľný názov.
9. Necommitujte heslá, API kľúče, `.env` súbory ani iné citlivé údaje.
10. Necommitujte lokálne alebo generované súbory, ktoré patria do `.gitignore`.
11. Pred merge skontrolujte, či projekt funguje a neobsahuje známe chyby.
12. Nemažte alebo výrazne neprepisujte cudziu funkcionalitu bez dohody s tímom.

## Aktualizácia vlastnej vetvy

Ak sa počas práce zmení `main`, aktualizujte si svoju vetvu.

```bash
git checkout main
git pull

git checkout feature/nazov-funkcionality
git merge main
```

Prípadné konflikty vyriešte ešte pred vytvorením alebo merge Pull Requestu.

## Commit messages

Používajte stručné a výstižné commit správy.

Dobré príklady:

```text
Add exhibition import
Add judge dashboard
Add notification system
Add user role validation
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

Pri vytváraní Pull Requestu stručne popíšte:

- čo bolo implementované,
- čo bolo upravené,
- prípadne čo treba otestovať.

Príklad:

```text
Add judge dashboard

- added assigned animal list
- added judging status
- added evaluation form
- added basic permission checks
```

## Branch naming

Používajte názvy vetiev, z ktorých je jasné, čo obsahujú.

### Nová funkcionalita

```text
feature/judge-dashboard
feature/exhibition-import
feature/live-results
```

### Oprava chyby

```text
fix/login
fix/notification-error
fix/queue-order
```

### Refactoring

```text
refactor/permissions
refactor/exhibition-service
```

### Dokumentácia

```text
docs/readme
docs/api-description
```

## Dôležité

`main` reprezentuje hlavnú stabilnú verziu projektu.

Preto platí:

```text
žiadny direct push do main
```

Každá zmena musí prejsť cez:

```text
branch -> Pull Request -> main
```
