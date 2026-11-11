# Deploying Pastra (Vercel + Neon)

A minimal, mobile-friendly path to a live, shareable instance. This deploys the **web app**
(`apps/web`). The background worker (`apps/worker`, the weekly drop chain) is **not** required for a
live test: connecting a service recomputes the pass on demand.

## 1. Database — Neon (managed Postgres)

1. Create a project at <https://neon.tech> (free tier).
2. Neon gives you **two** host forms for the same database — copy both:
   - the **pooled** string (host contains `-pooler`, pgbouncer transaction mode):
     `postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`
   - the **direct** string (no `-pooler`):
     `postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require`
3. Set **`DATABASE_URL` = the pooled string** (serverless web multiplexes through the pooler) and
   **`DATABASE_URL_UNPOOLED` = the direct string**. (SSL is required by the Neon URL — the `postgres`
   driver honours `sslmode=require`.)

Why both: Vercel functions are serverless, so each warm instance opens its own connection; the
pooler keeps the total from exhausting Postgres. But migrations (DDL) and the background worker
(pg-boss needs `LISTEN/NOTIFY` and advisory locks) require a **direct** session connection, which the
transaction pooler cannot provide — so those read `DATABASE_URL_UNPOOLED`. Locally there is one
Postgres and no pooler, so `DATABASE_URL_UNPOOLED` can be left empty (it falls back to `DATABASE_URL`).

The database schema is created automatically: the Vercel build runs `drizzle-kit migrate` (against
the direct endpoint) before `next build` (see `apps/web/vercel.json`). `drizzle-kit migrate` is
idempotent, so every later deploy is a no-op once the schema exists.

## 2. Web app — Vercel

1. Import the GitHub repo at <https://vercel.com/new>.
2. **Root Directory**: set to `apps/web`.
   (Install/build commands and framework are pinned by `apps/web/vercel.json` — no need to touch them.)
3. Add the **Environment Variables** from the table below (Production).
4. Deploy.
5. Copy the production URL (e.g. `https://<project>.vercel.app`), set `APP_URL` to it, and redeploy
   if it differs from what you entered.

## 3. Privy (login + embedded wallet)

In the Privy dashboard (<https://dashboard.privy.io>) for the app whose ID is `PRIVY_APP_ID`:

- Add the production origin (the exact `https://<project>.vercel.app`) to **Allowed origins / domains**.
- Confirm **Email** and **Google** login methods are enabled.

Without the origin allowlisted, Privy login is rejected in the browser.

## Environment variables (Vercel → Production)

| Variable                   | Value                                                       | Notes                              |
| -------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| `DATABASE_URL`             | Neon **pooled** string (`-pooler` host, `?sslmode=require`) | required — serverless web          |
| `DATABASE_URL_UNPOOLED`    | Neon **direct** string (no `-pooler`, `?sslmode=require`)   | migrations + worker; empty locally |
| `APP_URL`                  | `https://<project>.vercel.app`                              | the live URL                       |
| `SESSION_SECRET`           | 32-byte random hex                                          | generate fresh                     |
| `HMAC_KEY`                 | 32-byte random hex                                          | generate fresh                     |
| `TOKEN_ENC_KEYS`           | `v1:<64 hex chars>` (32 bytes)                              | generate fresh                     |
| `PRIVY_APP_ID`             | Privy app id                                                | server                             |
| `PRIVY_APP_SECRET`         | Privy app secret                                            | server, secret                     |
| `NEXT_PUBLIC_PRIVY_APP_ID` | same as `PRIVY_APP_ID`                                      | exposed to the browser             |
| `CARD_PROVIDER`            | `mock`                                                      | Wirex is behind the same interface |

Generate the three secrets with:

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)"
echo "HMAC_KEY=$(openssl rand -hex 32)"
echo "TOKEN_ENC_KEYS=v1:$(openssl rand -hex 32)"
```

Do **not** set `DEV_LOGIN_ENABLED` in production — it stays off, and the dev sign-in route returns 404.
`NODE_ENV=production` is set by Vercel automatically.

Everything else in `packages/config` has a safe default; card is mocked, notifications and indexers
are inert until their keys are supplied.
