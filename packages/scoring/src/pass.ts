import type { Axis, Catalog, MetricKey, ProviderId, ProviderSpec } from '@pastra/catalog';
import { AXES, DERIVED_NFTS_TOTAL } from '@pastra/catalog';
import { axisContributions, scoreAxis } from './axis';
import type { EvalContext } from './conditions';
import { fillTemplate, formatCount } from './format';
import { aggregateMetrics, combineParts, displayParts, scoreParts } from './service';
import { computeStampDelta } from './stamps';
import { computeRarity, computeTitle, computeTopPct, sortAxesByStrength } from './title';
import type { AxisResult, KeyNumber, PassResult, ScoringConnection, ScoringInput } from './types';

/** Points for each connected service and each rewarded friend (docs/formula.csv). */
const SERVICE_POINTS = 5;
const FRIEND_POINTS = 5;
/** Maximum rewarded friends (docs/product-spec.md section 6.5). */
const FRIEND_REWARD_CAP = 10;

interface ProviderGroup {
  spec: ProviderSpec;
  connections: ScoringConnection[];
  aggregated: Record<MetricKey, number>;
  extras: Record<string, unknown>;
  /** Lowest staleWeeks in the group (the most recently synced connection). */
  staleWeeks: number;
  /** True if at least one connection is in status `connected`. */
  hasConnected: boolean;
}

interface ScoredService {
  provider: ProviderId;
  score: number;
  parts: AxisResult['parts'];
}

function groupConnections(input: ScoringInput, catalog: Catalog): ProviderGroup[] {
  const byProvider = new Map<ProviderId, ScoringConnection[]>();
  for (const conn of input.connections) {
    const list = byProvider.get(conn.provider);
    if (list) list.push(conn);
    else byProvider.set(conn.provider, [conn]);
  }

  const groups: ProviderGroup[] = [];
  for (const [provider, connections] of byProvider) {
    const spec = catalog.providerById.get(provider);
    if (!spec) continue; // unknown provider id: ignore rather than throw
    const extras: Record<string, unknown> = {};
    for (const conn of connections) Object.assign(extras, conn.extras);
    groups.push({
      spec,
      connections,
      aggregated: aggregateMetrics(connections, spec),
      extras,
      staleWeeks: Math.min(...connections.map((c) => Math.max(0, c.staleWeeks))),
      hasConnected: connections.some((c) => c.status === 'connected'),
    });
  }
  return groups;
}

function buildEvalContext(
  input: ScoringInput,
  groups: ProviderGroup[],
  axes: Record<Axis, number>,
  level: number,
): { ctx: EvalContext; aggregated: Record<MetricKey, number> } {
  const aggregated: Record<MetricKey, number> = {};
  for (const group of groups) Object.assign(aggregated, group.aggregated);

  // Derived metric: total NFTs across all wallet types.
  const evmNfts = aggregated['wallet_evm.nfts'];
  const solNfts = aggregated['wallet_solana.nfts'];
  if (evmNfts !== undefined || solNfts !== undefined) {
    aggregated[DERIVED_NFTS_TOTAL] = (evmNfts ?? 0) + (solNfts ?? 0);
  }

  const ctx: EvalContext = {
    axes,
    level,
    connectedProviders: new Set(groups.map((g) => g.spec.id)),
    metrics: aggregated,
    country: input.country,
    hasCard: input.hasCard ?? false,
    rewardedFriends: Math.min(input.rewardedFriends, FRIEND_REWARD_CAP),
  };
  return { ctx, aggregated };
}

function buildKeyNumbers(
  axesOrder: Axis[],
  groups: ProviderGroup[],
  axisSources: Record<Axis, ScoredService[]>,
): KeyNumber[] {
  const groupByProvider = new Map(groups.map((g) => [g.spec.id, g]));
  const keyNumbers: KeyNumber[] = [];
  for (const axis of axesOrder) {
    // Best source in this axis that has a key-number spec and a present value.
    for (const source of axisSources[axis]) {
      const group = groupByProvider.get(source.provider);
      if (!group?.spec.keyNumber) continue;
      const { metric, template } = group.spec.keyNumber;
      const value = group.aggregated[metric];
      if (value === undefined) continue;
      const valueStr = formatCount(value);
      const vars: Record<string, string | number> = { value: valueStr };
      for (const [k, v] of Object.entries(group.extras)) {
        if (typeof v === 'string' || typeof v === 'number') vars[k] = v;
      }
      const label = fillTemplate(template.replace(/\{value\}\s*/, ''), vars);
      keyNumbers.push({ provider: source.provider, axis, value: valueStr, label });
      break;
    }
    if (keyNumbers.length >= 4) break;
  }
  return keyNumbers;
}

/**
 * Pure scorer: metrics in, pass out (docs/architecture.md section 8). Never touches the DB, the
 * network or the clock. The order of computation is metric → service → axis → points → level →
 * title → shares → key numbers → stamps (docs/product-spec.md section 6).
 */
