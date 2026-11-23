## Development

### Running payload

Install Node.js and pnpm locally.

```sh
pnpm i
cp .env.example .env
```

For development, the recommended setup is to leave `SMTP_HOST` unset, emails will be written to the console.

Start the dev sever:

```sh
pnpm dev
```

Open `http://localhost:3000` for the frontend or `http://localhost:3000/admin` for the admin dashboard.

## Docker

With Docker running, prepare `.env` as above, set a random `PAYLOAD_SECRET`, and unset `SMTP_HOST` for local use.

```sh
docker compose up --build -d
```

Open `http://localhost:3000`. Stop with `docker compose down` (data is preserved).
See [Docker docs](docs/docker.md) for details.
