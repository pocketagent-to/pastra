import { describe, expect, it } from 'vitest';
import { AdapterError } from '@pastra/providers';
import { createProviderLimiter, withAdapterRetry } from '@pastra/core';

const noSleep = () => Promise.resolve();

describe('withAdapterRetry', () => {
  it('retries transient errors and eventually succeeds', async () => {
    let calls = 0;
    const result = await withAdapterRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new AdapterError('provider_down');
        return 'ok';
      },
      { sleep: noSleep, jitter: () => 0.5 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('does not retry terminal errors', async () => {
    let calls = 0;
    await expect(
      withAdapterRetry(
        async () => {
          calls += 1;
          throw new AdapterError('auth_expired');
        },
        { sleep: noSleep },
      ),
    ).rejects.toMatchObject({ code: 'auth_expired' });
    expect(calls).toBe(1);
  });

  it('gives up after the attempt budget and rethrows the last error', async () => {
    let calls = 0;
    await expect(
      withAdapterRetry(
        async () => {
          calls += 1;
          throw new AdapterError('rate_limited');
        },
        { attempts: 2, sleep: noSleep, jitter: () => 0.5 },
      ),
    ).rejects.toMatchObject({ code: 'rate_limited' });
    expect(calls).toBe(2);
  });

  it('caps a hostile Retry-After hint to maxMs', async () => {
    const slept: number[] = [];
    const now = () => 1_000_000;
    await expect(
      withAdapterRetry(
        async () => {
          throw new AdapterError('rate_limited', 'slow down', new Date(now() + 10 * 60_000));
        },
        { attempts: 2, maxMs: 8000, sleep: (ms) => (slept.push(ms), Promise.resolve()), now },
      ),
    ).rejects.toMatchObject({ code: 'rate_limited' });
    expect(slept).toHaveLength(1);
    expect(slept[0]).toBeLessThanOrEqual(8000);
  });
});

describe('createProviderLimiter', () => {
  it('never exceeds a provider concurrency cap', async () => {
    const limiter = createProviderLimiter(() => ({ perMinute: 0, concurrency: 2 }), {
      sleep: noSleep,
      now: () => 0,
    });
    let active = 0;
    let peak = 0;
    const task = () =>
      limiter.run('steam', async () => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        await Promise.resolve();
        active -= 1;
      });
    await Promise.all(Array.from({ length: 10 }, task));
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('hands slots to waiters without leaking or over-granting', async () => {
    const limiter = createProviderLimiter(() => ({ perMinute: 0, concurrency: 2 }), {
      sleep: noSleep,
      now: () => 0,
    });
    let active = 0;
    let peak = 0;
    const gates: Array<() => void> = [];
    const run = () =>
      limiter.run('p', async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => gates.push(resolve));
        active -= 1;
      });
    const flush = async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve();
    };

    const tasks = [run(), run(), run(), run(), run()]; // 2 enter, 3 queue
    await flush();
    expect(peak).toBe(2);
    // Resolve one in-flight task at a time; each release must hand its slot to exactly one waiter.
    while (gates.length) {
      gates.shift()!();
      await flush();
    }
    await Promise.all(tasks);
    expect(peak).toBeLessThanOrEqual(2);
    expect(active).toBe(0); // no leaked slots
  });

  it('paces starts according to perMinute', async () => {
    const slept: number[] = [];
    let clock = 0;
    const limiter = createProviderLimiter(() => ({ perMinute: 60, concurrency: 10 }), {
      // Advance the clock by the slept amount so pacing accumulates like real time.
      sleep: (ms) => {
        slept.push(ms);
        clock += ms;
        return Promise.resolve();
      },
      now: () => clock,
    });
    // perMinute 60 => 1000ms between starts. Three back-to-back calls wait 0, 1000, 1000.
    await limiter.run('x', async () => undefined);
    await limiter.run('x', async () => undefined);
    await limiter.run('x', async () => undefined);
    expect(slept.filter((ms) => ms > 0)).toEqual([1000, 1000]);
  });

  it('isolates pacing per provider', async () => {
    const slept: number[] = [];
    const limiter = createProviderLimiter(() => ({ perMinute: 60, concurrency: 10 }), {
      sleep: (ms) => (slept.push(ms), Promise.resolve()),
      now: () => 0,
    });
    // Different providers do not pace against each other on their first call.
    await limiter.run('a', async () => undefined);
    await limiter.run('b', async () => undefined);
    expect(slept.filter((ms) => ms > 0)).toHaveLength(0);
  });
});
