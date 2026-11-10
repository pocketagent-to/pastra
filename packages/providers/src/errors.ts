/**
 * Adapter errors come only from this closed list (docs/architecture.md section 7). The core decides
 * what to do from the code: `auth_expired` -> needs_reconnect (no retry); `rate_limited` /
 * `provider_down` -> retry with backoff; `private_data` -> the "private profile" screen.
 */
export type AdapterErrorCode =
  | 'auth_expired'
  | 'rate_limited'
  | 'private_data'
  | 'provider_down'
  | 'unexpected_response';

export class AdapterError extends Error {
  constructor(
    readonly code: AdapterErrorCode,
    message?: string,
    /** For `rate_limited`: when it is safe to retry. */
    readonly retryAfter?: Date,
  ) {
    super(message ?? code);
    this.name = 'AdapterError';
  }
}

export function isAdapterError(error: unknown): error is AdapterError {
  return error instanceof AdapterError;
}
