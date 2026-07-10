import { printAgencyDocument } from '@/components/documents/documents-shared'

export async function openAgencyDocumentPdfById(
  id: string,
  apiBase = '/api/documents',
): Promise<boolean> {
  const res = await fetch(`${apiBase}/${id}`, { credentials: 'include' })
  const data = await res.json().catch(() => null)
  const doc = data?.document
  if (!res.ok || !doc) return false
  printAgencyDocument(doc)
  return true
}
