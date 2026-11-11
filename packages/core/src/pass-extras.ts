import { and, desc, eq, isNull, lte } from 'drizzle-orm';
import {
  AXES,
  catalog as defaultCatalog,
  type Axis,
  type Catalog,
  type StampSpec,
} from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { recaps, stamps } from '@pastra/db';
import { currentWeek } from './reads';

/**
 * Views for the Stamps (B5) and Weekly recap (B6) screens (docs/product-spec.md sections 7, 12).
 * Both reshape rows the drop already wrote — `stamps` and `recaps` — into the exact props the
 * rendered mockups (`design/Stamps.html`, `design/Recap.html`) map over.
 */

/** One stamp tile, as the Stamps card grid and the recap "New stamp" card render it. */
export interface StampCard {
  /** Display axis label, e.g. "Crypto" or "All sides" (the screen uppercases it). */
  axis: string;
  /** Stamp name, e.g. "2,000+ hours" or "Collector". */
  name: string;
  /** Sub-line: "Week 46" / "Week 46 · new" for collected stamps; absent when there is none. */
  meta?: string;
}

export interface StampsView {
  /** Stamps the user holds, newest-week stamps flagged "· new". */
  collected: StampCard[];
  /** Achievement stamps still to earn (service stamps are earned on the Services screen). */
  nextToEarn: StampCard[];
}

/** One row of the recap's per-axis change list. */
export interface RecapAxisDelta {
  /** Display axis label, e.g. "Lifestyle" (the screen uppercases it). */
  axis: string;
  delta: number;
}

export interface RecapView {
  /** ISO week of the recap, e.g. "2026-W46". */
  week: string;
  /** Badge label, e.g. "Week 46". */
  weekLabel: string;
  levelFrom: number;
  levelTo: number;
  /** The level only grows; the "Level up" chip and the arrow show only when it did. */
  leveledUp: boolean;
  /** All six axes, biggest gain first (the recap payload keeps only the top moves). */
  axisDeltas: RecapAxisDelta[];
  /** Stamps earned in the recap's week, resolved to axis + name. */
  newStamps: StampCard[];
}

/** "Crypto", "Gaming", … ; the catch-all axis renders as "All sides" (design/Stamps.html). */
function axisLabel(axis: Axis | 'all'): string {
  if (axis === 'all') return 'All sides';
  return axis.charAt(0).toUpperCase() + axis.slice(1);
}

/** "2026-W46" -> "Week 46"; empty string when the week is missing or malformed. */
function weekLabel(week: string | null | undefined): string {
  if (!week) return '';
  const match = /-W0*(\d+)$/.exec(week);
  return match ? `Week ${Number(match[1])}` : '';
}

/**
 * The display name of a held stamp. A tiered stamp shows the reached tier's label ("2,000+ hours");
 * everything else shows the spec label. Templated labels (e.g. "In crypto since {year}") stay as
 * written, because the resolved value is not persisted on the stamp row — matching the Pass screen.
 */
function stampName(spec: StampSpec, tier: number | null): string {
  if (spec.tiers && tier != null) {
    return spec.tiers.find((t) => t.tier === tier)?.label ?? spec.label;
  }
  return spec.label;
}

/**
 * The Stamps screen for a user (docs/product-spec.md section 12). `collected` is every non-revoked
 * stamp the user holds, mapped through the catalog; the stamp from the current week is flagged
 * "· new". `nextToEarn` is the achievement stamps not held yet — a not-yet-reached tiered stamp
 * shows its first tier as the next target.
 */
