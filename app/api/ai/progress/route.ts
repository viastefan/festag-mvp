import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

export async function POST(req: NextRequest) {
  try {
    const { taskId, devNote, projectId } = await req.json()
    const apiKey = process.env.MINIMAX_API_KEY || 'sk-api-E2sKUjhnOC8U5Crp2HcnwMa5RYvP-yrHRqphyS02cUi8KO4KUbnjKWmqNDemitoGh6_iZEtZ-Dymc74lIu8FGR1LZz3PrqDPNJvExGfWX94AS9u0fgqAPAo'
    if (!apiKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

    const res = await fetch('https://api.minimaxi.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        max_tokens: 200,
        messages: [
          { role: 'system', content: `Du bist Tagro. Übersetze technische Entwickler-Notizen in kundenfreundliche, klare Projekt-Updates.\nRegeln: Max 2 Sätze. Kein Fachjargon. Positiv aber ehrlich. Deutsch.` },
          { role: 'user', content: `Entwickler-Notiz: ${devNote}` },
        ],
      }),
    })

    const data = await res.json()
    const customerUpdate = data?.choices?.[0]?.message?.content ?? devNote

    // Save customer_update to task
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey && taskId) {
      const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      await sb.from('tasks').update({
        dev_notes: devNote,
        customer_update: customerUpdate,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId)

      // Post as message in project chat
      if (projectId) {
        await sb.from('messages').insert({
          project_id: projectId,
          message: customerUpdate,
          is_ai: true,
        })
        try {
          await sb.from('activity_feed').insert({
            project_id: projectId,
            type: 'ai_report',
            message: `Tagro Update: ${customerUpdate}`,
          })
        } catch { /* optional */ }
      }
    }

    return NextResponse.json({ customerUpdate })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
