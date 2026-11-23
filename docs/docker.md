# Docker

The Compose setup runs a production Next.js standalone build with Payload and SQLite.
Docker Desktop (or Docker Engine with Compose) must be running. Node.js and pnpm are
installed inside the build image, so they are not required on the host.

## First start

If `.env` does not exist yet, create it:

```sh
cp .env.example .env
```

Set `PAYLOAD_SECRET` in `.env` to a random, permanent value. You can generate one with:

```sh
openssl rand -hex 32
```

Keep `SMTP_HOST` unset to log email to the container logs. To send real email, configure
the SMTP and sender variables from `.env.example`. Set `SERVER_URL` to the public origin
of the application; locally, use `http://localhost:3000`.

Start from the repository root:

```sh
docker compose up --build -d
docker compose logs -f app
```

Open <http://localhost:3000> or <http://localhost:3000/admin>. On a fresh database,
create the first administrator through the admin dashboard.

If a local `pnpm dev` process already uses port 3000, stop it or use another host port:

```sh
APP_PORT=3001 SERVER_URL=http://localhost:3001 docker compose up --build -d
```

The alternative `SERVER_URL` must also be set in `.env` or passed again on future
Compose commands that recreate the container.

## Data and configuration

| Item                  | Location                                        |
| --------------------- | ----------------------------------------------- |
| SQLite database       | `bestcat_data` volume, mounted at `/app/data`   |
| Uploaded media        | `bestcat_media` volume, mounted at `/app/media` |
| Runtime configuration | `.env`, passed to the container by Compose      |

Compose overrides `DATABASE_URL` to `file:/app/data/payload.db`. The first start creates
a separate empty database. The host's `payload.db` and `media/` are not copied or modified.
Importing existing development data requires a separate, reviewed migration because
development databases use automatic schema push rather than migration history.

The image runs as the unprivileged `node` user. `.dockerignore` excludes local secrets,
databases, uploads, dependencies, and build artifacts from the build context.

## Updating and stopping

Rebuild after changing source code or dependencies:

```sh
docker compose up --build -d
```

Check the running service and its health:

```sh
docker compose ps
docker compose logs --tail=100 app
```

Stop the application while preserving its data:

```sh
docker compose down
```

The named volumes survive container replacement and `docker compose down`. Explicitly
deleting the volumes, including with `docker compose down -v`, removes their data.
Back up the database and uploaded media before deploying schema changes.

## Schema changes

Production uses the committed migrations in `src/migrations/`. Payload runs pending
migrations during its first initialization, before serving application data. The initial
migration creates all required tables, so a fresh container does not need an interactive
schema confirmation. The health check requests `/login` and verifies initialization.

After changing collections or fields during local development, generate a migration:

```sh
pnpm payload migrate:create describe_the_change
```

Review and commit the generated TypeScript migration, JSON schema snapshot, and updated
`index.ts`, then rebuild the image. Production does not automatically push schema changes.
Keep one application instance for this SQLite setup.

See the [Payload migration documentation](https://payloadcms.com/docs/database/migrations)
and [Next.js standalone output documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
