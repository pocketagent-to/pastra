import type { MetricKey, ProviderId } from '@pastra/catalog';

export type AuthKind =
  | 'oauth2'
  | 'openid'
  | 'wallet_signature'
  | 'telegram_login'
  | 'musickit'
  | 'internal';

export interface Tokens {
  access: string;
  refresh?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface BeginContext {
  userId: string;
  /** Where the service returns the user. */
  redirectUri: string;
  /** Opaque anti-forgery state. */
  state: string;
  /** For wallet signatures: a one-time nonce to embed in the message. */
  nonce?: string;
  /** For PKCE (RFC 7636): the S256 code challenge; the verifier is stored server-side. */
  codeChallenge?: string;
}

export interface CompleteContext {
  redirectUri: string;
  /** Callback query/body parameters (code, state, signed message, …). */
  params: Record<string, string>;
  state: string;
}

export interface FetchContext {
  externalId: string;
  tokens?: Tokens;
  /** The cumulative value of a metric four weeks ago, for `delta_30d` metrics. */
  priorValue?: (metric: MetricKey) => number | null;
}

export interface BeginRedirect {
  redirectUrl: string;
}
export interface BeginSignature {
  messageToSign: string;
}
export type BeginResult = BeginRedirect | BeginSignature;

export interface CompleteResult {
  externalId: string;
  tokens?: Tokens;
}

export interface FetchResult {
  metrics: Record<MetricKey, number | null>;
  extras?: Record<string, unknown>;
}

/** The single contract every service adapter implements (docs/architecture.md section 7). */
export interface ProviderAdapter {
  id: ProviderId;
  auth: AuthKind;
  begin(ctx: BeginContext): Promise<BeginResult>;
  complete(ctx: CompleteContext): Promise<CompleteResult>;
  refresh?(tokens: Tokens): Promise<Tokens>;
  fetch(ctx: FetchContext): Promise<FetchResult>;
  revoke?(tokens: Tokens): Promise<void>;
}
