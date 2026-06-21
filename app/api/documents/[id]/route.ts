import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** GET one document (for the print/preview view) + PATCH its status. */

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { data } = await (supa as any).from('agency_documents').select('*').eq('id', ctx.params.id).maybeSingle()
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ document: data })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const status = body?.status as string
  const markSigned = body?.mark_signed === true

  const { data: existing } = await (supa as any).from('agency_documents').select('id,kind,data,status').eq('id', ctx.params.id).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (markSigned) {
    if (existing.kind !== 'vertrag') return NextResponse.json({ error: 'not_a_contract' }, { status: 400 })
    const data = { ...(existing.data || {}), signed_at: new Date().toISOString() }
    patch.data = data
    patch.status = 'sent'
  } else if (status) {
    if (!['draft', 'final', 'sent', 'paid'].includes(status)) return NextResponse.json({ error: 'bad_status' }, { status: 400 })
    patch.status = status
  } else {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { data, error } = await (supa as any).from('agency_documents')
    .update(patch).eq('id', ctx.params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ document: data })
}
