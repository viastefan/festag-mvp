import type { SupabaseClient } from '@supabase/supabase-js'
import { buildTagroContext, contextToPromptText } from '@/lib/tagro/context-builder'
import { runOpenAIJson } from '@/lib/tagro/openai'
import { overallStatusReportPrompt, statusReportPrompt } from '@/lib/tagro/prompts'
import type { StatusReportOutput } from '@/lib/tagro/rules'
import type { TranslatedUpdate } from '@/lib/tagro/translate-update'

const DEFAULT_SINCE_HOURS = 24

function clamp(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function toStrArray(v: unknown, max = 4): string[] {
  return Array.isArray(v) ? v.map(x => String(x)).filter(Boolean).slice(0, max) : []
}

function hoursAgoIso(hours = DEFAULT_SINCE_HOURS) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

export async function gatherRecentDevSignals(
  sb: SupabaseClient<any>,
  projectId: string,
  since: string,
) {
  const [{ data: devRows }, { data: aiRows }, { data: activityRows }] = await Promise.all([
    sb
      .from('developer_updates')
      .select('update_text, status, blocker, blocker_description, created_at')
      .eq('project_id', projectId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(8),
    sb
      .from('ai_updates')
      .select('content, type, created_at')
      .eq('project_id', projectId)
      .in('type', ['dev_progress_update', 'status_report', 'daily_summary'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(6),
    sb
      .from('activity_feed')
      .select('title, body, event_type, created_at')
      .eq('project_id', projectId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const updates: Array<{ text: string; blocker: boolean; source: string }> = []

  for (const r of (devRows as any[]) ?? []) {
    const text = clamp(String(r.update_text ?? ''), 400)
    if (!text.trim()) continue
    updates.push({
      text,
      blocker: !!r.blocker || /blockiert|blocker/i.test(text),
      source: 'developer_update',
    })
  }

  for (const r of (aiRows as any[]) ?? []) {
    const text = clamp(String(r.content ?? ''), 400)
    if (!text.trim()) continue
    updates.push({
      text,
      blocker: /blockiert|blocker|risiko/i.test(text),
      source: `ai_${String(r.type ?? 'update')}`,
    })
  }

  for (const r of (activityRows as any[]) ?? []) {
    const text = clamp(String(r.title || r.body || ''), 280)
    if (!text.trim()) continue
    updates.push({
      text,
      blocker: /blocker|blockiert|risiko|verzöger/i.test(text),
      source: `activity_${String(r.event_type ?? 'event')}`,
    })
  }

  return updates.slice(0, 12)
}

function heuristicFromOutput(
  projectTitle: string,
  contextText: string,
  signals: Array<{ text: string; blocker: boolean }>,
): StatusReportOutput {
  const blockers = signals.filter(s => s.blocker).map(s => s.text)
  const work = signals.filter(s => !s.blocker).map(s => s.text)
  const openDecisions = (contextText.match(/Offene Entscheidungen \((\d+)\)/)?.[1] ?? '0')
  const openTasks = (contextText.match(/Offene Tasks \((\d+)\)/)?.[1] ?? '0')

  const lead = blockers.length > 0
    ? `Bei ${projectTitle} läuft die Arbeit; ein Punkt braucht Klärung.`
    : work.length > 0
      ? `Die Arbeit an ${projectTitle} ist im letzten Zeitraum vorangekommen.`
      : `Zu ${projectTitle} gibt es noch keine neuen Signale im gewählten Zeitraum.`

  return {
    summary: `${lead}${work[0] ? ` Zuletzt: ${work[0]}` : ''}`,
    completed_work: [],
    current_work: work.slice(0, 3),
    next_steps: Number(openDecisions) > 0 ? [`${openDecisions} offene Entscheidung${Number(openDecisions) === 1 ? '' : 'en'} warten`] : [],
    blockers: blockers.slice(0, 2),
    risks: Number(openTasks) > 5 ? ['Hohe offene Task-Last — Tagro empfiehlt Priorisierung'] : [],
    client_required_actions: Number(openDecisions) > 0 ? ['Offene Entscheidungen prüfen'] : [],
    dev_followups: [],
    decisions_needed: Number(openDecisions) > 0 ? [`${openDecisions} Entscheidung${Number(openDecisions) === 1 ? '' : 'en'} offen`] : [],
    suggested_action_items: [],
    confidence_score: 0.48,
  }
}

function mapStatusOutput(out: Record<string, unknown>, fallback: StatusReportOutput): {
  digest: TranslatedUpdate
  reportFields: {
    completed_work_json: string[]
    current_work_json: string[]
    next_steps_json: string[]
    blockers_json: string[]
    risks_json: string[]
    client_actions_json: string[]
    dev_followups_json: string[]
    decisions_needed_json: string[]
    action_items_json: unknown[]
  }
} {
  const merged: StatusReportOutput = {
    summary: String(out.summary ?? fallback.summary),
    completed_work: toStrArray(out.completed_work, 6).length ? toStrArray(out.completed_work, 6) : fallback.completed_work,
    current_work: toStrArray(out.current_work, 4).length ? toStrArray(out.current_work, 4) : fallback.current_work,
    next_steps: toStrArray(out.next_steps, 4).length ? toStrArray(out.next_steps, 4) : fallback.next_steps,
    blockers: toStrArray(out.blockers, 3).length ? toStrArray(out.blockers, 3) : fallback.blockers,
    risks: toStrArray(out.risks, 3).length ? toStrArray(out.risks, 3) : fallback.risks,
    client_required_actions: toStrArray(out.client_required_actions, 3).length ? toStrArray(out.client_required_actions, 3) : fallback.client_required_actions,
    dev_followups: toStrArray(out.dev_followups, 3).length ? toStrArray(out.dev_followups, 3) : fallback.dev_followups,
    decisions_needed: toStrArray(out.decisions_needed, 3).length ? toStrArray(out.decisions_needed, 3) : fallback.decisions_needed,
    suggested_action_items: Array.isArray(out.suggested_action_items) ? out.suggested_action_items : fallback.suggested_action_items,
    confidence_score: typeof out.confidence_score === 'number' ? out.confidence_score : fallback.confidence_score,
  }

  return {
    digest: {
      clientSummary: merged.summary,
      currentWork: merged.current_work,
      blockers: merged.blockers,
      nextSteps: merged.next_steps,
      confidence: Math.max(0, Math.min(1, merged.confidence_score)),
      model: 'pending',
    },
    reportFields: {
      completed_work_json: merged.completed_work,
      current_work_json: merged.current_work,
      next_steps_json: merged.next_steps,
      blockers_json: merged.blockers,
      risks_json: merged.risks,
      client_actions_json: merged.client_required_actions,
      dev_followups_json: merged.dev_followups,
      decisions_needed_json: merged.decisions_needed,
      action_items_json: merged.suggested_action_items as unknown[],
    },
  }
}

function signalsToText(signals: Array<{ text: string; blocker: boolean; source: string }>) {
  if (!signals.length) return 'Keine neuen Entwickler- oder Systemsignale im Zeitraum.'
  return signals
    .map((s, i) => `${i + 1}. [${s.source}]${s.blocker ? ' [Blocker]' : ''} ${s.text}`)
    .join('\n')
}

export async function generateProjectStatusDigest(
  sb: SupabaseClient<any>,
  projectId: string,
  options?: { since?: string; projectTitle?: string },
): Promise<TranslatedUpdate & { reportFields: ReturnType<typeof mapStatusOutput>['reportFields']; model: string }> {
  const since = options?.since ?? hoursAgoIso()
  const context = await buildTagroContext({ sb, projectId, purpose: 'status_report' })
  const projectTitle = options?.projectTitle ?? String(context.project?.title ?? 'das Projekt')
  const signals = await gatherRecentDevSignals(sb, projectId, since)
  const contextText = contextToPromptText(context)
  const promptBody = `${contextText}\n\nSignale der letzten ${DEFAULT_SINCE_HOURS} Stunden:\n${signalsToText(signals)}`
  const fallback = heuristicFromOutput(projectTitle, contextText, signals)

  const result = await runOpenAIJson({
    prompt: statusReportPrompt(promptBody),
    runType: 'status_report',
    fallback: () => fallback as unknown as Record<string, unknown>,
  })

  const mapped = mapStatusOutput(result.output as Record<string, unknown>, fallback)
  return {
    ...mapped.digest,
    model: result.model,
    reportFields: mapped.reportFields,
  }
}

export async function generateOverallStatusDigest(
  sb: SupabaseClient<any>,
  projects: Array<{ id: string; title?: string | null; status?: string | null }>,
  options?: { since?: string },
): Promise<TranslatedUpdate & { reportFields: ReturnType<typeof mapStatusOutput>['reportFields']; model: string }> {
  const since = options?.since ?? hoursAgoIso()
  const active = projects.filter(p => {
    const s = String(p.status ?? '').toLowerCase()
    return s !== 'done' && s !== 'archived'
  })

  if (!active.length) {
    const empty: StatusReportOutput = {
      summary: 'Noch keine aktiven Projekte. Sobald du ein Projekt startest, fasse ich den Gesamtstand hier zusammen.',
      completed_work: [], current_work: [], next_steps: [], blockers: [], risks: [],
      client_required_actions: [], dev_followups: [], decisions_needed: [],
      suggested_action_items: [], confidence_score: 0.55,
    }
    const mapped = mapStatusOutput(empty, empty)
    return { ...mapped.digest, model: 'heuristic', reportFields: mapped.reportFields }
  }

  const blocks: string[] = []
  const allSignals: Array<{ text: string; blocker: boolean }> = []

  for (const p of active.slice(0, 12)) {
    const context = await buildTagroContext({ sb, projectId: p.id, purpose: 'status_report' })
    const signals = await gatherRecentDevSignals(sb, p.id, since)
    allSignals.push(...signals.map(s => ({ text: `${p.title}: ${s.text}`, blocker: s.blocker })))
    blocks.push(
      `### ${p.title ?? 'Projekt'}\n${contextToPromptText(context)}\nSignale:\n${signalsToText(signals)}`,
    )
  }

  const portfolioFallback = heuristicFromOutput(
    'deine Projekte',
    blocks.join('\n'),
    allSignals,
  )
  portfolioFallback.summary = allSignals.length
    ? `Gesamtbericht über ${active.length} aktive Projekt${active.length === 1 ? '' : 'e'}. ${portfolioFallback.summary}`
    : `Über ${active.length} aktive Projekt${active.length === 1 ? '' : 'e'} gibt es im letzten Zeitraum noch keine neuen Signale. Tagro überwacht Tasks, Entscheidungen und Blocker weiter.`

  const result = await runOpenAIJson({
    prompt: overallStatusReportPrompt(blocks.join('\n\n')),
    runType: 'status_report_overall',
    fallback: () => portfolioFallback as unknown as Record<string, unknown>,
  })

  const mapped = mapStatusOutput(result.output as Record<string, unknown>, portfolioFallback)
  return {
    ...mapped.digest,
    model: result.model,
    reportFields: mapped.reportFields,
  }
}

export async function logTagroStatusRun(
  sb: SupabaseClient<any>,
  input: {
    projectId: string
    runType: string
    inputJson: Record<string, unknown>
    outputJson: Record<string, unknown>
    model: string
  },
) {
  await sb.from('tagro_runs').insert({
    project_id: input.projectId,
    run_type: input.runType,
    input_json: input.inputJson,
    output_json: input.outputJson,
    model: input.model,
    status: 'completed',
  }).then(() => null, () => null)
}
