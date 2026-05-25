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
    const { chatHistory, userId } = await req.json()

    const apiKey = process.env.MINIMAX_API_KEY || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'
    if (!apiKey) return NextResponse.json({ error: 'not configured' }, { status: 500 })

    // Build conversation summary for decomposition
    const chatText = (chatHistory ?? [])
      .map((m: any) => `${m.role === 'ai' ? 'Tagro' : 'Kunde'}: ${m.text}`)
      .join('\n')

    const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
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
          { role: 'system', content: DECOMPOSE_SYSTEM },
          { role: 'user', content: `Hier ist das Onboarding-Gespräch mit dem Kunden:\n\n${chatText}\n\nZerlege dieses Projekt strukturiert.` },
        ],
      }),
    })

    const aiData = await res.json()
    // <think>...</think> Reasoning-Block strippen (MiniMax-M2.x)
    const rawText = (aiData?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()

    // Parse JSON from AI response
    let decomposed: any
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

    const sb = createClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create project — only use guaranteed columns first
    const baseProject: Record<string, any> = {
      user_id: userId,
      title: decomposed.project_title ?? 'Neues Projekt',
      description: decomposed.scope_summary ?? null,
      status: 'intake',
    }

    // Try to insert with extended columns; fall back to base if columns missing
    let projectId: string | null = null

    const extended = {
      ...baseProject,
      goals: decomposed.goals ?? [],
      success_criteria: decomposed.success_criteria ?? [],
      risks: decomposed.risks ?? [],
      open_questions: decomposed.open_questions ?? [],
      scope_summary: decomposed.scope_summary ?? null,
      ai_decomposed_at: new Date().toISOString(),
    }

    const { data: project, error: projErr } = await sb
      .from('projects')
      .insert(extended)
      .select('id')
      .single()

    if (projErr) {
      // Fallback: try base insert without extended columns
      const { data: proj2, error: err2 } = await sb
        .from('projects')
        .insert(baseProject)
        .select('id')
        .single()

      if (err2) return NextResponse.json({ error: err2.message }, { status: 500 })
      projectId = proj2.id
    } else {
      projectId = project.id
    }

    // Create epics + tasks
    for (let ei = 0; ei < (decomposed.epics ?? []).length; ei++) {
      const ep = decomposed.epics[ei]

      // Try epic insert with full schema; fall back to minimal
      let epicId: string | null = null
      const { data: epic, error: epicErr } = await sb.from('epics').insert({
        project_id: projectId,
        title: ep.title,
        description: ep.description ?? null,
        priority: ep.priority ?? 'medium',
        estimated_effort: ep.estimated_effort ?? null,
        order_index: ei,
      }).select('id').single()

      if (!epicErr && epic) {
        epicId = epic.id
      } else {
        // Minimal epic insert
        const { data: epic2 } = await sb.from('epics').insert({
          project_id: projectId,
          title: ep.title,
          order_index: ei,
        }).select('id').single()
        epicId = epic2?.id ?? null
      }

      if (!epicId) continue

      for (const task of (ep.tasks ?? [])) {
        // Try full task insert; fall back to minimal
        const { error: taskErr } = await sb.from('tasks').insert({
          project_id: projectId,
          epic_id: epicId,
          title: task.title,
          description: task.description ?? null,
          status: 'todo',
          priority: task.priority ?? 'medium',
          estimated_hours: task.estimated_hours ?? null,
          acceptance_criteria: task.acceptance_criteria ?? [],
          tags: task.tags ?? [],
          requires_approval: task.requires_approval ?? false,
        })

        if (taskErr) {
          // Minimal task insert
          await sb.from('tasks').insert({
            project_id: projectId,
            epic_id: epicId,
            title: task.title,
            status: 'todo',
            priority: task.priority ?? 'medium',
          }).catch(() => {})
        }
      }
    }

    // Log to activity feed (optional)
    await sb.from('activity_feed').insert({
      user_id: userId,
      project_id: projectId,
      type: 'project_status',
      message: `Projekt "${decomposed.project_title}" wurde von Tagro AI strukturiert (${(decomposed.epics ?? []).length} Epics, ${(decomposed.epics ?? []).reduce((a: number, e: any) => a + (e.tasks?.length ?? 0), 0)} Tasks)`,
    }).catch(() => {})

    // Pool-wide fan-out: every approved dev gets an inbox row pointing
    // at the freshly-created project. Best-effort, never blocks.
    if (projectId) {
      try {
        const { notifyProjectCreated } = await import('@/lib/sync/project-created')
        await notifyProjectCreated({
          sb: sb as any,
          projectId,
          projectTitle: decomposed.project_title || 'Neues Projekt',
          actorId: userId,
        })
      } catch { /* swallow */ }
    }

    return NextResponse.json({ decomposed, projectId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
