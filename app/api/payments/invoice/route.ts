import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { nextInvoiceNumber } from '@/lib/billing/invoice-number'
import { sendGenericEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const body = await req.json().catch(() => ({}))
    const milestoneId: string | undefined = body?.milestoneId
    if (!milestoneId) return NextResponse.json({ error: 'missing_milestoneId' }, { status: 400 })

    const { data: milestone } = await sb
      .from('milestones')
      .select('id,project_id,title,amount,currency,status')
      .eq('id', milestoneId)
      .maybeSingle()
    if (!milestone) return NextResponse.json({ error: 'milestone_not_found' }, { status: 404 })
    if (milestone.status === 'paid') return NextResponse.json({ error: 'already_paid' }, { status: 400 })

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,assigned_dev,workspace_id,client_id')
      .eq('id', milestone.project_id)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    const isOwner = project.user_id === user.id || project.client_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const workspaceId = project.workspace_id
    let branding: any = null
    if (workspaceId) {
      const { data } = await sb
        .from('workspace_branding')
        .select('invoice_company_name,invoice_company_address,invoice_iban,invoice_bic,invoice_vat_id,invoice_footer')
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      branding = data
    }

    const invoiceNumber = await nextInvoiceNumber(sb, workspaceId || project.id)

    const invoiceText = [
      `Rechnung ${invoiceNumber}`,
      '',
      branding?.invoice_company_name || 'Festag',
      branding?.invoice_company_address || '',
      branding?.invoice_vat_id ? `USt-IdNr.: ${branding.invoice_vat_id}` : '',
      '',
      `Projekt: ${project.title}`,
      `Milestone: ${milestone.title}`,
      `Betrag: ${Number(milestone.amount).toFixed(2)} ${milestone.currency || 'EUR'}`,
      '',
      'Zahlungsinformationen:',
      branding?.invoice_iban ? `IBAN: ${branding.invoice_iban}` : 'IBAN: wird nachgereicht',
      branding?.invoice_bic ? `BIC: ${branding.invoice_bic}` : '',
      `Verwendungszweck: ${invoiceNumber}`,
      '',
      branding?.invoice_footer || 'Vielen Dank für Ihr Vertrauen.',
    ].filter(Boolean).join('\n')

    const { data: payment } = await sb
      .from('payments')
      .insert({
        user_id: user.id,
        project_id: project.id,
        milestone_id: milestoneId,
        provider: 'invoice',
        payment_method: 'invoice',
        amount: milestone.amount,
        currency: milestone.currency || 'EUR',
        status: 'pending',
        description: `${project.title} — ${milestone.title}`,
        invoice_number: invoiceNumber,
      })
      .select('id')
      .single()

    const { data: clientProfile } = await sb
      .from('profiles')
      .select('email,full_name,first_name')
      .eq('id', user.id)
      .maybeSingle()

    if (clientProfile?.email) {
      await sendGenericEmail({
        to: clientProfile.email,
        subject: `Rechnung ${invoiceNumber} — ${project.title}`,
        body: invoiceText,
      }).catch(() => {})
    }

    await sb.from('notifications').insert({
      user_id: user.id,
      project_id: project.id,
      audience: 'client',
      kind: 'invoice_sent',
      type: 'invoice_sent',
      title: `Rechnung ${invoiceNumber} erstellt`,
      body: `Die Rechnung für „${milestone.title}" wurde erstellt und per Mail zugestellt.`,
      message: `Rechnung ${invoiceNumber} erstellt.`,
      read: false,
      payload: { milestone_id: milestoneId, invoice_number: invoiceNumber, payment_id: payment?.id },
    })

    const { data: admins } = await sb
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(10)

    for (const admin of (admins || [])) {
      await sb.from('notifications').insert({
        user_id: admin.id,
        project_id: project.id,
        audience: 'admin',
        kind: 'invoice_awaiting_confirmation',
        type: 'invoice_awaiting_confirmation',
        title: `Rechnung ${invoiceNumber} — auf Zahlungseingang prüfen`,
        body: `${project.title}: ${Number(milestone.amount).toFixed(2)} ${milestone.currency || 'EUR'}`,
        message: 'Rechnung manuell als bezahlt markieren.',
        read: false,
        payload: { milestone_id: milestoneId, invoice_number: invoiceNumber, payment_id: payment?.id },
      })
    }

    return NextResponse.json({ ok: true, invoiceNumber, paymentId: payment?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'invoice_failed' }, { status: 500 })
  }
}
