import { createHash } from 'node:crypto';
import type { MetricKey, MetricSpec, ProviderId, ProviderSpec } from '@pastra/catalog';
import type {
  AuthKind,
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
} from './types';

/** The auth kind a provider uses, for stubs and the local environment. */
export function authKindFor(id: ProviderId): AuthKind {
  if (id.startsWith('wallet_')) return 'wallet_signature';
  if (id === 'telegram') return 'telegram_login';
  if (id === 'card_spend') return 'internal';
  if (id === 'apple_music') return 'musickit';
  if (id === 'steam') return 'openid';
  return 'oauth2';
}

function stubValue(m: MetricSpec): number {
  if (m.scale === 'linear') return (m.t0 + m.t100) / 2;
  return Math.round(Math.sqrt(m.t0 * m.t100) * 100) / 100; // geometric midpoint
}

function stubExtras(spec: ProviderSpec): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  if (spec.id === 'steam') extras.topGame = 'CS2';
  if (spec.id.startsWith('wallet_')) extras.firstTxYear = 2019;
  return extras;
}

/**
 * A stub adapter with fixed metrics, derived from the provider's own catalog entry so it always
 * returns exactly the catalog metric keys (docs/architecture.md section 15, local environment).
 */
export function makeStubAdapter(spec: ProviderSpec): ProviderAdapter {
  const auth = authKindFor(spec.id);
  const metrics: Record<MetricKey, number | null> = {};
  for (const m of spec.metrics) metrics[m.key] = stubValue(m);

  return {
    id: spec.id,
    auth,
    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (auth === 'wallet_signature') {
        return {
          messageToSign: `Pastra wants to verify this wallet.\nNonce: ${ctx.nonce ?? ctx.state}`,
        };
      }
      return { redirectUrl: `https://stub.pastra.test/${spec.id}/authorize?state=${ctx.state}` };
    },
    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const seed = ctx.params.address ?? ctx.params.code ?? ctx.state;
      const externalId = `${spec.id}-${createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;
      const tokens =
        auth === 'oauth2' || auth === 'openid'
          ? {
              access: `stub-access-${externalId}`,
              refresh: `stub-refresh-${externalId}`,
              scopes: [],
            }
          : undefined;
      return { externalId, tokens };
    },
    async fetch(_ctx: FetchContext): Promise<FetchResult> {
      return { metrics: { ...metrics }, extras: stubExtras(spec) };
    },
  };
}
