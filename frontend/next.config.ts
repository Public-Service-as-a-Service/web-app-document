import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: ['lucide-react'],
  webpack: (config) => {
    // pdfjs-dist optionally imports `canvas` for Node-side rendering; on the
    // client we never hit that path, but without the alias webpack errors on
    // the unresolved require. Same trick the react-pdf docs recommend.
    config.resolve.alias = { ...(config.resolve.alias ?? {}), canvas: false };
    return config;
  },
};

export default nextConfig;
