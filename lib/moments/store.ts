/**
 * Create / load Client Moments (immutable Delivery Pulse share snapshots).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'
import { trustWaitLine } from '@/lib/decisions/trust-copy'
import { buildDeliveryPulse } from '@/lib/pulse/build'
import { isMissingTableError } from '@/lib/supabase/safe-table'
import {
  isMomentActive,
  newMomentToken,
  type ClientMomentBranding,
  type ClientMomentDecision,
  type ClientMomentSnapshot,
} from '@/lib/moments/types'

function safeBrandColor(value: string | null | undefined) {
  const color = value?.trim()
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#5B647D'
}

async function loadPrimaryClientDecision(
  sb: SupabaseClient<any>,
  opts: {
    workspaceId: string
    projectId?: string | null
    agencyClientId: string
  },
): Promise<ClientMomentDecision | null> {
  let projectIds: string[] = []
  if (opts.projectId) {
    projectIds = [opts.projectId]
  } else {
    const { data: projects } = await sb
      .from('projects')
      .select('id')
      .eq('workspace_id', opts.workspaceId)
      .eq('client_id', opts.agencyClientId)
      .limit(40)
    projectIds = ((projects as any[]) ?? []).map(p => String(p.id)).filter(Boolean)
  }
  if (!projectIds.length) return null

  const { data: rows } = await sb
    .from('decisions')
    .select('id,title,client_title,client_summary,description,due_at,due_date,escalation_level,urgency,options_json,recommended_option,status')
    .in('project_id', projectIds)
    .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[])
    .order('escalation_level', { ascending: false })
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(8)

  const list = (rows as any[]) ?? []
  if (!list.length) return null

  const urgencyRank: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 }
  list.sort((a, b) => {
    const esc = (b.escalation_level ?? 0) - (a.escalation_level ?? 0)
    if (esc) return esc
    const urg = (urgencyRank[b.urgency] ?? 0) - (urgencyRank[a.urgency] ?? 0)
    if (urg) return urg
    const aDue = a.due_at || a.due_date
    const bDue = b.due_at || b.due_date
    if (aDue && bDue) return Date.parse(aDue) - Date.parse(bDue)
    if (aDue) return -1
    if (bDue) return 1
    return 0
  })

  const top = list[0]
  const optionsRaw = Array.isArray(top.options_json) ? top.options_json : []
  const options = optionsRaw
    .slice(0, 3)
    .map((o: any) => ({
      id: String(o.id || o.label || ''),
      label: String(o.client_label || o.label || '').trim(),
    }))
    .filter((o: { id: string; label: string }) => o.id && o.label)

  return {
    id: String(top.id),
    title: String(top.client_title || top.title || 'Offene Entscheidung').trim(),
    summary: String(top.client_summary || top.description || 'Ohne deine Freigabe stockt der nächste Schritt.').trim(),
    waitLine: trustWaitLine(top),
    dueAt: top.due_at || top.due_date || null,
    options,
    href: `/decisions/${top.id}`,
  }
}

export async function createClientMoment(
  sb: SupabaseClient<any>,
  opts: {
    userId: string
    agencyClientId: string
    scope?: 'overall' | 'project'
    projectId?: string | null
    title?: string
    expiresInDays?: number
    /** Explicit ack when readiness is not client_ready. */
    acknowledgeWarnings?: boolean
  },
): Promise<
  | { token: string; urlPath: string; expiresAt: string | null; readinessLabel: string }
  | { error: string; status: number; readiness?: { label: string; reason: string; status: string } }
