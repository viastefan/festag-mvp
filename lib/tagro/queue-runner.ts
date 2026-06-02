/**
 * Tagro Queue runner — executes a scheduled AI job and produces a draft output.
 *
 * Shared by the cron route (all due jobs, service client) and the manual
 * "Jetzt erzeugen" route (one job, user client). Builds compact project context
 * from existing data and asks Tagro (Claude-first) for the job's output.
 * Drafts only — delivery/approval is decided by the caller from the job config.
 */

import { tagroComplete } from '@/lib/tagro/complete'
import { queueTemplate } from '@/lib/tagro/queue-templates'

// Loosely-typed Supabase client (service or user-bound).
type AnySb = any

const SYSTEM =
  'Du bist Tagro, die AI-Kontrollschicht von Festag. Schreibe ruhig, klar und ehrlich auf Deutsch. ' +
  'Keine Floskeln, keine Emojis, keine erfundenen Fakten. Wenn Daten fehlen, sage es. ' +
  'Übersetze operative Arbeit in verständliche Sprache für Entscheider und Kunden.'

const INSTRUCTIONS: Record<string, string> = {
  weekly_report:
    'Erstelle einen kundenfähigen Wochen-Statusbericht: kurzer Status, was wurde getan, was läuft, offene Punkte, nächste Schritte. Belege nichts, was nicht im Kontext steht.',
  executive_briefing:
    'Erstelle ein kurzes Executive Briefing (max. 8 Zeilen): Status in einem Satz, wichtigste Entwicklung, Risiken, nächste Entscheidung.',
  audio_briefing:
    'Schreibe ein natürlich gesprochenes Audio-Briefing-Skript (1 Minute) als Fließtext, ohne Markdown — als Transkript verwendbar.',
  health_refresh:
    'Fasse den internen Projekt-Gesundheitsstand in 2–3 Sätzen zusammen: Fortschritt, Tempo, akute Risiken. Nur intern.',
  nexora_scan:
    'Prüfe die Bereitschaft für einen Kundenbericht: offene Entscheidungen, fehlende Belege, Blocker, mögliche interne Notizen. Gib eine ruhige Empfehlung.',
  proofgrid_check:
    'Nenne, für welche berichtete Arbeit noch Belege fehlen, und welche Belege kundensichtbar gemacht werden sollten.',
  decision_digest:
    'Liste die offenen Entscheidungen als klare Ja/Nein-Fragen auf, die der Kunde/Owner freigeben kann. Wenn keine offen sind, sage das.',
}

export async function buildProjectContext(sb: AnySb, projectId: string): Promise<{ title: string; context: string }> {
  const [{ data: proj }, { data: tasks }, { data: ev }, { data: updates }] = await Promise.all([
    sb.from('projects').select('title,status,description,scope_summary').eq('id', projectId).maybeSingle(),
    sb.from('tasks').select('title,status,priority').eq('project_id', projectId).limit(50),
    sb.from('evidence').select('title,evidence_type,proof_strength,client_visible').eq('project_id', projectId).order('created_at', { ascending: false }).limit(20),
    sb.from('ai_updates').select('content,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1),
  ])

  const title = (proj as any)?.title ?? 'Projekt'
  const t = (tasks as any[]) ?? []
  const done = t.filter(x => x.status === 'done').length
  const active = t.filter(x => x.status === 'active' || x.status === 'doing').length
  const blocked = t.filter(x => x.status === 'blocked').length
  const waiting = t.filter(x => x.status === 'waiting').length
  const evRows = (ev as any[]) ?? []
  const lastReport = (updates as any[])?.[0]?.content

  const lines = [
    `Projekt: ${title}`,
    `Status/Phase: ${(proj as any)?.status ?? 'unbekannt'}`,
    (proj as any)?.scope_summary || (proj as any)?.description ? `Scope: ${((proj as any).scope_summary || (proj as any).description).slice(0, 600)}` : '',
    `Aufgaben: ${t.length} gesamt · ${done} erledigt · ${active} aktiv · ${blocked} blockiert · ${waiting} wartet auf Entscheidung`,
    t.length ? `Aufgaben-Auszug:\n${t.slice(0, 18).map(x => `- [${x.status ?? 'todo'}] ${x.title}`).join('\n')}` : '',
    evRows.length
      ? `Belege (ProofGrid):\n${evRows.slice(0, 12).map(e => `- ${e.title || e.evidence_type} · ${e.proof_strength}${e.client_visible ? ' · kundensichtbar' : ' · intern'}`).join('\n')}`
      : 'Belege: noch keine erfasst.',
    lastReport ? `Letzter Statusbericht (Auszug):\n${String(lastReport).slice(0, 500)}` : 'Noch kein Statusbericht.',
  ].filter(Boolean)

  return { title, context: lines.join('\n\n') }
}

export type QueueRunResult = { ok: boolean; title: string; content: string; model?: string; error?: string }

export async function runQueueJob(sb: AnySb, job: { project_id: string; job_type: string }): Promise<QueueRunResult> {
  const tpl = queueTemplate(job.job_type)
  const { title: projectTitle, context } = await buildProjectContext(sb, job.project_id)
  const instruction = INSTRUCTIONS[job.job_type] ?? INSTRUCTIONS.weekly_report

  const r = await tagroComplete({
    system: SYSTEM,
    prompt: `Projektkontext:\n${context}\n\nAufgabe:\n${instruction}`,
    maxTokens: 1100,
    temperature: 0.3,
  })

  const label = tpl?.label ?? 'Tagro Output'
  const dateLabel = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  const title = `${label} — ${projectTitle} · ${dateLabel}`

  if (!r.ok || !r.text.trim()) {
    return { ok: false, title, content: '', error: r.error ?? 'no_output' }
  }
  return { ok: true, title, content: r.text.trim(), model: r.model }
}

/** Compute the next run timestamp from the job's human cadence descriptor. */
export function computeNextRun(cron: string | null | undefined, from = new Date()): string {
  const c = (cron || '').toLowerCase()
  const next = new Date(from)
  if (c.includes('täglich') || c.includes('werktag') || c.includes('daily')) {
    next.setDate(next.getDate() + 1)
  } else if (c.includes('monatlich') || c.includes('monthly')) {
    next.setMonth(next.getMonth() + 1)
  } else {
    next.setDate(next.getDate() + 7) // weekly default
  }
  return next.toISOString()
}

/** Next output version for a project + output_type. */
export async function nextOutputVersion(sb: AnySb, projectId: string, outputType: string): Promise<number> {
  const { data } = await sb
    .from('ai_outputs')
    .select('version')
    .eq('project_id', projectId)
    .eq('output_type', outputType)
    .order('version', { ascending: false })
    .limit(1)
  const top = (data as any[])?.[0]?.version
  return (typeof top === 'number' ? top : 0) + 1
}
