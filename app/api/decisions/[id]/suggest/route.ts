import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tagroComplete } from '@/lib/tagro/complete'
import { resolveRecommendedOption, splitReasonText } from '@/lib/overview/decision-canvas'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/suggest
 *
 * Enriches a decision with Tagro's recommendation for the Decision Canvas.
 * Uses decision_options (preferred) and falls back to options_json.
 * When no options exist (legacy rows), Tagro proposes 2–4 options and persists them.
 * Writes recommended_option, tagro_reasoning, tagro_recommendation_reason,
 * and marks recommended_by_tagro on the matching option row.
 */

const SYSTEM_WITH_OPTIONS = `Du bist Tagro, der ruhige COO von Festag.

Du liest eine konkrete Entscheidung, die der Mensch gleich treffen soll.
Du kennst Titel, Beschreibung, die angebotenen Optionen und etwas Projektkontext.

Du antwortest mit:
  • recommended_option_id:  die id einer der angebotenen Optionen
                            (genau wie angegeben), ODER 'freeform'.
  • reasoning:              2–4 kurze Sätze auf Deutsch, ruhig, konkret.
  • reasons:                Array mit 2–4 kurzen Bullet-Gründen (Deutsch).
  • urgency_hint:           low | normal | high | critical

Spielregeln:
  • Wenn die Beschreibung dünn ist und du nicht ehrlich empfehlen kannst,
    sag recommended_option_id="freeform" und erkläre kurz warum.
  • Keine Floskeln, keine Emojis.
  • Antworte AUSSCHLIESSLICH mit validem JSON.

Format:
{"recommended_option_id":"opt-1","reasoning":"…","reasons":["…","…"],"urgency_hint":"normal"}`

const SYSTEM_GENERATE_OPTIONS = `Du bist Tagro, der ruhige COO von Festag.

Diese Entscheidung hat noch keine Optionen. Du formulierst 2–4 klare,
entscheidbare Optionen auf Deutsch und empfiehlst eine davon.

Antwort:
  • options: Array mit 2–4 Objekten:
      { "id":"opt-1", "label":"kurze Option", "hint":"ein ruhiger Nebensatz" }
  • recommended_option_id: eine der options.id
  • reasoning: 2–4 kurze Sätze
  • reasons: 2–4 Bullet-Gründe
  • urgency_hint: low | normal | high | critical

Regeln:
  • Labels kurz, klar, entscheidbar (kein „Vielleicht“).
  • Erste Option ist oft die ruhigste/sicherste — aber nur wenn ehrlich.
  • Keine Floskeln, keine Emojis.
  • Nur valides JSON.

Format:
{"options":[{"id":"opt-1","label":"…","hint":"…"},{"id":"opt-2","label":"…","hint":"…"}],"recommended_option_id":"opt-1","reasoning":"…","reasons":["…","…"],"urgency_hint":"normal"}`

function stripFence(s: string) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
}

function parseSuggestion(raw: string) {
  return JSON.parse(stripFence(raw).replace(/<think>[\s\S]*?<\/think>/g, '').trim())
}

