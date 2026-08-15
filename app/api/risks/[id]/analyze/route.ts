import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveRiskAudience } from '@/lib/risks/audience'
import { enrichRisk } from '@/lib/risks/enrich'
import { sanitizeRiskForAudience, sanitizeSignalsForAudience } from '@/lib/risks/present'
import type { Risk, RiskSignal } from '@/lib/risks/types'
import { safeTableRows } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/risks/[id]/analyze
 *
 * „Mit Tagro analysieren": Tagro formuliert Kundenfassung und Empfehlung neu.
 * Wahrscheinlichkeit, Auswirkung und Schweregrad bleiben unangetastet — die
 * kommen aus der Erkennung, nicht aus dem Modell.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data } = await (supa as any)
    .from('risks').select('*').eq('id', params.id).maybeSingle()
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const risk = data as Risk

  const [signals, projectRes] = await Promise.all([
    safeTableRows<RiskSignal>((supa as any)
      .from('risk_signals').select('*').eq('risk_id', risk.id)
      .order('weight', { ascending: false })),
    (supa as any).from('projects').select('title,target_date').eq('id', risk.project_id).maybeSingle(),
  ])

  const framing = await enrichRisk(supa, risk, signals, {
    projectTitle: projectRes?.data?.title ?? null,
    targetDate: projectRes?.data?.target_date ?? null,
  })

  const { data: fresh } = await (supa as any)
    .from('risks').select('*').eq('id', params.id).maybeSingle()

  const audience = await resolveRiskAudience(supa, user.id)

  return NextResponse.json({
    risk: sanitizeRiskForAudience((fresh ?? risk) as Risk, audience),
    signals: sanitizeSignalsForAudience(signals, audience),
    // false heißt: das Modell war nicht verfügbar oder seine Fassung hat die
    // Prüfung nicht bestanden — die bestehende Formulierung bleibt gültig.
    updated: !!framing,
    audience,
  })
}
