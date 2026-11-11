# Service integrations — what to get and where

This is the shopping list for running HEXTRA in production and turning the service integrations on.
Each service ships with a real adapter (`packages/providers/src/adapters/*`). A service stays on the
**stub** adapter (instant demo connect) until its credentials are present; once you add them it
switches to the **real** OAuth/API flow automatically (`liveProviders()` in `apps/web/lib/server.ts`).

## How to apply

1. Register an app / get a key at each service's developer portal (tables below).
2. For every OAuth service, register this **exact redirect / callback URL**:
   `https://<your-domain>/api/connections/<provider>/callback`
   (e.g. `https://pastra-web-blond.vercel.app/api/connections/github/callback`). It must match the
   `APP_URL` you deployed with, character for character.
3. Put the credentials in **Vercel → Project → Settings → Environment Variables** (Production),
   using the env var names below. **Redeploy** after adding.
4. That provider now uses the real flow; the rest stay on the demo stub.

> Security: these are secrets. Keep them only in the environment, never in the repo. The app encrypts
> every user access/refresh token at rest (AES-256-GCM) and never logs tokens, addresses, emails or
> metric values.

---

## 0. Platform — required to run at all

| Purpose                             | Env var(s)                         | Where / how                                                                                                                                                                |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Postgres (Neon)**                 | `DATABASE_URL`                     | <https://console.neon.tech> → connection string. **Also add `DATABASE_URL_UNPOOLED`** (the direct, non-`-pooler` endpoint) for migrations and the worker — see note below. |
| **Privy (login + embedded wallet)** | `PRIVY_APP_ID`, `PRIVY_APP_SECRET` | <https://dashboard.privy.io> → your app → Settings → API keys. _(Already set — this is how login works today.)_                                                            |
| **Session secret**                  | `SESSION_SECRET`                   | Generate yourself: `openssl rand -hex 32`                                                                                                                                  |
| **Token encryption key**            | `TOKEN_ENC_KEYS`                   | Generate yourself: `printf 'v1:%s' "$(openssl rand -hex 32)"` (format is `v1:<hex>`; rotation = prepend a `v2:` key).                                                      |
| **HMAC key** (signatures/hashes)    | `HMAC_KEY`                         | Generate yourself: `openssl rand -hex 32`                                                                                                                                  |
| **App URL**                         | `APP_URL`                          | Your deployed origin, e.g. `https://pastra-web-blond.vercel.app` (no trailing slash).                                                                                      |

> **Neon pooling note:** serverless (Vercel) must use the **pooled** `-pooler` endpoint; migrations
> and the long-lived worker must use the **direct** endpoint (prepared statements / DDL). Keep both:
> `DATABASE_URL` = pooled, `DATABASE_URL_UNPOOLED` = direct. (This is part of the scalability
> hardening in progress.)

---

## 1. Gaming

| Service        | What to create                                  | Where                                          | Env vars                                                     | Scopes / notes                                                                                              |
| -------------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Steam**      | Web API key                                     | <https://steamcommunity.com/dev/apikey>        | `STEAM_WEB_API_KEY`                                          | OpenID login needs no app; data read with the Web API key. Hidden game details → "private profile" screen.  |
| **Twitch**     | Application → Client ID + Secret                | <https://dev.twitch.tv/console/apps>           | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`                   | scope `user:read:follows`. Set the OAuth Redirect URL on the app.                                           |
| **FACEIT**     | OAuth (OIDC) client **+** Data API key          | <https://developers.faceit.com>                | `FACEIT_CLIENT_ID`, `FACEIT_CLIENT_SECRET`, `FACEIT_API_KEY` | OIDC `openid profile` for login; the server-side **Data API** key reads match stats. Register the redirect. |
| **Battle.net** | Client → ID + Secret                            | <https://develop.battle.net>                   | `BATTLENET_CLIENT_ID`, `BATTLENET_CLIENT_SECRET`             | OAuth; pick the region. Reads profile/game summaries only. Register the redirect.                           |
| **lichess**    | Personal OAuth app (public PKCE, **no secret**) | <https://lichess.org/account/oauth/app>        | `LICHESS_CLIENT_ID`                                          | Public client; the client id is your app identifier.                                                        |
| **osu!**       | OAuth application                               | <https://osu.ppy.sh/home/account/edit> → OAuth | `OSU_CLIENT_ID`, `OSU_CLIENT_SECRET`                         | scope `public identify`. Register the redirect.                                                             |

## 2. Crypto

| Service           | What to create  | Where                           | Env vars      | Scopes / notes                                                                                    |
| ----------------- | --------------- | ------------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| **EVM wallet**    | Alchemy API key | <https://dashboard.alchemy.com> | `ALCHEMY_KEY` | No login; the user signs a message. Counts/dates only, never balances. Chains list: `EVM_CHAINS`. |
| **Solana wallet** | Helius API key  | <https://dashboard.helius.dev>  | `HELIUS_KEY`  | Signature-based; counts/dates only.                                                               |
| **TON wallet**    | TonAPI key      | <https://tonconsole.com>        | `TONAPI_KEY`  | Signature-based; counts/dates only.                                                               |

## 3. Social

