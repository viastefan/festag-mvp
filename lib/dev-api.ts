/**
 * Shared helpers for /api/dev/* routes.
 *
 * PIN devs authenticate via festag_dev_token (no Supabase session). Those
 * requests must read through the service client with app-level access checks.
 * OAuth devs keep the cookie-bound client so RLS applies normally.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getApiUser } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export type DevApiContext = {
  user: { id: string; role?: string }
  db: SupabaseClient
  hasSupabaseSession: boolean
}

export async function resolveDevApiContext(req: Request): Promise<DevApiContext | null> {
  const user = await getApiUser(req)
  if (!user) return null

  const supaAuth = createClient()
  const { data: { user: cookieUser } } = await supaAuth.auth.getUser()
  const hasSupabaseSession = !!cookieUser
  const service = getServiceClient()
  const db = hasSupabaseSession ? supaAuth : (service ?? supaAuth)

  return { user, db, hasSupabaseSession }
}

const DEV_ROLES = new Set(['dev', 'admin', 'project_owner'])

export async function assertDevRole(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await (db as any)
    .from('profiles')
    .select('role,approval_status')
    .eq('id', userId)
    .maybeSingle()
  return !!profile && DEV_ROLES.has(profile.role)
}

/** Project ids the dev can access (assignments + owned). */
export async function devAccessibleProjectIds(db: SupabaseClient, userId: string): Promise<string[]> {
  const { data: pa } = await (db as any)
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', userId)
    .eq('active', true)

  const assignedIds = ((pa as any[]) ?? []).map(r => r.project_id).filter(Boolean)

  const { data: owned } = await (db as any)
    .from('projects')
    .select('id')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)

  return Array.from(new Set([
    ...assignedIds,
    ...((owned as any[]) ?? []).map(p => p.id),
  ]))
}

/** First accessible project — useful for seed defaults. */
export async function devDefaultProjectId(db: SupabaseClient, userId: string): Promise<string | null> {
  const ids = await devAccessibleProjectIds(db, userId)
  return ids[0] ?? null
}
