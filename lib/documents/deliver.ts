import type { SupabaseClient } from '@supabase/supabase-js'
import { createInboxItem } from '@/lib/inbox/create-item'

const KIND_LABEL: Record<string, string> = {
  rechnung: 'Rechnung',
  angebot: 'Angebot',
  vertrag: 'Vertrag',
}

type AgencyDoc = {
  id: string
  kind: string
  number_label: string
  project_id?: string | null
  data?: Record<string, unknown> | null
  status: string
}

export async function deliverAgencyDocument(
  sb: SupabaseClient<any>,
  doc: AgencyDoc,
  actorId: string,
): Promise<void> {
  if (doc.status !== 'sent' || !doc.project_id) return

  const { data: project } = await sb
    .from('projects')
    .select('id,title,user_id,client_id,assigned_dev')
    .eq('id', doc.project_id)
    .maybeSingle()

  if (!project) return

  const clientUserId = (project as any).client_id || (project as any).user_id
  const devUserId = (project as any).assigned_dev as string | null
  const projectTitle = (project as any).title || 'Projekt'
  const kindLabel = KIND_LABEL[doc.kind] || 'Dokument'
  const recipientName = typeof doc.data?.recipient_name === 'string' ? doc.data.recipient_name : null

  const title = `${kindLabel} ${doc.number_label}`
  const body = recipientName
    ? `${kindLabel} für ${recipientName}, Projekt „${projectTitle}"`
    : `${kindLabel} zu „${projectTitle}"`

  const recipients: Array<{ userId: string; category: 'billing' | 'team' }> = []

  if (clientUserId && clientUserId !== actorId) {
    recipients.push({ userId: clientUserId, category: 'billing' })
  }
  if (devUserId && devUserId !== actorId && devUserId !== clientUserId) {
    recipients.push({ userId: devUserId, category: 'team' })
  }

  await Promise.all(recipients.map((r) => createInboxItem(sb, {
    userId: r.userId,
    projectId: doc.project_id,
    category: r.category,
    type: doc.kind === 'rechnung' ? 'invoice_created' : 'project_event',
    title,
    body,
    actorId,
    sourceTable: 'agency_documents',
    sourceId: doc.id,
    metadata: {
      document_id: doc.id,
      kind: doc.kind,
      number_label: doc.number_label,
    },
  })))
}
