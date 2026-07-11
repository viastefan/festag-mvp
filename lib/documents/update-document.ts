import { getDocTemplate, positionsTotal, type DocKind } from '@/lib/documents/templates'
import { normalizeDocumentData } from '@/lib/documents/document-defaults'

export type UpdateAgencyDocumentInput = {
  data?: Record<string, unknown>
  clientId?: string | null
  projectId?: string | null
  title?: string | null
  status?: 'draft' | 'final' | 'sent' | 'paid'
  markSigned?: boolean
}

export function buildDocumentPatch(
  existing: { kind: string; status: string; data?: Record<string, unknown> | null },
  input: UpdateAgencyDocumentInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const locked = existing.status === 'sent' || existing.status === 'paid'

  if (input.markSigned) {
    if (existing.kind !== 'vertrag') throw new Error('not_a_contract')
    patch.data = { ...(existing.data || {}), signed_at: new Date().toISOString() }
    patch.status = 'sent'
    return patch
  }

  if (input.status) {
    if (!['draft', 'final', 'sent', 'paid'].includes(input.status)) throw new Error('bad_status')
    patch.status = input.status
  }

  if (input.data !== undefined) {
    if (locked) throw new Error('document_locked')
    const kind = existing.kind as DocKind
    const merged = {
      ...(existing.data && typeof existing.data === 'object' ? existing.data : {}),
      ...input.data,
    }
    const normalized = normalizeDocumentData(kind, merged)
    patch.data = normalized
    const template = getDocTemplate(kind)
    if (template?.hasTotal) {
      patch.total_cents = Math.round(positionsTotal(normalized.positions as any) * 100)
    }
  }

  if (input.clientId !== undefined) {
    if (locked) throw new Error('document_locked')
    patch.client_id = input.clientId || null
  }
  if (input.projectId !== undefined) {
    if (locked) throw new Error('document_locked')
    patch.project_id = input.projectId || null
  }
  if (input.title !== undefined) {
    if (locked) throw new Error('document_locked')
    patch.title = input.title || null
  }

  if (Object.keys(patch).length === 1) throw new Error('bad_request')
  return patch
}
