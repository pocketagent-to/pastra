import type { ProviderId } from '@pastra/catalog';
import { AdapterError } from './errors';
import { httpForm } from './http';
import type {
  AuthKind,
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
  Tokens,
} from './types';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

export interface OAuth2Config {
  id: ProviderId;
  auth?: AuthKind;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Twitter/X and others mandate PKCE on public-style flows. */
  usePkce?: boolean;
  /** Extra authorize-URL params (e.g. access_type=offline, prompt=consent, duration=permanent). */
  authorizeParams?: Record<string, string>;
  /** Token-endpoint client auth: 'body' (client_secret_post, default) or 'basic' (client_secret_basic). */
  clientAuth?: 'body' | 'basic';
  /** Resolve the connected account id (never store it as a metric). */
  identify(tokens: Tokens): Promise<string>;
  /** Read the metrics for this account. */
  fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult>;
}

function basicAuth(cfg: OAuth2Config): Record<string, string> {
  const encoded = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  return { authorization: `Basic ${encoded}` };
}

function toTokens(res: TokenResponse, fallbackScopes: string[]): Tokens {
  return {
    access: res.access_token,
    refresh: res.refresh_token,
    expiresAt: res.expires_in ? new Date(Date.now() + res.expires_in * 1000) : undefined,
    scopes: res.scope ? res.scope.split(/[\s,]+/).filter(Boolean) : fallbackScopes,
  };
}

async function exchange(cfg: OAuth2Config, form: Record<string, string>): Promise<Tokens> {
  const useBasic = cfg.clientAuth === 'basic';
  const body = useBasic ? form : { ...form, client_id: cfg.clientId, client_secret: cfg.clientSecret };
  const headers = useBasic ? basicAuth(cfg) : {};
  const res = await httpForm<TokenResponse>(cfg.tokenUrl, body, headers);
  if (!res.access_token) throw new AdapterError('unexpected_response', 'No access token returned');
  return toTokens(res, cfg.scopes);
}

/**
 * A generic OAuth 2.0 (authorization-code) adapter. Service adapters supply their endpoints,
 * scopes, an `identify` call and a `fetchMetrics` call; begin/complete/refresh are handled here
 * (docs/architecture.md section 7). Credentials come from config; an unconfigured adapter refuses
 * to begin so the registry can fall back to the stub.
 */
export function createOAuth2Adapter(cfg: OAuth2Config): ProviderAdapter {
  const configured = Boolean(cfg.clientId && cfg.clientSecret);

  return {
    id: cfg.id,
    auth: cfg.auth ?? 'oauth2',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!configured) throw new AdapterError('provider_down', `${cfg.id} is not configured`);
      const params = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: cfg.scopes.join(' '),
        state: ctx.state,
        ...cfg.authorizeParams,
      });
      if (cfg.usePkce && ctx.codeChallenge) {
        params.set('code_challenge', ctx.codeChallenge);
        params.set('code_challenge_method', 'S256');
      }
      return { redirectUrl: `${cfg.authorizeUrl}?${params.toString()}` };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const code = ctx.params.code;
      if (!code) throw new AdapterError('unexpected_response', 'Missing authorization code');
      const form: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: ctx.redirectUri,
      };
      if (cfg.usePkce && ctx.params.codeVerifier) form.code_verifier = ctx.params.codeVerifier;
      const tokens = await exchange(cfg, form);
      const externalId = await cfg.identify(tokens);
      return { externalId, tokens };
    },

    async refresh(tokens: Tokens): Promise<Tokens> {
      if (!tokens.refresh) throw new AdapterError('auth_expired', 'No refresh token');
      const refreshed = await exchange(cfg, {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh,
      });
      // Some providers omit a new refresh token; keep the old one.
      return { ...refreshed, refresh: refreshed.refresh ?? tokens.refresh };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!ctx.tokens) throw new AdapterError('auth_expired', 'No tokens for this connection');
      return cfg.fetchMetrics({ tokens: ctx.tokens, externalId: ctx.externalId });
    },
  };
}

/** Convenience: a Bearer-authorized JSON GET, re-exported for adapters. */
export { bearer } from './http';

/** The provider ids that use the generic OAuth2 adapter (for the registry builder). */
export type OAuth2ProviderId = ProviderId;
