import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/tagro/search?q=
 * Workspace search for the app-shell topbar — projects, tasks, decisions.
 * Tagro ask is handled in the UI; this route returns structured hits Tagro can reason from.
 */
export async function GET(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const raw = String(url.searchParams.get('q') || '').trim()
  if (raw.length < 2) {
    return NextResponse.json({ hits: [] })
  }

  const safe = raw.replace(/[%_,]/g, '').slice(0, 80)
  if (!safe) return NextResponse.json({ hits: [] })
  const pattern = `%${safe}%`

  const hits: Array<{
    id: string
    kind: 'project' | 'task' | 'decision' | 'tagro'
    title: string
    hint?: string
    href?: string
  }> = []

  try {
    const [projects, tasks, decisions] = await Promise.all([
      supabase.from('projects').select('id,title,status').ilike('title', pattern).limit(5),
      (supabase as any).from('tasks').select('id,title,project_id,status').ilike('title', pattern).limit(5),
      (supabase as any)
        .from('decisions')
        .select('id,title,status,project_id')
        .ilike('title', pattern)
        .limit(5),
    ])

    for (const p of projects.data ?? []) {
      hits.push({
        id: `project-${p.id}`,
        kind: 'project',
        title: p.title,
        hint: p.status || 'Projekt',
        href: `/project/${p.id}`,
      })
    }
    for (const t of tasks.data ?? []) {
      hits.push({
        id: `task-${t.id}`,
        kind: 'task',
        title: t.title,
        hint: t.status || 'Aufgabe',
        href: t.project_id ? `/project/${t.project_id}#task-${t.id}` : '/overview',
      })
    }
    for (const d of decisions.data ?? []) {
      hits.push({
        id: `decision-${d.id}`,
        kind: 'decision',
        title: d.title,
        hint: d.status || 'Entscheidung',
        href: `/decisions/${d.id}`,
      })
    }
  } catch {
    /* return whatever we have */
  }

  hits.unshift({
    id: `tagro-${safe}`,
    kind: 'tagro',
    title: raw,
    hint: 'Tagro fragen',
  })

  return NextResponse.json({ hits })
}
