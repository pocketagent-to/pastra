import { createPublicKey, verify as verifyEd25519, type KeyObject } from 'node:crypto';
import { AdapterError, isAdapterError } from '../errors';
import type {
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
} from '../types';

/**
 * Solana wallet metrics from an indexer (Helius). Only counts and dates are read — never balances,
 * token holdings or transaction amounts (docs/product-spec.md section 14, docs/architecture.md
 * sections 7 and 14). `firstTxYear` surfaces as an extra, not a metric.
 */
export interface SolanaWalletData {
  ageYears: number;
  firstTxYear: number;
  txCount: number;
  activeMonthsLastYear: number;
  nftCount: number;
}

/** The counts-and-dates indexer the adapter depends on (e.g. Helius). Never returns balances. */
export interface SolanaIndexer {
  getWalletData(address: string): Promise<SolanaWalletData>;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Decode a base58 (Bitcoin alphabet) string, as used for Solana addresses and signatures. */
function base58Decode(input: string): Uint8Array {
  let acc = 0n;
  for (const ch of input) {
    const idx = BASE58_ALPHABET.indexOf(ch);
    if (idx < 0) throw new AdapterError('unexpected_response', 'Invalid base58 input');
    acc = acc * 58n + BigInt(idx);
  }
  const out: number[] = [];
  while (acc > 0n) {
    out.unshift(Number(acc & 0xffn));
    acc >>= 8n;
  }
  // Each leading '1' is a leading zero byte.
  for (const ch of input) {
    if (ch === '1') out.unshift(0);
    else break;
  }
  return Uint8Array.from(out);
}

/** A Solana address is the base58 of a 32-byte ed25519 public key, so it is the verifying key. */
function ed25519KeyFromRaw(raw: Uint8Array): KeyObject {
  return createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(raw).toString('base64url') },
    format: 'jwk',
  });
}

function tryDecode(fn: () => Uint8Array): Uint8Array | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

/** A 64-byte ed25519 signature, accepted as base58 (the Solana default) or base64. */
function decodeSignature(raw: string): Uint8Array {
  const b58 = tryDecode(() => base58Decode(raw));
  if (b58 && b58.length === 64) return b58;
  const b64 = tryDecode(() => new Uint8Array(Buffer.from(raw, 'base64')));
  if (b64 && b64.length === 64) return b64;
  throw new AdapterError('unexpected_response', 'Signature is not a 64-byte ed25519 signature');
}

/** The SIWS-style message a user signs to prove ownership of a Solana account. */
export function buildSolanaSignInMessage(domain: string, nonce: string): string {
  return [
    `${domain} wants you to sign in with your Solana account.`,
    '',
    'This request will not trigger a blockchain transaction or cost any fees.',
    `Nonce: ${nonce}`,
  ].join('\n');
}

/**
 * Solana wallet adapter. Verifies an ed25519 signature over the SIWS-style message for ownership
 * (the address is the ed25519 public key) and reads metrics from an injected indexer (e.g. Helius).
 * No OAuth tokens. `domain` is the configured app domain (an open business value, never invented).
 */
export function createSolanaWalletAdapter(opts: {
  domain: string;
  indexer: SolanaIndexer;
}): ProviderAdapter {
  return {
    id: 'wallet_solana',
    auth: 'wallet_signature',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      return { messageToSign: buildSolanaSignInMessage(opts.domain, ctx.nonce ?? ctx.state) };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const { address, signature, message } = ctx.params;
      if (!address || !signature || !message) {
        throw new AdapterError('unexpected_response', 'Missing wallet proof');
      }
      const publicKey = base58Decode(address);
      if (publicKey.length !== 32) {
        throw new AdapterError('unexpected_response', 'Invalid Solana address');
      }
      const key = ed25519KeyFromRaw(publicKey);
      const sig = decodeSignature(signature);
      let valid = false;
      try {
        valid = verifyEd25519(null, Buffer.from(message, 'utf8'), key, sig);
      } catch {
        valid = false;
      }
      if (!valid) {
        throw new AdapterError('unexpected_response', 'Signature does not match address');
      }
      // The external id (one account = one pass) is the canonical base58 address, case-preserved.
      return { externalId: address };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      let data: SolanaWalletData;
      try {
        data = await opts.indexer.getWalletData(ctx.externalId);
      } catch (error) {
        if (isAdapterError(error)) throw error;
        throw new AdapterError('provider_down', `Indexer failed: ${(error as Error).message}`);
      }
      return {
        metrics: {
          'wallet_solana.age_years': data.ageYears,
          'wallet_solana.tx_count': data.txCount,
          'wallet_solana.active_months_year': data.activeMonthsLastYear,
          'wallet_solana.nfts': data.nftCount,
        },
        extras: { firstTxYear: data.firstTxYear },
      };
    },
  };
}
