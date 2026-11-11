import { AdapterError } from '../errors';
import { httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * GitHub adapter — OAuth 2.0 (GitHub OAuth App). The generic OAuth2 adapter handles
 * begin/complete/refresh; this file supplies the GitHub endpoints, scope, `identify` and
 * `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `github.followers_stars`     volume    followers + stars received on the user's public repos
 *   - `github.contributions_30d`   activity  contributions in the last 30 days (source 'api', not a
 *                                            snapshot delta: we read the window directly)
 *   - `github.contributions_year`  depth     contributions in the last year
 *
 * Auth notes (docs/architecture.md section 7, task brief):
 *   - Token endpoint returns JSON when `Accept: application/json` is sent; `httpForm` already sets
 *     that. Client credentials go in the request body (client_secret_post).
 *   - Classic GitHub OAuth tokens do not expire and carry no refresh token, so the token response
 *     omits `expires_in`/`refresh_token`. The generic adapter handles that gracefully (no expiry =
 *     never refreshed); a refresh is only attempted if GitHub ever returns one.
 *
 * Privacy: the consent screen reads "Followers and stars, Contribution activity" and never the
 * user's private repositories or code. We request only `read:user`; public-repo read is implicit.
 * Contribution counts and star counts are public aggregates — we read numbers, never code. Every
 * GitHub request carries a generic `User-Agent` (required by the API) that holds no user data.
 */

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const GRAPHQL_URL = 'https://api.github.com/graphql';

/** Profile + followers; public-repo read is implicit. We never request `repo` (private) or write. */
const SCOPES = ['read:user'] as const;

/** Generic app identifier for the required User-Agent header — never a user's name or data. */
const USER_AGENT = 'Pastra';
const API_VERSION = '2022-11-28';

const DAY_MS = 24 * 60 * 60 * 1000;
/** GraphQL `contributionsCollection` accepts at most a one-year window. */
const YEAR_DAYS = 365;
/** Stop runaway pagination: repos are ordered by stars desc, so trailing pages add nothing. */
const MAX_REPO_PAGES = 20;

export interface GitHubAdapterConfig {
  clientId: string;
  clientSecret: string;
}

interface RestUser {
  id?: number;
}

interface RepoNode {
  stargazerCount?: number;
}

interface RepoConnection {
  nodes?: Array<RepoNode | null>;
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
}

interface ContributionWindow {
  contributionCalendar?: { totalContributions?: number };
}

interface ViewerMain {
  followers?: { totalCount?: number };
  repositories?: RepoConnection;
  last30?: ContributionWindow;
  lastYear?: ContributionWindow;
}

interface ViewerReposOnly {
  repositories?: RepoConnection;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ type?: string; message?: string }>;
}

const MAIN_QUERY = `
  query($from: DateTime!, $to: DateTime!, $yearFrom: DateTime!) {
    viewer {
      followers { totalCount }
      repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: { field: STARGAZERS, direction: DESC }) {
        nodes { stargazerCount }
        pageInfo { hasNextPage endCursor }
      }
      last30: contributionsCollection(from: $from, to: $to) {
        contributionCalendar { totalContributions }
      }
      lastYear: contributionsCollection(from: $yearFrom, to: $to) {
        contributionCalendar { totalContributions }
      }
    }
  }`;

const REPOS_PAGE_QUERY = `
  query($cursor: String!) {
    viewer {
      repositories(ownerAffiliations: OWNER, isFork: false, first: 100, after: $cursor, orderBy: { field: STARGAZERS, direction: DESC }) {
        nodes { stargazerCount }
        pageInfo { hasNextPage endCursor }
      }
    }
  }`;

/** Headers every GitHub REST call needs: Bearer token, a User-Agent, and the API version pin. */
function restHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'user-agent': USER_AGENT,
    'x-github-api-version': API_VERSION,
  };
}

/** Headers for the GraphQL endpoint (JSON POST). */
function graphqlHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'content-type': 'application/json',
    'user-agent': USER_AGENT,
  };
}

/**
 * A GitHub GraphQL request. GitHub answers GraphQL with HTTP 200 even for query-level failures, so
 * transport errors are mapped by `httpJson` (401 -> auth_expired, 429 -> rate_limited, ...) and
 * query-level `errors` are mapped here.
 */
async function githubGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await httpJson<GraphQLResponse<T>>(GRAPHQL_URL, {
    method: 'POST',
    headers: graphqlHeaders(token),
    body: JSON.stringify({ query, variables }),
  });
  if (res.errors?.length) {
    if (res.errors.some((e) => e.type === 'RATE_LIMITED')) {
      throw new AdapterError('rate_limited', 'GitHub GraphQL rate limited');
    }
    throw new AdapterError('unexpected_response', res.errors[0]?.message ?? 'GitHub GraphQL error');
  }
  if (!res.data) throw new AdapterError('unexpected_response', 'GitHub GraphQL returned no data');
  return res.data;
}

/** Sum of the `stargazerCount`s on a repositories page. */
function sumStars(conn: RepoConnection | undefined): number {
  return (conn?.nodes ?? []).reduce((total, node) => total + (node?.stargazerCount ?? 0), 0);
}

export function createGitHubAdapter(cfg: GitHubAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  /** Resolve the connected account id (the stable numeric id, never a metric). */
  async function identify(tokens: Tokens): Promise<string> {
    const user = await httpJson<RestUser>(USER_URL, { headers: restHeaders(tokens.access) });
    if (typeof user.id !== 'number')
      throw new AdapterError('unexpected_response', 'GitHub returned no user');
    return String(user.id);
  }

  async function fetchMetrics(args: { tokens: Tokens }): Promise<FetchResult> {
    const token = args.tokens.access;
    const now = Date.now();
    const to = new Date(now).toISOString();
    const from = new Date(now - 30 * DAY_MS).toISOString();
    const yearFrom = new Date(now - YEAR_DAYS * DAY_MS).toISOString();

    const main = await githubGraphql<{ viewer?: ViewerMain }>(token, MAIN_QUERY, {
      from,
      to,
      yearFrom,
    });
    const viewer = main.viewer;
    if (!viewer) throw new AdapterError('unexpected_response', 'GitHub returned no viewer');

    // Stars received across the user's own public repos. Repos come ordered by stars (desc), so we
    // page until GitHub runs out or a page adds nothing (all remaining repos have zero stars).
    let repos = viewer.repositories;
    let totalStars = sumStars(repos);
    let pages = 1;
    while (repos?.pageInfo?.hasNextPage && repos.pageInfo.endCursor && pages < MAX_REPO_PAGES) {
      const next = await githubGraphql<{ viewer?: ViewerReposOnly }>(token, REPOS_PAGE_QUERY, {
        cursor: repos.pageInfo.endCursor,
      });
      repos = next.viewer?.repositories;
      const pageStars = sumStars(repos);
      totalStars += pageStars;
      pages += 1;
      if (pageStars === 0) break;
    }

    const followers = viewer.followers?.totalCount;
    const followersStars = typeof followers === 'number' ? followers + totalStars : null;

    const contributions30d = viewer.last30?.contributionCalendar?.totalContributions;
    const contributionsYear = viewer.lastYear?.contributionCalendar?.totalContributions;

    return {
      metrics: {
        'github.followers_stars': followersStars,
        'github.contributions_30d': typeof contributions30d === 'number' ? contributions30d : null,
        'github.contributions_year':
          typeof contributionsYear === 'number' ? contributionsYear : null,
      },
    };
  }

  return createOAuth2Adapter({
    id: 'github',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // GitHub's token endpoint takes client_id/client_secret in the body (client_secret_post) and
    // returns JSON when Accept: application/json is set (httpForm sets it).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });
}
