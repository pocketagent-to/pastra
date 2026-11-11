/**
 * Next.js instrumentation (docs/architecture.md section 14). `register` is the init seam (where
 * `Sentry.init(...)` goes once the SDK is installed — it needs network access to add, so it is not
 * wired here). `onRequestError` captures otherwise-silent route-handler/render errors as one safe
 * JSON line: error name + the route PATTERN and type only — never the concrete path, headers,
 * tokens, emails or metric values.
 */
export async function register(): Promise<void> {
  // Intentionally empty. Add observability SDK init here when the dependency is available.
}

interface ErrorRequest {
  method?: string;
}
interface ErrorContext {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
}

export function onRequestError(error: unknown, request: ErrorRequest, context: ErrorContext): void {
  const name = error instanceof Error ? error.name : 'Unknown';
  console.error(
    JSON.stringify({
      src: 'web',
      event: 'request_error',
      error: name,
      method: request?.method,
      routePath: context?.routePath, // the pattern (e.g. /pass/[axis]), not the concrete path
      routeType: context?.routeType,
    }),
  );
  // TODO(observability): Sentry.captureRequestError(error, request, context) once @sentry/nextjs is installed.
}
