import type { NextConfig } from 'next';

// Fichiers envoyés (produits, marques, profils) servis par l'API sous /uploads —
// en http://localhost:3001 en local, d'où ce motif en plus du https général.
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@withyou/shared-types', '@withyou/shared-utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: apiUrl.protocol === 'https:' ? 'https' : 'http',
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: '/uploads/**',
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
