import { describe, expect, it } from 'vitest';
import type { ProviderSpec } from '@pastra/catalog';
import { aggregateMetrics, combineParts, displayParts, scoreParts } from '@pastra/scoring';

describe('service scoring (docs/product-spec.md section 6.2)', () => {
  it('combines parts with renormalised weights when Depth is absent (TON)', () => {
    // 0.40/0.75 * 50 + 0.35/0.75 * 80 = 64.0
    expect(combineParts({ volume: 50, activity: 80, depth: null })).toBe(64);
  });

  it('weights full parts 0.40 / 0.35 / 0.25', () => {
    expect(combineParts({ volume: 100, activity: 100, depth: 100 })).toBe(100);
    expect(combineParts({ volume: 80, activity: 40, depth: 20 })).toBe(
      Math.round((0.4 * 80 + 0.35 * 40 + 0.25 * 20) * 10) / 10,
    );
  });

  it('scores a service with no present parts as 0', () => {
    expect(combineParts({ volume: null, activity: null, depth: null })).toBe(0);
  });

  it("caps X's service score at 80", () => {
    expect(combineParts({ volume: 95, activity: 95, depth: 95 }, 80)).toBe(80);
  });

  it('decays the Activity part by 0.8 per stale week', () => {
    const provider: ProviderSpec = {
      id: 'twitch',
      name: 'Twitch',
      axis: 'gaming',
      status: 'live',
      health: false,
      syncEveryNthDrop: 1,
      rateLimit: { perMinute: 1, concurrency: 1 },
      consent: { weRead: [], weNever: [] },
      metrics: [
        {
          key: 'twitch.a',
          part: 'activity',
          scale: 'linear',
          t0: 0,
          t100: 100,
          source: 'api',
          label: 'a',
        },
      ],
    };
    const parts = scoreParts({ 'twitch.a': 60 }, provider, 2);
    expect(displayParts(parts).activity).toBe(38.4); // 60 * 0.8^2
  });

  it('aggregates wallet metrics across connections: sum counts, max ages', () => {
    const wallet: ProviderSpec = {
      id: 'wallet_evm',
      name: 'EVM wallet',
      axis: 'crypto',
      status: 'live',
      health: false,
      syncEveryNthDrop: 1,
      rateLimit: { perMinute: 1, concurrency: 1 },
      consent: { weRead: [], weNever: [] },
      metrics: [
        {
          key: 'wallet_evm.tx_count',
          part: 'volume',
          scale: 'log',
          t0: 5,
          t100: 5000,
          source: 'api',
          aggregate: 'sum',
          label: 'tx',
        },
        {
          key: 'wallet_evm.age_years',
          part: 'volume',
          scale: 'log',
          t0: 0.25,
          t100: 8,
          source: 'api',
          aggregate: 'max',
          label: 'age',
        },
      ],
    };
    const agg = aggregateMetrics(
      [
        { metrics: { 'wallet_evm.tx_count': 100, 'wallet_evm.age_years': 2 } },
        { metrics: { 'wallet_evm.tx_count': 250, 'wallet_evm.age_years': 5 } },
      ],
      wallet,
    );
    expect(agg['wallet_evm.tx_count']).toBe(350);
    expect(agg['wallet_evm.age_years']).toBe(5);
  });
});
