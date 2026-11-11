import { AdapterError } from '../errors';
import { bearer, httpForm } from '../http';
import type {
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
  Tokens,
} from '../types';

/**
 * Withings adapter — OAuth 2.0 (authorization-code), with Withings' non-standard token endpoint.
 * The generic OAuth2 adapter cannot be reused here: Withings' token call needs an extra
 * `action=requesttoken` body field, wraps every response in a `{ status, body }` envelope, and
 * returns the account id (`userid`) inside the token response itself (so there is no separate
 * identify call). begin/complete/refresh/fetch are therefore implemented directly.
 *
 * Endpoints:
 *   - authorize  https://account.withings.com/oauth2_user/authorize2  (standard code flow)
 *   - token      POST https://wbsapi.withings.net/v2/oauth2
 *                body: action=requesttoken, grant_type=authorization_code|refresh_token,
 *                      client_id, client_secret, code|refresh_token, redirect_uri
 *                -> { status: 0, body: { userid, access_token, refresh_token, expires_in, scope } }
 *   - data       POST https://wbsapi.withings.net/v2/measure?action=getactivity
 *
 * Catalog metrics (packages/catalog/src/providers.ts — all `source: 'api'`, no delta_30d):
 *   - withings.training_hours_year  volume    total active hours over the last 365 days
 *   - withings.active_days_week     activity  distinct active days / weeks tracked
 *   - withings.training_hours_30d   activity  total active hours over the last 30 days
 *   - withings.steps_avg_day        activity  mean steps per tracked day over the last 30 days
 *   - withings.weeks_streak         depth     current run of consecutive weeks with an active day
 *
 * Privacy (docs/architecture.md section 7 & 14; catalog `consent`). Withings is a Sports/`health`
 * service, so we read only daily *activity summaries* — steps and active-duration aggregates — via
 * `getactivity` with a minimal `data_fields` list (`steps,moderate,intense`). We never read body
 * measures (weight, fat mass, blood pressure), heart-rate series, sleep detail, locations or any raw
 * clinical record. "Active" here is Withings' moderate + intense durations (moderate-to-vigorous
 * activity), which is also what every active-day / streak metric is derived from.
 */

const AUTHORIZE_URL = 'https://account.withings.com/oauth2_user/authorize2';
const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';
const MEASURE_URL = 'https://wbsapi.withings.net/v2/measure';

/**
 * Scopes requested. Only `user.activity` is needed — every catalog metric comes from activity
 * summaries (steps, active durations). We deliberately do NOT request `user.metrics` (body/clinical
 * measurements), per the "read only what the metrics need" rule for health services.
 */
const SCOPES = ['user.activity'] as const;

/** getactivity returns one summary row per tracked day; we read only these fields. */
const ACTIVITY_FIELDS = 'steps,moderate,intense';

/** Withings' envelope status for an invalid/expired access token. */
const WITHINGS_STATUS_UNAUTHORIZED = 401;
/** Withings' envelope status for "too many requests". */
const WITHINGS_STATUS_RATE_LIMITED = 601;

const MS_PER_HOUR = 60 * 60 * 1000;
const DAY_MS = 24 * MS_PER_HOUR;
const WEEK_MS = 7 * DAY_MS;
const SEC_PER_HOUR = 3600;
const YEAR_DAYS = 365;
/** Runaway guard on the getactivity cursor walk (not a business value). */
const MAX_PAGES = 400;
/** We only ever read a rolling year, so a streak cannot exceed 52 weeks of fetched data. */
const MAX_STREAK_WEEKS = 52;

export interface WithingsAdapterConfig {
  clientId: string;
  clientSecret: string;
}

