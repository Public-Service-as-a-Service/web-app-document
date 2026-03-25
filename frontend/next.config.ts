import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  sassOptions: {
    prependData: `$basePath: '${process.env.NEXT_PUBLIC_BASE_PATH || ''}';`,
  },
  transpilePackages: ['lucide-react'],
};

export default nextConfig;
