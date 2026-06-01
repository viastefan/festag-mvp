import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasVeyraAI as hasGeminiKey, runVeyraText as runGeminiText } from '@/lib/tagro/text'

export const runtime = 'nodejs'

/**
 * POST /api/ai/conversations/:id/messages  { content: string, projectContext?: { id: string, title: string } }
 *
 * One turn:
 *   1. Persist the user's message.
 *   2. Pull the full conversation so Veyra has context.
 *   3. Hand it to MiniMax, strip <think>, return the assistant reply.
 *   4. Persist the assistant reply.
 *   5. If the conversation is still on the default "Neuer Chat" title
 *      and we just stored the first user turn, derive a calm short
 *      title from that first message.
 *
 * Stays JSON (no streaming) so it's easy to layer on top of the
 * existing Festag stack — frontend can fake a typing animation.
 */

const MINIMAX_ENDPOINT = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const MINIMAX_MODEL = 'MiniMax-M2.7'

const SYSTEM = `Du bist Veyra, das AI-Produktionssystem von Festag.

Verhalte dich wie ein erfahrener CTO und Projektmanager in einem.
Antworten klar, ruhig, direkt. Maximal 6 Sätze, wenn nicht ausdrücklich
mehr verlangt.

Sprache: Deutsch. Kein Smalltalk. Keine Emojis.

FORMATIERUNG: Markdown wenn es Klarheit schafft.
  - **fett** für Schlüsselbegriffe
  - Listen (- oder 1.) für mehrere Punkte
  - \`code\` für Datei-, Feld- oder Statusnamen
  - Überschriften (### oder ####) nur bei längeren Berichten
Halte den Text trotzdem knapp.`

type Mode = 'tagro' | 'developer' | 'owner' | 'support'

function buildSystemPrompt(mode: Mode, projectContextTitle: string, projectId: string | null): string {
  const ctxLine = `Aktiver Festag-Kontext: ${projectContextTitle}.`

  if (mode === 'developer') {
    return `Du bist die Veyra-Vermittlung im Developer-Chat.

${ctxLine}

Der Endnutzer schreibt an das Entwicklerteam. Du beantwortest stellvertretend technische Rückfragen, aber bleibst ruhig, projektorientiert und beziehst dich konkret auf bekannte Tasks, Milestones und Risiken im Projekt. Du sprichst nicht über andere Projekte. Wenn etwas eindeutig an einen menschlichen Entwickler eskaliert werden muss, sag es ehrlich.

Sprache: Deutsch. Maximal 6 Sätze. Markdown nur wenn es hilft. Keine Emojis.`
  }

  if (mode === 'owner') {
    return `Du bist die Veyra-Vermittlung zum Project Owner.

${ctxLine}

Project Owners stehen für Qualität, Freigaben, Scope-Änderungen und Eskalation. Antworte trust-first, ruhig, klar — als operative Schnittstelle zwischen Kunde und Owner. Bei Approval-/Scope-Fragen erinnere höflich, dass formale Freigaben immer schriftlich vom Owner bestätigt werden.

Sprache: Deutsch. Maximal 6 Sätze. Keine Emojis.`
  }

  if (mode === 'support') {
    return `Du bist Festag Support.

Beantworte Fragen zu Konto, Abrechnung, Login, Zahlungen, Paketen und Plattform-Bedienung. Konkrete Account-Aktionen führst du nicht aus, sondern schlägst sie als Schritt vor (Settings öffnen, Rechnungs-Mail prüfen etc.). Bei tieferen Anliegen verweise auf hi@festag.io.

Sprache: Deutsch. Maximal 6 Sätze. Markdown nur wenn nötig. Keine Emojis.`
  }

  // tagro default
  return `${SYSTEM}

${ctxLine}
Wenn der Kontext nicht "Alle Projekte" ist, antworte projektbezogen und mache sichtbar, dass du nur diesen Kontext bewertest.

Veyra kann in Festag konkrete Aktionen vorbereiten:
- Tasks aus Statusberichten erstellen
- Reviews freigeben oder Korrekturen anfordern
- Statusberichte und Audio-Briefings vorbereiten
- Blocker, Risiken und Entscheidungen priorisieren

Wichtige Aktionen werden nie sofort ausgeführt. Schlage sie als bestätigungspflichtigen nächsten Schritt vor.${projectId ? `\n\nDie Conversation ist an Projekt-ID ${projectId} gekoppelt.` : ''}`
}

