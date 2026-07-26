import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

function bearerToken(req: NextRequest): string | null {
  const raw = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  return raw || null
}

/** Supabase client scoped to the extension caller (cookies or Bearer). */
export function createExtensionClient(req: NextRequest): SupabaseClient {
  const bearer = bearerToken(req)
  if (bearer) {
    return createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll() {
        /* extension calls are read-only for session refresh */
      },
    },
  })
}

/**
 * Resolve the Festag user for Chrome-extension API calls.
 *
 * The extension forwards festag.app cookies (and optionally a Bearer access
 * token) because browser extensions cannot use credentials: 'include' against
 * festag.app. Route handlers must use this helper with the incoming Request —
 * not cookies() from next/headers alone — so forwarded Cookie headers resolve.
 */
export async function getExtensionUser(req: NextRequest): Promise<User | null> {
  const bearer = bearerToken(req)
  if (bearer) {
    try {
      const sb = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: { user }, error } = await sb.auth.getUser(bearer)
      if (user) return user
      if (error) console.error('[extension/session] bearer rejected:', error.message)
    } catch (e) {
      console.error('[extension/session] bearer error:', e)
    }
  }

  try {
    const sb = createExtensionClient(req)
    const { data: { user }, error } = await sb.auth.getUser()
    if (error) console.error('[extension/session] cookie auth failed:', error.message)
    return user ?? null
  } catch (e) {
    console.error('[extension/session] cookie auth error:', e)
    return null
  }
}
