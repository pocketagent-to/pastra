/**
 * Catalog types (docs/architecture.md sections 7 and 8).
 *
 * The catalog describes services, metrics, thresholds, stamps and titles as typed data. Adding a
 * service is one provider spec here plus one adapter file in `packages/providers`. The catalog is
 * the source of truth for metric thresholds once transcribed from `docs/metrics.csv`.
 */

/** The six sides of the hexagon. */
export type Axis = 'sports' | 'gaming' | 'crypto' | 'music' | 'social' | 'lifestyle';

/** All six axes in hexagon order, clockwise from the top vertex (docs/architecture.md section 13). */
export const AXES: readonly Axis[] = ['sports', 'gaming', 'crypto', 'music', 'social', 'lifestyle'];

export type ProviderId =
  // Gaming
  | 'steam'
  | 'twitch'
  | 'faceit'
  | 'battlenet'
  | 'lichess'
  | 'osu'
  // Crypto
  | 'wallet_evm'
  | 'wallet_solana'
  | 'wallet_ton'
  // Social
  | 'x'
  | 'discord'
  | 'telegram'
  | 'farcaster'
  | 'github'
  | 'linkedin'
  // Music & Entertainment
  | 'spotify'
  | 'tidal'
  | 'apple_music'
  | 'youtube'
  | 'anilist'
  | 'myanimelist'
  // Sports
  | 'terra'
  | 'polar'
  | 'withings'
  | 'whoop'
  | 'oura'
  // Lifestyle
  | 'foursquare'
  | 'card_spend';

/** A namespaced metric key, e.g. `steam.hours_total`. */
export type MetricKey = string;

/** The three parts of an axis (docs/product-spec.md section 2). */
export type AxisPart = 'volume' | 'activity' | 'depth';

export type MetricScale = 'log' | 'linear';

/**
 * How a metric value is obtained.
 * - `api`: read directly from the service on each sync.
 * - `delta_30d`: the difference against our own snapshot four weeks ago (docs/architecture.md §7).
 */
export type MetricSource = 'api' | 'delta_30d';

/** How values of the same metric across several connections of one provider combine (wallets). */
export type MetricAggregate = 'sum' | 'max';

export interface MetricSpec {
  key: MetricKey;
  part: AxisPart;
  scale: MetricScale;
  /** Score-0 threshold. For a reverse scale (e.g. osu! world rank) `t0` > `t100`. */
  t0: number;
  /** Score-100 threshold. */
  t100: number;
  source: MetricSource;
  /** For `delta_30d` metrics: the cumulative metric this is a delta of. */
  deltaOf?: MetricKey;
  /** How several connections of the same provider combine this metric. Defaults to `sum`. */
  aggregate?: MetricAggregate;
  label: string;
}

export interface ProviderSpec {
  id: ProviderId;
  name: string;
  axis: Axis;
  status: 'live' | 'coming_soon';
  /** True for Sports services: requires the Health consent screen; never drives offers. */
  health: boolean;
  /** Sync cadence in drops. 1 = every drop; X = 4 (every fourth drop). */
  syncEveryNthDrop: number;
  rateLimit: { perMinute: number; concurrency: number };
  /** Copy for the consent screen: what we read, what we never touch. */
  consent: { weRead: string[]; weNever: string[] };
  metrics: MetricSpec[];
  /** The headline metric and its label template for "Your numbers". */
  keyNumber?: { metric: MetricKey; template: string };
  /** Upper bound on this provider's service score (X = 80). */
  scoreCap?: number;
  /** Fixed points added to the axis (Telegram, LinkedIn = +5 to Social). */
  axisBonus?: number;
}

/**
 * A condition over a pass. Shared by stamp rules (docs/architecture.md §8) and offer rules
 * (docs/product-spec.md §10). The evaluator lives in `packages/scoring`.
 */
export type Condition =
  | { kind: 'axis_gte'; axis: Axis; value: number }
  | { kind: 'connected'; provider: ProviderId }
  | { kind: 'metric_gte'; metric: MetricKey; value: number }
  | { kind: 'level_gte'; value: number }
  | { kind: 'country_in'; countries: string[] }
  | { kind: 'has_card' }
  | { kind: 'all_axes_positive' }
  | { kind: 'rewarded_friends_gte'; value: number }
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] };

export type StampKind = 'service' | 'achievement';

export interface StampSpec {
  key: string;
  axis: Axis | 'all';
  kind: StampKind;
  label: string;
  /** Ascending thresholds for a tiered stamp (e.g. hours 500/1000/2000/5000). */
  tiers?: Array<{ tier: number; value: number; label: string }>;
  /** The metric a tiered stamp measures against (aggregated across connections). */
  tierMetric?: MetricKey;
  /** Condition for a non-tiered stamp; omitted for tiered and service stamps. */
  condition?: Condition;
  /** For service stamps: the provider whose connection awards (and revokes) this stamp. */
  provider?: ProviderId;
}

export interface TitleWords {
  /** Word when this axis is strongest, e.g. "Gamer". */
  primary: string;
  /** Word when this axis is the runner-up, e.g. "gamer". */
  secondary: string;
}

export interface Catalog {
  axes: readonly Axis[];
  providers: ProviderSpec[];
  providerById: Map<ProviderId, ProviderSpec>;
  metricById: Map<MetricKey, MetricSpec & { provider: ProviderId; axis: Axis }>;
  providersByAxis: Map<Axis, ProviderSpec[]>;
  stamps: StampSpec[];
  titleWords: Record<Axis, TitleWords>;
  /** Tie-break order for the strongest axis (docs/product-spec.md section 6.6). */
  titleTieOrder: readonly Axis[];
  /** Fixed axis bonuses not tied to a connected provider (ENS = +5 to Crypto). */
  ensAxisBonus: number;
}
