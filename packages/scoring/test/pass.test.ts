import { describe, expect, it } from 'vitest';
import type { Axis, ProviderId, ProviderSpec } from '@pastra/catalog';
import { buildCatalog } from '@pastra/catalog';
import { computePass, whatIfDisconnect } from '@pastra/scoring';
import type { ScoringConnection, ScoringInput } from '@pastra/scoring';

/**
 * A provider with a single linear volume metric scaled 0–100, so its service score equals the
 * metric value. This lets a test set an axis to an exact number: one such service of value `v`
 * gives an axis of `v` (docs/product-spec.md section 6.3).
 */
function axisProvider(id: ProviderId, axis: Axis): ProviderSpec {
  return {
    id,
    name: id,
    axis,
    status: 'live',
    health: axis === 'sports',
    syncEveryNthDrop: 1,
    rateLimit: { perMinute: 60, concurrency: 1 },
    consent: { weRead: [], weNever: [] },
    metrics: [
      {
        key: `${id}.v`,
        part: 'volume',
        scale: 'linear',
        t0: 0,
        t100: 100,
        source: 'api',
        label: 'v',
      },
    ],
  };
}

function conn(id: ProviderId, value: number): ScoringConnection {
  return {
    provider: id,
    status: 'connected',
    staleWeeks: 0,
    metrics: { [`${id}.v`]: value },
    extras: {},
  };
}

const base: Omit<ScoringInput, 'connections'> = {
  week: '2026-W46',
  rewardedFriends: 0,
  hasEns: false,
  existingStamps: [],
};

describe('computePass (docs/product-spec.md section 6, docs/architecture.md section 8)', () => {
  it('scores the pass example: 391 points, level 27, rare, "Gamer & crypto veteran"', () => {
    // Gaming = Steam 90 + Twitch 40 -> 94; plus five single-service axes.
    const catalog = buildCatalog([
      axisProvider('steam', 'gaming'),
      axisProvider('twitch', 'gaming'),
      axisProvider('wallet_evm', 'crypto'),
      axisProvider('discord', 'social'),
      axisProvider('tidal', 'music'),
      axisProvider('polar', 'sports'),
      axisProvider('foursquare', 'lifestyle'),
    ]);
    const input: ScoringInput = {
      ...base,
      connections: [
        conn('steam', 90),
        conn('twitch', 40),
        conn('wallet_evm', 88),
        conn('discord', 61),
        conn('tidal', 52),
        conn('polar', 34),
        conn('foursquare', 27),
      ],
    };

    const r = computePass(input, catalog);
    expect(r.axes.gaming.score).toBe(94);
    expect(r.axes.crypto.score).toBe(88);
    expect(r.axes.sports.score).toBe(34);
    expect(r.points).toBe(391); // 356 axes + 5*7 services
    expect(r.peakPoints).toBe(391);
    expect(r.level).toBe(27);
    expect(r.rarity).toBe('rare');
    expect(r.title).toBe('Gamer & crypto veteran');
    expect(r.axes.gaming.topPct).toBe(6); // Top 6% in Gaming
  });

  it('keeps the level at its peak when a service is removed (Steam disconnected)', () => {
    const catalog = buildCatalog([
      axisProvider('steam', 'gaming'),
      axisProvider('twitch', 'gaming'),
      axisProvider('wallet_evm', 'crypto'),
      axisProvider('discord', 'social'),
      axisProvider('tidal', 'music'),
      axisProvider('polar', 'sports'),
      axisProvider('foursquare', 'lifestyle'),
    ]);
    const connections = [
      conn('steam', 90),
      conn('twitch', 40),
      conn('wallet_evm', 88),
      conn('discord', 61),
      conn('tidal', 52),
      conn('polar', 34),
      conn('foursquare', 27),
    ];

    const r = computePass(
      { ...base, peakPoints: 391, connections: connections.filter((c) => c.provider !== 'steam') },
      catalog,
    );
    expect(r.axes.gaming.score).toBe(40); // only Twitch remains
    expect(r.points).toBe(332); // 302 axes + 5*6 services
    expect(r.peakPoints).toBe(391);
    expect(r.level).toBe(27);
  });

  it('awards level 7 and the title "Gamer" for one strong axis and one service', () => {
    const catalog = buildCatalog([axisProvider('steam', 'gaming')]);
    const r = computePass({ ...base, connections: [conn('steam', 94)] }, catalog);
    expect(r.axes.gaming.score).toBe(94);
    expect(r.points).toBe(99); // 94 + 5
    expect(r.level).toBe(7);
    expect(r.title).toBe('Gamer');
    expect(r.axes.gaming.topPct).toBe(6);
  });

  it('adds the runner-up word when the second axis is 60+', () => {
    const catalog = buildCatalog([
      axisProvider('steam', 'gaming'),
      axisProvider('wallet_evm', 'crypto'),
    ]);
    const r = computePass(
      { ...base, connections: [conn('steam', 94), conn('wallet_evm', 88)] },
      catalog,
    );
    expect(r.title).toBe('Gamer & crypto veteran');
  });

  it('calls a weak pass "Newcomer"', () => {
    const catalog = buildCatalog([axisProvider('steam', 'gaming')]);
    const r = computePass({ ...base, connections: [conn('steam', 15)] }, catalog);
    expect(r.title).toBe('Newcomer');
  });

  it('adds ENS as +5 to Crypto, clamped at 100', () => {
    const catalog = buildCatalog([axisProvider('wallet_evm', 'crypto')]);
    const withEns = computePass(
      { ...base, hasEns: true, connections: [conn('wallet_evm', 50)] },
      catalog,
    );
    expect(withEns.axes.crypto.score).toBe(55);
    const capped = computePass(
      { ...base, hasEns: true, connections: [conn('wallet_evm', 98)] },
      catalog,
    );
    expect(capped.axes.crypto.score).toBe(100);
  });

  it('counts rewarded friends, capped at 10', () => {
    const catalog = buildCatalog([axisProvider('steam', 'gaming')]);
    const r = computePass(
      { ...base, rewardedFriends: 25, connections: [conn('steam', 50)] },
      catalog,
    );
    // 50 axis + 5 (service) + 5*10 (friends cap) = 105
    expect(r.points).toBe(105);
  });

  it('previews a disconnect without dropping the level', () => {
    const catalog = buildCatalog([
      axisProvider('steam', 'gaming'),
      axisProvider('wallet_evm', 'crypto'),
    ]);
    const input: ScoringInput = {
      ...base,
      peakPoints: 0,
      connections: [conn('steam', 90), conn('wallet_evm', 60)],
    };
    const preview = whatIfDisconnect(input, 'wallet_evm', catalog);
    expect(preview.axisDeltas.crypto).toBe(-60);
    expect(preview.levelStays).toBe(true);
  });
});
