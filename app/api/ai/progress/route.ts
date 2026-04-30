import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

export async function POST(req: NextRequest) {
  try {
    const { taskId, devNote, projectId } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `Du bist Tagro. Übersetze technische Entwickler-Notizen in kundenfr eundliche, klare Projekt-Updates.
Regeln: Max 2 Sätze. Kein Fachjargon. Positiv aber ehrlich. Deutsch.`,
        messages: [{ role: 'user', content: `Entwickler-Notiz: ${devNote}` }]
      }),
    })

    const data = await res.json()
    const customerUpdate = data.content?.[0]?.text ?? devNote

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
