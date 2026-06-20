import type { SupabaseClient } from '@supabase/supabase-js'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'
import { tagroComplete } from '@/lib/tagro/complete'
import { buildExecutiveOverview } from '@/lib/executive/build-overview'
import type { ExecutiveDailyReport, ExecutiveHealth } from '@/lib/executive/types'

const HEALTH_LABEL: Record<ExecutiveHealth, string> = {
  healthy: 'Planmäßig',
  watch: 'Im Blick',
  risk: 'Erhöhtes Risiko',
  blocked: 'Blockiert',
}

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function dateLabelBerlin(): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date())
}

function synthesizeBody(
  overview: Awaited<ReturnType<typeof buildExecutiveOverview>>,
): string {
  const lines = [overview.headline, '', overview.summary]

  const notable = overview.projects.filter(p => p.summary || p.health !== 'healthy')
  if (notable.length > 0) {
    lines.push('', 'Projekte:')
    for (const p of notable.slice(0, 6)) {
      const detail = p.summary?.trim() || HEALTH_LABEL[p.health]
      lines.push(`• ${p.title}: ${detail}`)
    }
  }

  if (overview.forecast_days_min != null && overview.forecast_days_max != null) {
    lines.push('', `Forecast: ${overview.forecast_days_min}–${overview.forecast_days_max} Tage bei aktuellen Blockern.`)
  }

  return lines.filter(Boolean).join('\n')
}

function buildHighlights(
  overview: Awaited<ReturnType<typeof buildExecutiveOverview>>,
  decisionTitles: string[],
): string[] {
  const highlights: string[] = []
  if (overview.critical_issues > 0) {
    highlights.push(`${overview.critical_issues} kritische Issues`)
  }
  if (overview.open_decisions > 0) {
    highlights.push(`${overview.open_decisions} offene Entscheidungen`)
  }
  if (overview.forecast_days_min != null) {
    highlights.push(`Forecast ${overview.forecast_days_min}–${overview.forecast_days_max} Tage`)
  }
  for (const title of decisionTitles.slice(0, 3)) {
    highlights.push(`Entscheidung: ${title}`)
  }
  if (highlights.length === 0 && overview.projects.length > 0) {
    highlights.push(`${overview.progress_pct}% Fortschritt · ${overview.velocity_7d} abgeschlossen (7 Tage)`)
  }
  return highlights.slice(0, 6)
}

async function fetchLatestExecutiveBriefing(
  sb: SupabaseClient<any>,
  projectIds: string[],
): Promise<{ content: string; created_at: string } | null> {
  if (projectIds.length === 0) return null
  try {
    const { data } = await sb
      .from('ai_outputs')
      .select('content,created_at,audience,output_type')
      .in('project_id', projectIds)
      .eq('audience', 'executive')
      .order('created_at', { ascending: false })
      .limit(12)
    const rows = (data as any[]) ?? []
    const today = todayBerlin()
    const todayRow = rows.find(r => String(r.created_at ?? '').slice(0, 10) === today)
    const pick = todayRow ?? rows[0]
    if (!pick?.content?.trim()) return null
    return { content: String(pick.content).trim(), created_at: pick.created_at }
  } catch {
    return null
  }
}

async function generateTagroDailyReport(
  overview: Awaited<ReturnType<typeof buildExecutiveOverview>>,
): Promise<string | null> {
  const context = [
    `Gesundheit: ${overview.health}`,
    `Fortschritt: ${overview.progress_pct}%`,
    `Offene Issues: ${overview.open_issues} (${overview.critical_issues} kritisch)`,
    `Offene Entscheidungen: ${overview.open_decisions}`,
    `Velocity (7 Tage): ${overview.velocity_7d} abgeschlossen`,
    '',
    'Projekte:',
    ...overview.projects.map(p =>
      `- ${p.title}: ${p.progress_pct}% · ${p.open_issues} Issues · ${HEALTH_LABEL[p.health]}${p.summary ? ` — ${p.summary}` : ''}`,
    ),
  ].join('\n')

  const r = await tagroComplete({
    system:
      'Du bist Tagro, die Operational-Intelligence-Schicht von Festag. Schreibe ruhig, klar und ehrlich auf Deutsch. ' +
      'Keine Floskeln, keine Emojis, keine erfundenen Fakten.',
    prompt:
      `Portfolio-Kontext:\n${context}\n\n` +
      'Erstelle einen Tagro Tagesbericht für Führungskräfte (max. 10 Zeilen): ' +
      'Status in einem Satz, wichtigste Entwicklung, Risiken, nächste Entscheidung.',
    maxTokens: 900,
    temperature: 0.3,
  })

  return r.ok && r.text.trim() ? r.text.trim() : null
}

export async function buildExecutiveDailyReport(
  sb: SupabaseClient<any>,
  userId: string,
  opts?: { generateWithTagro?: boolean },
): Promise<ExecutiveDailyReport> {
  const overview = await buildExecutiveOverview(sb, userId)

  const { data: projs } = await sb
    .from('projects')
    .select('id')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .limit(50)
  const projectIds = ((projs as any[]) ?? []).map(p => p.id)

  let decisionTitles: string[] = []
  if (projectIds.length > 0) {
    const { data: decisions } = await sb
      .from('decisions')
      .select('title')
      .in('project_id', projectIds)
      .in('status', DECISION_OPEN_STATUS_LIST)
      .order('created_at', { ascending: false })
      .limit(5)
    decisionTitles = ((decisions as any[]) ?? []).map(d => String(d.title ?? '').trim()).filter(Boolean)
  }

  const highlights = buildHighlights(overview, decisionTitles)
  const date_label = dateLabelBerlin()

  if (opts?.generateWithTagro) {
    const tagroBody = await generateTagroDailyReport(overview)
    if (tagroBody) {
      return {
        title: 'Tagro Tagesbericht',
        date_label,
        body: tagroBody,
        highlights,
        source: 'tagro',
        generated_at: new Date().toISOString(),
      }
    }
  }

  const briefing = await fetchLatestExecutiveBriefing(sb, projectIds)
  if (briefing) {
    return {
      title: 'Tagro Tagesbericht',
      date_label,
      body: briefing.content,
      highlights,
      source: 'scheduled',
      generated_at: briefing.created_at,
    }
  }

  return {
    title: 'Tagesüberblick',
    date_label,
    body: synthesizeBody(overview),
    highlights,
    source: 'synthesized',
    generated_at: new Date().toISOString(),
  }
}
