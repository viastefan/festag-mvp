import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client.
 *
 * Bypasses RLS. Use it ONLY for trusted server-side fan-out work where we
 * decide what gets written (audit logs, notifications, Tagro mirrors).
 * Never thread untrusted user input through this client without
 * application-level checks.
 *
 * Returns `null` when `SUPABASE_SERVICE_ROLE_KEY` is missing — callers
 * decide whether to skip silently or fall back to the user-session client.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

export function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createServiceClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Convenience: returns the service client when available, otherwise the
 * fallback (typically the cookie-bound user client). Useful for code paths
 * where you'd rather degrade than throw.
 */
export function serviceOr<T>(fallback: T): T {
  const s = getServiceClient()
  return (s ?? fallback) as T
}
