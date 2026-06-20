import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tagroComplete } from '@/lib/tagro/complete'

export const runtime = 'nodejs'

/**
 * POST /api/notes/:id/suggest
 *
 * Runs Tagro across the note body and stores structured suggestions
 * back onto notes.tagro_suggestions. The shape we standardise on:
 *
 *   {
 *     summary:  "2-3 sentence reading",
 *     themes:   ["Onboarding", "Pricing"],
 *     tasks:    [{ title, why, priority: 'high'|'medium'|'low', estimated_hours? }],
 *     decisions:[{ title, reason, options?: string[] }],
 *     followups:["Klären, ob X", ...],
 *     risks:    ["...", ...],
 *     tags:     ["...", ...]
 *   }
 *
 * Tasks are NOT created here — that's a separate explicit action via
 * /api/notes/:id/spawn-tasks. This route is read-only on the world
 * outside of the notes table.
 */

const SYSTEM = `Du bist Tagro, der AI-Projektmanager von Festag.

Du liest eine Notiz und gibst dem Nutzer ruhige, konkrete Vorschläge:
  • summary:   2–3 Sätze, was die Notiz inhaltlich sagt (ohne sie zu wiederholen)
  • themes:    1–4 prägnante Themen / Schlagworte (max 3 Wörter)
  • tasks:     0–5 konkrete Aufgaben, die aus der Notiz entstehen könnten
               jeweils mit title, why (1 Satz), priority (high|medium|low) und optional estimated_hours
  • decisions: 0–3 Entscheidungen, die dokumentiert werden sollten (Meeting/Spec)
               jeweils mit title, reason (1 Satz), optional options (2–4 kurze Optionen)
  • followups: 0–3 ruhige Klärungsfragen
  • risks:     0–3 Risiken oder Lücken, die sichtbar werden
  • tags:      0–6 tags, kleingeschrieben, ohne #

Spielregeln:
  • Nichts erfinden. Wenn die Notiz dünn ist, lieber 0–1 Vorschlag als gefüllte Listen mit Quatsch.
  • Auf Deutsch, ruhig, professionell. Keine Emojis. Kein "Du könntest…" — direkt formulieren.
  • Titel kurz und konkret, kein Marketing-Sprech.

Antworte AUSSCHLIESSLICH mit validem JSON, kein Markdown:
{ "summary":"…", "themes":[…], "tasks":[{"title":"…","why":"…","priority":"medium"}],
  "decisions":[{"title":"…","reason":"…","options":["A","B"]}],
  "followups":[…], "risks":[…], "tags":[…] }`

function stripCodeFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
}

function emptyResult() {
  return { summary: '', themes: [], tasks: [], decisions: [], followups: [], risks: [], tags: [] }
}

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: note, error: noteError } = await (supa as any)
    .from('notes').select('id,title,body,project_id').eq('id', ctx.params.id).maybeSingle()
  if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 })
  if (!note) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = (note.body || '').trim()
  if (body.length < 12) {
    const empty = emptyResult()
    await (supa as any).from('notes').update({
      tagro_suggestions: empty,
      tagro_last_run_at: new Date().toISOString(),
    }).eq('id', ctx.params.id)
    return NextResponse.json({ suggestions: empty, reason: 'note too short' })
  }

  // Pull a tiny bit of project context if attached.
  let context = ''
  if (note.project_id) {
    const { data: proj } = await (supa as any)
      .from('projects').select('title,scope_summary,description').eq('id', note.project_id).maybeSingle()
    if (proj) {
      context = `Diese Notiz hängt am Projekt „${proj.title}". Scope: ${proj.scope_summary || proj.description || '—'}`
    }
  }

  let suggestions = emptyResult()
  try {
    const userPrompt = `Titel: ${note.title || '(ohne)'}\n\n${context ? context + '\n\n' : ''}Notiz:\n${body}`

    const ai = await tagroComplete({
      system: SYSTEM,
      prompt: userPrompt,
      maxTokens: 2000,
      temperature: 0.2,
      json: true,
    })
    const raw: string | null = ai.ok && ai.text ? ai.text : null

    if (raw) {
      const cleaned = stripCodeFence(raw).replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      try {
        const parsed = JSON.parse(cleaned)
        suggestions = {
          summary: typeof parsed?.summary === 'string' ? parsed.summary.trim() : '',
          themes: Array.isArray(parsed?.themes) ? parsed.themes.slice(0, 4).map(String) : [],
          tasks: Array.isArray(parsed?.tasks) ? parsed.tasks.slice(0, 5).map((t: any) => ({
            title: String(t?.title || '').trim().slice(0, 140),
            why: String(t?.why || '').trim().slice(0, 280),
            priority: ['high', 'medium', 'low'].includes(t?.priority) ? t.priority : 'medium',
            estimated_hours: typeof t?.estimated_hours === 'number' && Number.isFinite(t.estimated_hours)
              ? Math.max(0.25, Math.min(80, t.estimated_hours)) : undefined,
          })).filter((t: any) => t.title) : [],
          decisions: Array.isArray(parsed?.decisions) ? parsed.decisions.slice(0, 3).map((d: any) => ({
            title: String(d?.title || '').trim().slice(0, 140),
            reason: String(d?.reason || d?.why || '').trim().slice(0, 400),
            options: Array.isArray(d?.options)
              ? d.options.map((o: any) => String(o).trim()).filter(Boolean).slice(0, 4)
              : [],
          })).filter((d: any) => d.title) : [],
          followups: Array.isArray(parsed?.followups) ? parsed.followups.slice(0, 3).map(String) : [],
          risks: Array.isArray(parsed?.risks) ? parsed.risks.slice(0, 3).map(String) : [],
          tags: Array.isArray(parsed?.tags) ? parsed.tags.slice(0, 6).map((t: any) => String(t).toLowerCase().replace(/^#/, '')) : [],
        }
      } catch {
        // keep empty fallback
      }
    }
  } catch {
    // network etc — keep empty fallback
  }

  await (supa as any).from('notes').update({
    tagro_suggestions: suggestions,
    tagro_last_run_at: new Date().toISOString(),
  }).eq('id', ctx.params.id)

  return NextResponse.json({ suggestions })
}
