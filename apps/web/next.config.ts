import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@withyou/shared-types', '@withyou/shared-utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10,
  },
  eslint: {
    // Avertissement : Cela permet de générer le build en production même s'il y a des erreurs ESLint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