type CanvasOpt = {
  id: string
  rowId: string | null
  label: string
  hint: string | null
  recommended: boolean
}

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: d } = await (supa as any)
    .from('decisions')
    .select(
      'id,title,description,client_title,client_summary,options_json,project_id,urgency,recommended_option,tagro_reasoning,tagro_recommendation_reason,response_type',
    )
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: optionRows } = await (supa as any)
    .from('decision_options')
    .select('id,external_id,label,client_label,ordinal,recommended_by_tagro,description')
    .eq('decision_id', d.id)
    .order('ordinal', { ascending: true })

  let tableOpts = (optionRows as any[]) || []
  const legacyOpts = Array.isArray(d.options_json) ? d.options_json : []

  let canvasOpts: CanvasOpt[] =
    tableOpts.length > 0
      ? tableOpts.map((o) => ({
          id: String(o.external_id || o.id),
          rowId: String(o.id),
          label: String(o.client_label || o.label || 'Option'),
          hint:
            typeof o.description === 'string' && o.description.trim()
              ? o.description.trim()
              : null,
          recommended: Boolean(o.recommended_by_tagro),
        }))
      : legacyOpts
          .filter((o: any) => o && (o.id || o.label))
          .map((o: any, i: number) => ({
            id: String(o.id || `opt-${i + 1}`),
            rowId: null as string | null,
            label: String(o.label || o.id || 'Option'),
            hint: typeof o.hint === 'string' ? o.hint : null,
            recommended: false,
          }))

  const needsOptionGeneration = canvasOpts.length === 0

  let projectContext = ''
  if (d.project_id) {
    const { data: p } = await (supa as any)
      .from('projects')
      .select('title,scope_summary,description,status')
      .eq('id', d.project_id)
      .maybeSingle()
    if (p) {
      projectContext = `Projekt „${p.title}" (Status: ${p.status || 'unbekannt'}). Scope: ${p.scope_summary || p.description || '—'}`
    }
  }

  let recommended_option_id: string | null = null
  let reasoning = ''
  let reasons: string[] = []
  let urgency_hint: string | null = null
  let generatedOptions: Array<{ id: string; label: string; hint: string | null }> = []

  try {
    const title = d.client_title || d.title
    const description = d.client_summary || d.description || '—'

    const optionsBlock = needsOptionGeneration
      ? '  (noch keine Optionen — bitte formulieren)'
      : canvasOpts.map((o) => `  • [${o.id}] ${o.label}`).join('\n')

    const userPrompt =
      `Entscheidung: ${title}\n\n` +
      `Kontext:\n${description}\n\n` +
      `Optionen:\n${optionsBlock}\n\n` +
      (projectContext ? `Projekt-Kontext:\n${projectContext}\n` : '')

    const ai = await tagroComplete({
      system: needsOptionGeneration ? SYSTEM_GENERATE_OPTIONS : SYSTEM_WITH_OPTIONS,
      prompt: userPrompt,
      maxTokens: needsOptionGeneration ? 1800 : 1400,
      temperature: 0.25,
      json: true,
    })
    const raw: string | null = ai.ok && ai.text ? ai.text : null

    if (raw) {
      try {
        const parsed = parseSuggestion(raw)
        recommended_option_id =
          typeof parsed?.recommended_option_id === 'string'
            ? parsed.recommended_option_id
            : null
        reasoning =
          typeof parsed?.reasoning === 'string' ? parsed.reasoning.trim() : ''
        if (Array.isArray(parsed?.reasons)) {
          reasons = parsed.reasons
            .filter((r: unknown) => typeof r === 'string' && (r as string).trim().length > 4)
            .map((r: string) => r.trim())
            .slice(0, 5)
        }
        urgency_hint = ['low', 'normal', 'high', 'critical'].includes(parsed?.urgency_hint)
          ? parsed.urgency_hint
          : null

        if (needsOptionGeneration && Array.isArray(parsed?.options)) {
          generatedOptions = parsed.options
            .filter((o: any) => o && (o.label || o.id))
            .slice(0, 4)
            .map((o: any, i: number) => ({
              id: String(o.id || `opt-${i + 1}`).trim() || `opt-${i + 1}`,
              label: String(o.label || o.id || `Option ${i + 1}`).trim(),
              hint:
                typeof o.hint === 'string' && o.hint.trim() ? o.hint.trim().slice(0, 180) : null,
            }))
        }
      } catch {
        /* keep empty */
      }
    }
  } catch {
    /* network */
  }

  /* Persist generated options for legacy empty decisions */
  if (needsOptionGeneration && generatedOptions.length >= 2) {
    const rows = generatedOptions.map((o, i) => ({
      decision_id: d.id,
      ordinal: i,
      external_id: o.id.startsWith('opt-') ? o.id : `opt-${i + 1}`,
      label: o.label,
      client_label: o.label,
      description: o.hint,
      implications_json: {},
      recommended_by_tagro: false,
    }))

    const { data: inserted } = await (supa as any)
      .from('decision_options')
      .insert(rows)
      .select('id,external_id,label,client_label,description,recommended_by_tagro')

    if (inserted?.length) {
      tableOpts = inserted
      canvasOpts = inserted.map((o: any) => ({
        id: String(o.external_id || o.id),
        rowId: String(o.id),
        label: String(o.client_label || o.label || 'Option'),
        hint:
          typeof o.description === 'string' && o.description.trim()
            ? o.description.trim()
            : null,
        recommended: false,
      }))
    }

    const legacyJson = canvasOpts.map((o) => ({
      id: o.id,
      label: o.label,
      hint: o.hint || undefined,
    }))
    await (supa as any)
      .from('decisions')
      .update({ options_json: legacyJson })
      .eq('id', d.id)
  } else if (needsOptionGeneration && canvasOpts.length === 0) {
    /* AI failed — calm binary fallback so the canvas still works */
    const binary =
      d.response_type === 'binary'
        ? [
            { id: 'yes', label: 'Ja', hint: 'Zustimmen und fortfahren.' },
            { id: 'no', label: 'Nein', hint: 'Ablehnen und Feedback geben.' },
          ]
        : [
            {
              id: 'opt-1',
              label: 'Empfehlung übernehmen',
              hint: 'Tagro führt den nächsten Schritt aus.',
            },
            {
              id: 'opt-2',
              label: 'Anpassen',
              hint: 'Du behältst die Kontrolle.',
            },
          ]
    const rows = binary.map((o, i) => ({
      decision_id: d.id,
      ordinal: i,
      external_id: o.id,
      label: o.label,
      client_label: o.label,
      description: o.hint,
      implications_json: {},
      recommended_by_tagro: i === 0,
    }))
    const { data: inserted } = await (supa as any)
      .from('decision_options')
      .insert(rows)
      .select('id,external_id,label,client_label,description,recommended_by_tagro')
    if (inserted?.length) {
      canvasOpts = inserted.map((o: any) => ({
        id: String(o.external_id || o.id),
        rowId: String(o.id),
        label: String(o.client_label || o.label || 'Option'),
        hint:
          typeof o.description === 'string' && o.description.trim()
            ? o.description.trim()
            : null,
        recommended: Boolean(o.recommended_by_tagro),
      }))
      recommended_option_id = canvasOpts[0]?.id || null
      if (!reasoning) {
        reasoning =
          'Ohne tiefere Daten empfiehlt Tagro die ruhigste Option — du kannst jederzeit anpassen.'
      }
      if (reasons.length === 0) {
        reasons = [
          'Schnelle Freigabe hält das Projekt in Bewegung.',
          'Du kannst die Entscheidung später noch anpassen.',
        ]
      }
      await (supa as any)
        .from('decisions')
        .update({
          options_json: canvasOpts.map((o) => ({
            id: o.id,
            label: o.label,
            hint: o.hint || undefined,
          })),
        })
        .eq('id', d.id)
    }
  }

  if (reasons.length === 0 && reasoning) {
    reasons = splitReasonText(reasoning)
  }

  const matched = resolveRecommendedOption(canvasOpts, recommended_option_id)
  const storeRecommended =
    matched?.id ||
    (recommended_option_id && recommended_option_id !== 'freeform'
      ? recommended_option_id
      : null)

  const recommendationReason =
    reasons.length > 0 ? reasons.map((r) => `• ${r}`).join('\n') : reasoning || null

  await (supa as any)
    .from('decisions')
    .update({
      recommended_option: storeRecommended,
      tagro_reasoning: reasoning || null,
      tagro_recommendation_reason: recommendationReason,
      impact_summary: recommendationReason,
      tagro_run_at: new Date().toISOString(),
      ...(urgency_hint ? { urgency: urgency_hint } : {}),
    })
    .eq('id', ctx.params.id)

  if (canvasOpts.some((o) => o.rowId) && matched?.rowId) {
    await (supa as any)
      .from('decision_options')
      .update({ recommended_by_tagro: false })
      .eq('decision_id', d.id)
    await (supa as any)
      .from('decision_options')
      .update({ recommended_by_tagro: true })
      .eq('id', matched.rowId)
  }

  return NextResponse.json({
    recommended_option: storeRecommended,
    reasoning,
    reasons,
    urgency_hint,
    matched_option_id: matched?.id || null,
    matched_label: matched?.label || null,
    options: canvasOpts.map((o) => ({
      id: o.id,
      label: o.label,
      hint: o.hint,
      recommended: Boolean(matched && o.id === matched.id),
    })),
    generated: needsOptionGeneration,
  })
}
