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

### Account activation

Users must complete email activation before signing in, including through the REST API.
OTP codes expire after 10 minutes and allow five attempts. Both initial code requests and resends
share a 60-second cooldown and a quota of five emails per account per 15 minutes. A shared quota
also limits activation emails to 60 per minute across accounts. Limits are stored in the database
so they apply across server processes.

Behind a trusted reverse proxy that overwrites client-supplied `X-Forwarded-For` / `X-Real-IP`, set
`AUTH_TRUST_PROXY_IP=true` to additionally limit each IP to ten activation emails per 15 minutes.
Leave this disabled when the app is directly accessible; forwarded headers can otherwise be forged.

After successful OTP verification, the single-use password setup token expires in 10 minutes and
only its hash is stored. Old activation tokens without an expiry are rejected; request a fresh code.
If password setup fails after the token has been consumed, start activation again with a fresh code.
