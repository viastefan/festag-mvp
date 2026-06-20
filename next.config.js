/** @type {import('next').NextConfig} */

// Build-time bridge: map legacy Vercel env names into NEXT_PUBLIC_* for the client bundle.
// Local dev reads .env.local directly; do not set empty values here (they override .env.local).
const publicEnv = {}
const mappedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const mappedAnon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_SERVICE_PUBLISHABLE_KEY

if (mappedUrl) publicEnv.NEXT_PUBLIC_SUPABASE_URL = mappedUrl
if (mappedAnon) publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = mappedAnon

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(Object.keys(publicEnv).length > 0 ? { env: publicEnv } : {}),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
