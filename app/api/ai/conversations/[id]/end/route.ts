import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * POST /api/ai/conversations/:id/end
 *
 * Closes a conversation, asks MiniMax for a short, calm executive
 * summary, persists it on the conversation, sets the lifecycle to
 * `sent_to_inbox`, and emits a `notifications` row tagged as
 * `kind='conversation_summary'` so the existing Inbox surface picks
 * it up without any new table.
 *
 * Lifecycle:
 *   active  →  ended  →  sent_to_inbox
 *
 * The transcript itself stays in tagro_messages — nothing is deleted.
 */

const MINIMAX_ENDPOINT = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const MINIMAX_MODEL = 'MiniMax-M2.7'

const SUMMARY_SYSTEM = `Du bist Tagro. Fasse einen Festag-Chat ruhig und executive zusammen.

Antworte als kurzer deutscher Markdown-Block mit höchstens 5 Zeilen, optional einer Mini-Liste. Sektionen wenn relevant:
**Kurzfassung:** ein Satz, was besprochen wurde.
**Wichtige Punkte:** 1–3 Stichpunkte (nur wenn vorhanden).
**Offen / Nächster Schritt:** ein Satz oder ein Bullet (nur wenn vorhanden).

Keine Floskeln, keine Emojis, keine Phrasen wie "im obigen Chat".`

function stripThink(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: conv } = await (supa as any)
    .from('tagro_conversations')
    .select('id,user_id,title,mode,project_id,status')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (conv.status === 'sent_to_inbox' || conv.status === 'archived') {
    return NextResponse.json({ error: 'already closed' }, { status: 400 })
  }

  // Pull transcript.
  const { data: msgs } = await (supa as any)
    .from('tagro_messages')
    .select('role,content,created_at')
    .eq('conversation_id', ctx.params.id)
    .order('created_at', { ascending: true })

  const transcript = ((msgs as any[]) ?? []).map(m => {
    const who = m.role === 'user' ? 'Nutzer' : m.role === 'assistant' ? 'Tagro' : 'System'
    return `${who}: ${m.content}`
  }).join('\n')

  // Generate summary via MiniMax. Fallback to a deterministic short stub
  // if the model errors — Inbox should still receive *something*.
  let summary = 'Konversation beendet. Keine Inhalte zum Zusammenfassen vorhanden.'
  if (transcript.trim().length > 0) {
    const apiKey = process.env.MINIMAX_API_KEY
      || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'
    try {
      const res = await fetch(MINIMAX_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          max_tokens: 600,
          reasoning_effort: 'none',
          messages: [
            { role: 'system', content: SUMMARY_SYSTEM },
            { role: 'user', content: `Modus: ${conv.mode}\nTitel: ${conv.title}\n\nTranskript:\n${transcript.slice(0, 12000)}` },
          ],
        }),
      })
      if (res.ok) {
        const ai = await res.json().catch(() => null)
        const raw = ai?.choices?.[0]?.message?.content as string | undefined
        if (raw) summary = stripThink(raw).slice(0, 4000) || summary
      }
    } catch {
      // keep fallback
    }
  }

  // Persist on the conversation. ended_at + status + summary in one go.
  const nowIso = new Date().toISOString()
  await (supa as any)
    .from('tagro_conversations')
    .update({
      status: 'sent_to_inbox',
      summary,
      ended_at: nowIso,
    })
    .eq('id', ctx.params.id)

  // Inbox fan-out via notifications. Service-client so we can set
  // audience + payload without colliding with the row-level write policy.
  const service = getServiceClient()
  const writer: any = service ?? supa
  const modeLabel: Record<string, string> = {
    tagro: 'Tagro AI',
    developer: 'Developer',
    owner: 'Project Owner',
    support: 'Support',
  }
  const modeBadge = modeLabel[conv.mode] || 'Chat'

  try {
    await writer.from('notifications').insert({
      user_id: user.id,
      project_id: conv.project_id,
      audience: 'client',
      kind: 'conversation_summary',
      type: 'conversation_summary',
      title: `${modeBadge} · ${conv.title}`,
      body: summary.slice(0, 500),
      message: summary.slice(0, 500),
      payload: {
        conversation_id: conv.id,
        mode: conv.mode,
        project_id: conv.project_id,
        ended_at: nowIso,
      },
    })
  } catch { /* best-effort */ }

  return NextResponse.json({
    ok: true,
    summary,
    status: 'sent_to_inbox',
    ended_at: nowIso,
  })
}
