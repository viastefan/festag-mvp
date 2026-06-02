import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasTagroAI as hasGeminiKey, runTagroText as runGeminiText } from '@/lib/tagro/text'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

const SYSTEM = `Du bist Tagro, der AI-Projektmanager von Festag.

Deine Aufgabe: Lies den folgenden Statusbericht und extrahiere konkrete, umsetzbare Verbesserungs-Tasks.

Antworte NUR mit validem JSON in diesem Schema:
{
  "tasks": [
    { "title": "Kurzer Task-Titel (max 80 Zeichen)", "description": "1-2 Sätze konkrete Aufgabe", "priority": "critical|high|medium|low" }
  ]
}

Regeln:
- Maximal 8 Tasks
- Nur konkrete, umsetzbare Aktionen — keine vagen "Verbesserungen"
- Jeder Task muss in 1-3 Tagen abschließbar sein
- Auf Deutsch
- Keine Markdown, keine Erklärungen außerhalb des JSON`

export async function POST(req: NextRequest) {
  try {
    const { reportId, projectId, content, autoInsert = false } = await req.json()
    if (!content) return NextResponse.json({ error:'no content' }, { status:400 })

    let raw = ''
    if (hasGeminiKey()) {
      const gemini = await runGeminiText({
        system: SYSTEM,
        prompt: `Statusbericht:\n\n${content}\n\nExtrahiere die Verbesserungs-Tasks.`,
        maxTokens: 4000,
        temperature: 0.2,
        responseMimeType: 'application/json',
      })
      if (gemini.ok) raw = gemini.text.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
    }

    if (!raw) {
      const apiKey = process.env.MINIMAX_API_KEY || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'
      if (!apiKey) return NextResponse.json({ error:'AI not configured' }, { status:500 })
      const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
        method:'POST',
        headers: {
          'Content-Type':'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:'MiniMax-M2.7',
          max_tokens: 4000,
          reasoning_effort: 'none',
          messages: [
            { role: 'system', content: SYSTEM },
            { role:'user', content: `Statusbericht:\n\n${content}\n\nExtrahiere die Verbesserungs-Tasks.` },
          ],
        }),
      })
      const data = await res.json()
      raw = (data?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
    }

    let parsed: any
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(m?.[0] ?? raw)
    } catch {
      return NextResponse.json({ error:'parse_failed', raw }, { status:422 })
    }

    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : []

    // Optionally insert directly into tasks table
    let insertedIds: string[] = []
    if (autoInsert && projectId) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        const sb = createClient(SUPABASE_URL, serviceKey, { auth:{ autoRefreshToken:false, persistSession:false } })
        for (const t of tasks) {
          const { data: ins } = await sb.from('tasks').insert({
            project_id: projectId,
            title: String(t.title ?? '').slice(0, 200),
            description: t.description ?? null,
            status: 'todo',
            priority: ['critical','high','medium','low'].includes(t.priority) ? t.priority : 'medium',
            source: 'ai_report',
            source_report_id: reportId ?? null,
          }).select('id').single()
          if (ins?.id) insertedIds.push(ins.id)
        }
      }
    }

    return NextResponse.json({ tasks, inserted: insertedIds })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'unknown' }, { status:500 })
  }
}
