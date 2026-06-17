import { NextResponse } from 'next/server'
import { resolveDevApiContext } from '@/lib/dev-api'
import { getServiceClient } from '@/lib/supabase/service'
import { getServiceRoleKey, getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

export const runtime = 'nodejs'

/**
 * GET /api/dev/health
 *
 * Lightweight backend connectivity probe for the dev panel.
 * Does not expose secrets — only booleans and table reachability.
 */
export async function GET(req: Request) {
  const ctx = await resolveDevApiContext(req)
  const service = getServiceClient()

  const checks: Record<string, boolean | string> = {
    authenticated: !!ctx,
    auth_kind: ctx?.hasSupabaseSession ? 'supabase' : (ctx ? 'pin' : 'none'),
    supabase_url: !!getSupabaseUrl(),
    anon_key: !!getSupabaseAnonKey(),
    service_role: !!getServiceRoleKey(),
    service_client: !!service,
  }

  if (service) {
    const probes = ['profiles', 'decisions', 'tasks', 'notifications'] as const
    for (const table of probes) {
      const { error } = await (service as any).from(table).select('id', { head: true, count: 'exact' }).limit(1)
      checks[`table_${table}`] = !error
      if (error) checks[`table_${table}_err`] = error.message.slice(0, 120)
    }

    const { error: rpcErr } = await (service as any).rpc('decisions_tick', { p_limit: 1 })
    checks.decisions_tick_rpc = !rpcErr
    if (rpcErr) checks.decisions_tick_rpc_err = rpcErr.message.slice(0, 120)
  }

  const ok = !!ctx && checks.service_client === true

  return NextResponse.json({
    ok,
    checks,
    hints: !checks.service_role
      ? ['SUPABASE_SERVICE_ROLE_KEY fehlt — PIN-Login, Seed und Cron brauchen den JWT Service Key.']
      : !ctx
        ? ['Nicht angemeldet — /dev/login']
        : [],
  })
}
