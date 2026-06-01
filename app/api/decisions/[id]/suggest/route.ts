import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasTagroAI as hasGeminiKey, runTagroText as runGeminiText } from '@/lib/tagro/text'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/suggest
 *
 * Runs Tagro across the decision (title + description + options) and
 * stores a recommendation back as `recommended_option` (id) + the calm
 * one-paragraph `tagro_reasoning`. Pulls minimal project context so
 * Tagro can reason about scope before suggesting.
 *
 * Does NOT decide — that's the client's call. This route only enriches
 * the decision row with Tagro's view.
 */

const SYSTEM = `Du bist Tagro, der ruhige AI-Projektmanager von Festag.

Du liest eine konkrete Entscheidung, die der Kunde gleich treffen soll.
Du kennst Titel, Beschreibung, die angebotenen Optionen und etwas
Projektkontext.

Du antwortest mit:
  • recommended_option_id:  die id einer der angebotenen Optionen,
                            ODER 'freeform' wenn keine Option passt.
  • reasoning:              2–4 Sätze auf Deutsch, ruhig, konkret.
                            Was spricht für diese Option, was wäre
                            das Risiko der anderen.
  • urgency_hint:           low | normal | high | critical — wie
                            schnell sollte das entschieden werden.

Spielregeln:
  • Wenn die Beschreibung dünn ist und du nicht ehrlich empfehlen kannst,
    sag recommended_option_id="freeform" und erkläre kurz warum.
  • Keine Floskeln, keine Emojis, kein "Du könntest…" — direkt.
  • Antworte AUSSCHLIESSLICH mit validem JSON, kein Markdown.

Format: {"recommended_option_id":"opt-1","reasoning":"…","urgency_hint":"normal"}`

function stripFence(s: string) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
}

function parseSuggestion(raw: string) {
  return JSON.parse(stripFence(raw).replace(/<think>[\s\S]*?<\/think>/g, '').trim())
}

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: d } = await (supa as any).from('decisions')
    .select('id,title,description,options_json,project_id,urgency')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let projectContext = ''
  if (d.project_id) {
    const { data: p } = await (supa as any)
      .from('projects').select('title,scope_summary,description,status').eq('id', d.project_id).maybeSingle()
    if (p) projectContext = `Projekt „${p.title}" (Status: ${p.status || 'unbekannt'}). Scope: ${p.scope_summary || p.description || '—'}`
  }

  const options = Array.isArray(d.options_json) ? d.options_json : []
  const optionsBlock = options.length
    ? options.map((o: any, i: number) => `  • [${o.id || `opt-${i + 1}`}] ${o.label || ''}${o.hint ? ` — ${o.hint}` : ''}`).join('\n')
    : '  (keine vordefinierten Optionen — Tagro darf "freeform" empfehlen)'

  const apiKey = process.env.MINIMAX_API_KEY
    || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'

  let recommended_option_id: string | null = null
  let reasoning = ''
  let urgency_hint: string | null = null

  try {
    const userPrompt =
      `Entscheidung: ${d.title}\n\n` +
      `Kontext (Dev hat geschrieben):\n${d.description || '—'}\n\n` +
      `Optionen:\n${optionsBlock}\n\n` +
      (projectContext ? `Projekt-Kontext:\n${projectContext}\n` : '')

    let raw: string | null = null
    if (hasGeminiKey()) {
      const gemini = await runGeminiText({
        system: SYSTEM,
        prompt: userPrompt,
        maxTokens: 1200,
        temperature: 0.2,
        responseMimeType: 'application/json',
      })
      if (gemini.ok && gemini.text) raw = gemini.text
    }

    if (!raw) {
      const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'MiniMax-M2.7',
          max_tokens: 1200,
          reasoning_effort: 'none',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userPrompt },
          ],
        }),
      })
      if (res.ok) {
        const ai = await res.json().catch(() => null)
        raw = ai?.choices?.[0]?.message?.content ?? null
      }
    }

    if (raw) {
      try {
        const parsed = parseSuggestion(raw)
        recommended_option_id = typeof parsed?.recommended_option_id === 'string' ? parsed.recommended_option_id : null
        reasoning = typeof parsed?.reasoning === 'string' ? parsed.reasoning.trim() : ''
        urgency_hint = ['low', 'normal', 'high', 'critical'].includes(parsed?.urgency_hint) ? parsed.urgency_hint : null
      } catch {/* keep empty */}
    }
  } catch {/* network */}

  await (supa as any).from('decisions').update({
    recommended_option: recommended_option_id,
    tagro_reasoning: reasoning,
    tagro_run_at: new Date().toISOString(),
    ...(urgency_hint ? { urgency: urgency_hint } : {}),
  }).eq('id', ctx.params.id)

  return NextResponse.json({ recommended_option: recommended_option_id, reasoning, urgency_hint })
}
