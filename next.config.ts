import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: '.next-sonar',
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
