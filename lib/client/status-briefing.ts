export type ClientStatusReport = {
  summary: string
  currentWork: string[]
  nextSteps: string[]
  blockers: string[]
  createdAt?: string
}

export function normalizeClientReport(raw: unknown): ClientStatusReport {
  const row = raw as Record<string, unknown> | null | undefined
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []
  return {
    summary: String(row?.summary ?? row?.content ?? '').trim(),
    currentWork: arr(row?.current_work_json),
    nextSteps: arr(row?.next_steps_json),
    blockers: arr(row?.blockers_json),
    createdAt: typeof row?.created_at === 'string' ? row.created_at : undefined,
  }
}

export function splitBriefingSentences(text: string): string[] {
  return (text.match(/[^.!?\u2026]+[.!?\u2026]+(?:["')\]]+)?|[^.!?\u2026]+$/g) || [])
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

type ProjectLite = { id: string; status?: string | null }
type TaskLite = { project_id?: string | null; status?: string | null }

export function buildProjectsOverallFallback(projects: ProjectLite[], tasks: TaskLite[]): string {
  const active = projects.filter((p) => {
    const s = (p.status || '').toLowerCase()
    return s !== 'done' && s !== 'archived' && s !== 'erledigt'
  })
  if (active.length === 0) {
    return 'Noch kein aktives Projekt. Sobald jemand am Projekt arbeitet, fasse ich den Stand hier ruhig zusammen.'
  }
  const open = tasks.filter((t) => {
    const s = (t.status || '').toLowerCase()
    return s !== 'done' && s !== 'completed' && s !== 'erledigt'
  }).length
  const blocked = tasks.filter((t) => (t.status || '').toLowerCase() === 'blocked').length
  const waiting = tasks.filter((t) => (t.status || '').toLowerCase() === 'waiting').length
  return (
    `Gesamtbericht. Du hast ${active.length} aktive Projekt${active.length === 1 ? '' : 'e'}. ` +
    `${open} offene Aufgaben insgesamt. ` +
    `${blocked > 0 ? `${blocked} Risiken brauchen Aufmerksamkeit. ` : 'Keine akuten Risiken über alle Projekte. '}` +
    `${waiting > 0 ? `${waiting} Entscheidungen warten auf dich.` : 'Keine offene Entscheidung wartet auf dich.'}`
  )
}

export function briefingDurationLabel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const seconds = Math.max(20, Math.round((words / 150) * 60))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')} min`
}
