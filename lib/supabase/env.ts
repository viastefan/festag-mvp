/**
 * Server-side Supabase configuration.
 * Supports legacy Vercel env names; never import from client components.
 */

import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/supabase/public-env'

const DEFAULT_SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

function isSupabaseAnonKey(key: string): boolean {
  return key.startsWith('eyJ') || key.startsWith('sb_publishable_')
}

export function getSupabaseUrl(): string {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL
    || DEFAULT_SUPABASE_URL
  ).trim()
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid https://*.supabase.co URL.')
  }
  return url
}

export function getSupabaseAnonKey(): string {
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_SERVICE_PUBLISHABLE_KEY
    || ''
  ).trim()
  if (key && isSupabaseAnonKey(key)) return key
  // Edge/middleware may only have NEXT_PUBLIC_* — reuse browser resolver.
  return getPublicSupabaseAnonKey()
}

/** Server routes that need URL fallbacks but can use the public anon key. */
export function getSupabaseUrlWithPublicFallback(): string {
  try {
    return getSupabaseUrl()
  } catch {
    return getPublicSupabaseUrl()
  }
}

export function getServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) return null

  if (!key.startsWith('eyJ')) {
    console.error(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY is not a JWT. ' +
      'Use the service_role secret from Dashboard → Settings → API (eyJ...).',
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return {
    url: Boolean(url),
    anonKey: Boolean(anon && isSupabaseAnonKey(anon)),
    serviceKey: Boolean(service),
    serviceKeyValid: Boolean(service?.startsWith('eyJ')),
  }
}
