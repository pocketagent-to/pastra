import type { Axis, MetricKey, ProviderId, StampKind } from '@pastra/catalog';

export type ConnectionStatus = 'connected' | 'needs_reconnect' | 'error';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** One connected service as seen by the pure scorer: metrics are already computed (incl. deltas). */
export interface ScoringConnection {
  provider: ProviderId;
  status: ConnectionStatus;
  /** Consecutive drops this connection missed a refresh; drives Activity decay (0.8^staleWeeks). */
  staleWeeks: number;
  /** `null` means the service did not return the field; it is skipped, not treated as zero. */
  metrics: Record<MetricKey, number | null>;
  extras: Record<string, unknown>;
}

export interface StampRecord {
  key: string;
  axis: Axis | 'all';
  kind: StampKind;
  label: string;
  /** For tiered achievement stamps (e.g. hours 500/1000/2000/5000): the reached tier. */
  tier?: number;
}

export interface ScoringInput {
  week: string;
  connections: ScoringConnection[];
  /** Invited friends who connected a service, already capped by the caller or here at 10. */
  rewardedFriends: number;
  hasEns: boolean;
  hasCard?: boolean;
  country?: string;
  existingStamps: StampRecord[];
  /** Highest points ever reached; the level is computed from max(peakPoints, points). */
  peakPoints?: number;
  /** Previous week's result; only used by the recap, never by scoring. */
  previous?: PassResult;
  /** Per-axis percentile ladders; empty until an axis has 1,000 non-zero users. */
  percentiles?: Partial<Record<Axis, number[]>>;
}

export interface AxisSource {
  provider: ProviderId;
  /** Service score 0–100 (one decimal). */
  score: number;
  /** How much this source added to the axis (full for the best, 10% for the rest). */
  contribution: number;
}

export interface AxisResult {
  score: number;
  parts: { volume: number | null; activity: number | null; depth: number | null };
  sources: AxisSource[];
  topPct: number | null;
}

export interface KeyNumber {
  provider: ProviderId;
  axis: Axis;
  value: string;
  label: string;
}

export interface PassResult {
  axes: Record<Axis, AxisResult>;
  points: number;
  peakPoints: number;
  level: number;
  rarity: Rarity;
  title: string;
  keyNumbers: KeyNumber[];
  stamps: { awarded: StampRecord[]; revoked: StampRecord[] };
}
