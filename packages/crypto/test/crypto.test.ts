import { describe, expect, it } from 'vitest';
import { Secret, TokenCipher, hmacSha256, parseKeys, randomToken, sha256 } from '@pastra/crypto';

describe('TokenCipher (docs/architecture.md section 7)', () => {
  const cipher = TokenCipher.fromEnv('v1:dev-key-one,v2:dev-key-two');

  it('round-trips a value', () => {
    const token = cipher.encrypt('ya29.secret-access-token');
    expect(token.startsWith('v1:')).toBe(true);
    expect(cipher.decrypt(token)).toBe('ya29.secret-access-token');
  });

  it('uses a fresh nonce each time', () => {
    expect(cipher.encrypt('x')).not.toBe(cipher.encrypt('x'));
  });

  it('decrypts ciphertext from an older key version', () => {
    const older = TokenCipher.fromEnv('v2:dev-key-two');
    const token = older.encrypt('hello');
    // The multi-key cipher still holds v2 and can decrypt it.
    expect(cipher.decrypt(token)).toBe('hello');
  });

  it('rejects tampered ciphertext', () => {
    const token = cipher.encrypt('payload');
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('accepts a real 32-byte base64 key', () => {
    const b64 = Buffer.alloc(32, 7).toString('base64');
    const c = TokenCipher.fromEnv(`k1:${b64}`);
    expect(c.decrypt(c.encrypt('v'))).toBe('v');
  });

  it('parses multiple key entries', () => {
    expect(parseKeys('a:1,b:2')).toHaveLength(2);
    expect(() => parseKeys('')).toThrow();
    expect(() => parseKeys('nocolon')).toThrow();
  });
});

describe('hashing', () => {
  it('sha256 is deterministic hex', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hmac depends on the key', () => {
    expect(hmacSha256('k1', 'server')).not.toBe(hmacSha256('k2', 'server'));
  });

  it('randomToken is 256 bits by default', () => {
    expect(randomToken()).toMatch(/^[0-9a-f]{64}$/);
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe('Secret', () => {
  it('redacts in JSON and string coercion but reveals on demand', () => {
    const s = new Secret('top-secret');
    expect(JSON.stringify({ token: s })).toBe('{"token":"[redacted]"}');
    expect(`${s}`).toBe('[redacted]');
    expect(s.reveal()).toBe('top-secret');
  });
});
