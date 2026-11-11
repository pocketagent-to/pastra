import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { AdapterError } from '../errors';
import type {
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
} from '../types';

/**
 * Telegram adapter (Login Widget; auth kind `telegram_login`, docs/architecture.md section 7).
 *
 * Telegram is not OAuth and has no API token for us. `begin` redirects the user to our own page
 * that renders the Telegram Login Widget; when the user authorises, Telegram hands the widget a set
 * of signed fields (`id`, `first_name`, `last_name`, `username`, `photo_url`, `auth_date`, `hash`)
 * which our callback forwards to `complete`. `complete` verifies that signature against the bot
 * token and extracts the Telegram user id — that is the external id (one account = one pass). There
 * is no per-user token, so there is no `refresh`/`revoke` and no network call anywhere.
 *
 * Catalog (packages/catalog/src/providers.ts): Telegram carries a fixed `axisBonus` to Social and
 * **no metrics**, so `fetch` returns an empty metrics object. We read nothing from Telegram beyond
 * the identity proof — never messages, contacts or the phone number (catalog `consent.weNever`).
 *
 * Verification (Telegram Login Widget algorithm, distinct from Mini App `initData`):
 *   secret        = SHA256(botToken)                       // raw 32 bytes, NOT the WebAppData HMAC
 *   dataCheck     = sorted "key=value" lines (all fields except `hash`), joined with "\n"
 *   expectedHash  = HMAC_SHA256(dataCheck, secret) as hex
 * The login is accepted when expectedHash === hash (constant-time) and `auth_date` is recent.
 */

/** Path of our own page that renders the Login Widget (begin redirects here). */
const DEFAULT_LOGIN_PAGE_PATH = '/connect/telegram';
/** Reject logins older than this (replay guard); matches Telegram's own reference sample. */
const DEFAULT_MAX_AUTH_AGE_SECONDS = 86_400;
/** Tolerated clock skew for a future-dated `auth_date`. */
const FUTURE_SKEW_SECONDS = 300;
/**
 * Keys that are ours, not Telegram's, and therefore excluded from the data-check-string: `hash`
 * itself, and the `state` anti-forgery value which may ride back on the callback URL. Every other
 * field present is signed by Telegram, so unknown future Telegram fields are included automatically.
 */
const NON_SIGNED_KEYS = new Set(['hash', 'state']);

export interface TelegramAdapterConfig {
  /**
   * Bot token from @BotFather (env `TELEGRAM_BOT_TOKEN`). Used only to derive the login secret and
   * never logged or returned anywhere.
   */
  botToken: string;
  /** Path of our Login-Widget page that `begin` redirects to. Default `/connect/telegram`. */
  loginPagePath?: string;
  /** Maximum age of `auth_date` before a login is treated as stale. Default 86400s (24h). */
  maxAuthAgeSeconds?: number;
}

/**
 * Build Telegram's data-check-string: every received field except our own (`hash`, `state`), as
 * `key=value`, sorted by key, joined with newlines.
 */
function dataCheckString(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => !NON_SIGNED_KEYS.has(key))
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('\n');
}

/** Constant-time comparison of two hex digests. Returns false on any length/format mismatch. */
function hexEqual(expectedHex: string, providedHex: string): boolean {
  if (expectedHex.length !== providedHex.length) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const provided = Buffer.from(providedHex, 'hex');
  // Buffer.from('hex') stops at the first invalid pair, so a malformed hash yields a short buffer.
  if (expected.length === 0 || expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Telegram Login Widget adapter. The bot token is injected via config; an unconfigured adapter
 * refuses to begin so the registry can fall back to the stub (docs/architecture.md section 15).
 */
export function createTelegramAdapter(cfg: TelegramAdapterConfig): ProviderAdapter {
  const configured = Boolean(cfg.botToken);
  const loginPagePath = cfg.loginPagePath ?? DEFAULT_LOGIN_PAGE_PATH;
  const maxAuthAge = cfg.maxAuthAgeSeconds ?? DEFAULT_MAX_AUTH_AGE_SECONDS;
  // The Login Widget HMAC key is SHA256(botToken) as raw bytes; derive it once, keep it off logs.
  const secret = configured ? createHash('sha256').update(cfg.botToken).digest() : null;

  return {
    id: 'telegram',
    auth: 'telegram_login',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!secret) throw new AdapterError('provider_down', 'telegram is not configured');
      // Send the user to our own Login-Widget page; derive the origin from the registered callback
      // so we never invent a domain, and round-trip the anti-forgery state as a query param.
      const page = new URL(loginPagePath, new URL(ctx.redirectUri).origin);
      page.searchParams.set('state', ctx.state);
      return { redirectUrl: page.toString() };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      if (!secret) throw new AdapterError('provider_down', 'telegram is not configured');
      const id = ctx.params.id;
      const authDateRaw = ctx.params.auth_date;
      const hash = ctx.params.hash;
      if (!id || !authDateRaw || !hash) {
        throw new AdapterError('unexpected_response', 'Missing Telegram login fields');
      }

      const expected = createHmac('sha256', secret)
        .update(dataCheckString(ctx.params))
        .digest('hex');
      if (!hexEqual(expected, hash)) {
        throw new AdapterError('unexpected_response', 'Telegram login hash did not verify');
      }

      const authDate = Number(authDateRaw);
      if (!Number.isFinite(authDate)) {
        throw new AdapterError('unexpected_response', 'Telegram auth_date is not a number');
      }
      const ageSeconds = Date.now() / 1000 - authDate;
      if (ageSeconds > maxAuthAge) {
        // Stale (possibly replayed) login — the user must sign in again.
        throw new AdapterError('auth_expired', 'Telegram login is stale');
      }
      if (ageSeconds < -FUTURE_SKEW_SECONDS) {
        throw new AdapterError('unexpected_response', 'Telegram auth_date is in the future');
      }

      // One account = one pass: the Telegram user id is the external id. No tokens for Telegram.
      return { externalId: id };
    },

    async fetch(_ctx: FetchContext): Promise<FetchResult> {
      // Telegram contributes a fixed axis bonus, not metrics (packages/catalog/src/providers.ts).
      return { metrics: {} };
    },
  };
}
