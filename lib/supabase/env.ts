/**
 * Central Supabase configuration — no credentials in source code.
 * All keys come from environment variables (.env.local / Vercel).
 */

function read(name: string): string | undefined {
  const v = process.env[name]?.trim()
  return v || undefined
}

export function getSupabaseUrl(): string {
  const url = read('NEXT_PUBLIC_SUPABASE_URL')
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.local.example → .env.local and set your project URL.',
    )
  }
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid https://*.supabase.co URL.')
  }
  return url
}

function isSupabaseAnonKey(key: string): boolean {
  // Legacy JWT anon key (eyJ…) or newer publishable key (sb_publishable_…).
  return key.startsWith('eyJ') || key.startsWith('sb_publishable_')
}

export function getSupabaseAnonKey(): string {
  const key = read('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Get it from Supabase Dashboard → Settings → API.',
    )
  }
  if (!isSupabaseAnonKey(key)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase anon JWT (eyJ…) or publishable key (sb_publishable_…).',
    )
  }
  return key
}

/**
 * Service-role key — server-only. Never import in client components.
 * Returns null when unset so callers can degrade gracefully.
 */
export function getServiceRoleKey(): string | null {
  const key = read('SUPABASE_SERVICE_ROLE_KEY')
  if (!key) return null

  // Supabase service_role keys are JWTs. Short sb_secret_* keys are invalid
  // for @supabase/supabase-js RPC writes (welcome message, inbox fan-out).
  if (!key.startsWith('eyJ')) {
    console.error(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY is not a JWT. ' +
      'Use the service_role secret from Dashboard → Settings → API (eyJ...). ' +
      'Server-side inbox writes and welcome messages will fail until fixed.',
    )
    return null
  }
  return key
}

export type SupabaseEnvStatus = {
  url: boolean
  anonKey: boolean
  serviceKey: boolean
  serviceKeyValid: boolean
}

export function checkSupabaseEnv(): SupabaseEnvStatus {
  const url = read('NEXT_PUBLIC_SUPABASE_URL')
  const anon = read('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const service = read('SUPABASE_SERVICE_ROLE_KEY')
  return {
    url: Boolean(url),
    anonKey: Boolean(anon && isSupabaseAnonKey(anon)),
    serviceKey: Boolean(service),
    serviceKeyValid: Boolean(service?.startsWith('eyJ')),
  }
}
