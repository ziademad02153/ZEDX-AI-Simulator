import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
        ],
      },
      // Authenticated application screens are not search landing pages.
      // Keep them crawlable so search engines can read this noindex directive.
      ...[
        'login', 'onboarding', 'auth', 'dashboard', 'admin', 'interview',
        'mock-interview', 'desktop-assistant', 'desktop', 'scanner-frame', 'api',
      ].map((route) => ({
        source: `/${route}/:path*`,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      })),
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.zedx-ai.tech' }],
        destination: 'https://zedx-ai.tech/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'zedx-ai-simulator.vercel.app',
          },
        ],
        destination: 'https://zedx-ai.tech/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'zedx-ai-assistant-1.vercel.app',
          },
        ],
        destination: 'https://zedx-ai.tech/:path*',
        permanent: true,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Enable WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};

export default nextConfig;
