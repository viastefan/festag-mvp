import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

const DECOMPOSE_SYSTEM = `Du bist Tagro, der AI-Projektmanager von Festag.
Deine Aufgabe: Zerlege ein Kundenprojekt aus einem Chat-Gespräch in eine strukturierte Projekt-Definition.

Antworte NUR mit validen JSON — kein Markdown, kein erklärender Text außerhalb des JSON.

JSON-Schema:
{
  "project_title": "Prägnanter Projekttitel",
  "scope_summary": "2-3 Sätze Projektüberblick",
  "goals": ["Ziel 1", "Ziel 2"],
  "success_criteria": ["Erfolgskriterium 1", "Erfolgskriterium 2"],
  "risks": ["Risiko 1", "Risiko 2"],
  "open_questions": ["Offene Frage 1"],
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
}`

export async function POST(req: NextRequest) {
  try {
    const { chatHistory, userId, authToken } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

    // Build conversation summary for decomposition
    const chatText = chatHistory
      .map((m: any) => `${m.role === 'ai' ? 'Tagro' : 'Kunde'}: ${m.text}`)
      .join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: DECOMPOSE_SYSTEM,
        messages: [{
          role: 'user',
          content: `Hier ist das Onboarding-Gespräch mit dem Kunden:\n\n${chatText}\n\nZerlege dieses Projekt strukturiert.`
        }]
      }),
    })

    const data = await res.json()
    const rawText = data.content?.[0]?.text ?? ''

    // Parse JSON from AI response
    let decomposed
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      decomposed = JSON.parse(jsonMatch?.[0] ?? rawText)
    } catch {
      return NextResponse.json({ error: 'Parse failed', raw: rawText }, { status: 422 })
    }

    // Save to Supabase using service role
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey || !userId) {
      return NextResponse.json({ decomposed })
    }

    const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Create project
    const { data: project, error: projErr } = await sb.from('projects').insert({
      user_id: userId,
      title: decomposed.project_title ?? 'Neues Projekt',
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

    // Create epics + tasks
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
      }
    }

    // Log to activity feed
    try {
      await sb.from('activity_feed').insert({
        user_id: userId,
        project_id: projectId,
        type: 'project_status',
        message: `Projekt "${decomposed.project_title}" wurde von Tagro AI strukturiert (${(decomposed.epics ?? []).length} Epics, ${(decomposed.epics ?? []).reduce((a: number, e: any) => a + (e.tasks?.length ?? 0), 0)} Tasks)`,
      })
    } catch { /* optional */ }

    return NextResponse.json({ decomposed, projectId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
