import { isAddress, verifyMessage } from 'viem';
import { AdapterError, isAdapterError } from '../errors';
import { httpJson } from '../http';
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
 * Farcaster adapter. Identity is proved with "Sign In With Farcaster" (SIWF): the user signs a
 * SIWE/ERC-4361 message with their Farcaster custody or auth key; `complete` verifies the signature
 * and extracts the FID from the message's `farcaster://fid/<fid>` resource (auth kind
 * `wallet_signature`, modelled on adapters/walletEvm.ts). Metrics are read from the Neynar API with
 * the application's API key (never a per-user token), so there is no `refresh` or `revoke`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts), axis "social":
 *   - `farcaster.followers`            volume    follower count
 *   - `farcaster.followers_gain_30d`   activity  delta_30d of `farcaster.followers`; we return the
 *                                                cumulative follower count and core derives the
 *                                                30-day delta from our own snapshots
 *   - `farcaster.account_age_years`    depth     account age (see the note below)
 *
 * Privacy (docs/architecture.md section 14): we read only public aggregate counts. The FID is the
 * external id (one account = one pass), returned from `complete`, never a metric. Addresses, the FID
 * and usernames never appear in `metrics` or `extras`.
 *
 * Verification gap (flagged to the owner): full SIWF verification (@farcaster/auth-client) resolves
 * the signer against the on-chain Farcaster Id/Key registries. We do not bundle that library, so we
 * (a) verify the ERC-4361 signature with viem and (b) cross-check, via Neynar, that the signing
 * address is one of the FID's custody / auth / verified addresses. Neynar sources those from the same
 * on-chain registries, so this binds FID<->signer, but the trust is delegated to Neynar's indexer
 * rather than read from chain directly. Only EOA signatures are verified; a smart-contract auth
 * address (EIP-1271) would need a viem public client we do not inject here.
 */

const NEYNAR_BULK_URL = 'https://api.neynar.com/v2/farcaster/user/bulk';
/** The ERC-4361 resource that carries the Farcaster id in a SIWF message. */
const FID_RESOURCE_RE = /farcaster:\/\/fid\/(\d+)/;

export interface FarcasterAdapterConfig {
  /** Neynar API key (env NEYNAR_API_KEY); sent as the `x-api-key` header, never logged. */
  neynarApiKey: string;
  /** The app domain bound into the SIWF message (an open business value, never invented). */
  domain: string;
}

/** The subset of the Neynar user object we read — only public aggregate stats and account keys. */
interface NeynarUser {
  fid?: number;
  follower_count?: number;
  following_count?: number;
  custody_address?: string;
  verified_addresses?: {
    eth_addresses?: string[];
    primary?: { eth_address?: string | null };
  };
  auth_addresses?: Array<{ address?: string }>;
}

interface NeynarBulkResponse {
  users?: NeynarUser[];
}

/**
 * The message the user signs to prove FID ownership. In a real AuthKit flow the Farcaster client
 * assembles the full ERC-4361 message from the domain and nonce we supply here; this readable form
 * carries the same two bound values. `complete` validates the actually-signed message, so the exact
 * bytes of this string are not required to match.
 *
 * The connection `state` is used as the SIWF nonce: it is the per-request, unguessable value exposed
 * to both `begin` and `complete` (CompleteContext has no `nonce`), which lets `complete` verify it.
 */
export function buildFarcasterSignInMessage(domain: string, nonce: string): string {
  return [
    `${domain} wants you to sign in with your Farcaster account for Pastra.`,
    '',
    'This request will not trigger a transaction or cost any fees.',
    `Nonce: ${nonce}`,
  ].join('\n');
}

interface ParsedSiwf {
  domain: string | null;
  address: `0x${string}` | null;
  nonce: string | null;
  fid: string | null;
  expired: boolean;
}

/** Parse the SIWF (ERC-4361) message for the bound domain, signer address, nonce and FID. */
function parseSiwf(message: string): ParsedSiwf {
  const lines = message.split('\n');
  const domainMatch = /^(\S+) wants you to sign in/.exec(lines[0] ?? '');
  const addressLine = (lines[1] ?? '').trim();
  const address: `0x${string}` | null = isAddress(addressLine) ? addressLine : null;

  let nonce: string | null = null;
  let expired = false;
  for (const line of lines) {
    if (line.startsWith('Nonce:')) nonce = line.slice('Nonce:'.length).trim();
    else if (line.startsWith('Expiration Time:')) {
      const at = new Date(line.slice('Expiration Time:'.length).trim());
      if (!Number.isNaN(at.getTime()) && at.getTime() < Date.now()) expired = true;
    }
  }

  const fid = FID_RESOURCE_RE.exec(message)?.[1] ?? null;
  return { domain: domainMatch?.[1] ?? null, address, nonce, fid, expired };
}

