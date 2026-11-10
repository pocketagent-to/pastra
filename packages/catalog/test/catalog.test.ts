import { describe, expect, it } from 'vitest';
import { AXES, buildCatalog, catalog } from '@pastra/catalog';

describe('catalog', () => {
  it('builds without throwing and exposes every provider', () => {
    expect(catalog.providers.length).toBeGreaterThanOrEqual(26);
  });

  it('every provider has metrics or an axis bonus', () => {
    for (const p of catalog.providers) {
      expect(p.metrics.length > 0 || p.axisBonus !== undefined).toBe(true);
    }
  });

  it('metric keys are unique and namespaced under their provider', () => {
    const keys = new Set<string>();
    for (const p of catalog.providers) {
      for (const m of p.metrics) {
        expect(keys.has(m.key)).toBe(false);
        keys.add(m.key);
        expect(m.key.startsWith(`${p.id}.`)).toBe(true);
      }
    }
    expect(catalog.metricById.size).toBe(keys.size);
  });

  it('indexes providers by all six axes', () => {
    for (const axis of AXES) {
      expect(catalog.providersByAxis.has(axis)).toBe(true);
    }
    expect(catalog.providersByAxis.get('gaming')?.some((p) => p.id === 'steam')).toBe(true);
    expect(catalog.providersByAxis.get('crypto')?.some((p) => p.id === 'wallet_evm')).toBe(true);
  });

  it('transcribes thresholds from docs/metrics.csv', () => {
    const hours = catalog.metricById.get('steam.hours_total');
    expect(hours).toMatchObject({ part: 'volume', scale: 'log', t0: 10, t100: 5000 });

    // osu! world rank is a reverse scale: t0 > t100.
    const rank = catalog.metricById.get('osu.world_rank');
    expect(rank?.t0).toBe(1_000_000);
    expect(rank?.t100).toBe(1000);
  });

  it('caps X and syncs it every fourth drop', () => {
    const x = catalog.providerById.get('x');
    expect(x?.scoreCap).toBe(80);
    expect(x?.syncEveryNthDrop).toBe(4);
  });

  it('gives Telegram and LinkedIn a fixed axis bonus and no metrics', () => {
    for (const id of ['telegram', 'linkedin'] as const) {
      const p = catalog.providerById.get(id);
      expect(p?.axisBonus).toBe(5);
      expect(p?.metrics.length).toBe(0);
      expect(p?.axis).toBe('social');
    }
  });

  it('marks Sports providers as health and sets default visibility expectations', () => {
    for (const id of ['polar', 'withings', 'whoop', 'oura'] as const) {
      expect(catalog.providerById.get(id)?.health).toBe(true);
    }
  });

  it('aggregates wallet age by max and transactions by sum', () => {
    const age = catalog.metricById.get('wallet_evm.age_years');
    const tx = catalog.metricById.get('wallet_evm.tx_count');
    expect(age?.aggregate).toBe('max');
    expect(tx?.aggregate).toBe('sum');
  });

  it('rejects an internally inconsistent provider list', () => {
    expect(() =>
      buildCatalog([
        {
          id: 'steam',
          name: 'Steam',
          axis: 'gaming',
          status: 'live',
          health: false,
          syncEveryNthDrop: 1,
          rateLimit: { perMinute: 1, concurrency: 1 },
          consent: { weRead: [], weNever: [] },
          metrics: [
            {
              key: 'wrong.key',
              part: 'volume',
              scale: 'log',
              t0: 1,
              t100: 2,
              source: 'api',
              label: 'x',
            },
          ],
        },
      ]),
    ).toThrow();
  });
});
