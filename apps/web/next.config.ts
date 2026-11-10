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
};

export default nextConfig;
