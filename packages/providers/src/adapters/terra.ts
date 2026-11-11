import { createHmac, timingSafeEqual } from 'node:crypto';
import { AdapterError } from '../errors';
import { httpJson } from '../http';
import type {
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
} from '../types';

export interface TerraAdapterConfig {
  /** Terra developer id (header `dev-id`). */
  devId: string;
  /** Terra API key (header `x-api-key`). */
  apiKey: string;
}

const BASE = 'https://api.tryterra.co/v2';

function authHeaders(cfg: TerraAdapterConfig): Record<string, string> {
  return { 'dev-id': cfg.devId, 'x-api-key': cfg.apiKey, accept: 'application/json' };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface TerraWidgetResponse {
  url?: string;
  session_id?: string;
}
interface TerraDataResponse {
  data?: Array<Record<string, unknown>>;
}

/** Safely read a nested number from Terra's payload by a path of keys. */
function dig(obj: unknown, ...path: string[]): number | null {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === 'object' && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }
  return typeof cur === 'number' && Number.isFinite(cur) ? cur : null;
}

/**
 * Terra (tryterra.co) — one connector for many cloud wearables (Garmin, Fitbit, Oura, WHOOP,
 * Polar, Withings, Strava, …). Terra holds the per-user OAuth; we reference a user by their Terra
 * `user_id` and read data with our dev-id + API key. begin() opens Terra's connect widget; the
 * widget redirects back to our callback carrying ?user_id=. Apple Health still needs Terra's native
 * SDK (a mobile app) and is out of scope for this web connector. Field paths below follow Terra's
 * v2 schema and should be re-verified against the live API once a key is available.
 */
export function createTerraAdapter(cfg: TerraAdapterConfig): ProviderAdapter {
  const configured = Boolean(cfg.devId && cfg.apiKey);

  return {
    id: 'terra',
    auth: 'oauth2',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!configured) throw new AdapterError('provider_down', 'Terra is not configured');
      // Our CSRF state travels in the redirect URL; Terra appends ?user_id=&reference_id= on return.
      const back = `${ctx.redirectUri}?state=${encodeURIComponent(ctx.state)}`;
      const res = await httpJson<TerraWidgetResponse>(`${BASE}/auth/generateWidgetSession`, {
        method: 'POST',
        headers: { ...authHeaders(cfg), 'content-type': 'application/json' },
        body: JSON.stringify({
          reference_id: ctx.userId,
          language: 'en',
          auth_success_redirect_url: back,
          auth_failure_redirect_url: `${back}&error=terra_failed`,
        }),
      });
      if (!res.url) throw new AdapterError('unexpected_response', 'Terra returned no widget URL');
      return { redirectUrl: res.url };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const userId = ctx.params.user_id;
      if (!userId) throw new AdapterError('unexpected_response', 'Terra callback has no user_id');
      // No per-user tokens: Terra holds them; we read with our dev-id/API key by user_id.
      return { externalId: userId };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!configured) throw new AdapterError('provider_down', 'Terra is not configured');
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 86_400_000);
      const q =
        `user_id=${encodeURIComponent(ctx.externalId)}` +
        `&start_date=${isoDate(start)}&end_date=${isoDate(end)}&to_webhook=false`;

      const [activity, daily, sleep] = await Promise.all([
        httpJson<TerraDataResponse>(`${BASE}/activity?${q}`, { headers: authHeaders(cfg) }),
        httpJson<TerraDataResponse>(`${BASE}/daily?${q}`, { headers: authHeaders(cfg) }),
        httpJson<TerraDataResponse>(`${BASE}/sleep?${q}`, { headers: authHeaders(cfg) }),
      ]);

      const workouts = (activity.data ?? []).length;

      const dailyRows = daily.data ?? [];
      const activeDays = dailyRows.filter((d) => {
        const steps = dig(d, 'distance_data', 'steps') ?? dig(d, 'steps');
        return steps !== null && steps > 1000;
      }).length;

      const sleepRows = sleep.data ?? [];
      const sleepHours = sleepRows
        .map((s) => {
          const secs =
            dig(s, 'sleep_durations_data', 'asleep', 'duration_asleep_state_seconds') ??
            dig(s, 'sleep_durations_data', 'other', 'duration_in_bed_seconds');
          return secs !== null ? secs / 3600 : null;
        })
        .filter((h): h is number => h !== null);
      const avgSleep =
        sleepHours.length > 0
          ? Math.round((sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length) * 10) / 10
          : null;

      return {
        metrics: {
          'terra.workouts': workouts,
          'terra.active_days_30d': activeDays,
          'terra.avg_sleep_hours': avgSleep,
        },
      };
    },
  };
}

/**
 * Verify a Terra webhook signature (header `terra-signature: t=<ts>,v1=<hmac>`), HMAC-SHA256 of
 * `"<t>.<rawBody>"` with the signing secret. Returns true when it matches.
 */
export function verifyTerraSignature(
  rawBody: string,
  signatureHeader: string | null,
  signingSecret: string,
): boolean {
  if (!signatureHeader || !signingSecret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim(), v?.trim()];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = createHmac('sha256', signingSecret).update(`${t}.${rawBody}`).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}
