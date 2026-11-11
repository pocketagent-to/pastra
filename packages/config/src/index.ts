import { z } from 'zod';

/**
 * Environment configuration (docs/architecture.md section 15).
 *
 * All variables are read and validated here; the schema is applied at startup so a process
 * never boots with incomplete config. Defaults are provided only where they are safe for local
 * development; production supplies real values. Secrets are never logged.
 */

const csv = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const boolish = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value === undefined || value === '' ? fallback : value === 'true' || value === '1',
    );

const csvList = z
  .string()
  .default('')
  .transform((value) => csv(value));

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Core
  APP_URL: z.url().default('http://localhost:3000'),

  // Auth — Privy is the login and embedded-wallet provider (docs/architecture.md section 11.1).
  PRIVY_APP_ID: z.string().default(''),
  PRIVY_APP_SECRET: z.string().default(''),
  // A development-only sign-in shortcut; never enabled in production.
  DEV_LOGIN_ENABLED: boolish(false),

  DATABASE_URL: z.string().min(1).default('postgres://pastra:pastra@localhost:5432/pastra'),
  SESSION_SECRET: z.string().min(1).default('dev-session-secret-change-me'),
  TOKEN_ENC_KEYS: z.string().min(1).default('v1:00000000000000000000000000000000000000000000'),
  HMAC_KEY: z.string().min(1).default('dev-hmac-key-change-me'),

  // Weekly drop
  DROP_CRON: z.string().default('0 13 * * 1'),
  DROP_TZ: z.string().default('Europe/Warsaw'),
  DROP_PREPARE_HOURS: z.coerce.number().int().positive().default(24),
  OFFERS_PER_USER: z.coerce.number().int().positive().default(8),
  OFFERS_PER_AXIS: z.coerce.number().int().positive().default(3),

  // Card
  CARD_PROVIDER: z.enum(['mock', 'wirex']).default('mock'),
  WIREX_API_URL: z.string().default('https://api-baas.wirexapp.tech'),
  WIREX_API_KEY: z.string().default(''),
  WIREX_WEBHOOK_SECRET: z.string().default(''),
  CARD_DEFAULT_DAILY_LIMIT: z.string().default(''),
  CARD_INACTIVE_DAYS: z.coerce.number().int().positive().default(90),

  // Feature flags (default off)
  CASHBACK_PAYOUT_ENABLED: boolish(false),
  PHONE_WALLET_ENABLED: boolish(false),
  PROVIDERS_LIVE: csvList,
  ADMIN_USERS: csvList,

  // Indexers
  ALCHEMY_KEY: z.string().default(''),
  HELIUS_KEY: z.string().default(''),
  TONAPI_KEY: z.string().default(''),
  EVM_CHAINS: z
    .string()
    .default('ethereum,base,arbitrum,optimism,polygon,bnb,avalanche,zksync')
    .transform((value) => csv(value)),

  // Notifications
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(''),
  MAIL_API_KEY: z.string().default(''),
  MAIL_FROM: z.string().default('hello@[your-domain]'),

  // Observability
  SENTRY_DSN: z.string().default(''),
  POSTHOG_KEY: z.string().default(''),

  // Service credentials
  STEAM_WEB_API_KEY: z.string().default(''),
  X_DAILY_SPEND_CAP: z.string().default(''),
  APPLE_MUSIC_KEY: z.string().default(''),

  // OAuth client credentials, one pair per service adapter (docs/architecture.md section 7).
  // Empty => the registry falls back to the stub adapter for that provider.
  TWITCH_CLIENT_ID: z.string().default(''),
  TWITCH_CLIENT_SECRET: z.string().default(''),
  LICHESS_CLIENT_ID: z.string().default(''),
  X_CLIENT_ID: z.string().default(''),
  X_CLIENT_SECRET: z.string().default(''),
  DISCORD_CLIENT_ID: z.string().default(''),
  DISCORD_CLIENT_SECRET: z.string().default(''),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  TIDAL_CLIENT_ID: z.string().default(''),
  TIDAL_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  ANILIST_CLIENT_ID: z.string().default(''),
  ANILIST_CLIENT_SECRET: z.string().default(''),
  POLAR_CLIENT_ID: z.string().default(''),
  POLAR_CLIENT_SECRET: z.string().default(''),
  WHOOP_CLIENT_ID: z.string().default(''),
  WHOOP_CLIENT_SECRET: z.string().default(''),
  OURA_CLIENT_ID: z.string().default(''),
  OURA_CLIENT_SECRET: z.string().default(''),

  // Second wave of live-service adapters.
  FACEIT_CLIENT_ID: z.string().default(''),
  FACEIT_CLIENT_SECRET: z.string().default(''),
  FACEIT_API_KEY: z.string().default(''),
  BATTLENET_CLIENT_ID: z.string().default(''),
  BATTLENET_CLIENT_SECRET: z.string().default(''),
  OSU_CLIENT_ID: z.string().default(''),
  OSU_CLIENT_SECRET: z.string().default(''),
  NEYNAR_API_KEY: z.string().default(''),
  LINKEDIN_CLIENT_ID: z.string().default(''),
  LINKEDIN_CLIENT_SECRET: z.string().default(''),
  MYANIMELIST_CLIENT_ID: z.string().default(''),
  MYANIMELIST_CLIENT_SECRET: z.string().default(''),
  WITHINGS_CLIENT_ID: z.string().default(''),
  WITHINGS_CLIENT_SECRET: z.string().default(''),
  FOURSQUARE_CLIENT_ID: z.string().default(''),
  FOURSQUARE_CLIENT_SECRET: z.string().default(''),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigError extends Error {
  constructor(readonly issues: z.ZodError) {
    super(`Invalid configuration:\n${z.prettifyError(issues)}`);
    this.name = 'ConfigError';
  }
}

/** Parse and validate configuration from an environment record. Throws {@link ConfigError}. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(result.error);
  }
  return result.data;
}

let cached: Config | undefined;

/** Lazily load and memoise the process configuration. */
export function getConfig(): Config {
  cached ??= loadConfig();
  return cached;
}
