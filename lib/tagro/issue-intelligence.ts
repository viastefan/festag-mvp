import type { SupabaseClient } from '@supabase/supabase-js'
import { runOpenAIJson } from '@/lib/tagro/openai'
import { ISSUE_OPEN_STATUSES, type Issue } from '@/lib/issues/types'

export type IssueInterpretation = {
  issue_id: string
  summary: string
  confidence: number
  blocks_delivery: boolean
  impact?: string | null
  delay_days_min?: number | null
  delay_days_max?: number | null
}

export type ProjectIssueIntelligence = {
  project_summary: string
  issues: IssueInterpretation[]
  confidence: number
}

function heuristicInterpret(issues: Issue[]): ProjectIssueIntelligence {
  const open = issues.filter(i => ISSUE_OPEN_STATUSES.has(i.status))
  const blockers = open.filter(i => i.issue_type === 'blocker' || i.severity === 'critical')

  const project_summary = blockers.length > 0
    ? `${open.length} offene Issues · ${blockers.length} ${blockers.length === 1 ? 'blockiert' : 'blockieren'} die Auslieferung.`
    : open.length > 0
      ? `${open.length} offene Issues — keine kritischen Blocker erkannt.`
      : 'Keine offenen Issues.'

  return {
    project_summary,
    confidence: 0.45,
    issues: open.slice(0, 12).map(i => ({
      issue_id: i.id,
      summary: i.impact || i.description?.slice(0, 160) || i.title,
      confidence: 0.4,
      blocks_delivery: i.issue_type === 'blocker' || i.severity === 'critical',
      impact: i.impact || null,
      delay_days_min: i.issue_type === 'blocker' ? 1 : null,
      delay_days_max: i.issue_type === 'blocker' ? 3 : null,
    })),
  }
}

export async function interpretProjectIssues(
  projectTitle: string,
  issues: Issue[],
): Promise<ProjectIssueIntelligence> {
  const open = issues.filter(i => ISSUE_OPEN_STATUSES.has(i.status))
  if (open.length === 0) {
    return {
      project_summary: `${projectTitle}: Keine offenen Issues.`,
      issues: [],
      confidence: 0.7,
    }
  }

  const issueList = open.slice(0, 20).map((i, idx) => (
    `${idx + 1}. [${i.id}] ${i.issue_type}/${i.severity} — ${i.title}${i.description ? `\n   ${i.description.slice(0, 200)}` : ''}`
  )).join('\n')

  const prompt = `Du bist Tagro — Operational Intelligence für Festag.

Projekt: "${projectTitle}"

Offene Issues (aus GitHub/Jira/Linear oder manuell):
"""
${issueList}
"""

Interpretiere diese Issues für Führungskräfte und Delivery-Leads.

Regeln:
- Kein technisches Rauschen, keine Commit-Hashes.
- Sage WAS blockiert, WARUM es wichtig ist, geschätzte Verzögerung wenn erkennbar.
- project_summary: 2-4 Sätze Gesamtbild (wie: "Authentication complete. Payment blocked by missing Stripe webhook. Estimated delay 2-3 days.")
- Pro Issue: kurze summary (1-2 Sätze), blocks_delivery boolean, optional delay_days_min/max.
- Deutsch, ruhig, sachlich.

Antworte als JSON:
{
  "project_summary": string,
  "confidence": number,
  "issues": [
    {
      "issue_id": string,
      "summary": string,
      "confidence": number,
      "blocks_delivery": boolean,
      "impact": string | null,
      "delay_days_min": number | null,
      "delay_days_max": number | null
    }
  ]
}`

  const { output } = await runOpenAIJson({
    prompt,
    runType: 'issue_intelligence',
    fallback: () => heuristicInterpret(open) as unknown as Record<string, unknown>,
  })

  const parsed = output as Partial<ProjectIssueIntelligence>
  const interpretations = Array.isArray(parsed.issues) ? parsed.issues : heuristicInterpret(open).issues

  return {
    project_summary: String(parsed.project_summary || heuristicInterpret(open).project_summary),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    issues: interpretations
      .filter(row => row?.issue_id && row?.summary)
      .map(row => ({
        issue_id: String(row.issue_id),
        summary: String(row.summary).slice(0, 4000),
        confidence: typeof row.confidence === 'number' ? Math.max(0, Math.min(1, row.confidence)) : 0.5,
        blocks_delivery: !!row.blocks_delivery,
        impact: row.impact ? String(row.impact).slice(0, 2000) : null,
        delay_days_min: typeof row.delay_days_min === 'number' ? row.delay_days_min : null,
        delay_days_max: typeof row.delay_days_max === 'number' ? row.delay_days_max : null,
      })),
  }
}

export async function enrichProjectIssues(
  sb: SupabaseClient<any>,
  projectId: string,
  opts: { projectTitle?: string; limit?: number } = {},
): Promise<{ updated: number; intelligence: ProjectIssueIntelligence }> {
  const limit = opts.limit ?? 40

  const [{ data: project }, { data: rows }] = await Promise.all([
    sb.from('projects').select('id,title').eq('id', projectId).maybeSingle(),
    sb.from('issues')
      .select('*')
      .eq('project_id', projectId)
      .in('status', Array.from(ISSUE_OPEN_STATUSES))
      .order('updated_at', { ascending: false })
      .limit(limit),
  ])

  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const issues = (((rows as Issue[] | null) ?? []))
    .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9))
  const projectTitle = opts.projectTitle || (project as any)?.title || 'Projekt'
  const intelligence = await interpretProjectIssues(projectTitle, issues)

  let updated = 0
  for (const item of intelligence.issues) {
    const match = issues.find(i => i.id === item.issue_id)
    if (!match) continue

    const delayNote =
      item.delay_days_min != null && item.delay_days_max != null
        ? ` Geschätzte Verzögerung: ${item.delay_days_min}–${item.delay_days_max} Tage.`
        : ''

    const { error } = await sb.from('issues').update({
      tagro_summary: `${item.summary}${delayNote}`.trim(),
      tagro_confidence: item.confidence,
      impact: item.impact || match.impact || null,
    }).eq('id', item.issue_id)

    if (!error) updated++
  }

  return { updated, intelligence }
}
