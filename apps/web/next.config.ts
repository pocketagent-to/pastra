import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TypeScript source and transpiled by Next.
  transpilePackages: [
    '@pastra/card',
    '@pastra/catalog',
    '@pastra/config',
    '@pastra/core',
    '@pastra/crypto',
    '@pastra/db',
    '@pastra/notify',
    '@pastra/providers',
    '@pastra/scoring',
  ],
  // postgres-js is a server-only dependency; keep it external to the server bundle.
  serverExternalPackages: ['postgres'],
  // Offers are hidden for now (card not live yet, Wirex pending): the user-facing /offers screens
  // redirect to the pass. Temporary (307) — remove these entries to bring Offers back. The offer
  // engine, API and /admin/offers tooling are untouched.
  async redirects() {
    return [
      { source: '/offers', destination: '/pass', permanent: false },
      { source: '/offers/:path*', destination: '/pass', permanent: false },
    ];
  },
};

export default nextConfig;
