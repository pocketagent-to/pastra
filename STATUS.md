# Pastra — build status

Autonomous build of the handoff in `docs/`. Everything below is green:
`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
The backend is integration-tested on an in-process Postgres (PGlite) and was
also verified end-to-end against a real Postgres via `docker compose`.

```
pnpm install
docker compose up -d        # local Postgres
pnpm db:migrate             # apply migrations
pnpm db:seed                # nomad / week-46 example
pnpm dev                    # web (3000) + worker
pnpm --filter @pastra/worker start drop   # run a drop now (staging)
```

## Stage status (docs/architecture.md section 17)

| Stage | Area                                                                   | Status                                                                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Scaffold: workspace, config, CI, Docker, CLAUDE.md, docs/design/assets | ✅ Complete                                                                                                                                                                                                    |
| 1     | Catalog (26 providers, thresholds) + scoring engine                    | ✅ Complete — all §8 cases pass                                                                                                                                                                                |
| 2     | Design system: tokens, fonts, hexagon, components, showcase            | ✅ Complete                                                                                                                                                                                                    |
| 3     | Auth + screens on seeds                                                | 🟡 Screens built on the seed; sessions, handle check, DB-backed reads done. Remaining: full Google OAuth + email magic-link flow, `/onboarding` wiring to real sign-up                                         |
| 4     | Connections: contract, crypto, connect/disconnect, first adapters      | ✅ Core complete + integration-tested. Real adapters: EVM wallet (SIWE) done; others are stubs (below)                                                                                                         |
| 5     | Weekly drop: queue + chain                                             | ✅ Complete — pg-boss worker, full chain, verified on live DB                                                                                                                                                  |
| 6     | Offers, friends, sharing, admin                                        | 🟡 Offer engine + selection done; public pass + OG image done; friends/admin screens built. Remaining: friends mutations (invite/compare/reward) wired to core, admin write actions, personal code pool reveal |
| 7     | Remaining adapters                                                     | 🟡 Stub adapter for every provider (local env). Real adapters pending per-service API work (EVM done as the reference)                                                                                         |
| 8     | Card                                                                   | ✅ `CardProvider` + full mock (all flows, scenario-tested) + card screens. Remaining: the `wirex` implementation against the sandbox                                                                           |
| 9     | Launch prep                                                            | 🟡 Health endpoint + seed done. Remaining: data export/delete ops, rate limiting, monitoring/alerts, load test                                                                                                 |

## Packages

| Package       | What                                                              | Tests                         |
| ------------- | ----------------------------------------------------------------- | ----------------------------- |
| `catalog`     | Services, metrics, thresholds, stamps, titles, conditions         | ✅                            |
| `scoring`     | Pure `computePass`; metric→service→axis→level→title→stamps        | ✅ (all §8)                   |
| `crypto`      | AES-256-GCM token cipher, hashing, `Secret<T>`                    | ✅                            |
| `db`          | Drizzle schema (28 tables), migrations, PGlite test harness       | ✅                            |
| `card`        | `CardProvider` + mock, `WalletProvider` + mock                    | ✅                            |
| `providers`   | Adapter contract, registry, stubs, EVM wallet (SIWE)              | ✅                            |
| `notify`      | Mailer/Telegram interfaces + mocks + templates                    | ✅                            |
| `core`        | connect/disconnect/recompute, offers, drop, sessions, public pass | ✅                            |
| `config`      | Zod-validated environment                                         | —                             |
| `apps/web`    | Next.js 16: 46 routes, API, OG share image                        | build ✅                      |
| `apps/worker` | pg-boss drop chain                                                | typecheck ✅, runs on live DB |

## Open decisions (handoff README) — need the owner

1. **Embedded wallet provider** (recommendation Privy). Hidden behind
   `WalletProvider`; a mock is used. Not committed.
2. Cashback funding/payout; inactive-card policy; Wirex webhook source IPs;
   withdrawal min/fee; default daily card limit; domain and legal texts.

All business placeholders (`[FEE]`, `[PARTNER A]`, `[your-domain]`,
`[ISSUER LEGAL NAME]`, `[RATE]`, …) are kept verbatim as defaults, never invented.

## Notable "next" items

- Wire the app screens from the example seed to live `core` reads behind a data
  layer (the seam exists); add the Google OAuth and email magic-link routes.
- Real provider adapters per service (API fields verified against live docs).
- The `wirex` `CardProvider` against the sandbox.
- Friends/admin write paths, data export/delete, rate limiting, monitoring.
