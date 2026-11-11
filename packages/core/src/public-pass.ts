import type { Axis, Catalog } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';
import { computeTitle } from '@pastra/scoring';

export type VisibilityLevel = 'everyone' | 'friends' | 'me';
export type Viewer = 'public' | 'friend' | 'self';

export interface PublicAxis {
  score: number;
  visible: boolean;
  topPct: number | null;
}

export interface PublicKeyNumber {
  axis: Axis;
  value: string;
  label: string;
}

export interface PublicPass {
  handle: string;
  displayName?: string;
  bio?: string;
  level?: number;
  title: string;
  axes: Record<Axis, PublicAxis>;
  keyNumbers: PublicKeyNumber[];
  stamps: Array<{ key: string; label: string; axis: Axis | 'all' }>;
}

function canSee(level: VisibilityLevel, viewer: Viewer): boolean {
  if (viewer === 'self') return true;
  if (level === 'everyone') return true;
  if (level === 'friends') return viewer === 'friend';
  return false;
}

/**
 * Serialise a pass for a public or friend viewer (docs/product-spec.md section 11, 14). Hidden axes
 * are drawn at zero and marked invisible; their key numbers and stamps are dropped. The output
 * carries no wallet addresses, emails, external ids, card data, friends or offers.
 *
 * Pass `catalog` for an untrusted viewer (public/friend): the title is then recomputed from only the
 * visible axes, so a private strongest axis cannot leak through the title (computeTitle names the
 * dominant axis). Omit it to keep the stored title verbatim (callers that discard the title).
 */
export function toPublicPass(params: {
  user: {
    handle: string;
    displayName?: string | null;
    bio?: string | null;
    showLevel: boolean;
    showStamps: boolean;
    showNumbers: boolean;
    showBio: boolean;
  };
  snapshot: {
    axes: Record<string, { score: number; topPct: number | null }>;
    level: number;
    title: string;
    keyNumbers: Array<{ axis: Axis; value: string; label: string }>;
  };
  visibility: Record<string, VisibilityLevel>;
  viewer: Viewer;
  stamps: Array<{ key: string; label: string; axis: Axis | 'all' }>;
  catalog?: Catalog;
}): PublicPass {
  const { user, snapshot, visibility, viewer, stamps, catalog } = params;

  const axes = {} as Record<Axis, PublicAxis>;
  const visibleAxes = new Set<Axis>();
  for (const axis of AXES) {
    const level = visibility[axis] ?? (axis === 'sports' ? 'me' : 'everyone');
    const visible = canSee(level, viewer);
    if (visible) visibleAxes.add(axis);
    const data = snapshot.axes[axis];
    axes[axis] = {
      score: visible ? (data?.score ?? 0) : 0,
      visible,
      topPct: visible ? (data?.topPct ?? null) : null,
    };
  }

  const keyNumbers = user.showNumbers
    ? snapshot.keyNumbers.filter((k) => visibleAxes.has(k.axis))
    : [];
  const visibleStamps = user.showStamps
    ? stamps.filter((s) => s.axis === 'all' || visibleAxes.has(s.axis))
    : [];

  // Recompute the title from visible axes only (hidden ones already zeroed in `axes`) so a private
  // strongest axis never surfaces through the title; without a catalog, keep the stored title.
  const title = catalog
    ? computeTitle(
        Object.fromEntries(AXES.map((axis) => [axis, axes[axis].score])) as Record<Axis, number>,
        catalog,
      )
    : snapshot.title;

  return {
    handle: user.handle,
    displayName: user.displayName ?? undefined,
    bio: user.showBio ? (user.bio ?? undefined) : undefined,
    level: user.showLevel ? snapshot.level : undefined,
    title,
    axes,
    keyNumbers,
    stamps: visibleStamps,
  };
}
