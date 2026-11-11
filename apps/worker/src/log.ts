/**
 * Structured worker logging. One JSON line per event with a strict field whitelist — ids, codes,
 * counts and durations only, never tokens, emails, metric values, addresses or webhook bodies
 * (docs/architecture.md section 14). This is also the seam for an error reporter (e.g. Sentry):
 * `captureError` currently logs a safe, PII-free line and is where `Sentry.captureException` goes
 * once the SDK is installed (it needs network access to add, so it is not wired here).
 */
export type LogFields = Record<string, string | number | boolean | undefined>;

export function logEvent(event: string, fields: LogFields = {}): void {
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) clean[k] = v;
  console.log(JSON.stringify({ src: 'worker', event, ...clean }));
}

/** Report an error without leaking its message (driver/connection detail): name + code only. */
export function captureError(event: string, error: unknown, fields: LogFields = {}): void {
  const name = error instanceof Error ? error.name : 'Unknown';
  logEvent(event, { ...fields, error: name });
  // TODO(observability): Sentry.captureException(error) here once @sentry/node is installed.
}
