import type { BriefingType } from '@/lib/voice'

type BriefingInput = {
  type: BriefingType
  projectTitle?: string
  report?: string
  projectStatus?: string
  progress?: number
  blockerCount?: number
  decisionCount?: number
  nextSteps?: string[]
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sentenceSlice(value: string, max = 3) {
  const clean = stripMarkdown(value)
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []
  return sentences.slice(0, max).join(' ').trim()
}

export function generateBriefingText(input: BriefingInput) {
  const project = input.projectTitle || 'dieses Projekt'
  const intro = input.type === 'dashboard_briefing'
    ? 'Hier ist dein kurzes Festag Briefing.'
    : `Hier ist dein kurzes Briefing für ${project}.`

  const status = input.progress !== undefined
    ? `Der aktuelle Fortschritt liegt bei ungefähr ${input.progress} Prozent.`
    : input.projectStatus
      ? `Der aktuelle Status ist ${input.projectStatus}.`
      : ''

  const reportSummary = input.report ? sentenceSlice(input.report, 3) : ''
  const blockers = input.blockerCount && input.blockerCount > 0
    ? `${input.blockerCount} mögliche Blocker oder Risiken sind markiert.`
    : 'Es sind aktuell keine kritischen Blocker markiert.'
  const decisions = input.decisionCount && input.decisionCount > 0
    ? `${input.decisionCount} Entscheidung${input.decisionCount === 1 ? '' : 'en'} brauchen Aufmerksamkeit.`
    : 'Aktuell ist keine unmittelbare Client-Entscheidung sichtbar.'
  const next = input.nextSteps?.length
    ? `Der nächste sinnvolle Schritt ist: ${input.nextSteps[0]}.`
    : 'Der nächste sinnvolle Schritt ist, die offenen Punkte im Bericht zu prüfen.'

  return [intro, status, reportSummary, blockers, decisions, next]
    .filter(Boolean)
    .join(' ')
}
