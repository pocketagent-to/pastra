import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** SHA-256 of a string or buffer, hex-encoded. Used to hash session tokens before storage. */
export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/** HMAC-SHA-256 with a key, hex-encoded. Used to hash Discord server ids for "In common". */
export function hmacSha256(key: string | Buffer, input: string | Buffer): string {
  return createHmac('sha256', key).update(input).digest('hex');
}

/** A cryptographically random token, hex-encoded (default 32 bytes = 256 bits). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Constant-time comparison of two hex strings of equal length. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
