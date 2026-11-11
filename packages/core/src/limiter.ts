/**
 * Per-provider rate limiter (docs/architecture.md section 7). The catalog declares each provider's
 * `rateLimit { perMinute, concurrency }`; when the drop fans out thousands of syncs this caps, per
 * provider, both the number in flight (concurrency) and the start rate (perMinute), so a parallel
 * sync never breaches a single provider's quota. One in-process limiter per worker — no dependency.
 */
export interface RateLimit {
  perMinute: number;
  concurrency: number;
}

export interface ProviderLimiter {
  /** Acquire this provider's slot (respecting concurrency + pace), run `fn`, then release. */
  run<T>(providerId: string, fn: () => Promise<T>): Promise<T>;
}

interface ProviderState {
  active: number;
  waiters: Array<() => void>;
  /** Earliest time the next call for this provider may start (ms epoch). */
  nextStart: number;
}

export interface LimiterOptions {
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Build a limiter that reads each provider's limits from `limitFor`. */
export function createProviderLimiter(
  limitFor: (providerId: string) => RateLimit,
  options: LimiterOptions = {},
): ProviderLimiter {
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const states = new Map<string, ProviderState>();

  function stateFor(id: string): ProviderState {
    let state = states.get(id);
    if (!state) {
      state = { active: 0, waiters: [], nextStart: 0 };
      states.set(id, state);
    }
    return state;
  }

  async function acquire(state: ProviderState, concurrency: number): Promise<void> {
    if (state.active < concurrency) {
      state.active += 1;
      return;
    }
    // Queue for a slot. `release` hands its slot over directly (without decrementing active), so the
    // woken waiter already holds the slot and must NOT increment again — otherwise a fresh fast-path
    // acquire could slip into the gap between the decrement and the waiter's resume, over-granting.
    await new Promise<void>((resolve) => state.waiters.push(resolve));
  }

  function release(state: ProviderState): void {
    const next = state.waiters.shift();
    if (next) {
      next(); // transfer the held slot to the next waiter; active is unchanged
    } else {
      state.active -= 1; // no waiter: free the slot
    }
  }

  return {
    async run<T>(providerId: string, fn: () => Promise<T>): Promise<T> {
      const { perMinute, concurrency } = limitFor(providerId);
      const state = stateFor(providerId);
      await acquire(state, Math.max(1, concurrency));
      try {
        // Pace starts: reserve the next start slot even while waiting on a concurrency slot.
        const interval = perMinute > 0 ? 60_000 / perMinute : 0;
        const t = now();
        const start = Math.max(t, state.nextStart);
        state.nextStart = start + interval;
        const wait = start - t;
        if (wait > 0) await sleep(wait);
        return await fn();
      } finally {
        release(state);
      }
    },
  };
}
