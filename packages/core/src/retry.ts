import { isAdapterError } from '@pastra/providers';

/**
 * Bounded retry for transient adapter failures (docs/architecture.md section 7). Only
 * `rate_limited` and `provider_down` are retried; `auth_expired`, `private_data` and
 * `unexpected_response` are terminal and rethrow immediately. Backoff is exponential with full
 * jitter, honouring an `AdapterError.retryAfter` hint but capped to `maxMs` so a hostile
 * `Retry-After` can never stall the caller (the connect path and the worker share this).
 */
export interface RetryOptions {
  /** Total attempts, including the first. Default 3. */
  attempts?: number;
  /** Base backoff in ms (attempt n waits ~base * 2^(n-1), jittered). Default 500. */
  baseMs?: number;
  /** Hard cap on any single delay in ms. Default 8000. */
  maxMs?: number;
  /** Injectable sleep (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable jitter in [0, 1) (tests pass a constant). */
  jitter?: () => number;
  /** Injectable clock for the retryAfter calculation. */
  now?: () => number;
}

const RETRYABLE = new Set(['rate_limited', 'provider_down']);

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Run `fn`, retrying only transient adapter errors with capped, jittered exponential backoff. */
export async function withAdapterRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 500;
  const maxMs = opts.maxMs ?? 8000;
  const sleep = opts.sleep ?? defaultSleep;
  const jitter = opts.jitter ?? Math.random;
  const now = opts.now ?? Date.now;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isAdapterError(error) && RETRYABLE.has(error.code);
      if (!retryable || attempt === attempts) throw error;

      const backoff = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
      let delay = backoff * jitter(); // full jitter
      if (isAdapterError(error) && error.retryAfter) {
        const hint = error.retryAfter.getTime() - now();
        if (Number.isFinite(hint) && hint > 0) delay = Math.min(Math.max(hint, delay), maxMs);
      }
      await sleep(Math.max(0, Math.round(delay)));
    }
  }
  // Unreachable (the loop either returns or throws), but satisfies the type checker.
  throw lastError;
}
