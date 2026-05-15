import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

function uuidOrNull(value: unknown) {
  const text = typeof value === 'string' ? value : ''
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null
}

/**
 * Mollie webhook. Mollie POSTs `id` (paymentId). We GET status from Mollie API
 * and update payments table accordingly.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const id = String(form.get('id') ?? '')
    if (!id) return NextResponse.json({ ok: false }, { status: 400 })

    const key = process.env.MOLLIE_API_KEY
    if (!key) return NextResponse.json({ ok: false }, { status: 500 })

    const r = await fetch(`https://api.mollie.com/v2/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    })
    const data = await r.json()

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const projectId = uuidOrNull(data.metadata?.projectId)
      const milestoneId = uuidOrNull(data.metadata?.milestoneId)
      let userId: string | null = null
      if (projectId) {
        const { data: project } = await sb.from('projects').select('user_id').eq('id', projectId).maybeSingle()
        userId = (project as any)?.user_id ?? null
      }
      await sb.from('payments').upsert({
        user_id: userId,
        project_id: projectId,
        milestone_id: milestoneId,
        provider: 'mollie',
        provider_id: id,
        status: data.status,
        amount: Number(data.amount?.value ?? 0),
        currency: data.amount?.currency ?? 'EUR',
        description: data.description ?? null,
        metadata: data.metadata ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider_id' }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