> {
  const { data: client, error: clientErr } = await sb
    .from('agency_clients')
    .select('id,workspace_id,name,slug,brand_color,logo_url')
    .eq('id', opts.agencyClientId)
    .maybeSingle()

  if (clientErr || !client) return { error: 'client_not_found', status: 404 }
  if (!client.slug) return { error: 'client_slug_missing', status: 400 }

  const scope = opts.scope === 'project' && opts.projectId ? 'project' : 'overall'

  // Gate publish when report readiness is not client_ready (project or worst overall).
  {
    const { buildProjectTruth } = await import('@/lib/trust/project-truth')
    if (scope === 'project' && opts.projectId) {
      const truth = await buildProjectTruth(sb, opts.projectId)
      if (truth && truth.readiness.status !== 'client_ready' && !opts.acknowledgeWarnings) {
        return {
          error: 'readiness_blocked',
          status: 409,
          readiness: {
            label: truth.readiness.label,
            reason: truth.readiness.reason,
            status: truth.readiness.status,
          },
        }
      }
    } else if (scope === 'overall') {
      const { data: projects } = await sb
        .from('projects')
        .select('id')
        .eq('workspace_id', client.workspace_id)
        .eq('client_id', client.id)
        .limit(12)
      const projectIds = ((projects as any[]) ?? []).map((p) => String(p.id)).filter(Boolean)
      for (const pid of projectIds) {
        const truth = await buildProjectTruth(sb, pid)
        if (truth && truth.readiness.status !== 'client_ready' && !opts.acknowledgeWarnings) {
          return {
            error: 'readiness_blocked',
            status: 409,
            readiness: {
              label: truth.readiness.label,
              reason: truth.readiness.reason,
              status: truth.readiness.status,
            },
          }
        }
      }
    }
  }

  const { data: branding } = await sb
    .from('workspace_branding')
    .select('brand_name,brand_color,logo_url,plan')
    .eq('workspace_id', client.workspace_id)
    .maybeSingle()

  const pulse = await buildDeliveryPulse(sb, opts.userId, {
    scope,
    projectId: scope === 'project' ? opts.projectId : null,
    refineWithTagro: true,
  })

  const decision = await loadPrimaryClientDecision(sb, {
    workspaceId: client.workspace_id,
    projectId: scope === 'project' ? opts.projectId : null,
    agencyClientId: client.id,
  })

  const brand: ClientMomentBranding = {
    clientName: String(client.name || 'Kunde'),
    brandColor: safeBrandColor(client.brand_color || branding?.brand_color),
    logoUrl: client.logo_url || branding?.logo_url || null,
    agencyName: branding?.brand_name || null,
    poweredByFestag: String(branding?.plan || '').toLowerCase() !== 'white_label',
  }

  const days = Math.min(90, Math.max(1, opts.expiresInDays ?? 14))
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString()
  const token = newMomentToken()
  const title = (opts.title || 'Lieferstand').trim().slice(0, 120) || 'Lieferstand'

  const { error: insertErr } = await sb.from('client_moments').insert({
    token,
    agency_client_id: client.id,
    workspace_id: client.workspace_id,
    created_by: opts.userId,
    title,
    scope,
    project_id: scope === 'project' ? opts.projectId : null,
    pulse_json: {
      progress: pulse.progress,
      risk: pulse.risk,
      next_step: pulse.next_step,
      health: pulse.health,
      generatedAt: pulse.generatedAt,
      decision,
    },
    proof_json: pulse.proof.slice(0, 3),
    summary: decision?.title ? `Entscheidung: ${decision.title}` : null,
    branding_json: brand,
    expires_at: expiresAt,
  })

  if (insertErr) {
    if (isMissingTableError(insertErr)) {
      return { error: 'moments_table_missing', status: 503 }
    }
    return { error: insertErr.message || 'insert_failed', status: 500 }
  }

  return {
    token,
    urlPath: `/c/${client.slug}/m/${token}`,
    expiresAt,
    readinessLabel: 'client_ready',
  }
}

