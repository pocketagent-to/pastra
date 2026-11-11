# Deploying HEXTRA on Railway

Railway hosts the whole app in one project as **three services**:

| Service    | What it is                          | Config file           |
| ---------- | ----------------------------------- | --------------------- |
| `Postgres` | Railway managed PostgreSQL          | — (Railway plugin)    |
| `web`      | Next.js app (long-lived container)  | `railway.web.json`    |
| `worker`   | pg-boss background worker (the drop)| `railway.worker.json` |

Why Railway fits well: unlike Vercel, it runs a **persistent container**, so the `worker` finally
has a home, and `web` uses a real connection pool against a **direct** Postgres (no pgbouncer). The
pool shape is controlled by `WEB_DB_POOL` — set it to `persistent` here (see env tables).

> This is a pnpm workspace monorepo. Each service builds from the **repo root** (the whole workspace
> must be installed) and is told which app to build/run by its config file. The migrations run once
> per deploy via the web service's `preDeployCommand`.

---

## 0. Prerequisites

```bash
npm i -g @railway/cli      # or: brew install railway
railway login              # opens the browser; the token stays on your machine
```

Everything below is run from the repo root on **your** machine (where the CLI is authenticated).

---

## 1. Create the project and the database

```bash
cd /path/to/pastra
railway init                       # create a new project (name it e.g. "hextra")
railway add --database postgres    # add the managed Postgres (or: dashboard → New → Database → PostgreSQL)
```

Note the Postgres **service name** Railway gives it (default `Postgres`) — you reference it below.

---

## 2. Create the two app services

Service creation is most reliable in the **dashboard** (railway.app → your project):

1. **New → GitHub Repo** → pick this repo → name the service **`web`**.
2. **New → GitHub Repo** → same repo → name the service **`worker`**.

(Or, without GitHub, create two **Empty Services** and deploy to them with `railway up --service web`
/ `--service worker` from the repo root.)

### Point each service at its config file

For each service: **Settings → Config-as-code** → set the path, or set the variable
`RAILWAY_CONFIG_FILE`:

- `web` → `railway.web.json`
- `worker` → `railway.worker.json`

These files pin the build command (`pnpm --filter @pastra/web build`), the migrate step
(`preDeployCommand`), and the start command for each service.

---

## 3. Environment variables

Set these per service (dashboard → service → **Variables**). Values like `${{Postgres.DATABASE_URL}}`
are **Railway references** — type them in the dashboard so autocomplete links them (if you use the
CLI, single-quote them so your shell doesn't touch the braces). Replace `Postgres` with your DB
service's actual name if different.

### `web`

| Variable           | Value                                   | Notes                                   |
| ------------------ | --------------------------------------- | --------------------------------------- |
| `DATABASE_URL`     | `${{Postgres.DATABASE_URL}}`            | the managed Postgres (direct)           |
| `WEB_DB_POOL`      | `persistent`                            | long-lived container → real pool        |
| `APP_URL`          | `https://${{RAILWAY_PUBLIC_DOMAIN}}`    | the service's public URL                |
| `NODE_ENV`         | `production`                            |                                         |
| `SESSION_SECRET`   | `openssl rand -hex 32`                  | generate (below)                        |
| `TOKEN_ENC_KEYS`   | `v1:<hex>`                              | generate (below)                        |
| `HMAC_KEY`         | `openssl rand -hex 32`                  | generate                                |
| `PRIVY_APP_ID`     | from dashboard.privy.io                 | login                                   |
| `PRIVY_APP_SECRET` | from dashboard.privy.io                 | login                                   |

Add any provider credentials you want live (see `INTEGRATIONS.md`). `DATABASE_URL_UNPOOLED` is **not
needed** on Railway (single direct Postgres); it falls back to `DATABASE_URL`.

### `worker`

| Variable         | Value                        | Notes                                              |
| ---------------- | ---------------------------- | -------------------------------------------------- |
| `DATABASE_URL`   | `${{Postgres.DATABASE_URL}}` | same Postgres                                       |
| `NODE_ENV`       | `production`                 |                                                    |
| `TOKEN_ENC_KEYS` | same as web                  | the worker decrypts tokens to sync                 |
| `HMAC_KEY`       | same as web                  |                                                    |
| `DROP_CRON`      | `0 13 * * 1` (default)       | weekly drop time; optional                         |
| `DROP_TZ`        | `Europe/Warsaw` (default)    | optional                                           |

> The worker runs the weekly drop, which calls each provider's API to sync connections, so it needs
> the **same provider credentials** as `web` (the OAuth client ids/secrets and API keys from
> `INTEGRATIONS.md`). Add them to the `worker` service too, not just `web`.

### Generate the secrets

```bash
openssl rand -hex 32                        # SESSION_SECRET
printf 'v1:%s' "$(openssl rand -hex 32)"    # TOKEN_ENC_KEYS
openssl rand -hex 32                        # HMAC_KEY
```

Use the **same** `TOKEN_ENC_KEYS` and `HMAC_KEY` on `web` and `worker` (they encrypt/verify the same
data). `SESSION_SECRET` is only used by `web`.

---

## 4. Give `web` a public URL

Dashboard → `web` service → **Settings → Networking → Generate Domain**. Then make sure `APP_URL`
resolves to it (the `https://${{RAILWAY_PUBLIC_DOMAIN}}` reference does this automatically). Add that
origin to Privy (dashboard.privy.io → Allowed origins) or login is rejected in the browser.

OAuth/service callbacks use `https://<your-domain>/api/connections/<provider>/callback` — register
that redirect at each provider once the domain is known (see `INTEGRATIONS.md`).

---

## 5. Deploy

- **With GitHub integration:** push to the connected branch; Railway builds and deploys each service.
- **With the CLI:** from the repo root,

```bash
railway up --service web
railway up --service worker
```

The `web` deploy runs `drizzle-kit migrate` (its `preDeployCommand`) against the database before it
goes live, so the schema is created/updated automatically. Watch logs with:

```bash
railway logs --service web
railway logs --service worker
```

A healthy `web` responds on `GET /api/health` with `{"ok":true}`. A healthy `worker` logs a
`{"src":"worker","event":"drop_scheduled",...}` line on boot.

---

## Notes & troubleshooting

- **Migrations as a one-off:** if you prefer not to run them on every deploy, drop
  `preDeployCommand` from `railway.web.json` and run once after a schema change:
  `railway run --service web pnpm --filter @pastra/db migrate`.
- **Postgres connection limit:** Railway Postgres has a per-plan connection cap. Each container holds
  up to `max: 10` (persistent role). Keep `numReplicas` modest, or lower the pool if you hit limits.
- **The worker refuses to start** with "requires the DIRECT database endpoint" only if `DATABASE_URL`
  points at a pooler host (`-pooler`/`pgbouncer`). Railway's managed Postgres is direct, so this
  should not happen — it is a guard for mixed Neon/Railway setups.
- **Build fails on the install step:** Railway's Nixpacks reads `packageManager` (pnpm@10) from
  `package.json` and installs the whole workspace. If it misbehaves, set the service's **Install
  Command** to `pnpm install --frozen-lockfile`. As a last resort the repo can be switched to a
  Dockerfile builder — ask and I'll add a tested multi-stage Dockerfile.
- **Vercel still works:** these changes are additive. On Vercel keep `WEB_DB_POOL` unset (defaults to
  `serverless`) and use the Neon pooled/direct split from `DEPLOY.md`.
