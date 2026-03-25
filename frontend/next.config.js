/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  sassOptions: {
    prependData: `$basePath: '${process.env.NEXT_PUBLIC_BASE_PATH || ''}';`,
  },
  transpilePackages: ['lucide-react'],
  experimental: {
    optimizePackageImports: ['@sk-web-gui'],
  },
};
