import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { deliverAgencyDocument } from '@/lib/documents/deliver'
import { userCanAccessProjectDocuments } from '@/lib/documents/project-access'

export const runtime = 'nodejs'

async function devUser(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  return cookieUser ?? getDevUserFromRequest(req)
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const user = await devUser(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const supa = createClient()
  const body = await req.json().catch(() => ({} as any))
  const status = body?.status as string

  const { data: existing } = await (supa as any).from('agency_documents')
    .select('id,kind,data,status,project_id,number_label')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!existing?.project_id) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const access = await userCanAccessProjectDocuments(supa as any, user.id, existing.project_id)
  if (!access.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (!status || !['final', 'sent', 'paid'].includes(status)) {
    return NextResponse.json({ error: 'bad_status' }, { status: 400 })
  }

  const wasSent = existing.status === 'sent'
  const { data, error } = await (supa as any).from('agency_documents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ctx.params.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })

  if (status === 'sent' && !wasSent) {
    const service = getServiceClient()
    if (service) {
      await deliverAgencyDocument(service as any, data, user.id).catch(() => {})
    }
  }

  return NextResponse.json({ document: data })
}
