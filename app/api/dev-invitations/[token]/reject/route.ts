import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const service = getServiceClient()
  if (!service) return new NextResponse('Service unavailable', { status: 503 })
  const sb = service as any

  const { data: invitation } = await sb
    .from('dev_invitations')
    .select('id,invited_by,project_id,dev_email,dev_name,status')
    .eq('reject_token', token)
    .maybeSingle()

  if (!invitation) {
    return htmlResponse('Ungültiger Link', 'Dieser Ablehnungslink ist ungültig oder wurde bereits verwendet.')
  }

  if (invitation.status !== 'awaiting_confirmation') {
    return htmlResponse('Bereits verarbeitet', 'Diese Einladung wurde bereits bearbeitet.')
  }

  await sb.from('dev_invitations').update({
    status: 'rejected',
    rejected_at: new Date().toISOString(),
  }).eq('id', invitation.id)

  if (invitation.invited_by) {
    await sb.from('notifications').insert({
      user_id: invitation.invited_by,
      project_id: invitation.project_id,
      audience: 'client',
      kind: 'invite_rejected',
      type: 'invite_rejected',
      title: 'Einladung abgelehnt',
      body: `${invitation.dev_name || invitation.dev_email} hat die Einladung abgelehnt.`,
      message: 'Dev-Einladung abgelehnt.',
      read: false,
      payload: {
        dev_email: invitation.dev_email,
        dev_name: invitation.dev_name,
      },
    })
  }

  return htmlResponse('Abgelehnt', 'Du hast die Einladung abgelehnt. Du kannst dieses Fenster schließen.')
}

function htmlResponse(title: string, message: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
    .card{background:#fff;border-radius:16px;padding:40px;max-width:400px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.06)}
    h1{font-size:20px;margin:0 0 12px;color:#0f0f10}p{font-size:15px;color:#6e717e;margin:0}</style>
    </head><body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
