import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  poweredByHeader: false,
  async rewrites() {
    const backendUrl = (
      process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      (process.env.VERCEL ? 'https://issue-tracking-ngcx.vercel.app' : undefined)
    )?.replace(/\/$/, '');

    if (!backendUrl) {
      return [];
    }

    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/health', destination: `${backendUrl}/health` },
      { source: '/ready', destination: `${backendUrl}/ready` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
