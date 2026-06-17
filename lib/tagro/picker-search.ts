/**
 * Workspace search for Tagro's People/Sources picker.
 * Returns grouped hits across people, projects, tasks, decisions, reports, clients, notes.
 */

export type PickGroup =
  | 'Personen'
  | 'Projekte'
  | 'Aufgaben'
  | 'Entscheidungen'
  | 'Berichte'
  | 'Notizen'
  | 'Kunden'

export type PickResult = {
  group: PickGroup
  id: string
  title: string
  hint?: string
  objectType: string
  mentionLabel: string
}

function displayName(p: { full_name?: string | null; first_name?: string | null; email?: string | null }) {
  return (p.full_name || p.first_name || p.email || 'Person').trim()
}

const RECENT_KEY = 'festag-tagro-recent-picks'
const RECENT_MAX = 8

function readRecent(): PickResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function rememberRecentPick(r: PickResult) {
  if (typeof window === 'undefined') return
  try {
    const prev = readRecent().filter(p => !(p.group === r.group && p.id === r.id))
    localStorage.setItem(RECENT_KEY, JSON.stringify([r, ...prev].slice(0, RECENT_MAX)))
  } catch { /* noop */ }
}

export async function searchTagroPicker(query: string): Promise<PickResult[]> {
  const { createClient } = await import('@/lib/supabase/client')
  const sb = createClient() as any
  const term = query.trim()
  const like = term ? `%${term.replace(/[%_]/g, '\\$&')}%` : null

  const projectsQ = like
    ? sb.from('projects').select('id,title,status').ilike('title', like).limit(5)
    : sb.from('projects').select('id,title,status').order('updated_at', { ascending: false }).limit(5)
  const tasksQ = like
    ? sb.from('tasks').select('id,title,status').ilike('title', like).limit(5)
    : sb.from('tasks').select('id,title,status').order('updated_at', { ascending: false }).limit(5)
  const decisionsQ = like
    ? sb.from('decisions').select('id,title,status').ilike('title', like).limit(4)
    : sb.from('decisions').select('id,title,status').order('updated_at', { ascending: false }).limit(4)
  const clientsQ = like
    ? sb.from('clients').select('id,name').ilike('name', like).limit(4)
    : sb.from('clients').select('id,name').order('updated_at', { ascending: false }).limit(4)
  const notesQ = like
    ? sb.from('relations_notes').select('id,title,content').or(`title.ilike.${like},content.ilike.${like}`).limit(4)
    : sb.from('relations_notes').select('id,title,content').order('updated_at', { ascending: false }).limit(4)
  const reportsQ = like
    ? sb.from('status_reports').select('id,summary,content,project_id').or(`summary.ilike.${like},content.ilike.${like}`).limit(4)
    : sb.from('status_reports').select('id,summary,content,project_id').order('updated_at', { ascending: false }).limit(4)
  const peopleQ = like
    ? sb.from('profiles').select('id,full_name,first_name,email').or(`full_name.ilike.${like},first_name.ilike.${like},email.ilike.${like}`).limit(5)
    : sb.from('profiles').select('id,full_name,first_name,email').order('created_at', { ascending: false }).limit(5)

  const [projects, tasks, decisions, clients, notes, reports, people] = await Promise.all([
    projectsQ.then((r: any) => r).catch(() => ({ data: [] })),
    tasksQ.then((r: any) => r).catch(() => ({ data: [] })),
    decisionsQ.then((r: any) => r).catch(() => ({ data: [] })),
    clientsQ.then((r: any) => r).catch(() => ({ data: [] })),
    notesQ.then((r: any) => r).catch(() => ({ data: [] })),
    reportsQ.then((r: any) => r).catch(() => ({ data: [] })),
    peopleQ.then((r: any) => r).catch(() => ({ data: [] })),
  ])

  const out: PickResult[] = []

  ;(people.data || []).forEach((p: any) => {
    const name = displayName(p)
    out.push({
      group: 'Personen',
      id: p.id,
      title: name,
      hint: p.email || undefined,
      objectType: 'person',
      mentionLabel: `@${name.split(/\s+/)[0] || name}`,
    })
  })
  ;(projects.data || []).forEach((p: any) => {
    out.push({
      group: 'Projekte', id: p.id, title: p.title, hint: p.status,
      objectType: 'project', mentionLabel: `@Projekt ${p.title}`,
    })
  })
  ;(tasks.data || []).forEach((t: any) => {
    out.push({
      group: 'Aufgaben', id: t.id, title: t.title, hint: t.status,
      objectType: 'task', mentionLabel: `@Aufgabe ${t.title}`,
    })
  })
  ;(decisions.data || []).forEach((d: any) => {
    out.push({
      group: 'Entscheidungen', id: d.id, title: d.title, hint: d.status,
      objectType: 'decision', mentionLabel: `@Entscheidung ${d.title}`,
    })
  })
  ;(reports.data || []).forEach((r: any) => {
    const title = (r.summary || (r.content || '').slice(0, 60) || 'Statusbericht').trim()
    out.push({
      group: 'Berichte', id: r.id, title, hint: 'Bericht',
      objectType: 'status_report', mentionLabel: `@Bericht ${title}`,
    })
  })
  ;(clients.data || []).forEach((c: any) => {
    out.push({
      group: 'Kunden', id: c.id, title: c.name,
      objectType: 'client', mentionLabel: `@Kunde ${c.name}`,
    })
  })
  ;(notes.data || []).forEach((n: any) => {
    const title = n.title || (n.content || '').slice(0, 60)
    out.push({
      group: 'Notizen', id: n.id, title,
      objectType: 'note', mentionLabel: `@Notiz ${title}`,
    })
  })

  if (!term) {
    const recent = readRecent()
    const seen = new Set(out.map(r => `${r.group}:${r.id}`))
    for (const r of recent) {
      const key = `${r.group}:${r.id}`
      if (!seen.has(key)) {
        out.unshift(r)
        seen.add(key)
      }
    }
  }

  return out
}

export function pickResultToChip(r: PickResult): {
  kind: 'object' | 'meta'
  label: string
  objectType: string
  objectId: string
} {
  return {
    kind: r.group === 'Personen' ? 'meta' : 'object',
    label: r.mentionLabel,
    objectType: r.objectType,
    objectId: r.id,
  }
}
