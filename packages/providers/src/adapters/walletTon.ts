import { createHash, createPublicKey, verify as verifyEd25519, type KeyObject } from 'node:crypto';
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
 * TON wallet metrics from an indexer (TonAPI). Only counts and dates are read — never balances,
 * jettons or transaction amounts (docs/product-spec.md section 14, docs/architecture.md sections 7
 * and 14). The catalog gives TON no depth part. `firstTxYear` surfaces as an extra, not a metric.
 */
export interface TonWalletData {
  ageYears: number;
  firstTxYear: number;
  txCount: number;
  activeMonthsLastYear: number;
}

/** The counts-and-dates indexer the adapter depends on (e.g. TonAPI). Never returns balances. */
export interface TonIndexer {
  getWalletData(address: string): Promise<TonWalletData>;
}

interface TonAddress {
  workchain: number;
  hashHex: string;
  hash: Uint8Array;
}

/** Parse a raw TON address `workchain:hash` (e.g. `0:<64 hex>`). */
function parseTonAddress(raw: string): TonAddress {
  const parts = raw.split(':');
  const wcStr = parts[0];
  const hashHex = parts[1];
  if (parts.length !== 2 || wcStr === undefined || hashHex === undefined) {
    throw new AdapterError('unexpected_response', 'Expected a raw TON address "workchain:hash"');
  }
  const workchain = Number.parseInt(wcStr, 10);
  if (!Number.isInteger(workchain) || String(workchain) !== wcStr) {
    throw new AdapterError('unexpected_response', 'Invalid TON workchain');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hashHex)) {
    throw new AdapterError('unexpected_response', 'Invalid TON address hash');
  }
  return { workchain, hashHex: hashHex.toLowerCase(), hash: hexToBytes(hashHex) };
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new AdapterError('unexpected_response', 'Invalid hex string');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function ed25519KeyFromRaw(raw: Uint8Array): KeyObject {
  return createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(raw).toString('base64url') },
    format: 'jwk',
  });
}

/**
 * The digest a TON Connect wallet signs for `ton_proof` (TON Connect v2):
 *   message   = "ton-proof-item-v2/" ‖ int32be(workchain) ‖ addressHash(32)
 *             ‖ uint32le(domainLen) ‖ domain ‖ uint64le(timestamp) ‖ payload
 *   signed    = sha256( 0xffff ‖ "ton-connect" ‖ sha256(message) )
 * The wallet signs `signed` with ed25519; we verify against its public key.
 */
function tonProofDigest(args: {
  workchain: number;
  addressHash: Uint8Array;
  domain: string;
  timestamp: number;
  payload: string;
}): Buffer {
  const wc = Buffer.alloc(4);
  wc.writeInt32BE(args.workchain, 0);
  const domainBuf = Buffer.from(args.domain, 'utf8');
  const domainLen = Buffer.alloc(4);
  domainLen.writeUInt32LE(domainBuf.length, 0);
  const ts = Buffer.alloc(8);
  ts.writeBigUInt64LE(BigInt(args.timestamp), 0);
  const message = Buffer.concat([
    Buffer.from('ton-proof-item-v2/', 'utf8'),
    wc,
    Buffer.from(args.addressHash),
    domainLen,
    domainBuf,
    ts,
    Buffer.from(args.payload, 'utf8'),
  ]);
  const messageHash = createHash('sha256').update(message).digest();
  const full = Buffer.concat([
    Buffer.from([0xff, 0xff]),
    Buffer.from('ton-connect', 'utf8'),
    messageHash,
  ]);
  return createHash('sha256').update(full).digest();
}

/**
 * TON wallet adapter. Verifies a TON Connect `ton_proof` ed25519 signature for ownership and reads
 * metrics from an injected indexer (e.g. TonAPI). No OAuth tokens. `domain` is the configured app
 * domain the proof is bound to (an open business value, never invented); we verify against our own
 * domain so a proof signed for another origin is rejected.
 *
 * Security note: ton_proof binds the signature to the claimed address *hash* and to the supplied
 * public key, but proving that the public key actually controls that address needs the wallet's
 * stateInit (BoC) or a `GET /v2/accounts/{address}/publickey` lookup. See openQuestions.
 */
export function createTonWalletAdapter(opts: {
  domain: string;
  indexer: TonIndexer;
}): ProviderAdapter {
  return {
    id: 'wallet_ton',
    auth: 'wallet_signature',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      // TON Connect signs a structured ton_proof whose payload is our one-time nonce.
      return { messageToSign: ctx.nonce ?? ctx.state };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const { address, publicKey, signature, timestamp, payload } = ctx.params;
      if (!address || !publicKey || !signature || !timestamp || !payload) {
        throw new AdapterError('unexpected_response', 'Missing ton_proof fields');
      }
      const parsed = parseTonAddress(address);
      const pubkey = hexToBytes(publicKey);
      if (pubkey.length !== 32) {
        throw new AdapterError('unexpected_response', 'Invalid TON public key');
      }
      const ts = Number(timestamp);
      if (!Number.isFinite(ts) || ts <= 0) {
        throw new AdapterError('unexpected_response', 'Invalid ton_proof timestamp');
      }
      const sig = new Uint8Array(Buffer.from(signature, 'base64'));
      if (sig.length !== 64) {
        throw new AdapterError('unexpected_response', 'Invalid ton_proof signature');
      }
      const digest = tonProofDigest({
        workchain: parsed.workchain,
        addressHash: parsed.hash,
        domain: opts.domain,
        timestamp: ts,
        payload,
      });
      const key = ed25519KeyFromRaw(pubkey);
      let valid = false;
      try {
        valid = verifyEd25519(null, digest, key, sig);
      } catch {
        valid = false;
      }
      if (!valid) {
        throw new AdapterError('unexpected_response', 'ton_proof signature does not match public key');
      }
      // The external id (one account = one pass) is the canonical raw address.
      return { externalId: `${parsed.workchain}:${parsed.hashHex}` };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      let data: TonWalletData;
      try {
        data = await opts.indexer.getWalletData(ctx.externalId);
      } catch (error) {
        if (isAdapterError(error)) throw error;
        throw new AdapterError('provider_down', `Indexer failed: ${(error as Error).message}`);
      }
      return {
        metrics: {
          'wallet_ton.age_years': data.ageYears,
          'wallet_ton.tx_count': data.txCount,
          'wallet_ton.active_months_year': data.activeMonthsLastYear,
        },
        extras: { firstTxYear: data.firstTxYear },
      };
    },
  };
}
