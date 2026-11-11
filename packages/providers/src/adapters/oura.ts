import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * Oura adapter — OAuth 2.0 (authorization-code, confidential client). The generic OAuth2 adapter
 * (packages/providers/src/oauth2.ts) handles begin/complete/refresh; this file supplies the Oura
 * endpoints, scopes, `identify` and `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts — all `source: 'api'`, no delta_30d):
 *   - oura.training_hours_year  volume   total workout hours over the last 365 days
 *   - oura.active_days_week     activity distinct days with a workout / weeks tracked
 *   - oura.training_hours_30d   activity total workout hours over the last 30 days
 *   - oura.weeks_streak         depth    current run of consecutive weeks with >=1 workout
 *   - oura.sleep_score_30d      depth    mean daily Sleep score over the last 30 days
 *
 * Privacy (docs/architecture.md section 7 — Polar/Withings note applies to every `health` service;
 * catalog `consent`). Oura is a Sports/`health` service, so we read only workout *summaries*
 * (durations, dates) and the aggregate daily Sleep score. We never request or read heart rate, HRV,
 * SpO2, readiness detail, temperature, weight or raw health records — the `heartrate`, `spo2` and
 * `session` scopes are never requested (the consent "weNever" list). Scopes requested:
 *   - `personal` — resolve the Oura account id (never stored as a metric; never read the email),
 *   - `workout`  — workout summaries (training hours, active days, streak),
 *   - `daily`    — daily Sleep *score* only (the aggregate 0-100 value).
 */

const AUTHORIZE_URL = 'https://cloud.ouraring.com/oauth/authorize';
const TOKEN_URL = 'https://api.ouraring.com/oauth/token';
const DEFAULT_API_BASE = 'https://api.ouraring.com/v2';

const SCOPES = ['daily', 'workout', 'personal'] as const;

const MS_PER_HOUR = 60 * 60 * 1000;
const DAY_MS = 24 * MS_PER_HOUR;
const WEEK_MS = 7 * DAY_MS;
const YEAR_DAYS = 365;
/** Runaway guard on the cursor walk (not a business value): 200 pages = 20,000 records. */
const MAX_PAGES = 200;
/** We only ever read a rolling year, so a streak cannot exceed 52 weeks of fetched data. */
const MAX_STREAK_WEEKS = 52;

export interface OuraAdapterConfig {
  clientId: string;
  clientSecret: string;
  /** Override the API base (default `https://api.ouraring.com/v2`). No trailing slash needed. */
  apiBaseUrl?: string;
}

/** `GET /v2/usercollection/personal_info` (scope `personal`). We read only the account id. */
interface OuraPersonalInfo {
  id?: string;
}

/** An Oura paginated collection page (`data` + an opaque `next_token`). */
interface OuraPage<T> {
  data?: T[];
  next_token?: string | null;
}

/** A workout summary (`GET /v2/usercollection/workout`). We read only start/end times and the day. */
interface OuraWorkout {
  day?: string;
  start_datetime?: string;
  end_datetime?: string;
}

/** A daily sleep summary (`GET /v2/usercollection/daily_sleep`). We read only the aggregate score. */
interface OuraDailySleep {
  day?: string;
  score?: number | null;
}

function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** A UTC calendar day ("YYYY-MM-DD") for an epoch-ms instant, for Oura's date-range query params. */
function dayStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Workout duration in hours (end - start), or null if a bound is missing/invalid or end <= start. */
function workoutHours(w: OuraWorkout): number | null {
  if (!w.start_datetime || !w.end_datetime) return null;
  const s = Date.parse(w.start_datetime);
  const e = Date.parse(w.end_datetime);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  return (e - s) / MS_PER_HOUR;
}

