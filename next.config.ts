import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep API and media on the frontend origin, including on mobile devices.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8001'}/media/:path*`,
      },
      { source: '/api/:path*', destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8001'}/api/:path*/` },
    ];
  },
};

export default nextConfig;
