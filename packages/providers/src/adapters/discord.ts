import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * Discord adapter — OAuth 2.0 (authorization-code, confidential client). The generic OAuth2 adapter
 * handles begin/complete/refresh; this file supplies the Discord endpoints, scopes, `identify` and
 * `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `discord.servers`            volume   number of guilds the user is in (label "Servers")
 *   - `discord.servers_gain_30d`   activity delta_30d of `discord.servers`; we return the cumulative
 *                                           server count and core derives the 30-day delta from snapshots
 *   - `discord.account_age_years`  depth    account age from the user-id snowflake timestamp
 *
 * Privacy (docs/architecture.md section 7, line "Discord"): the server list is turned into a COUNT
 * and a set of HMAC hashes (keyed with a server key owned by core) for the "In common" feature. The
 * HMAC key lives in core, not here, so this adapter never hashes: it returns the numeric metrics and
 * hands the raw guild ids to core in `extras.guildIds` for core to hash. We read only guild ids and
 * the count — never server names, messages, or the user's friends (the consent "weNever" list).
 */

const AUTHORIZE_URL = 'https://discord.com/api/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const USERS_ME_URL = 'https://discord.com/api/users/@me';
const GUILDS_URL = 'https://discord.com/api/users/@me/guilds';

/** Only the scopes we need: `identify` for the account id, `guilds` for the server count. */
const SCOPES = ['identify', 'guilds'] as const;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
/** Discord snowflake epoch: 2015-01-01T00:00:00.000Z. */
const DISCORD_EPOCH_MS = 1_420_070_400_000;
/** The OAuth `/users/@me/guilds` endpoint caps at 200; a user account cannot exceed that anyway. */
const GUILDS_LIMIT = 200;

export interface DiscordAdapterConfig {
  clientId: string;
  clientSecret: string;
}

interface DiscordUser {
  id?: string;
}

/** A partial guild object; we read only the id (for the count and the core-side "In common" hash). */
interface DiscordGuild {
  id?: string;
}

/**
 * Account age from a Discord snowflake id. The upper bits hold a millisecond timestamp offset from
 * the Discord epoch, so no extra API call is needed. Returns null for a non-snowflake id.
 */
function accountAgeYears(id: string): number | null {
  let snowflake: bigint;
  try {
    snowflake = BigInt(id);
  } catch {
    return null;
  }
  if (snowflake <= 0n) return null;
  const createdMs = Number(snowflake >> 22n) + DISCORD_EPOCH_MS;
  const elapsed = Date.now() - createdMs;
  return elapsed > 0 ? elapsed / MS_PER_YEAR : 0;
}

export function createDiscordAdapter(cfg: DiscordAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  /** Resolve the connected account id. Used once at connect time, never as a metric. */
  async function identify(tokens: Tokens): Promise<string> {
    const user = await httpJson<DiscordUser>(USERS_ME_URL, { headers: bearer(tokens.access) });
    if (!user.id) throw new AdapterError('unexpected_response', 'Discord returned no user');
    return user.id;
  }

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const url = `${GUILDS_URL}?limit=${GUILDS_LIMIT}`;
    const guilds = await httpJson<DiscordGuild[]>(url, { headers: bearer(args.tokens.access) });
    if (!Array.isArray(guilds)) {
      throw new AdapterError('unexpected_response', 'Discord returned no guild list');
    }

    const serverCount = guilds.length;
    // Raw guild ids for core's "In common" HMAC (keyed with core's server key). Never hashed here,
    // never a metric, never a server name — core reads these from extras and stores only the hashes.
    const guildIds = guilds.map((g) => g.id).filter((id): id is string => typeof id === 'string');

    return {
      metrics: {
        'discord.servers': serverCount,
        // delta_30d: return the cumulative server count; core derives the 30-day delta from snapshots.
        'discord.servers_gain_30d': serverCount,
        // Account age from the snowflake in the connected account id (externalId).
        'discord.account_age_years': accountAgeYears(args.externalId),
      },
      extras: { guildIds },
    };
  }

  return createOAuth2Adapter({
    id: 'discord',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // Discord's token endpoint takes client_id/client_secret in the body (client_secret_post).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });
}