export function computePass(input: ScoringInput, catalog: Catalog): PassResult {
  const groups = groupConnections(input, catalog);

  // Score every service that has metrics, grouped by axis.
  const axisSources: Record<Axis, ScoredService[]> = {
    sports: [],
    gaming: [],
    crypto: [],
    music: [],
    social: [],
    lifestyle: [],
  };
  for (const group of groups) {
    if (group.spec.metrics.length === 0) continue; // bonus-only providers (Telegram, LinkedIn)
    const parts = scoreParts(group.aggregated, group.spec, group.staleWeeks);
    const score = combineParts(parts, group.spec.scoreCap);
    axisSources[group.spec.axis].push({
      provider: group.spec.id,
      score,
      parts: displayParts(parts),
    });
  }

  // Fixed axis bonuses from connected bonus providers and ENS.
  const axisBonus: Record<Axis, number> = {
    sports: 0,
    gaming: 0,
    crypto: 0,
    music: 0,
    social: 0,
    lifestyle: 0,
  };
  for (const group of groups) {
    if (group.spec.axisBonus) axisBonus[group.spec.axis] += group.spec.axisBonus;
  }
  if (input.hasEns) axisBonus.crypto += catalog.ensAxisBonus;

  // Axis scores and per-axis results.
  const axes = {} as Record<Axis, AxisResult>;
  const axisScores = {} as Record<Axis, number>;
  for (const axis of AXES) {
    const sources = axisSources[axis];
    const scores = sources.map((s) => s.score);
    const score = scoreAxis(scores, axisBonus[axis]);
    axisScores[axis] = score;

    const contributions = axisContributions(scores);
    const best = sources.reduce<ScoredService | undefined>(
      (top, s) => (top === undefined || s.score > top.score ? s : top),
      undefined,
    );
    axes[axis] = {
      score,
      parts: best ? best.parts : { volume: null, activity: null, depth: null },
      sources: sources.map((s, i) => ({
        provider: s.provider,
        score: s.score,
        contribution: contributions[i] ?? 0,
      })),
      topPct: computeTopPct(score, input.percentiles?.[axis]),
    };
  }

  // Points, peak and level.
  const servicesCount = groups.filter((g) => g.hasConnected).length;
  const rewardedFriends = Math.min(input.rewardedFriends, FRIEND_REWARD_CAP);
  const axisSum = AXES.reduce((sum, axis) => sum + axisScores[axis], 0);
  const points = axisSum + SERVICE_POINTS * servicesCount + FRIEND_POINTS * rewardedFriends;
  const peakPoints = Math.max(input.peakPoints ?? 0, points);
  const level = 1 + Math.floor(peakPoints / 15);

  const rarity = computeRarity(level);
  const title = computeTitle(axisScores, catalog);

  // Key numbers: up to four, one per axis in descending score order.
  const axesByStrength = sortAxesByStrength(axisScores, catalog);
  const keyNumbers = buildKeyNumbers(axesByStrength, groups, axisSources);

  // Stamps.
  const { ctx, aggregated } = buildEvalContext(input, groups, axisScores, level);
  const labelVars: Record<string, string | number> = {};
  const year = oldestWalletYear(groups);
  if (year !== undefined) labelVars.year = year;
  const stamps = computeStampDelta(catalog, ctx, aggregated, input.existingStamps, labelVars);

  return { axes, points, peakPoints, level, rarity, title, keyNumbers, stamps };
}

function oldestWalletYear(groups: ProviderGroup[]): number | undefined {
  let min: number | undefined;
  for (const group of groups) {
    if (!group.spec.id.startsWith('wallet_')) continue;
    const year = group.extras.firstTxYear;
    if (typeof year === 'number' && (min === undefined || year < min)) min = year;
  }
  return min;
}

/**
 * Recompute a pass without one provider and return the axis deltas, for the "Disconnect a service"
 * preview (docs/architecture.md section 8). The level never drops: it stays at the current peak.
 */
export function whatIfDisconnect(
  input: ScoringInput,
  provider: ProviderId,
  catalog: Catalog,
): {
  before: PassResult;
  after: PassResult;
  axisDeltas: Record<Axis, number>;
  levelStays: boolean;
} {
  const before = computePass(input, catalog);
  const after = computePass(
    {
      ...input,
      // The level never drops: carry the peak forward so the preview shows "level stays".
      peakPoints: before.peakPoints,
      connections: input.connections.filter((c) => c.provider !== provider),
    },
    catalog,
  );
  const axisDeltas = {} as Record<Axis, number>;
  for (const axis of AXES) axisDeltas[axis] = after.axes[axis].score - before.axes[axis].score;
  return { before, after, axisDeltas, levelStays: after.level === before.level };
}
