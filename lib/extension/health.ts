import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from '@/lib/supabase/env'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createServiceClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** True when extension writing tables exist and are readable on prod. */
export async function checkExtensionBackendReady(): Promise<boolean> {
  const sb = serviceClient()
  if (!sb) return false

  const [usage, events] = await Promise.all([
    sb.from('extension_improve_usage').select('id', { head: true, count: 'exact' }).limit(1),
    sb.from('extension_writing_events').select('id', { head: true, count: 'exact' }).limit(1),
  ])

  return !usage.error && !events.error
}
