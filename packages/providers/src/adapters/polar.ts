import { AdapterError } from '../errors';
import { bearer, httpForm, httpJson, randomToken } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type {
  CompleteContext,
  CompleteResult,
  FetchResult,
  ProviderAdapter,
  Tokens,
} from '../types';

/**
 * Polar adapter — Polar AccessLink, OAuth 2.0 (authorization-code, confidential client). The generic
 * OAuth2 adapter builds the authorize URL (`begin`) and wires `fetch`; `complete` is overridden here
 * because AccessLink has two quirks the generic flow cannot express:
 *   1. The token response carries the Polar user id out-of-band as `x_user_id` (there is no
 *      "whoami" endpoint), so we read the account id from the token exchange, not a later call.
 *   2. A user must be registered to our AccessLink client exactly once (`POST /v3/users`) before any
 *      data endpoint will return their data. We register on connect and treat "already registered"
 *      (HTTP 409) as success.
 *
 * Catalog metrics (packages/catalog/src/providers.ts) — all `source: 'api'`, so we return each value
 * directly (none are `delta_30d`):
 *   - `polar.training_hours_year`  volume    training hours in the last 365 days ("Training hours (year)")
 *   - `polar.distance_year_km`     volume    training distance in the last 365 days, km ("Distance (year)")
 *   - `polar.active_days_week`     activity  average days/week with a training in the last 4 weeks ("Active days/week")
 *   - `polar.training_hours_30d`   activity  training hours in the last 30 days ("Training hours (30d)")
 *   - `polar.weeks_streak`         depth     consecutive recent weeks with a training ("Weeks streak")
 *
 * Privacy (docs/architecture.md section 7; catalog `consent`): we read only exercise SUMMARIES —
 * their start time, duration and distance — and derive every metric from those. We never read the
 * `heart-rate` object on an exercise, continuous heart rate, physical-info/weight, or sleep. Polar
 * AccessLink exposes a single scope (`accesslink.read_all`); the heart-rate/weight boundary is kept
 * by the fields and endpoints we touch, not by scope. We do not even call the daily-activity/steps
 * endpoints: the Polar catalog needs no steps metric, and active days are derivable from exercises,
 * so reading exercise summaries alone is the privacy-minimal path.
 *
 * Coverage note: this uses the non-transactional `GET /v3/exercises` list, which returns the most
 * recent exercises Polar retains for the account. The year totals therefore reflect the returned
 * window; a full 365-day history for very high-volume athletes would require the stateful
 * exercise-transactions endpoints, which are a core/worker concern (they consume data on commit).
 */

const AUTHORIZE_URL = 'https://flow.polar.com/oauth2/authorization';
const TOKEN_URL = 'https://polarremote.com/v2/oauth2/token';

/** AccessLink REST base; overridable via config if Polar moves the host. No trailing slash. */
const DEFAULT_API_BASE = 'https://www.polaraccesslink.com/v3';

/** The only scope AccessLink offers. It grants read access; we restrict to summary fields (see above). */
const SCOPES = ['accesslink.read_all'] as const;

/** Request timeout for the registration call (mirrors the http helper default). */
const REGISTER_TIMEOUT_MS = 15_000;

export interface PolarAdapterConfig {
  clientId: string;
  clientSecret: string;
  /** Override the AccessLink REST base (default `https://www.polaraccesslink.com/v3`). */
  apiBaseUrl?: string;
  /** Override the authorize endpoint (default Polar Flow authorize URL). */
  authorizeUrl?: string;
  /** Override the token endpoint (default Polar token URL). */
  tokenUrl?: string;
}

/** Polar's token response. `x_user_id` is the stable Polar user id; there is no refresh token. */
interface PolarTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  x_user_id?: number | string;
}

/** An exercise summary from `GET /v3/exercises`. We read only these three fields. */
interface PolarExercise {
  'start-time'?: string;
  /** ISO 8601 duration, e.g. "PT1H30M". */
  duration?: string;
  /** Metres. */
  distance?: number | string;
}

function basicAuthHeader(clientId: string, clientSecret: string): Record<string, string> {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return { authorization: `Basic ${encoded}` };
}

/** Parse an ISO 8601 duration (the subset Polar emits) to whole/fractional seconds; 0 if unparsable. */
function durationSeconds(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, w, d, h, min, s] = m;
  return (
    Number(w || 0) * 604800 +
    Number(d || 0) * 86400 +
    Number(h || 0) * 3600 +
    Number(min || 0) * 60 +
    Number(s || 0)
  );
}

/** The UTC day index (days since epoch) of an exercise's calendar date, or null if absent/invalid. */
function exerciseDayIndex(startTime: string | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startTime ?? '');
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(ms) ? null : Math.floor(ms / 86_400_000);
}

/** A Monday-aligned week index for a day index (epoch day 0 = Thursday 1970-01-01). */
function weekIndex(dayIndex: number): number {
  return Math.floor((dayIndex + 3) / 7);
}

