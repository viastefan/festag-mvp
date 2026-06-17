import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/dev/daily-plan
 *
 * Erzeugt einen einfachen Tagesplan-Eintrag in `developer_daily_plans`.
 * Heuristik ohne LLM:
 *   - lädt die zugewiesenen offenen Tasks des Devs
 *   - priorisiert nach priority (critical > high > medium > low) und
 *     updated_at desc
 *   - nimmt die top 5 als plan_json
 *   - generiert ein focus_summary aus den Task-Titeln
 *
 * Tagro-Übersetzung in einen wirklich erklärenden Plan kommt im Folge-
 * schritt; diese Version ist die ehrliche Baseline (keine Hallu).
 */

function today() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

const PRIO_SCORE: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    // Lade Assignments + Tasks
    const { data: pa } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('user_id', user.id).eq('active', true)
    const projectIds = ((pa as any[] | null) ?? []).map(r => r.project_id).filter(Boolean) as string[]

    const taskQ = supabase
      .from('tasks')
      .select('id,title,status,priority,project_id,updated_at,description')
      .or(
        projectIds.length > 0
          ? `assigned_to.eq.${user.id},project_id.in.(${projectIds.join(',')})`
          : `assigned_to.eq.${user.id}`,
      )
      .neq('status', 'done')
      .order('updated_at', { ascending: false })
      .limit(40)
    const { data: tasks } = await taskQ
    const tList = ((tasks as any[] | null) ?? [])

    // Sortieren + top 5
    const ranked = [...tList].sort((a, b) => {
      const sa = (PRIO_SCORE[a.priority ?? 'medium'] ?? 2)
      const sb = (PRIO_SCORE[b.priority ?? 'medium'] ?? 2)
      if (sa !== sb) return sb - sa
      return String(b.updated_at).localeCompare(String(a.updated_at))
    }).slice(0, 5)

    const planSteps = ranked.map((t, idx) => ({
      sequence: idx + 1,
      task_id: t.id,
      title: t.title,
      expected_outcome: t.description ? String(t.description).slice(0, 140) : null,
    }))
    const focusSummary = ranked.length === 0
      ? 'Aktuell sind keine zugewiesenen Tasks offen. Tagro wartet auf den nächsten Briefing-Eingang.'
      : `Heutiger Fokus: ${ranked.length} Tasks, Schwerpunkt liegt auf ${ranked[0].title}.`

    // Upsert für (developer, date, project=null) — ein zusammenfassender Plan pro Tag
    const { data, error } = await supabase
      .from('developer_daily_plans')
      .upsert({
        developer_id: user.id,
        project_id: null,
        date: today(),
        focus_summary: focusSummary,
        plan_json: planSteps,
        status: 'draft',
        created_by_tagro: true,
      }, { onConflict: 'developer_id,date,project_id' })
      .select('*').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'daily_plan_generated',
        entity_type: 'developer_daily_plan',
        entity_id: (data as any)?.id ?? null,
        metadata: { task_count: ranked.length },
      })
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true, plan: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
