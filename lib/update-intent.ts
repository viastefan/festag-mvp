export type UpdateIntent =
  | 'answer'
  | 'task'
  | 'decision'
  | 'status_report'
  | 'ticket'

export const UPDATE_INTENT_LABELS: Record<UpdateIntent, string> = {
  answer: 'Frage beantworten',
  task: 'Aufgabe erstellen',
  decision: 'Entscheidung anfordern',
  status_report: 'Statusbericht generieren',
  ticket: 'Ticket anlegen',
}

export function classifyUpdateIntent(text: string): UpdateIntent {
  const t = text.toLowerCase().trim()
  if (/statusbericht|status\s*bericht|bericht\s*erstellen|erstelle.*bericht/.test(t)) return 'status_report'
  if (/entscheidung|freigabe|genehmig|zustimmung/.test(t)) return 'decision'
  if (/ticket|bug\s*melden|\bissue\b/.test(t)) return 'ticket'
  if (/hinzufügen|hinzufuegen|erstelle|implementier|baue|füge|fuege|landingpage|login|feature/.test(t)) {
    return 'task'
  }
  if (/\?|wie ist|wann wird|was steht|welche blocker|aktuell|blocker/.test(t)) return 'answer'
  return 'answer'
}
