/**
 * JSON response for per-user (authed) data. Sets `Cache-Control: private, no-store` so the response
 * can never land in a shared CDN/proxy cache and be served to another signed-in user — the correct
 * "vary" answer for per-user data is to not shared-cache it at all. Defense-in-depth alongside
 * `dynamic = 'force-dynamic'` on these routes.
 */
export function privateJson(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store');
  return Response.json(body, { ...init, headers });
}