/** The `body` of a Withings token response (`{ status, body }` envelope unwrapped). */
interface WithingsTokenBody {
  userid?: number | string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

/** One daily activity summary row from `getactivity` (durations are in seconds). */
interface WithingsActivity {
  date?: string;
  steps?: number | null;
  moderate?: number | null;
  intense?: number | null;
}

/** The `body` of a `getactivity` response: a page of rows plus an opaque `offset`/`more` cursor. */
interface WithingsActivityBody {
  activities?: WithingsActivity[];
  more?: boolean;
  offset?: number;
}

/** Every Withings response is `{ status, body }`; `status: 0` means success. */
interface WithingsEnvelope<T> {
  status?: number;
  body?: T;
}

function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** A UTC calendar day ("YYYY-MM-DD") for an epoch-ms instant (Withings' `*ymd` query params). */
function dayStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Epoch ms at UTC midnight for a "YYYY-MM-DD" activity date, or null if unparseable. */
function dayMs(date: string | undefined): number | null {
  if (!date) return null;
  const t = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

/** Unwrap a Withings `{ status, body }` envelope, mapping a non-zero status to an AdapterError. */
function unwrap<T>(env: WithingsEnvelope<T>): T {
  const status = env.status ?? -1;
  if (status !== 0) {
    if (status === WITHINGS_STATUS_UNAUTHORIZED) {
      throw new AdapterError('auth_expired', 'Withings access token invalid or expired');
    }
    if (status === WITHINGS_STATUS_RATE_LIMITED) {
      throw new AdapterError('rate_limited', 'Withings rate limit');
    }
    // Deliberately no echo of any Withings error string, which can repeat request params.
    throw new AdapterError('unexpected_response', `Withings status ${status}`);
  }
  if (env.body === undefined)
    throw new AdapterError('unexpected_response', 'Withings returned no body');
  return env.body;
}

/** Build our Tokens from a token-response body; `scope` is comma- or space-separated. */
function toTokens(body: WithingsTokenBody): Tokens {
  if (!body.access_token) {
    throw new AdapterError('unexpected_response', 'Withings returned no access token');
  }
  return {
    access: body.access_token,
    refresh: body.refresh_token,
    expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined,
    scopes: body.scope ? body.scope.split(/[\s,]+/).filter(Boolean) : [...SCOPES],
  };
}

export function createWithingsAdapter(cfg: WithingsAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;
  const configured = Boolean(clientId && clientSecret);

  /** POST a `requesttoken` grant and return the parsed token body (userid + tokens). */
  async function requestToken(grant: Record<string, string>): Promise<WithingsTokenBody> {
    const env = await httpForm<WithingsEnvelope<WithingsTokenBody>>(TOKEN_URL, {
      action: 'requesttoken',
      client_id: clientId,
      client_secret: clientSecret,
      ...grant,
    });
    return unwrap(env);
  }

  /** Walk `getactivity` over [startMs, now], paging via the response's `offset`/`more` cursor. */
  async function fetchActivities(
    startMs: number,
    endMs: number,
    token: string,
  ): Promise<WithingsActivity[]> {
    const headers = bearer(token);
    const base: Record<string, string> = {
      action: 'getactivity',
      startdateymd: dayStr(startMs),
      enddateymd: dayStr(endMs),
      data_fields: ACTIVITY_FIELDS,
    };
    const out: WithingsActivity[] = [];
    let offset: number | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const form = offset === undefined ? base : { ...base, offset: String(offset) };
      const env = await httpForm<WithingsEnvelope<WithingsActivityBody>>(
        MEASURE_URL,
        form,
        headers,
      );
      const body = unwrap(env);
      if (Array.isArray(body.activities)) out.push(...body.activities);
      if (!body.more || body.offset === undefined || body.offset === null) break;
      offset = body.offset;
    }
    return out;
  }

  return {
    id: 'withings',
    auth: 'oauth2',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!configured) throw new AdapterError('provider_down', 'withings is not configured');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: ctx.redirectUri,
        scope: SCOPES.join(','),
        state: ctx.state,
      });
      return { redirectUrl: `${AUTHORIZE_URL}?${params.toString()}` };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const code = ctx.params.code;
      if (!code) throw new AdapterError('unexpected_response', 'Missing authorization code');
      const body = await requestToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: ctx.redirectUri,
      });
      if (body.userid === undefined || body.userid === null || body.userid === '') {
        throw new AdapterError('unexpected_response', 'Withings returned no user id');
      }
      // The Withings userid is the external id (one account = one pass); never a metric.
      return { externalId: String(body.userid), tokens: toTokens(body) };
    },

    async refresh(tokens: Tokens): Promise<Tokens> {
      if (!tokens.refresh) throw new AdapterError('auth_expired', 'No refresh token');
      const body = await requestToken({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh,
      });
      const refreshed = toTokens(body);
      // Withings may omit a new refresh token; keep the old one so the connection survives.
      return { ...refreshed, refresh: refreshed.refresh ?? tokens.refresh };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!ctx.tokens) throw new AdapterError('auth_expired', 'No tokens for this connection');
      const token = ctx.tokens.access;
      const now = Date.now();
      const yearStart = now - YEAR_DAYS * DAY_MS;
      const monthStart = now - 30 * DAY_MS;

      // One year of daily activity summaries drives every metric; page it once.
      const activities = await fetchActivities(yearStart, now, token);

      let yearActiveSec = 0;
      let monthActiveSec = 0;
      let monthSteps = 0;
      let monthDays = 0;
      let earliestActive = now;
      const activeDays = new Set<string>();
      const activeWeeks = new Set<number>();

      for (const a of activities) {
        const ms = dayMs(a.date);
        if (ms === null || ms < yearStart || ms > now) continue;

        const activeSec = (a.moderate ?? 0) + (a.intense ?? 0);
        if (activeSec > 0) {
          yearActiveSec += activeSec;
          if (ms >= monthStart) monthActiveSec += activeSec;

          // Withings' `date` is the user's local calendar day — the active-day key we need.
          if (a.date) activeDays.add(a.date);
          if (ms < earliestActive) earliestActive = ms;

          const weeksAgo = Math.floor(Math.max(0, now - ms) / WEEK_MS);
          if (weeksAgo <= MAX_STREAK_WEEKS) activeWeeks.add(weeksAgo);
        }

        // Steps average counts every tracked day in the window, active or not.
        if (ms >= monthStart) {
          monthSteps += a.steps ?? 0;
          monthDays += 1;
        }
      }

      // Active days per week: distinct active days over the span actually tracked (first active day
      // to now), clamped to [1, 52] weeks so a young account is not diluted by a full-year window.
      const spanWeeks =
        activeDays.size === 0
          ? 1
          : Math.min(MAX_STREAK_WEEKS, Math.max(1, (now - earliestActive) / WEEK_MS));
      const activeDaysWeek = activeDays.size === 0 ? 0 : activeDays.size / spanWeeks;

      // Current streak: consecutive weeks with an active day, allowing an empty (partial) current week.
      let streak = 0;
      let cursor = activeWeeks.has(0) ? 0 : activeWeeks.has(1) ? 1 : -1;
      if (cursor >= 0) {
        while (cursor <= MAX_STREAK_WEEKS && activeWeeks.has(cursor)) {
          streak += 1;
          cursor += 1;
        }
      }

      const stepsAvgDay = monthDays === 0 ? null : Math.round(monthSteps / monthDays);

      return {
        metrics: {
          'withings.training_hours_year': round(yearActiveSec / SEC_PER_HOUR, 2),
          'withings.active_days_week': round(activeDaysWeek, 2),
          'withings.training_hours_30d': round(monthActiveSec / SEC_PER_HOUR, 2),
          'withings.steps_avg_day': stepsAvgDay,
          'withings.weeks_streak': streak,
        },
      };
    },
  };
}