export function createOuraAdapter(cfg: OuraAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;
  const apiBase = (cfg.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, '');

  /**
   * Walk an Oura collection between two days (inclusive), paging via the opaque `next_token` cursor.
   * Oura filters by the record's local `day`, so we widen the window by a day at each end to be safe.
   */
  async function collect<T>(path: string, startMs: number, endMs: number, token: string): Promise<T[]> {
    const headers = bearer(token);
    const startDate = dayStr(startMs - DAY_MS);
    const endDate = dayStr(endMs + DAY_MS);
    const out: T[] = [];
    let nextToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const url = new URL(`${apiBase}${path}`);
      url.searchParams.set('start_date', startDate);
      url.searchParams.set('end_date', endDate);
      if (nextToken) url.searchParams.set('next_token', nextToken);
      const res = await httpJson<OuraPage<T>>(url.toString(), { headers });
      if (Array.isArray(res.data)) out.push(...res.data);
      if (!res.next_token) break;
      nextToken = res.next_token;
    }
    return out;
  }

  /** Resolve the connected account id. Used once at connect time, never returned as a metric. */
  async function identify(tokens: Tokens): Promise<string> {
    const res = await httpJson<OuraPersonalInfo>(`${apiBase}/usercollection/personal_info`, {
      headers: bearer(tokens.access),
    });
    if (!res.id) throw new AdapterError('unexpected_response', 'Oura returned no user id');
    return res.id;
  }

  /** Mean daily Sleep score over the window, or null if no scored day. */
  async function sleepScore30d(startMs: number, endMs: number, token: string): Promise<number | null> {
    const days = await collect<OuraDailySleep>('/usercollection/daily_sleep', startMs, endMs, token);
    const scores: number[] = [];
    for (const d of days) {
      const t = d.day ? Date.parse(`${d.day}T00:00:00Z`) : NaN;
      if (Number.isNaN(t) || t < startMs || t > endMs + DAY_MS) continue;
      if (typeof d.score === 'number' && Number.isFinite(d.score)) scores.push(d.score);
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
    const workouts = await collect<OuraWorkout>('/usercollection/workout', yearStart, now, token);

    let yearHours = 0;
    let monthHours = 0;
    let earliestStart = now;
    const activeDays = new Set<string>();
    const activeWeeks = new Set<number>();

    for (const w of workouts) {
      const started = w.start_datetime ? Date.parse(w.start_datetime) : NaN;
      if (Number.isNaN(started) || started < yearStart || started > now) continue;
      if (started < earliestStart) earliestStart = started;

      const hours = workoutHours(w);
      if (hours !== null) {
        yearHours += hours;
        if (started >= monthStart) monthHours += hours;
      }

      // Oura's `day` is the workout's local calendar day — exactly the active-day key we need.
      if (w.day) activeDays.add(w.day);

      const weeksAgo = Math.floor(Math.max(0, now - started) / WEEK_MS);
      if (weeksAgo <= MAX_STREAK_WEEKS) activeWeeks.add(weeksAgo);
    }

    // Active days per week: distinct training days over the span actually tracked (first workout to
    // now), clamped to [1, 52] weeks so a young account is not diluted by a full-year denominator.
    const spanWeeks = Math.min(MAX_STREAK_WEEKS, Math.max(1, (now - earliestStart) / WEEK_MS));
    const activeDaysWeek = activeDays.size === 0 ? 0 : activeDays.size / spanWeeks;

    // Current streak: consecutive weeks with a workout, allowing an empty (partial) current week.
    let streak = 0;
    let cursor = activeWeeks.has(0) ? 0 : activeWeeks.has(1) ? 1 : -1;
    if (cursor >= 0) {
      while (cursor <= MAX_STREAK_WEEKS && activeWeeks.has(cursor)) {
        streak += 1;
        cursor += 1;
      }
    }

    const sleepScore = await sleepScore30d(monthStart, now, token);

    return {
      metrics: {
        'oura.training_hours_year': round(yearHours, 2),
        'oura.active_days_week': round(activeDaysWeek, 2),
        'oura.training_hours_30d': round(monthHours, 2),
        'oura.weeks_streak': streak,
        'oura.sleep_score_30d': sleepScore,
      },
    };
  }

  return createOAuth2Adapter({
    id: 'oura',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // Oura's token endpoint uses HTTP Basic client authentication (client_secret_basic).
    clientAuth: 'basic',
    identify,
    fetchMetrics,
  });
}
