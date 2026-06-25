import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from '@/lib/supabase/env'

const STYLE_MEMORY_KEY = 'extension_writing_style'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createServiceClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type ExtensionStats = {
  periodDays: number
  improveCount: number
  appliedCount: number
  hourlyRemaining: number
  hourlyLimit: number
  topActions: { action: string; count: number }[]
  topDomains: { domain: string; count: number }[]
  styleSnippet: string | null
}

const HOURLY_LIMIT = 120

export async function getExtensionStats(userId: string): Promise<ExtensionStats> {
  const sb = serviceClient()
  const empty: ExtensionStats = {
    periodDays: 7,
    improveCount: 0,
    appliedCount: 0,
    hourlyRemaining: HOURLY_LIMIT,
    hourlyLimit: HOURLY_LIMIT,
    topActions: [],
    topDomains: [],
    styleSnippet: null,
  }
  if (!sb) return empty

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const [usageRes, appliedRes, hourRes, styleRes] = await Promise.all([
    sb.from('extension_improve_usage').select('action, page_domain').eq('user_id', userId).gte('created_at', since7d),
    sb.from('extension_writing_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('applied', true).gte('created_at', since7d),
    sb.from('extension_improve_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since1h),
    sb.from('tagro_memories').select('content').eq('user_id', userId).eq('scope', 'preference').eq('key', STYLE_MEMORY_KEY).is('project_id', null).maybeSingle(),
  ])

  const rows = (usageRes.data ?? []) as { action: string; page_domain: string | null }[]
  const actionCounts = new Map<string, number>()
  const domainCounts = new Map<string, number>()
  for (const row of rows) {
    actionCounts.set(row.action, (actionCounts.get(row.action) ?? 0) + 1)
    if (row.page_domain) {
      domainCounts.set(row.page_domain, (domainCounts.get(row.page_domain) ?? 0) + 1)
    }
  }

  const topActions = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([action, count]) => ({ action, count }))

  const topDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }))

  const hourUsed = hourRes.count ?? 0
  const styleRaw = String((styleRes.data as { content?: string } | null)?.content ?? '').trim()

  return {
    periodDays: 7,
    improveCount: rows.length,
    appliedCount: appliedRes.count ?? 0,
    hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourUsed),
    hourlyLimit: HOURLY_LIMIT,
    topActions,
    topDomains,
    styleSnippet: styleRaw ? styleRaw.slice(0, 280) : null,
  }
}