| Service         | What to create                               | Where                                         | Env vars                                       | Scopes / notes                                                                                                                       |
| --------------- | -------------------------------------------- | --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **X (Twitter)** | Project + App → OAuth 2.0 Client ID + Secret | <https://developer.x.com/en/portal/dashboard> | `X_CLIENT_ID`, `X_CLIENT_SECRET`               | scopes `users.read tweet.read offline.access`, PKCE on. Profile metrics need a **paid** tier; daily spend cap `X_DAILY_SPEND_CAP`.   |
| **Discord**     | Application → OAuth2 creds                   | <https://discord.com/developers/applications> | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`   | scopes `identify guilds`. Add the redirect under OAuth2 → Redirects.                                                                 |
| **GitHub**      | OAuth App → Client ID + Secret               | <https://github.com/settings/developers>      | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`     | scope `read:user`. Tokens don't expire.                                                                                              |
| **Telegram**    | Bot via BotFather                            | <https://t.me/BotFather>                      | `TELEGRAM_BOT_TOKEN`                           | Login Widget verifies by HMAC of the bot token. Run `/setdomain` in BotFather and set your domain. Also used for drop notifications. |
| **Farcaster**   | Neynar API key                               | <https://dev.neynar.com>                      | `NEYNAR_API_KEY`                               | Sign In With Farcaster; Neynar reads the profile.                                                                                    |
| **LinkedIn**    | App → Client ID + Secret                     | <https://www.linkedin.com/developers/apps>    | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | "Sign In with LinkedIn using OpenID Connect" product → scopes `openid profile`. Register the redirect.                               |

## 4. Music & Entertainment

| Service         | What to create                                      | Where                                                        | Env vars                                             | Scopes / notes                                                                                                 |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Spotify**     | App → Client ID + Secret                            | <https://developer.spotify.com/dashboard>                    | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`         | scopes `user-library-read user-follow-read`. Add the redirect in the dashboard.                                |
| **TIDAL**       | App → Client ID + Secret                            | <https://developer.tidal.com>                                | `TIDAL_CLIENT_ID`, `TIDAL_CLIENT_SECRET`             | scopes `user.read collection.read`. Register the redirect.                                                     |
| **Apple Music** | MusicKit identifier + private key → developer token | <https://developer.apple.com> (paid Apple Developer Program) | `APPLE_MUSIC_KEY` (developer token)                  | The user's Music-User-Token is obtained in-browser via MusicKit JS; short-lived, frequent reconnect is normal. |
| **YouTube**     | Google OAuth client ID + Secret                     | <https://console.cloud.google.com/apis/credentials>          | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`           | Enable **YouTube Data API v3**; scope `youtube.readonly`. Google app verification required before public use.  |
| **AniList**     | API client                                          | <https://anilist.co/settings/developer>                      | `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET`         | GraphQL API, no extra scopes.                                                                                  |
| **MyAnimeList** | API config → Client ID + Secret                     | <https://myanimelist.net/apiconfig>                          | `MYANIMELIST_CLIENT_ID`, `MYANIMELIST_CLIENT_SECRET` | OAuth2 (PKCE). Register the redirect.                                                                          |

## 5. Sports (Health axis — consent screen, never drives offers)

| Service                | What to create                    | Where                                           | Env vars                                                | Scopes / notes                                                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------- | ----------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terra** (aggregator) | Dev ID + API key + signing secret | <https://dashboard.tryterra.co>                 | `TERRA_DEV_ID`, `TERRA_API_KEY`, `TERRA_SIGNING_SECRET` | One connect covers Garmin/Fitbit/Oura/WHOOP/Polar/Withings/Strava… **Also** set the webhook URL `…/api/webhooks/terra` and allow the redirect `…/api/connections/terra/callback` in the dashboard. Apple Health needs Terra's native mobile SDK (out of scope for web). |
| **WHOOP**              | Developer app                     | <https://developer.whoop.com>                   | `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`                | scopes `read:profile read:workout read:cycles offline`.                                                                                                                                                                                                                 |
| **Oura**               | OAuth application                 | <https://cloud.ouraring.com/oauth/applications> | `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`                  | scopes `daily workout personal`.                                                                                                                                                                                                                                        |
| **Polar**              | AccessLink app                    | <https://admin.polaraccesslink.com>             | `POLAR_CLIENT_ID`, `POLAR_CLIENT_SECRET`                | scope `accesslink.read_all`; workout summaries / steps only, no heart-rate.                                                                                                                                                                                             |
| **Withings**           | App → Client ID + Secret          | <https://developer.withings.com>                | `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET`          | scopes `user.activity user.metrics`. Register the redirect.                                                                                                                                                                                                             |

> With **Terra** connected you usually don't need the individual WHOOP/Oura/Polar/Withings apps —
> Terra covers them behind one login. Keep the direct ones only if you want native per-device flows.

## 6. Lifestyle

| Service                | What to create           | Where                                    | Env vars                                           | Scopes / notes                                            |
| ---------------------- | ------------------------ | ---------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| **Foursquare / Swarm** | App → Client ID + Secret | <https://foursquare.com/developers/apps> | `FOURSQUARE_CLIENT_ID`, `FOURSQUARE_CLIENT_SECRET` | User OAuth; reads check-in counts. Register the redirect. |

---

## 7. Production infrastructure (not a user-connectable service)

| Purpose                         | Env var(s)                                      | Where                                                                                  |
| ------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Telegram weekly-drop bot        | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | @BotFather (token); you choose the webhook secret.                                     |
| Email (login links, drop email) | `MAIL_API_KEY`, `MAIL_FROM`                     | Your mail provider (Resend / Postmark / SES — open decision).                          |
| Error monitoring                | `SENTRY_DSN`                                    | <https://sentry.io> → project → DSN.                                                   |
| Product analytics               | `POSTHOG_KEY`                                   | <https://posthog.com> → project API key.                                               |
| Crypto Visa card (Wirex BaaS)   | `WIREX_API_KEY`, `WIREX_WEBHOOK_SECRET`         | Wirex BaaS partner onboarding. _(Card feature not built yet — not needed until then.)_ |

> This list is maintained from the adapters' own requirements (`packages/config/src/index.ts` is the
> source of truth for env var names). If an adapter's report flags an extra scope or a different
> portal, this file is updated to match.
