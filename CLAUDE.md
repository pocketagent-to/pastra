# Pastra — repository rules

Pastra is a free "pass" (a hexagon of six life axes plus a level) that funnels users to a
crypto Visa card issued through Wirex BaaS. Build to the handoff in `docs/`, do not redesign.

## Source of truth

| For                   | Read                          |
| --------------------- | ----------------------------- |
| Behaviour and numbers | `docs/product-spec.md`        |
| How it is built       | `docs/architecture.md`        |
| Metric thresholds     | `docs/metrics.csv`            |
| Scoring constants     | `docs/formula.csv`            |
| Layout, colours, copy | `design/*.html` (the mockups) |

When the spec and a mockup disagree on **behaviour/numbers**, the spec wins. On **look/copy**,
the mockup wins. For the card, architecture §11 `CardProvider` contract and §19 win over older text.

Docs are in Russian. **All code, identifiers, UI copy, commits and comments are in English.**
Take UI copy verbatim from the mockups.

## Commands

```bash
pnpm install            # install workspace deps
pnpm dev                # run web + worker in parallel
pnpm typecheck          # tsc across packages + apps
pnpm test               # vitest (unit + contract)
pnpm lint               # eslint
pnpm format             # prettier --write
docker compose up -d    # local Postgres for the db/core/worker stages
```

Every build stage ends green: typecheck, unit tests, and the e2e scenarios for that stage
(architecture §16 + §19). Build order is architecture §17 (stages 0–9).

## Package boundaries (architecture §4)

```
apps/web      Next.js: pages, API routes, webhooks, OG images
apps/worker   background worker: drop chain, sync jobs
packages/
  catalog     services, metrics, thresholds, stamps, titles (data + types)
  scoring     pure computePass: metrics -> axes, level, title, stamps
  providers   one adapter file per service
  db          Drizzle schema, migrations, queries
  card        CardProvider interface + wirex & mock implementations
  notify      Telegram, email, templates
  crypto      token encryption, signatures, hashes
  config      env reading and validation
```

- `apps/web` and `apps/worker` call only `core`, `db` (reads), `notify`, `config`.
  All data mutations go through `core` operations.
- `core` is the only place `providers`, `scoring`, `db`, `card` meet.
- `scoring` imports nothing but `catalog`. It never touches the DB, network, or the clock.
- `providers` do not know about the DB: given a token, they return metrics only.

## Rules that override defaults

- **Mockup is the layout truth.** Each screen is compared by Playwright screenshot against the
  rendered HTML mockup in the same viewport (390px). Allowed differences are only those in the
  spec table "Расхождения макета и спецификации" and real data in place of sample data.
- **Placeholders stay.** Square-bracket text in a mockup (`[FEE]`, `[PARTNER A]`, `[your-domain]`)
  is an open business value: read it from config/seed and keep the bracket text as the default.
  Never invent fees, rates, partner names, legal names, or a domain.
- **Level only grows:** `level = 1 + floor(peakPoints / 15)`; store peak points.
- **Money is strings** with a decimal point, never float.

## Never log (architecture §14)

Access tokens, login codes, full wallet addresses, email addresses, metric values, promo codes,
card webhook bodies, and card details (number/expiry/CVV never touch our servers at all).
Logs may contain IDs, error codes, and durations only.

## Open decisions — ask the owner, do not guess

Embedded wallet provider (recommendation Privy, behind a `WalletProvider` interface); cashback
funding/payout; inactive-card policy; Wirex webhook source IPs; withdrawal min/fee; default daily
card limit; domain and legal texts. See `docs/architecture.md` §18 and the handoff README.
