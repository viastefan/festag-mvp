import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

function bearerToken(req?: NextRequest | Request): string | null {
  const raw = req?.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  return raw || null
}

/** Supabase client for App Router API routes — cookies from the request, Bearer fallback. */
export function createRouteHandlerClient(req?: NextRequest | Request): SupabaseClient {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  const bearer = bearerToken(req)

  if (bearer) {
    return createSupabaseClient(url, key, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  if (req && 'cookies' in req) {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return (req as NextRequest).cookies.getAll()
        },
        setAll() {
          /* read-only — session refresh happens in middleware */
        },
      },
    })
  }

  const cookieStore = cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          /* ignore when called from a Server Component context */
        }
      },
    },
  })
}

/** Resolve the signed-in user for API routes (Bearer first, then cookies). */
export async function getRouteUser(req?: NextRequest | Request): Promise<User | null> {
  const bearer = bearerToken(req)
  if (bearer) {
    try {
      const sb = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: { user } } = await sb.auth.getUser(bearer)
      if (user) return user
    } catch {
      /* fall through to cookies */
    }
  }

  const supa = createRouteHandlerClient(req)
  const { data: { user } } = await supa.auth.getUser()
  return user ?? null
}
