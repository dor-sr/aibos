import type { NextConfig } from 'next';

const isTurbopack = process.env.TURBOPACK === '1'; // Turbopack currently does not support typedRoutes

const nextConfig: NextConfig = {
  transpilePackages: ['@aibos/core', '@aibos/data-model'],
  experimental: isTurbopack
    ? undefined
    : {
        typedRoutes: true,
      },
};

export default nextConfig;




