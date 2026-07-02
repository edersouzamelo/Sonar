import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { distDir: '.next-sonar' }),
  serverExternalPackages: ['pdf-parse'],
  async headers() {
    return [
      {
        source: '/classes/consolidacoes/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