/** Collect the lowercase addresses that belong to a FID (custody, verified eth, auth keys). */
function accountAddresses(user: NeynarUser): Set<string> {
  const set = new Set<string>();
  const add = (a: string | null | undefined): void => {
    if (a && isAddress(a)) set.add(a.toLowerCase());
  };
  add(user.custody_address);
  add(user.verified_addresses?.primary?.eth_address ?? null);
  for (const a of user.verified_addresses?.eth_addresses ?? []) add(a);
  for (const a of user.auth_addresses ?? []) add(a?.address);
  return set;
}

/** Read one metric as a number, or null when the upstream field is absent/non-numeric. */
function metric(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function createFarcasterAdapter(cfg: FarcasterAdapterConfig): ProviderAdapter {
  const configured = Boolean(cfg.neynarApiKey && cfg.domain);

  /** Fetch the public user object by FID. A rejected key is a provider/config fault, not user auth. */
  async function fetchUser(fid: string): Promise<NeynarUser> {
    const url = `${NEYNAR_BULK_URL}?fids=${encodeURIComponent(fid)}`;
    let data: NeynarBulkResponse;
    try {
      data = await httpJson<NeynarBulkResponse>(url, {
        headers: { 'x-api-key': cfg.neynarApiKey, accept: 'application/json' },
      });
    } catch (error) {
      // SIWF uses no per-user token, so a 401/403 from Neynar is our key being bad or over quota:
      // surface it as provider_down (core backs off and retries) rather than needs_reconnect.
      if (isAdapterError(error) && error.code === 'auth_expired') {
        throw new AdapterError('provider_down', 'Neynar API key was rejected');
      }
      throw error;
    }
    const user = data.users?.[0];
    if (!user || typeof user.fid !== 'number') {
      throw new AdapterError('unexpected_response', 'Farcaster user not found');
    }
    return user;
  }

  return {
    id: 'farcaster',
    auth: 'wallet_signature',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!configured) throw new AdapterError('provider_down', 'farcaster is not configured');
      return { messageToSign: buildFarcasterSignInMessage(cfg.domain, ctx.state) };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      if (!configured) throw new AdapterError('provider_down', 'farcaster is not configured');
      const { message, signature } = ctx.params;
      if (!message || !signature) {
        throw new AdapterError('unexpected_response', 'Missing SIWF message or signature');
      }

      const parsed = parseSiwf(message);
      if (!parsed.address)
        throw new AdapterError('unexpected_response', 'SIWF message has no signer address');
      if (!parsed.fid)
        throw new AdapterError('unexpected_response', 'SIWF message has no Farcaster id');
      if (parsed.expired) throw new AdapterError('unexpected_response', 'SIWF message has expired');
      // Domain binding (prevents replay of a signature obtained for another site).
      if (!parsed.domain || parsed.domain.toLowerCase() !== cfg.domain.toLowerCase()) {
        throw new AdapterError('unexpected_response', 'SIWF domain does not match');
      }
      // Nonce binding (anti-replay): the signed nonce must be this connection's state.
      if (parsed.nonce !== ctx.state) {
        throw new AdapterError('unexpected_response', 'SIWF nonce does not match');
      }

      let valid = false;
      try {
        valid = await verifyMessage({
          address: parsed.address,
          message,
          signature: signature as `0x${string}`,
        });
      } catch {
        valid = false;
      }
      if (!valid) throw new AdapterError('unexpected_response', 'SIWF signature is invalid');

      // Bind FID<->signer: the signing address must be a known key of this FID (see the gap note).
      const user = await fetchUser(parsed.fid);
      if (!accountAddresses(user).has(parsed.address.toLowerCase())) {
        throw new AdapterError(
          'unexpected_response',
          'Signer is not a key of this Farcaster account',
        );
      }

      // The FID (decimal string) is the external id — one account = one pass. Never a metric.
      return { externalId: parsed.fid };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!configured) throw new AdapterError('provider_down', 'farcaster is not configured');
      const user = await fetchUser(ctx.externalId);
      const followers = metric(user.follower_count);

      return {
        metrics: {
          'farcaster.followers': followers,
          // delta_30d: return the cumulative follower count; core derives the 30-day delta.
          'farcaster.followers_gain_30d': followers,
          // Account age is not exposed by the Neynar user object; populating it needs an extra data
          // source (the on-chain Id Registry on Optimism, or a Neynar registration endpoint). Until
          // one is wired in we report null rather than inventing a date (see the owner to-do).
          'farcaster.account_age_years': null,
        },
        extras: { followingCount: metric(user.following_count) },
      };
    },
  };
}
