const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'https://xsdkoepwuvpuroijjain.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_SERVICE_PUBLISHABLE_KEY

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Map legacy Vercel env names → NEXT_PUBLIC_* for client bundle + SSG.
  // Only set keys when a value exists — empty entries override .env.local in dev.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    ...(supabaseAnonKey ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } : {}),
  },
  // Credentials live in .env.local / Vercel only — never hardcode secrets here.
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