function stripThink(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

function deriveTitle(text: string): string {
  // Take the first sentence (or first line) up to ~48 chars.
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'Neuer Chat'
  const firstSentence = cleaned.split(/[.!?]/)[0].trim()
  const candidate = (firstSentence || cleaned).slice(0, 48)
  return candidate.length < cleaned.length ? `${candidate}…` : candidate
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) return NextResponse.json({ error: 'empty message' }, { status: 400 })
  const rawProjectContext = body?.projectContext
  const projectContextTitle = typeof rawProjectContext?.title === 'string' && rawProjectContext.title.trim()
    ? rawProjectContext.title.trim().slice(0, 140)
    : 'Alle Projekte'

  // Verify conversation ownership (RLS would also block, but explicit).
  const { data: conv } = await (supa as any)
    .from('tagro_conversations')
    .select('id,title,user_id,mode,project_id')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const mode = (conv.mode || 'tagro') as Mode

  // 1. Persist user message.
  const { data: userMsg, error: insErr } = await (supa as any)
    .from('tagro_messages')
    .insert({
      conversation_id: ctx.params.id,
      role: 'user',
      content: content.slice(0, 8000),
    })
    .select('id,role,content,created_at')
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // 2. Pull conversation history.
  const { data: history } = await (supa as any)
    .from('tagro_messages')
    .select('role,content')
    .eq('conversation_id', ctx.params.id)
    .order('created_at', { ascending: true })

  // 3. Call Veyra provider.
  const apiKey = process.env.MINIMAX_API_KEY
    || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'

  let aiText = 'Veyra ist gerade kurz nicht erreichbar. Versuch es bitte gleich nochmal.'
  let thinking: string | null = null
  try {
    const systemPrompt = buildSystemPrompt(mode, projectContextTitle, conv.project_id)
    const messages = [
      ...((history as any[]) ?? []).map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ]

    if (hasGeminiKey()) {
      const gemini = await runGeminiText({
        system: systemPrompt,
        messages: messages.map(message => ({
          role: message.role === 'assistant' ? 'model' as const : 'user' as const,
          text: message.content,
        })),
        maxTokens: 1200,
        temperature: 0.2,
      })
      if (gemini.ok && gemini.text) {
        aiText = gemini.text
      }
    }

    if (aiText === 'Veyra ist gerade kurz nicht erreichbar. Versuch es bitte gleich nochmal.') {
      const res = await fetch(MINIMAX_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          max_tokens: 1200,
          reasoning_effort: 'none',
          messages: [
            { role: 'system' as const, content: systemPrompt },
            ...messages,
          ],
        }),
      })
      if (res.ok) {
        const ai = await res.json().catch(() => null)
        const raw = ai?.choices?.[0]?.message?.content as string | undefined
        if (raw) {
          // Capture any think block separately, then strip from the visible reply.
          const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/)
          thinking = thinkMatch ? thinkMatch[1].trim().slice(0, 4000) : null
          aiText = stripThink(raw)
        }
      }
    }
  } catch {
    // soft fallback already set
  }

  // 4. Persist assistant reply.
  const { data: aiMsg } = await (supa as any)
    .from('tagro_messages')
    .insert({
      conversation_id: ctx.params.id,
      role: 'assistant',
      content: aiText.slice(0, 16000),
      thinking,
    })
    .select('id,role,content,thinking,created_at')
    .single()

  // 5. Auto-title on first user turn.
  if (conv.title === 'Neuer Chat') {
    const userCount = ((history as any[]) ?? []).filter(m => m.role === 'user').length
    if (userCount <= 1) {
      const newTitle = deriveTitle(content)
      if (newTitle && newTitle !== 'Neuer Chat') {
        await (supa as any).from('tagro_conversations')
          .update({ title: newTitle })
          .eq('id', ctx.params.id)
      }
    }
  }

  return NextResponse.json({
    user: userMsg,
    assistant: aiMsg,
  })
}
