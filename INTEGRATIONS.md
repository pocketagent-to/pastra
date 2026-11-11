# Service integrations — what to get and where

This is the shopping list for turning the service integrations on. Each service ships with a real
adapter (`packages/providers/src/adapters/*`). A service stays on the **stub** adapter (instant
demo connect) until its credentials are present; once you add them it switches to the **real**
OAuth/API flow automatically (`liveProviders()` in `apps/web/lib/server.ts`).

## How to apply

1. Register an app / get a key at each service's developer portal (table below).
2. For every OAuth service, register this **exact redirect / callback URL**:
   `https://<your-domain>/api/connections/<provider>/callback`
   (e.g. `https://pastra-web-blond.vercel.app/api/connections/github/callback`). Use the same
   `APP_URL` you set in the deploy; it must match exactly.
3. Put the credentials in the environment (Vercel → Project → Settings → Environment Variables),
   using the env var names below. Redeploy.
4. That provider now uses the real flow; the rest stay on the demo stub.

> Security: these are secrets. Keep them only in the environment, never in the repo. The app encrypts
> every user access/refresh token at rest (AES-256-GCM) and never logs tokens, addresses, emails or
> metric values.

## Services

| Service | What to create | Where | Env vars | Scopes / notes |
| --- | --- | --- | --- | --- |
| **Steam** | Web API key | <https://steamcommunity.com/dev/apikey> | `STEAM_WEB_API_KEY` | OpenID login needs no app; data is read with the Web API key. Public profile with hidden game details shows the "private profile" screen. |
| **GitHub** | OAuth App → Client ID + Secret | <https://github.com/settings/developers> | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | scope `read:user`. Tokens don't expire. |
| **Discord** | Application → OAuth2 creds | <https://discord.com/developers/applications> | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | scopes `identify guilds`. Add the redirect URL under OAuth2 → Redirects. |
| **Twitch** | Application → Client ID + Secret | <https://dev.twitch.tv/console/apps> | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Set the OAuth Redirect URL on the app. |
| **X (Twitter)** | Project + App → OAuth 2.0 Client ID + Secret | <https://developer.twitter.com/en/portal/dashboard> | `X_CLIENT_ID`, `X_CLIENT_SECRET` | scopes `users.read tweet.read offline.access`, PKCE on. Reading profile metrics needs a **paid** API tier; the daily spend cap is `X_DAILY_SPEND_CAP`. |
| **TIDAL** | App → Client ID + Secret | <https://developer.tidal.com/> | `TIDAL_CLIENT_ID`, `TIDAL_CLIENT_SECRET` | Register the redirect URL. |
| **AniList** | API client | <https://anilist.co/settings/developer> | `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET` | GraphQL API, no extra scopes. |
| **lichess** | Personal OAuth app (public PKCE, **no secret**) | <https://lichess.org/account/oauth/app> | `LICHESS_CLIENT_ID` | Public client; the client id can be your app identifier. |
| **YouTube** | Google OAuth client ID + Secret | <https://console.cloud.google.com/apis/credentials> | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Enable **YouTube Data API v3**; scope `youtube.readonly`. Stays `coming_soon` until Google verifies the app. |
| **Apple Music** | MusicKit identifier + private key → developer token | <https://developer.apple.com> (paid Apple Developer Program) | `APPLE_MUSIC_KEY` (developer token) | The user's Music-User-Token is obtained in-browser via MusicKit JS; it is short-lived (frequent reconnect is normal). |
| **Polar** | AccessLink app | <https://admin.polaraccesslink.com/> | `POLAR_CLIENT_ID`, `POLAR_CLIENT_SECRET` | Only workout summaries / steps are requested — no heart-rate scope. |
| **WHOOP** | Developer app | <https://developer.whoop.com/> | `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET` | scopes `read:profile read:workout read:cycles offline`. |
| **Oura** | OAuth application | <https://cloud.ouraring.com/oauth/applications> | `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` | scopes `daily workout personal`. |
| **EVM wallet** | Alchemy API key | <https://dashboard.alchemy.com/> | `ALCHEMY_KEY` | No login; the user signs a message. Only counts/dates are read, never balances. Chains: `EVM_CHAINS`. |
| **Solana wallet** | Helius API key | <https://dashboard.helius.dev/> | `HELIUS_KEY` | Signature-based; counts/dates only. |
| **TON wallet** | TonAPI key | <https://tonconsole.com/> | `TONAPI_KEY` | Signature-based; counts/dates only. |

## Not a service, but needed in production

| Purpose | Env var(s) | Where |
| --- | --- | --- |
| Telegram weekly-drop bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | @BotFather |
| Email (login links, drop email) | `MAIL_API_KEY`, `MAIL_FROM` | your mail provider |
| Error monitoring | `SENTRY_DSN` | Sentry |
| Product analytics | `POSTHOG_KEY` | PostHog |
| Crypto Visa card (Wirex BaaS) | `WIREX_API_KEY`, `WIREX_WEBHOOK_SECRET` | Wirex BaaS onboarding |

> This list is maintained from the adapters' own requirements. If an adapter's report flags an extra
> scope or a different portal, this file is updated to match.
