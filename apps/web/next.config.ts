import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aibos/core', '@aibos/data-model'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;



