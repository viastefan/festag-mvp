import { createBrowserClient } from '@supabase/ssr'
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/supabase/public-env'

// createBrowserClient from @supabase/ssr stores session in cookies,
// making it accessible to the server-side middleware.
export function createClient() {
  return createBrowserClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
}
