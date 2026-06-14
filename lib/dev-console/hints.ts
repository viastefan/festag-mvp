// ─────────────────────────────────────────────────────────────────────────────
// Dev Console Relay — WP3: hint engine
//
// The suggestion chips under the composer. A blend of static quick-starts and
// data-driven nudges reflecting the real project state (open daily prompt,
// decisions waiting on the client, client tasks with no reaction, stale last
// update). Data-driven hints rank first.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

export type Hint = {
  id: string
  label: string
  prefill?: string
  action?: 'open_decisions' | 'compose'
  count?: number
  tone: 'neutral' | 'info' | 'warn'
  icon?: string
}

const STATIC_HINTS: Hint[] = [
  { id: 'progress', label: 'Fortschritt an Kunde melden', prefill: 'Ich habe gerade ', action: 'compose', tone: 'neutral', icon: 'check' },
  { id: 'decision', label: 'Entscheidung vom Kunden einholen', prefill: 'Der Kunde muss entscheiden: ', action: 'compose', tone: 'neutral', icon: 'scissors' },
  { id: 'ask', label: 'Kunde um etwas bitten (Logo, Zugang, Text)', prefill: 'Ich brauche vom Kunden: ', action: 'compose', tone: 'neutral', icon: 'paperclip' },
  { id: 'blocker', label: 'Blocker melden', prefill: 'Ich bin blockiert durch: ', action: 'compose', tone: 'neutral', icon: 'warning' },
]

export async function buildHints(
  supa: SupabaseClient<any>,
  { projectId, developerId }: { projectId: string; developerId: string },
): Promise<Hint[]> {
  const dataHints: Hint[] = []
  const sb = supa as any
  const today = new Date().toISOString().slice(0, 10)

  // Run the independent reads together.
  const [dailyPrompt, pendingDecisions, clientTasks, lastReport, projectRow] = await Promise.all([
    sb.from('dev_daily_prompts').select('id').eq('developer_id', developerId).eq('project_id', projectId)
      .is('submitted_at', null).eq('prompt_date', today).limit(1).maybeSingle().then((r: any) => r.data).catch(() => null),
    sb.from('decisions').select('id', { count: 'exact', head: true }).eq('project_id', projectId)
      .eq('status', 'pending_client').then((r: any) => r.count ?? 0).catch(() => 0),
    sb.from('tasks').select('id', { count: 'exact', head: true }).eq('project_id', projectId)
      .eq('audience', 'client').not('client_status', 'in', '("done","completed","approved")')
      .then((r: any) => r.count ?? 0).catch(() => 0),
    sb.from('status_reports').select('created_at').eq('project_id', projectId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle().then((r: any) => r.data).catch(() => null),
    sb.from('projects').select('title').eq('id', projectId).maybeSingle().then((r: any) => r.data).catch(() => null),
  ])

  const projectName = projectRow?.title || 'das Projekt'

  if (dailyPrompt) {
    dataHints.push({
      id: 'daily-prompt', label: `Tagesstand für ${projectName} posten`,
      prefill: 'Heutiger Stand: ', action: 'compose', tone: 'info', icon: 'pulse',
    })
  }
  if (pendingDecisions > 0) {
    dataHints.push({
      id: 'pending-decisions',
      label: `${pendingDecisions} Entscheidung${pendingDecisions === 1 ? '' : 'en'} warten auf den Kunden — nachfassen?`,
      action: 'open_decisions', count: pendingDecisions, tone: 'warn', icon: 'scissors',
    })
  }
  if (clientTasks > 0) {
    dataHints.push({
      id: 'client-tasks',
      label: `Kunde hat ${clientTasks} Aufgabe${clientTasks === 1 ? '' : 'n'} offen`,
      prefill: 'Erinnerung an den Kunden: ', action: 'compose', count: clientTasks, tone: 'warn', icon: 'list',
    })
  }
  const days = lastReport?.created_at ? daysSince(lastReport.created_at) : null
  if (days === null || days >= 3) {
    dataHints.push({
      id: 'stale-update',
      label: days === null ? 'Noch kein Kunden-Update gepostet' : `Letztes Kunden-Update vor ${days} Tagen`,
      prefill: 'Update für den Kunden: ', action: 'compose', tone: days !== null && days >= 7 ? 'warn' : 'info', icon: 'clock',
    })
  }

  return [...dataHints, ...STATIC_HINTS].slice(0, 6)
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}
