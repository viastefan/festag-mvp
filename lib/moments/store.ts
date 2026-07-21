/**
 * Create / load Client Moments (immutable Delivery Pulse share snapshots).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDeliveryPulse } from '@/lib/pulse/build'
import {
  isMomentActive,
  newMomentToken,
  type ClientMomentBranding,
  type ClientMomentSnapshot,
} from '@/lib/moments/types'

function safeBrandColor(value: string | null | undefined) {
  const color = value?.trim()
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#5B647D'
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
  },
): Promise<{ token: string; urlPath: string; expiresAt: string | null } | { error: string; status: number }> {
  const { data: client, error: clientErr } = await sb
    .from('agency_clients')
    .select('id,workspace_id,name,slug,brand_color,logo_url')
    .eq('id', opts.agencyClientId)
    .maybeSingle()

  if (clientErr || !client) return { error: 'client_not_found', status: 404 }
  if (!client.slug) return { error: 'client_slug_missing', status: 400 }

  const { data: branding } = await sb
    .from('workspace_branding')
    .select('brand_name,brand_color,logo_url,plan')
    .eq('workspace_id', client.workspace_id)
    .maybeSingle()

  const scope = opts.scope === 'project' && opts.projectId ? 'project' : 'overall'
  const pulse = await buildDeliveryPulse(sb, opts.userId, {
    scope,
    projectId: scope === 'project' ? opts.projectId : null,
    refineWithTagro: true,
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
    },
    proof_json: pulse.proof.slice(0, 3),
    summary: null,
    branding_json: brand,
    expires_at: expiresAt,
  })

  if (insertErr) {
    // Soft fail when migration not applied yet.
    return { error: insertErr.message || 'insert_failed', status: 500 }
  }

  return {
    token,
    urlPath: `/c/${client.slug}/m/${token}`,
    expiresAt,
  }
}

export async function loadClientMomentByToken(
  sb: SupabaseClient<any>,
  token: string,
): Promise<ClientMomentSnapshot & { slug: string; title: string } | null> {
  const clean = String(token || '').trim()
  if (!clean || clean.length < 16) return null

  const { data: row } = await sb
    .from('client_moments')
    .select('title,scope,project_id,pulse_json,proof_json,summary,branding_json,expires_at,revoked_at,created_at,agency_client_id')
    .eq('token', clean)
    .maybeSingle()

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

export async function revokeClientMoment(
  sb: SupabaseClient<any>,
  token: string,
): Promise<boolean> {
  const { error } = await sb
    .from('client_moments')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('token', token)
    .is('revoked_at', null)
  return !error
}