/** Metres as a finite number, or 0 (strength sessions and the like carry no distance). */
function distanceMetres(distance: number | string | undefined): number {
  const n = Number(distance);
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Consecutive recent weeks with at least one training, counting back from the current week. The
 * in-progress current week is allowed to be empty without breaking the streak (we anchor at the
 * previous week then). Returns 0 when there is no run ending in the last two weeks.
 */
function weeksStreak(activeWeeks: Set<number>, todayDayIndex: number): number {
  const current = weekIndex(todayDayIndex);
  let anchor: number;
  if (activeWeeks.has(current)) anchor = current;
  else if (activeWeeks.has(current - 1)) anchor = current - 1;
  else return 0;
  let streak = 0;
  for (let w = anchor; activeWeeks.has(w); w -= 1) streak += 1;
  return streak;
}

export function createPolarAdapter(cfg: PolarAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;
  const apiBase = (cfg.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, '');
  const tokenUrl = cfg.tokenUrl ?? TOKEN_URL;

  /**
   * Register the connected user with our AccessLink client. Required once before any data endpoint
   * returns data; a repeat connect yields HTTP 409, which we treat as success. We never read the
   * response body — it contains the member's name, which we must not touch or log.
   */
  async function registerUser(accessToken: string, memberId: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REGISTER_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ 'member-id': memberId }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new AdapterError('provider_down', `Network error: ${(error as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
    if (res.ok || res.status === 409) return; // 200/201 newly registered; 409 already registered.
    if (res.status === 401 || res.status === 403)
      throw new AdapterError('auth_expired', 'Unauthorized');
    if (res.status === 429) throw new AdapterError('rate_limited', 'Rate limited');
    if (res.status >= 500) throw new AdapterError('provider_down', `Upstream ${res.status}`);
    throw new AdapterError('unexpected_response', `HTTP ${res.status}`);
  }

  /** Exchange the authorization code for a token, capturing `x_user_id`, then register the user. */
  async function complete(ctx: CompleteContext): Promise<CompleteResult> {
    const code = ctx.params.code;
    if (!code) throw new AdapterError('unexpected_response', 'Missing authorization code');

    const token = await httpForm<PolarTokenResponse>(
      tokenUrl,
      { grant_type: 'authorization_code', code, redirect_uri: ctx.redirectUri },
      // AccessLink token endpoint uses HTTP Basic client authentication (client_secret_basic).
      basicAuthHeader(clientId, clientSecret),
    );
    if (!token.access_token)
      throw new AdapterError('unexpected_response', 'No access token returned');
    if (token.x_user_id === undefined || token.x_user_id === null)
      throw new AdapterError('unexpected_response', 'Polar returned no user id');

    const tokens: Tokens = {
      access: token.access_token,
      // AccessLink tokens are long-lived and have no refresh token.
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined,
      scopes: [...SCOPES],
    };

    // member-id links our side to the Polar user; it must be unique but we never read it back
    // (we dedupe on the Polar user id). A random value is enough.
    await registerUser(tokens.access, randomToken(16));

    return { externalId: String(token.x_user_id), tokens };
  }

  /** Read exercise summaries and derive the catalog metrics. */
  async function fetchMetrics(args: { tokens: Tokens }): Promise<FetchResult> {
    const res = await httpJson<PolarExercise[] | { exercises?: PolarExercise[] } | undefined>(
      `${apiBase}/exercises`,
      { headers: bearer(args.tokens.access) },
    );
    const list: PolarExercise[] = Array.isArray(res)
      ? res
      : Array.isArray(res?.exercises)
        ? res.exercises
        : [];

    const today = Math.floor(Date.now() / 86_400_000);
    let hoursYear = 0;
    let kmYear = 0;
    let hours30 = 0;
    const activeDays28 = new Set<number>();
    const activeWeeks = new Set<number>();

    for (const ex of list) {
      const day = exerciseDayIndex(ex['start-time']);
      if (day === null) continue;
      const ageDays = today - day;
      if (ageDays < 0) continue; // guard against a timezone-skewed "future" exercise

      const hours = durationSeconds(ex.duration) / 3600;
      const km = distanceMetres(ex.distance) / 1000;

      if (ageDays < 365) {
        hoursYear += hours;
        kmYear += km;
        activeWeeks.add(weekIndex(day));
      }
      if (ageDays < 30) hours30 += hours;
      if (ageDays < 28) activeDays28.add(day);
    }

    return {
      metrics: {
        'polar.training_hours_year': round2(hoursYear),
        'polar.distance_year_km': round2(kmYear),
        'polar.active_days_week': round2(activeDays28.size / 4),
        'polar.training_hours_30d': round2(hours30),
        'polar.weeks_streak': weeksStreak(activeWeeks, today),
      },
    };
  }

  // Reuse the generic adapter for the authorize-URL build (`begin`) and the token guard around
  // `fetch`; override `complete` for the AccessLink quirks above. AccessLink has no refresh flow.
  const base = createOAuth2Adapter({
    id: 'polar',
    clientId,
    clientSecret,
    authorizeUrl: cfg.authorizeUrl ?? AUTHORIZE_URL,
    tokenUrl,
    scopes: [...SCOPES],
    clientAuth: 'basic',
    identify: async () => {
      throw new AdapterError(
        'unexpected_response',
        'Polar resolves the account id during complete',
      );
    },
    fetchMetrics,
  });

  return {
    id: 'polar',
    auth: 'oauth2',
    begin: base.begin,
    complete,
    fetch: base.fetch,
  };
}
