import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runOpenAIJson } from '@/lib/tagro/openai'
import { getDocTemplate, type DocKind } from '@/lib/documents/templates'

export const runtime = 'nodejs'

/**
 * POST /api/documents/draft  { kind, brief }
 *
 * Tagro reads the free-text brief and fills the chosen document template —
 * returns a `data` object (field_key → value, positions[]) that pre-fills the
 * builder. Human reviews + edits before creating (legal documents stay
 * human-confirmed). Falls back to an empty object if no AI is configured.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const kind = body?.kind as DocKind
  const brief = String(body?.brief ?? '').trim()
  const template = getDocTemplate(kind)
  if (!template || !brief) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const schema = template.fields.map(f => `- ${f.key} (${f.type}): ${f.label}`).join('\n')
  const hasPositions = template.fields.some(f => f.type === 'positions')

  const prompt = [
    `Dokumenttyp: ${template.title}.`,
    `Fülle die folgenden Felder aus dem Briefing. Felder:`,
    schema,
    hasPositions
      ? `Für "positions" gib ein Array von { "description": string, "qty": number, "unit_price": number } (Einzelpreis in EUR, ohne Währungssymbol).`
      : '',
    `Briefing des Nutzers:\n"""${brief}"""`,
    `Gib ein JSON-Objekt zurück, dessen Schlüssel exakt die Feld-Keys oben sind. Lass unbekannte Felder weg oder leer. Datumsfelder im Format YYYY-MM-DD. Keine erfundenen rechtlichen Angaben.`,
  ].filter(Boolean).join('\n\n')

  const result = await runOpenAIJson({
    prompt,
    runType: 'document_draft',
    fallback: () => ({}),
  })

  // Keep only known field keys; coerce positions into the expected shape.
  const allowed = new Set(template.fields.map(f => f.key))
  const raw = (result.output ?? {}) as Record<string, any>
  const data: Record<string, any> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k)) continue
    if (k === 'positions' && Array.isArray(v)) {
      data.positions = v.map((p: any) => ({
        description: String(p?.description ?? ''),
        qty: Number(p?.qty) || 0,
        unit_price: Number(p?.unit_price) || 0,
      })).filter((p: any) => p.description || p.unit_price)
    } else {
      data[k] = typeof v === 'string' ? v : v == null ? '' : String(v)
    }
  }

  return NextResponse.json({ data, model: result.model, status: result.status })
}
