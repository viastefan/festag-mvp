import type { DocKind } from '@/lib/documents/templates'

export function defaultDocumentData(kind: DocKind): Record<string, unknown> {
  const base = {
    date: new Date().toISOString().slice(0, 10),
  }
  if (kind === 'rechnung' || kind === 'angebot') {
    return {
      ...base,
      positions: [{ description: '', qty: 1, unit_price: 0 }],
    }
  }
  return base
}

export function normalizeDocumentData(kind: DocKind, data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data }
  if (!next.date) next.date = new Date().toISOString().slice(0, 10)
  if ((kind === 'rechnung' || kind === 'angebot') && !Array.isArray(next.positions)) {
    next.positions = [{ description: '', qty: 1, unit_price: 0 }]
  }
  if (kind === 'rechnung' && !String(next.tax_note ?? '').trim()) delete next.tax_note
  return next
}
