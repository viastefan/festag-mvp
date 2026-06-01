import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDocTemplate, positionsTotal, type DocKind } from '@/lib/documents/templates'

export const runtime = 'nodejs'

/**
 * Agency documents (Angebot / Vertrag / Rechnung).
 *   GET  → list documents the user can see (RLS-scoped to their workspace)
 *   POST { kind, workspace_id, client_id?, project_id?, title?, data }
 *        → create one: assigns the next per-workspace number, snapshots the
 *          brand (White-Label brand or Festag default), computes the total.
 */

const FESTAG_BRAND = { name: 'Festag', color: '#5B647D', logo_url: null as string | null, address: null as string | null, footer: null as string | null }

export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { data } = await (supa as any).from('agency_documents')
    .select('id,kind,number_label,title,status,total_cents,currency,client_id,project_id,created_at,data,brand_snapshot')
    .order('created_at', { ascending: false })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const kind = body?.kind as DocKind
  const workspaceId = body?.workspace_id as string
  const template = getDocTemplate(kind)
  if (!template || !workspaceId) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  // Brand snapshot: White-Label brand if active, else Festag default.
  let brand = { ...FESTAG_BRAND }
  const { data: branding } = await (supa as any).from('workspace_branding')
    .select('plan,brand_name,brand_color,logo_url,mail_from').eq('workspace_id', workspaceId).maybeSingle()
  if (branding && branding.plan && branding.plan !== 'powered_by_festag' && branding.brand_name) {
    brand = {
      name: branding.brand_name,
      color: branding.brand_color || '#5B647D',
      logo_url: branding.logo_url || null,
      address: null,
      footer: branding.mail_from || null,
    }
  }

  // Next per-workspace, per-kind number.
  const { data: num, error: numErr } = await (supa as any).rpc('next_agency_doc_number', { p_workspace: workspaceId, p_kind: kind })
  if (numErr) return NextResponse.json({ error: numErr.message }, { status: 403 })
  const n: number = typeof num === 'number' ? num : 1
  const numberLabel = `${template.numberPrefix}-${String(n).padStart(4, '0')}`

  const data = body?.data ?? {}
  const totalCents = template.hasTotal ? Math.round(positionsTotal(data.positions) * 100) : null

  const { data: doc, error } = await (supa as any).from('agency_documents').insert({
    workspace_id: workspaceId,
    client_id: body?.client_id || null,
    project_id: body?.project_id || null,
    kind,
    number: n,
    number_label: numberLabel,
    title: body?.title || template.title,
    data,
    brand_snapshot: brand,
    status: 'final',
    total_cents: totalCents,
    currency: 'EUR',
    created_by: user.id,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })

  return NextResponse.json({ document: doc })
}