export async function getStampsView(
  db: Database,
  catalog: Catalog,
  userId: string,
): Promise<StampsView> {
  const rows = await db
    .select()
    .from(stamps)
    .where(and(eq(stamps.userId, userId), isNull(stamps.revokedAt)));

  const specByKey = new Map(catalog.stamps.map((s) => [s.key, s]));
  const week = currentWeek();

  const collected: StampCard[] = [];
  const heldKeys = new Set<string>();
  for (const row of rows) {
    heldKeys.add(row.stampKey);
    const spec = specByKey.get(row.stampKey);
    if (!spec) continue; // a stamp whose spec was retired — skip rather than render a bare key
    const label = weekLabel(row.awardedWeek);
    const isNew = row.awardedWeek != null && row.awardedWeek === week;
    collected.push({
      axis: axisLabel(spec.axis),
      name: stampName(spec, row.tier),
      meta: label ? (isNew ? `${label} · new` : label) : undefined,
    });
  }

  const nextToEarn: StampCard[] = [];
  for (const spec of catalog.stamps) {
    if (spec.kind !== 'achievement') continue;
    if (heldKeys.has(spec.key)) continue;
    nextToEarn.push({
      axis: axisLabel(spec.axis),
      name: spec.tiers?.[0]?.label ?? spec.label,
    });
  }

  return { collected, nextToEarn };
}

/** Pull the typed fields the recap payload (`buildRecapPayload`) writes as loose jsonb. */
function readRecapPayload(payload: Record<string, unknown>): {
  levelFrom: number;
  levelTo: number;
  deltaByAxis: Map<string, number>;
} {
  const levelTo = typeof payload.levelTo === 'number' ? payload.levelTo : 0;
  const levelFrom = typeof payload.levelFrom === 'number' ? payload.levelFrom : levelTo;
  const deltaByAxis = new Map<string, number>();
  if (Array.isArray(payload.axisDeltas)) {
    for (const entry of payload.axisDeltas) {
      if (entry && typeof entry === 'object') {
        const axis = (entry as { axis?: unknown }).axis;
        const delta = (entry as { delta?: unknown }).delta;
        if (typeof axis === 'string' && typeof delta === 'number') deltaByAxis.set(axis, delta);
      }
    }
  }
  return { levelFrom, levelTo, deltaByAxis };
}

/**
 * The Weekly recap for a user (docs/product-spec.md section 7). Reshapes the latest recap the drop
 * wrote up to `week` — the level change and the per-axis deltas from the payload, the stamps earned
 * that week resolved to axis + name from the stamps table. Returns null when the user has no recap
 * yet, so the page shows its empty state.
 */
export async function getRecapView(
  db: Database,
  userId: string,
  week: string,
): Promise<RecapView | null> {
  const [row] = await db
    .select()
    .from(recaps)
    .where(and(eq(recaps.userId, userId), lte(recaps.week, week)))
    .orderBy(desc(recaps.week), desc(recaps.createdAt))
    .limit(1);
  if (!row) return null;

  const { levelFrom, levelTo, deltaByAxis } = readRecapPayload(row.payload);

  const axisDeltas: RecapAxisDelta[] = AXES.map((axis, index) => ({
    axis,
    delta: deltaByAxis.get(axis) ?? 0,
    index,
  }))
    .sort((a, b) => b.delta - a.delta || a.index - b.index)
    .map(({ axis, delta }) => ({ axis: axisLabel(axis), delta }));

  const stampRows = await db
    .select()
    .from(stamps)
    .where(
      and(eq(stamps.userId, userId), eq(stamps.awardedWeek, row.week), isNull(stamps.revokedAt)),
    );
  const specByKey = new Map(defaultCatalog.stamps.map((s) => [s.key, s]));
  const newStamps: StampCard[] = [];
  for (const sr of stampRows) {
    const spec = specByKey.get(sr.stampKey);
    if (!spec) continue;
    newStamps.push({ axis: axisLabel(spec.axis), name: stampName(spec, sr.tier) });
  }

  return {
    week: row.week,
    weekLabel: weekLabel(row.week),
    levelFrom,
    levelTo,
    leveledUp: levelTo > levelFrom,
    axisDeltas,
    newStamps,
  };
}
