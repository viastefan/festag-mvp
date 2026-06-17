import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveExternalHandoff, resolveHandoffFromOption } from '@/lib/decisions/external-handoffs'

export const runtime = 'nodejs'

/**
 * GET /api/decisions/:id/handoff?option=<external_id|label>
 *
 * Resolves a guided external setup flow for a decision option.
 * Merges decision_options.implications_json.external_handoff with the
 * built-in provider registry (Stripe, Vercel, GitHub, …).
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const optionKey = new URL(req.url).searchParams.get('option')?.trim()
  if (!optionKey) return NextResponse.json({ error: 'option query required' }, { status: 400 })

  const { data: d } = await (supa as any).from('decisions')
    .select('id,decision_type,recommended_option,options_json')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: options } = await (supa as any)
    .from('decision_options')
    .select('id,external_id,label,client_label,description,implications_json,recommended_by_tagro')
    .eq('decision_id', ctx.params.id)
    .order('ordinal', { ascending: true })

  const list = (options as any[]) ?? []
  const match = list.find(o =>
    o.external_id === optionKey ||
    o.id === optionKey ||
    (o.label && o.label.toLowerCase() === optionKey.toLowerCase()) ||
    (o.client_label && o.client_label.toLowerCase() === optionKey.toLowerCase()),
  )

  let handoff = match
    ? resolveHandoffFromOption(match, d.decision_type)
    : null

  if (!handoff) {
    const legacy = Array.isArray(d.options_json)
      ? d.options_json.find((o: { id: string; label: string }) =>
        o.id === optionKey || o.label?.toLowerCase() === optionKey.toLowerCase(),
      )
      : null
    handoff = resolveExternalHandoff({
      optionId: optionKey,
      optionLabel: legacy?.label || optionKey,
      optionDescription: legacy?.hint,
      decisionType: d.decision_type,
    })
  }

  if (!handoff) {
    return NextResponse.json({ handoff: null })
  }

  return NextResponse.json({ handoff })
}
