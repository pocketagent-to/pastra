import { createHash, randomBytes } from 'node:crypto';
import { AdapterError } from './errors';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | URLSearchParams;
  /** Which AdapterError a 403 maps to. Default 'auth_expired'; set 'private_data' for e.g. Steam. */
  forbiddenAs?: 'auth_expired' | 'private_data';
  timeoutMs?: number;
}

/** A base64url string with no padding (for PKCE and state). */
function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A cryptographically-random URL-safe token. */
export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

/** A PKCE (RFC 7636, S256) verifier/challenge pair. */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken(32);
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function retryDate(header: string | null): Date | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return new Date(Date.now() + secs * 1000);
  const date = new Date(header);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Map a non-OK response to the closed AdapterError set (docs/architecture.md section 7). */
function statusError(res: Response, forbiddenAs: HttpOptions['forbiddenAs']): AdapterError {
  if (res.status === 401) return new AdapterError('auth_expired', 'Unauthorized');
  if (res.status === 403) return new AdapterError(forbiddenAs ?? 'auth_expired', 'Forbidden');
  if (res.status === 429)
    return new AdapterError(
      'rate_limited',
      'Rate limited',
      retryDate(res.headers.get('retry-after')),
    );
  if (res.status >= 500) return new AdapterError('provider_down', `Upstream ${res.status}`);
  return new AdapterError('unexpected_response', `HTTP ${res.status}`);
}

async function send(url: string, opts: HttpOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      headers: opts.headers,
      body: opts.body,
      signal: controller.signal,
    });
  } catch (error) {
    throw new AdapterError('provider_down', `Network error: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** A JSON request that throws AdapterError on any transport or status failure. */
export async function httpJson<T = unknown>(url: string, opts: HttpOptions = {}): Promise<T> {
  const res = await send(url, opts);
  if (!res.ok) throw statusError(res, opts.forbiddenAs);
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AdapterError('unexpected_response', 'Response was not valid JSON');
  }
}

/** A form-encoded POST (OAuth token endpoints) returning parsed JSON. */
export async function httpForm<T = unknown>(
  url: string,
  form: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<T> {
  return httpJson<T>(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
      ...headers,
    },
    body: new URLSearchParams(form),
  });
}

/** A GET with a Bearer token. */
export function bearer(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return { authorization: `Bearer ${token}`, accept: 'application/json', ...extra };
}
