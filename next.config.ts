import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep media on the frontend origin, including on mobile devices.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8002';
    return [
      {
        source: '/media/:path*',
        destination: `${backend}/media/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
