import { AdapterError } from '../errors';
import { bearer, httpForm, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * WHOOP adapter — OAuth 2.0 (authorization-code, confidential client). The generic OAuth2 adapter
 * (packages/providers/src/oauth2.ts) handles begin/complete; this file supplies the WHOOP endpoints,
 * scopes, `identify` and `fetchMetrics`, and overrides `refresh` for a WHOOP quirk (below).
 *
 * Catalog metrics (packages/catalog/src/providers.ts — all `source: 'api'`, no delta_30d):
 *   - whoop.training_hours_year  volume   total workout hours over the last 365 days
 *   - whoop.distance_year_km     volume   total workout distance over the last 365 days, in km
 *   - whoop.active_days_week     activity distinct days with a workout / weeks tracked
 *   - whoop.training_hours_30d   activity total workout hours over the last 30 days
 *   - whoop.weeks_streak         depth    current run of consecutive weeks with >=1 workout
 *   - whoop.sleep_score_30d      depth    mean sleep-performance % over 30 days (opt-in, see below)
 *
 * Privacy (docs/architecture.md section 7; catalog `consent`). WHOOP is a Sports/`health` service, so
 * we read only workout (and cycle) *summaries*: durations, distances, dates and the aggregate
 * sleep-performance score. We never request or read heart rate, strain detail, routes or raw health
 * records (the consent "weNever" list). Scopes requested: `read:profile` (resolve the account id),
 * `read:workout` and `read:cycles` (training summaries), and `offline` (a refresh token).
 *
 * The aggregate Sleep score (`whoop.sleep_score_30d`) needs the extra `read:sleep` scope. It is OFF
 * by default — the adapter reads workout/cycle summaries only and reports that metric as null. Set
 * `includeSleep` once the WHOOP app grants `read:sleep` to fill it from the aggregate
 * sleep-performance percentage (naps excluded); nothing else changes.
 *
 * WHOOP quirk: the refresh grant must re-send `scope=offline` to be issued a new refresh token, so we
 * override the generic `refresh` to include it.
 */

const AUTHORIZE_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const DEFAULT_API_BASE = 'https://api.prod.whoop.com/developer';

const BASE_SCOPES = ['read:profile', 'read:workout', 'read:cycles', 'offline'] as const;
const SLEEP_SCOPE = 'read:sleep';

const MS_PER_HOUR = 60 * 60 * 1000;
const DAY_MS = 24 * MS_PER_HOUR;
const WEEK_MS = 7 * DAY_MS;
const YEAR_DAYS = 365;
/** WHOOP collections page at most 25 records. */
const PAGE_LIMIT = 25;
/** Runaway guard on the cursor walk (not a business value): 400 pages = 10,000 records. */
const MAX_PAGES = 400;
/** We only ever read a rolling year, so a streak cannot exceed 52 weeks of fetched data. */
const MAX_STREAK_WEEKS = 52;

export interface WhoopAdapterConfig {
  clientId: string;
  clientSecret: string;
  /**
   * Opt in to the aggregate Sleep score metric (`whoop.sleep_score_30d`). Requires the WHOOP app to
   * grant the `read:sleep` scope. Off by default, keeping the adapter to workout/cycle summaries
   * (docs/architecture.md section 7); when off, the metric is reported as null.
   */
  includeSleep?: boolean;
  /** Override the developer API base (default `https://api.prod.whoop.com/developer`). No trailing slash needed. */
  apiBaseUrl?: string;
}

interface WhoopTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

/** `GET /v1/user/profile/basic`. We read only the account id. */
interface WhoopProfile {
  user_id?: number;
}

/** A WHOOP paginated collection page (`records` + an opaque `next_token`). */
interface WhoopPage<T> {
  records?: T[];
  next_token?: string | null;
}

/** A workout summary (`GET /v1/activity/workout`). We read only times, dates and distance. */
interface WhoopWorkout {
  start?: string;
  end?: string;
  timezone_offset?: string;
  score?: { distance_meter?: number | null } | null;
}

/** A sleep summary (`GET /v1/activity/sleep`). We read only the aggregate performance percentage. */
interface WhoopSleep {
  nap?: boolean;
  score?: { sleep_performance_percentage?: number | null } | null;
}

function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Minutes east of UTC for a WHOOP `timezone_offset` like "-05:00" or "+0100"; 0 if absent/unparseable. */
function tzOffsetMinutes(offset: string | undefined): number {
  if (!offset) return 0;
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset.trim());
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

/** The local calendar day ("YYYY-MM-DD") a workout started on, or null if the timestamp is unusable. */
function localDayKey(startIso: string | undefined, offset: string | undefined): string | null {
  if (!startIso) return null;
  const t = Date.parse(startIso);
  if (Number.isNaN(t)) return null;
  const local = new Date(t + tzOffsetMinutes(offset) * 60 * 1000);
  const y = local.getUTCFullYear();
  const mo = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Workout duration in hours (end - start), or null if a bound is missing/invalid or end <= start. */
function workoutHours(w: WhoopWorkout): number | null {
  if (!w.start || !w.end) return null;
  const s = Date.parse(w.start);
  const e = Date.parse(w.end);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  return (e - s) / MS_PER_HOUR;
}

export function createWhoopAdapter(cfg: WhoopAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;
  const apiBase = (cfg.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, '');
  const scopes = cfg.includeSleep ? [...BASE_SCOPES, SLEEP_SCOPE] : [...BASE_SCOPES];

  /** Walk a WHOOP collection between two instants, paging via the opaque `next_token` cursor. */
  async function collect<T>(path: string, startMs: number, endMs: number, token: string): Promise<T[]> {
    const headers = bearer(token);
    const out: T[] = [];
    let nextToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const url = new URL(`${apiBase}${path}`);
      url.searchParams.set('start', new Date(startMs).toISOString());
      url.searchParams.set('end', new Date(endMs).toISOString());
      url.searchParams.set('limit', String(PAGE_LIMIT));
      if (nextToken) url.searchParams.set('nextToken', nextToken);
      const res = await httpJson<WhoopPage<T>>(url.toString(), { headers });
      if (Array.isArray(res.records)) out.push(...res.records);
      if (!res.next_token) break;
      nextToken = res.next_token;
    }
    return out;
  }

  /** Resolve the connected account id. Used once at connect time, never returned as a metric. */
  async function identify(tokens: Tokens): Promise<string> {
    const res = await httpJson<WhoopProfile>(`${apiBase}/v1/user/profile/basic`, {
      headers: bearer(tokens.access),
    });
    if (res.user_id === undefined || res.user_id === null) {
      throw new AdapterError('unexpected_response', 'WHOOP returned no user');
    }
    return String(res.user_id);
  }

  /** Mean aggregate sleep-performance percentage over the window (naps excluded), or null if none. */
  async function sleepScore30d(startMs: number, endMs: number, token: string): Promise<number | null> {
    const sleeps = await collect<WhoopSleep>('/v1/activity/sleep', startMs, endMs, token);
    const scores: number[] = [];
    for (const s of sleeps) {
      if (s.nap) continue;
      const pct = s.score?.sleep_performance_percentage;
      if (typeof pct === 'number' && Number.isFinite(pct)) scores.push(pct);
    }
    if (scores.length === 0) return null;
    return round(scores.reduce((a, b) => a + b, 0) / scores.length, 1);
  }

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const token = args.tokens.access;
    const now = Date.now();
    const yearStart = now - YEAR_DAYS * DAY_MS;
    const monthStart = now - 30 * DAY_MS;

    // One year of workout summaries drives every workout-derived metric; we page it once.
    const workouts = await collect<WhoopWorkout>('/v1/activity/workout', yearStart, now, token);

    let yearHours = 0;
    let yearDistanceM = 0;
    let monthHours = 0;
    let earliestStart = now;
    const activeDays = new Set<string>();
    const activeWeeks = new Set<number>();

    for (const w of workouts) {
      const started = w.start ? Date.parse(w.start) : NaN;
      if (Number.isNaN(started)) continue;
      if (started < earliestStart) earliestStart = started;

      const hours = workoutHours(w);
      if (hours !== null) {
        yearHours += hours;
        if (started >= monthStart) monthHours += hours;
      }

      const dist = w.score?.distance_meter;
      if (typeof dist === 'number' && Number.isFinite(dist) && dist > 0) yearDistanceM += dist;

      const day = localDayKey(w.start, w.timezone_offset);
      if (day) activeDays.add(day);

      const weeksAgo = Math.floor(Math.max(0, now - started) / WEEK_MS);
      if (weeksAgo <= MAX_STREAK_WEEKS) activeWeeks.add(weeksAgo);
    }

    // Active days per week: distinct training days over the span actually tracked (first workout to
    // now), clamped to [1, 52] weeks so a young account is not diluted by a full-year denominator.
    const spanWeeks = Math.min(MAX_STREAK_WEEKS, Math.max(1, (now - earliestStart) / WEEK_MS));
    const activeDaysWeek = workouts.length === 0 ? 0 : activeDays.size / spanWeeks;

    // Current streak: consecutive weeks with a workout, allowing an empty (partial) current week.
    let streak = 0;
    let cursor = activeWeeks.has(0) ? 0 : activeWeeks.has(1) ? 1 : -1;
    if (cursor >= 0) {
      while (cursor <= MAX_STREAK_WEEKS && activeWeeks.has(cursor)) {
        streak += 1;
        cursor += 1;
      }
    }

    const sleepScore = cfg.includeSleep ? await sleepScore30d(monthStart, now, token) : null;

    return {
      metrics: {
        'whoop.training_hours_year': round(yearHours, 2),
        'whoop.distance_year_km': round(yearDistanceM / 1000, 2),
        'whoop.active_days_week': round(activeDaysWeek, 2),
        'whoop.training_hours_30d': round(monthHours, 2),
        'whoop.weeks_streak': streak,
        'whoop.sleep_score_30d': sleepScore,
      },
    };
  }

  const adapter = createOAuth2Adapter({
    id: 'whoop',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes,
    // WHOOP's token endpoint takes client_id/client_secret in the body (client_secret_post).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });

  // WHOOP quirk: the refresh grant must re-send `scope=offline` to be issued a new refresh token.
  return {
    ...adapter,
    async refresh(tokens: Tokens): Promise<Tokens> {
      if (!tokens.refresh) throw new AdapterError('auth_expired', 'No refresh token');
      const res = await httpForm<WhoopTokenResponse>(TOKEN_URL, {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh,
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'offline',
      });
      if (!res.access_token) throw new AdapterError('unexpected_response', 'No access token returned');
      return {
        access: res.access_token,
        // WHOOP may omit a new refresh token; keep the old one so the connection survives.
        refresh: res.refresh_token ?? tokens.refresh,
        expiresAt: res.expires_in ? new Date(Date.now() + res.expires_in * 1000) : undefined,
        scopes: res.scope ? res.scope.split(/[\s,]+/).filter(Boolean) : tokens.scopes,
      };
    },
  };
}
