/**
 * Browser-safe Supabase config.
 *
 * Only static `process.env.NEXT_PUBLIC_*` reads — Next.js inlines these into
 * the client bundle. Do not add server-only fallbacks here.
 */

const DEFAULT_SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

function isSupabaseAnonKey(key: string): boolean {
  return key.startsWith('eyJ') || key.startsWith('sb_publishable_')
}

export function getPublicSupabaseUrl(): string {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim()
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid https://*.supabase.co URL.')
  }
  return url
}

export function getPublicSupabaseAnonKey(): string {
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example → .env.local and set your anon key from Supabase Dashboard → Settings → API.',
    )
  }
  if (!isSupabaseAnonKey(key)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase anon JWT (eyJ…) or publishable key (sb_publishable_…).',
    )
  }
  return key
}
