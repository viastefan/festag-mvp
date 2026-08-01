/**
 * Tagro Workspace Blueprint — heuristic intent → OKM-ready structure.
 * Used by onboarding (context step) and /api/onboarding/analyze-intent.
 * Collaboration intelligence only — workspace-scoped, never surveillance scores.
 */

export type TagroBlueprint = {
  workspaceType: string
  confidence: number
  mode: 'developer' | 'client' | 'hybrid' | ''
  signals: Array<{ label: string; score: number }>
  modules: string[]
  integrations: string[]
  navigation: string[]
  primaryGoal: string
  needs: string[]
  needsClarify: boolean
  intentSummary: string
}

const DEFAULT_INTEGRATIONS = [
  'GitHub',
  'Figma',
  'Slack',
  'Google Calendar',
  'Notion',
  'Linear',
]

export function analyzeIntent(raw: string, clarifyPick = ''): TagroBlueprint {
  const s = raw.trim().toLowerCase()
  const empty: TagroBlueprint = {
    workspaceType: '—',
    confidence: 0,
    mode: '',
    signals: [],
    modules: [],
    integrations: [],
    navigation: ['Dashboard', 'Projects', 'Tagro'],
    primaryGoal: '',
    needs: [],
    needsClarify: false,
    intentSummary: '',
  }
  if (s.length < 4 && !clarifyPick) return empty

  let agency = 0
  let freelancer = 0
  let startup = 0
  let company = 0
  let developer = 0
  let client = 0
  let github = 0
  let figma = 0
  let portal = 0

  if (/agentur|agency|mitarbeiter|kundenprojekt/.test(s)) agency += 42
  if (/kunde|kunden|client|extern/.test(s)) {
    agency += 18
    client += 28
    portal += 35
  }
  if (/freelance|freelancer|allein|solo|selbstständig/.test(s)) freelancer += 48
  if (/startup|gründung|mvp|saas/.test(s)) startup += 44
  if (/unternehmen|firma|company|enterprise|konzern|team leiten|produktteam/.test(s)) company += 40
  if (/entwickl|bau|software|app|code|github|frontend|backend|webseite|website/.test(s)) developer += 40
  if (/suche.*(freelancer|entwickler)|brauche.*(freelancer|entwickler)/.test(s)) {
    client += 35
    portal += 25
  }
  if (/github|supabase|vercel|repo/.test(s)) github += 55
  if (/figma|design/.test(s)) figma += 40
  if (/organisieren|projektmanagement|status|rechnung|invoice/.test(s)) {
    agency += 12
    portal += 20
  }

  if (clarifyPick === 'Agentur') agency += 55
  if (clarifyPick === 'Developer' || clarifyPick === 'Freelancer') {
    developer += 55
    freelancer += 40
  }
  if (clarifyPick === 'Startup') startup += 55
  if (clarifyPick === 'Unternehmen') company += 55

  const typeScores: Array<[string, number]> = [
    ['Agency', agency],
    ['Developer', Math.max(freelancer, developer)],
    ['Startup', startup],
    ['Company', company],
  ]
  typeScores.sort((a, b) => b[1] - a[1])
  const topType = typeScores[0][0]
  const topScore = typeScores[0][1]
  const second = typeScores[1][1]
  const confidence = Math.min(98, Math.max(0, Math.round(topScore + (topScore - second) * 0.35)))

  let mode: TagroBlueprint['mode'] = ''
  if (developer >= 28 && client >= 28) mode = 'hybrid'
  else if (client > developer + 8) mode = 'client'
  else if (developer > 20) mode = 'developer'
  else if (topType === 'Agency' || topType === 'Developer') mode = 'hybrid'
  else if (topType === 'Company') mode = 'client'
  else if (topType === 'Startup') mode = 'developer'

  const signals: Array<{ label: string; score: number }> = []
  if (agency > 12) signals.push({ label: 'Agency', score: Math.min(99, agency + 20) })
  if (developer > 12 || freelancer > 12) {
    signals.push({
      label: 'Developer',
      score: Math.min(99, Math.max(developer, freelancer) + 22),
    })
  }
  if (startup > 12) signals.push({ label: 'Startup', score: Math.min(99, startup + 22) })
  if (company > 12) signals.push({ label: 'Company', score: Math.min(99, company + 20) })
  if (github > 20) signals.push({ label: 'Needs GitHub', score: Math.min(99, github + 20) })
  if (portal > 20) signals.push({ label: 'Likely Client Portal', score: Math.min(99, portal + 18) })
  if (figma > 20) signals.push({ label: 'Needs Figma', score: Math.min(99, figma + 18) })
  signals.sort((a, b) => b.score - a.score)

  const modulesByType: Record<string, string[]> = {
    Agency: ['Projects', 'Clients', 'Tasks', 'Status Reports', 'Files', 'Billing'],
    Developer: ['Projects', 'Tasks', 'Files', 'Invoices', 'Messages'],
    Startup: ['Projects', 'Tasks', 'Roadmap', 'Git', 'AI'],
    Company: ['Overview', 'Projects', 'People', 'Reports', 'Files'],
  }
  const navByMode: Record<string, string[]> = {
    developer: ['Dashboard', 'Projects', 'Git', 'Tasks', 'Tagro'],
    client: ['Dashboard', 'Projects', 'Progress', 'Files', 'Tagro'],
    hybrid: ['Dashboard', 'Projects', 'Clients', 'Tasks', 'Tagro'],
    '': ['Dashboard', 'Projects', 'Tagro'],
  }
  const integByType: Record<string, string[]> = {
    Agency: ['GitHub', 'Figma', 'Slack', 'Google Calendar', 'Notion'],
    Developer: ['GitHub', 'Figma', 'Slack', 'Google Calendar'],
    Startup: ['GitHub', 'Linear', 'Supabase', 'Vercel', 'Notion'],
    Company: ['Microsoft', 'Jira', 'Slack', 'Google Calendar', 'GitHub'],
  }

  const modules = modulesByType[topType] || ['Projects', 'Tasks', 'Files']
  const integrations = [
    ...(github > 20 ? ['GitHub', 'Supabase'] : []),
    ...(figma > 20 ? ['Figma'] : []),
    ...(integByType[topType] || DEFAULT_INTEGRATIONS),
  ]
  const seen = new Set<string>()
  const integrationsUnique = integrations.filter((x) => (seen.has(x) ? false : (seen.add(x), true))).slice(0, 6)

  const needs: string[] = []
  if (client > 15) needs.push('Clients')
  if (developer > 15) needs.push('Delivery')
  if (portal > 20) needs.push('Status & Freigaben')
  if (freelancer > 20 || /freelancer|entwickler/.test(s)) needs.push('Collaborators')
  if (github > 20) needs.push('Repos')

  let primaryGoal = 'Workspace einrichten'
  if (/webseite|website|app|saas|produkt/.test(s)) primaryGoal = 'Digitale Produkte bauen'
  else if (/suche|brauche/.test(s)) primaryGoal = 'Mitwirkende finden'
  else if (/organisieren|projektmanagement/.test(s)) primaryGoal = 'Arbeit organisieren'
  else if (/kunde/.test(s)) primaryGoal = 'Kundenarbeit liefern'

  const needsClarify = s.length >= 6 && confidence > 0 && confidence < 72 && !clarifyPick

  return {
    workspaceType: topScore > 8 ? topType : '—',
    confidence: topScore > 8 ? confidence : 0,
    mode,
    signals: signals.slice(0, 5),
    modules,
    integrations: integrationsUnique,
    navigation: navByMode[mode] || navByMode[''],
    primaryGoal,
    needs,
    needsClarify,
    intentSummary: raw.trim().slice(0, 160),
  }
}

/** Merge blueprint into workspace metadata (non-destructive). */
export function blueprintMetadataPatch(
  metadata: Record<string, unknown>,
  blueprint: TagroBlueprint,
): Record<string, unknown> {
  return {
    ...metadata,
    tagro_blueprint: {
      ...blueprint,
      updated_at: new Date().toISOString(),
      source: 'onboarding_intent',
    },
  }
}
