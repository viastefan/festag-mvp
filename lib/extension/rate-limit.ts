import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from '@/lib/supabase/env'

const HOURLY_IMPROVE_LIMIT = 120

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createServiceClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function checkExtensionImproveRateLimit(userId: string): Promise<{ ok: boolean; remaining?: number }> {
  const sb = serviceClient()
  if (!sb) return { ok: true }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await sb
    .from('extension_improve_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)

  if (error) {
    console.error('[extension/rate-limit]', error.message)
    return { ok: true }
  }

  const used = count ?? 0
  if (used >= HOURLY_IMPROVE_LIMIT) return { ok: false, remaining: 0 }
  return { ok: true, remaining: HOURLY_IMPROVE_LIMIT - used }
}

export async function recordExtensionImproveUsage(input: {
  userId: string
  action: string
  pageUrl?: string | null
  applied?: boolean
}) {
  const sb = serviceClient()
  if (!sb) return

  let pageDomain: string | null = null
  if (input.pageUrl) {
    try {
      pageDomain = new URL(input.pageUrl).hostname.replace(/^www\./, '')
    } catch { /* noop */ }
  }

  await sb.from('extension_improve_usage').insert({
    user_id: input.userId,
    action: input.action,
    page_domain: pageDomain,
    applied: input.applied ?? false,
  })
}
