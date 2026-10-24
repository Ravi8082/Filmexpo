/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  experimental: {
    agentUpgrade: 'security',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Uploaded media filenames are immutable UUIDs, so optimized output can
    // be cached for a year instead of re-processed on the optimizer path.
    minimumCacheTTL: 31_536_000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'filmexpoindia.com',
        pathname: '/wp-content/uploads/2026/01/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Static art assets never change; let browsers and CDNs pin them.
        source: '/film-expo-art/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:filename(film-expo-hero\\.webp|film-expo-logo\\.svg|film-expo-logo\\.png|apple-icon\\.png|icon\\.svg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
