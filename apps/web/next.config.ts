import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TypeScript source and transpiled by Next.
  transpilePackages: ['@pastra/catalog', '@pastra/scoring', '@pastra/config'],
};

export default nextConfig;
