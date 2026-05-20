import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { distDir: '.next-sonar' }),
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
