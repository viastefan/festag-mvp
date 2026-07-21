import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseUrl } from '@/lib/supabase/env'

const SUPABASE_URL = getSupabaseUrl()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function requireFestagAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; reason: string }
> {
  const cookieStore = cookies()
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
    },
  })

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, status: 401, reason: 'no_session' }

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return { ok: false, status: 403, reason: 'forbidden' }
  }

  return { ok: true, userId: user.id }
}
