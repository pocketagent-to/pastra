import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Token encryption at rest (docs/architecture.md section 7).
 *
 * AES-256-GCM with a fresh 96-bit nonce per value and a key version baked into the ciphertext, so
 * keys can rotate without downtime. Keys come from `TOKEN_ENC_KEYS` as a comma-separated list of
 * `version:key` pairs; the newest (first) key encrypts, any listed key can decrypt.
 *
 * A key is a 32-byte value given as base64 or hex. For developer convenience, any other string is
 * accepted and stretched to 32 bytes with SHA-256 — production must supply real 32-byte keys.
 *
 * Ciphertext format: `v1:<base64 nonce>:<base64 ciphertext+tag>`.
 */
export interface KeyEntry {
  version: string;
  key: Buffer;
}

function materialiseKey(raw: string): Buffer {
  for (const encoding of ['base64', 'hex'] as const) {
    try {
      const buf = Buffer.from(raw, encoding);
      if (buf.length === 32) return buf;
    } catch {
      // try the next encoding
    }
  }
  return createHash('sha256').update(raw).digest();
}

export function parseKeys(spec: string): KeyEntry[] {
  const entries = spec
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx === -1) throw new Error('TOKEN_ENC_KEYS entry must be "version:key"');
      return { version: part.slice(0, idx), key: materialiseKey(part.slice(idx + 1)) };
    });
  if (entries.length === 0) throw new Error('TOKEN_ENC_KEYS is empty');
  return entries;
}

export class TokenCipher {
  readonly #byVersion: Map<string, Buffer>;
  readonly #current: KeyEntry;

  constructor(keys: KeyEntry[]) {
    if (keys.length === 0) throw new Error('TokenCipher needs at least one key');
    this.#byVersion = new Map(keys.map((k) => [k.version, k.key]));
    this.#current = keys[0]!;
  }

  static fromEnv(spec: string): TokenCipher {
    return new TokenCipher(parseKeys(spec));
  }

  encrypt(plaintext: string): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#current.key, nonce);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([enc, tag]);
    return `${this.#current.version}:${nonce.toString('base64')}:${payload.toString('base64')}`;
  }

  decrypt(token: string): string {
    const [version, nonceB64, payloadB64] = token.split(':');
    if (!version || !nonceB64 || !payloadB64) throw new Error('Malformed ciphertext');
    const key = this.#byVersion.get(version);
    if (!key) throw new Error(`Unknown key version: ${version}`);
    const nonce = Buffer.from(nonceB64, 'base64');
    const payload = Buffer.from(payloadB64, 'base64');
    const tag = payload.subarray(payload.length - 16);
    const enc = payload.subarray(0, payload.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
}
