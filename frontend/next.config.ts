import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: ['lucide-react'],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3010';
    return [
      // SAML routes bypass the catch-all proxy — they return redirects + Set-Cookie
      // that need to flow directly between browser and backend
      {
        source: '/api/saml/:path*',
        destination: `${backendUrl}/api/saml/:path*`,
      },
    ];
  },
};

export default nextConfig;