function parseMomentDecision(raw: unknown): ClientMomentDecision | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  const id = String(d.id || '').trim()
  const title = String(d.title || '').trim()
  if (!id || !title) return null
  const options = Array.isArray(d.options)
    ? d.options
      .map((o: any) => ({ id: String(o?.id || ''), label: String(o?.label || '').trim() }))
      .filter((o: { id: string; label: string }) => o.id && o.label)
      .slice(0, 3)
    : []
  return {
    id,
    title,
    summary: String(d.summary || '').trim() || 'Ohne deine Freigabe stockt der nächste Schritt.',
    waitLine: String(d.waitLine || '').trim() || trustWaitLine({}),
    dueAt: typeof d.dueAt === 'string' ? d.dueAt : null,
    options,
    href: typeof d.href === 'string' && d.href.startsWith('/') ? d.href : `/decisions/${id}`,
  }
}

export async function loadClientMomentByToken(
  sb: SupabaseClient<any>,
  token: string,
): Promise<ClientMomentSnapshot & { slug: string; title: string } | null> {
  const clean = String(token || '').trim()
  if (!clean || clean.length < 16) return null

  const { data: row, error } = await sb
    .from('client_moments')
    .select('title,scope,project_id,pulse_json,proof_json,summary,branding_json,expires_at,revoked_at,created_at,agency_client_id')
    .eq('token', clean)
    .maybeSingle()

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[moments] load by token failed:', error.message)
    }
    return null
  }

  if (!row || !isMomentActive(row)) return null

  const { data: client } = await sb
    .from('agency_clients')
    .select('slug')
    .eq('id', row.agency_client_id)
    .maybeSingle()

  const slug = String(client?.slug || '').trim()
  if (!slug) return null

  const pulse = (row.pulse_json || {}) as any
  const branding = (row.branding_json || {}) as ClientMomentBranding
  const proof = Array.isArray(row.proof_json) ? row.proof_json : []

  return {
    slug,
    title: String(row.title || 'Lieferstand'),
    scope: row.scope === 'project' ? 'project' : 'overall',
    projectId: row.project_id ?? null,
    pulse: {
      progress: String(pulse.progress || ''),
      risk: String(pulse.risk || ''),
      next_step: String(pulse.next_step || ''),
      health: pulse.health || 'healthy',
      generatedAt: String(pulse.generatedAt || row.created_at),
    },
    proof: proof.slice(0, 3),
    decision: parseMomentDecision(pulse.decision),
    summary: row.summary ?? null,
    branding: {
      clientName: branding.clientName || 'Kunde',
      brandColor: safeBrandColor(branding.brandColor),
      logoUrl: branding.logoUrl || null,
      agencyName: branding.agencyName || null,
      poweredByFestag: branding.poweredByFestag !== false,
    },
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
  }
}

export type ClientMomentListItem = {
  token: string
  title: string
  scope: 'overall' | 'project'
  projectId: string | null
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  active: boolean
  urlPath: string
}

export async function listClientMoments(
  sb: SupabaseClient<any>,
  opts: { agencyClientId: string; limit?: number },
): Promise<ClientMomentListItem[]> {
  const { data: client } = await sb
    .from('agency_clients')
    .select('id,slug')
    .eq('id', opts.agencyClientId)
    .maybeSingle()
  if (!client?.slug) return []

  const { data, error } = await sb
    .from('client_moments')
    .select('token,title,scope,project_id,created_at,expires_at,revoked_at')
    .eq('agency_client_id', opts.agencyClientId)
    .order('created_at', { ascending: false })
    .limit(Math.min(50, Math.max(1, opts.limit ?? 20)))

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[moments] list failed:', error.message)
    }
    return []
  }

  return ((data as any[]) ?? []).map((row) => ({
    token: String(row.token),
    title: String(row.title || 'Lieferstand'),
    scope: row.scope === 'project' ? 'project' as const : 'overall' as const,
    projectId: row.project_id ?? null,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    active: isMomentActive(row),
    urlPath: `/c/${client.slug}/m/${row.token}`,
  }))
}

export async function revokeClientMoment(
  sb: SupabaseClient<any>,
  token: string,
): Promise<boolean> {
  const { error } = await sb
    .from('client_moments')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('token', token)
    .is('revoked_at', null)
  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[moments] revoke failed:', error.message)
    }
    return false
  }
  return true
}
