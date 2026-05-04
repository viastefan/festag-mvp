import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

const GENERATE_SYSTEM = `Du bist Tagro, der AI-Projektmanager von Festag.
Deine Aufgabe: Erfinde ein realistisches, kreatives Demo-Software-Projekt und zerlege es vollständig in eine strukturierte Projekt-Definition.

Wähle eine spannende, realistische Produktidee aus dem SaaS- oder B2C-Web/Mobile-Bereich (z.B. Booking-Tool, Marktplatz, Community-App, Workflow-SaaS, KI-Tool, Analytics-Dashboard, Local Business App). Würfle die Idee — nicht jedes Mal das gleiche.

Antworte AUSSCHLIESSLICH mit validem JSON — kein Markdown, kein erklärender Text außerhalb des JSON.

JSON-Schema:
{
  "project_title": "Prägnanter Projekttitel",
  "scope_summary": "2-3 Sätze Projektüberblick",
  "goals": ["Ziel 1", "Ziel 2", "Ziel 3"],
  "success_criteria": ["Erfolgskriterium 1", "Erfolgskriterium 2", "Erfolgskriterium 3"],
  "risks": ["Risiko 1", "Risiko 2"],
  "open_questions": ["Offene Frage 1", "Offene Frage 2"],
  "epics": [
    {
      "title": "Epic-Titel",
      "description": "Was wird in diesem Epic gebaut",
      "priority": "high|medium|low",
      "estimated_effort": "1 Woche|2-3 Wochen|1 Monat",
      "tasks": [
        {
          "title": "Task-Titel",
          "description": "Konkrete Aufgabenbeschreibung",
          "priority": "critical|high|medium|low",
          "estimated_hours": 8,
          "acceptance_criteria": ["AC 1", "AC 2"],
          "tags": ["frontend", "backend", "design"],
          "requires_approval": false
        }
      ]
    }
  ]
}

Anforderungen:
- 3-4 Epics
- Pro Epic 2-4 Tasks
- Realistische Stundenschätzungen
- Sinnvolle Tags (frontend, backend, design, devops, testing, content)
- Sprache: Deutsch
- Beginne den Titel NICHT mit "Test-Projekt" — gib dem Demo-Projekt einen echten, realistischen Namen.`

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    const apiKey = process.env.MINIMAX_API_KEY || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    if (!serviceKey) return NextResponse.json({ error: 'service key missing' }, { status: 500 })
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // 1. Minimax generiert ein komplettes Demo-Projekt
    const aiRes = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        max_tokens: 8000,
        reasoning_effort: 'none',
        messages: [
          { role: 'system', content: GENERATE_SYSTEM },
          { role: 'user', content: 'Generiere jetzt ein realistisches Demo-Software-Projekt mit allen Epics und Tasks. Würfle eine kreative, neue Idee.' },
        ],
      }),
    })

    const aiData = await aiRes.json()
    // <think>...</think> Reasoning-Block strippen (MiniMax-M2.x)
    const rawText = (aiData?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()

    let decomposed: any
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      decomposed = JSON.parse(jsonMatch?.[0] ?? rawText)
    } catch {
      return NextResponse.json({ error: 'AI lieferte kein valides JSON', raw: rawText }, { status: 422 })
    }

    // 2. Projekt + Epics + Tasks in DB schreiben
    const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: project, error: projErr } = await sb.from('projects').insert({
      user_id: userId,
      title: decomposed.project_title ?? 'Demo-Projekt',
      description: decomposed.scope_summary,
      status: 'intake',
      goals: decomposed.goals ?? [],
      success_criteria: decomposed.success_criteria ?? [],
      risks: decomposed.risks ?? [],
      open_questions: decomposed.open_questions ?? [],
      scope_summary: decomposed.scope_summary,
      ai_decomposed_at: new Date().toISOString(),
    }).select().single()

    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

    const projectId = project.id

    let taskCount = 0
    for (let ei = 0; ei < (decomposed.epics ?? []).length; ei++) {
      const ep = decomposed.epics[ei]
      const { data: epic } = await sb.from('epics').insert({
        project_id: projectId,
        title: ep.title,
        description: ep.description,
        priority: ep.priority ?? 'medium',
        estimated_effort: ep.estimated_effort,
        order_index: ei,
      }).select().single()

      if (!epic) continue

      for (const task of (ep.tasks ?? [])) {
        await sb.from('tasks').insert({
          project_id: projectId,
          epic_id: epic.id,
          title: task.title,
          description: task.description,
          status: 'todo',
          priority: task.priority ?? 'medium',
          estimated_hours: task.estimated_hours,
          acceptance_criteria: task.acceptance_criteria ?? [],
          tags: task.tags ?? [],
          requires_approval: task.requires_approval ?? false,
        })
        taskCount++
      }
    }

    try {
      await sb.from('activity_feed').insert({
        user_id: userId,
        project_id: projectId,
        type: 'project_status',
        message: `Demo-Projekt "${decomposed.project_title}" wurde von Tagro AI generiert (${(decomposed.epics ?? []).length} Epics, ${taskCount} Tasks)`,
      })
    } catch {
      /* activity_feed ist optional — Projekt-Insert ist schon erfolgt */
    }

    return NextResponse.json({ projectId, decomposed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
