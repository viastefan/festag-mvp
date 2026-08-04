import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { runOpenAIJson } from '@/lib/tagro/openai'
import {
  classifyIntentHeuristic,
  normalizeIntentResult,
  type TagroIntentResult,
  type WorkspaceProjectHint,
} from '@/lib/tagro/intent-intake'

export const runtime = 'nodejs'

/**
 * POST /api/tagro/intent-intake
 * Free-text request → structured Tagro draft (no writes).
 * Body: { text, attachmentNames?: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const text = String(body?.text || body?.description || '').trim().slice(0, 4000)
    const attachmentNames = Array.isArray(body?.attachmentNames)
      ? body.attachmentNames.map((n: unknown) => String(n)).filter(Boolean).slice(0, 12)
      : []

    if (!text && attachmentNames.length === 0) {
      return NextResponse.json({ ok: false, error: 'text_required' }, { status: 400 })
    }

    const service = getServiceClient() || supabase
    const projects = await loadProjectHints(service, user.id)
    const enrichedText =
      attachmentNames.length > 0
        ? `${text}${text ? '\n\n' : ''}Attachments: ${attachmentNames.join(', ')}`
        : text

    const heuristic = classifyIntentHeuristic(enrichedText || 'New project from attachments', projects)

    const { output } = await runOpenAIJson({
      runType: 'intent_intake',
      fallback: () => heuristic as unknown as Record<string, unknown>,
      prompt: `Du bist Tagro, die Operating Intelligence von Festag.
Analysiere die Nutzernachricht und entscheide die Absicht.
Antworte NUR als JSON mit diesem Shape:
{
  "intent": "new_project" | "bug_task" | "feature_task" | "question" | "invite" | "status_briefing",
  "confidence": 0.0-1.0,
  "project": { "name": string, "summary": string, "features": string[], "estimatedScope": "small"|"medium"|"large" } | null,
  "task": { "kind": "bug"|"feature", "projectId": string|null, "projectTitle": string|null, "title": string, "description": string, "priority": "low"|"medium"|"high"|"critical" } | null,
  "invite": { "username": string, "email": string, "role": "workspace_owner"|"project_owner"|"developer"|"designer"|"client"|"viewer", "projectId": string|null, "projectTitle": string|null } | null,
  "answer": { "question": string, "answer": string } | null,
  "briefing": { "headline": string, "summary": string } | null
}

Regeln:
- Nutzer beschreiben Ziele — nie Formulare. Tagro strukturiert.
- Neue Software-Idee → new_project mit editierbarem Draft.
- Bug → bug_task im passenden Projekt (nutze project hints).
- Feature in bestehendem Kontext → feature_task.
- Einladung → invite.
- Status/Stand → status_briefing.
- Reine Frage → question mit ruhiger Antwort.
- Sprache der Felder: Englisch oder Deutsch wie die Eingabe.
- Erfinde keine Projekt-IDs. Nutze nur diese Projekte: ${JSON.stringify(projects.slice(0, 12))}
- Keine Emojis. Keine Marketing-Floskeln.

Nachricht: """${enrichedText}"""`,
    })

    const result = normalizeIntentResult(
      output as Partial<TagroIntentResult>,
      enrichedText,
      projects,
    )

    return NextResponse.json({ ok: true, result, projects })
  } catch (error: any) {
    console.error('[intent-intake]', error)
    return NextResponse.json(
      { ok: false, error: error?.message || 'intent_intake_failed' },
      { status: 500 },
    )
  }
}

async function loadProjectHints(sb: any, userId: string): Promise<WorkspaceProjectHint[]> {
  const owned = await sb
    .from('projects')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  let rows: any[] = owned.data || []

  if (!rows.length) {
    const member = await sb
      .from('project_members')
      .select('project_id, projects(id, title, created_at)')
      .eq('user_id', userId)
      .limit(20)
    rows = (member.data || [])
      .map((r: any) => r.projects)
      .filter(Boolean)
  }

  return rows
    .filter((p) => p?.id && p?.title)
    .map((p) => ({ id: String(p.id), title: String(p.title) }))
}
