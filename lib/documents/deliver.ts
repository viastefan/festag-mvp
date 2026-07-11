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

/**
 * Notify project client + assigned developer when a document is sent.
 * projects.client_id is an agency_clients row — never use it as auth.users id.
 * The portal client is projects.user_id.
 */
export async function deliverAgencyDocument(
  sb: SupabaseClient<any>,
  doc: AgencyDoc,
  actorId: string,
): Promise<void> {
  if (doc.status !== 'sent' || !doc.project_id) return

  const { data: project } = await sb
    .from('projects')
    .select('id,title,user_id,assigned_dev')
    .eq('id', doc.project_id)
    .maybeSingle()

  if (!project) return

  const clientUserId = (project as { user_id?: string | null }).user_id || null
  const devUserId = (project as { assigned_dev?: string | null }).assigned_dev || null
  const projectTitle = (project as { title?: string }).title || 'Projekt'
  const kindLabel = KIND_LABEL[doc.kind] || 'Dokument'
  const recipientName = typeof doc.data?.recipient_name === 'string' ? doc.data.recipient_name : null

  const title = `${kindLabel} ${doc.number_label}`
  const body = recipientName
    ? `${kindLabel} für ${recipientName}, Projekt „${projectTitle}"`
    : `${kindLabel} zu „${projectTitle}"`

  const recipients: Array<{ userId: string; category: 'billing' | 'team' }> = []

  if (clientUserId) {
    recipients.push({ userId: clientUserId, category: 'billing' })
  }
  if (devUserId && devUserId !== clientUserId) {
    recipients.push({ userId: devUserId, category: 'team' })
  }

  // Solo / delivery workspaces: project owner is often the sender — still leave a receipt.
  if (recipients.length === 0 && actorId) {
    recipients.push({ userId: actorId, category: 'billing' })
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
