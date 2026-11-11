import type { Axis, Catalog } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { currentWeek, getLivePass, getUserByHandle, getUserStamps, getVisibility } from './reads';
import { toPublicPass, type PublicPass, type Viewer, type VisibilityLevel } from './public-pass';

/**
 * The live public pass for a handle, with visibility applied (docs/product-spec.md section 11, 14).
 * Returns null when the handle does not exist or has no live pass yet. This is the only path the
 * public `/[handle]` page and the OG card should use — it never leaks private axes, numbers or
 * anything on the never-log/never-leak list (toPublicPass strips them).
 */
export async function getPublicPassByHandle(
  db: Database,
  catalog: Catalog,
  handle: string,
  viewer: Viewer = 'public',
): Promise<PublicPass | null> {
  const user = await getUserByHandle(db, handle);
  if (!user || !user.handle) return null;

  const week = currentWeek();
  const [snapshot, visRows, stampRows] = await Promise.all([
    getLivePass(db, user.id, week),
    getVisibility(db, user.id),
    getUserStamps(db, user.id),
  ]);
  if (!snapshot) return null;

  const visibility: Record<string, VisibilityLevel> = {};
  for (const row of visRows) visibility[row.axis] = row.level as VisibilityLevel;

  const stamps = stampRows
    .map((s) => {
      const spec = catalog.stamps.find((x) => x.key === s.stampKey);
      if (!spec) return null;
      const tierLabel =
        s.tier != null ? spec.tiers?.find((t) => t.tier === s.tier)?.label : undefined;
      return { key: spec.key, label: tierLabel ?? spec.label, axis: spec.axis };
    })
    .filter((x): x is { key: string; label: string; axis: Axis | 'all' } => x !== null);

  return toPublicPass({
    user: {
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      showLevel: user.showLevel,
      showStamps: user.showStamps,
      showNumbers: user.showNumbers,
      showBio: user.showBio,
    },
    snapshot: {
      axes: snapshot.axes as Record<string, { score: number; topPct: number | null }>,
      level: snapshot.level,
      title: snapshot.title,
      keyNumbers: (snapshot.keyNumbers ?? []) as Array<{
        axis: Axis;
        value: string;
        label: string;
      }>,
    },
    visibility,
    viewer,
    stamps,
    catalog,
  });
}
