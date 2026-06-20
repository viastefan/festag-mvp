import type { WorkSignalType } from '@/lib/work-types'

export function mapSlackMessageType(text: string): WorkSignalType {
  const t = text.toLowerCase()
  if (/blockiert|blocker|blocked|stuck|waiting on/i.test(t)) return 'blocker_reported'
  if (/entscheidung|decision|approve|freigabe|need (your )?input/i.test(t)) return 'decision_needed'
  if (/risiko|risk|concern|delayed|verzög/i.test(t)) return 'risk_reported'
  if (/deploy|release|live|shipped|merged/i.test(t)) return 'deployment_update'
  if (/status|update|fortschritt|progress|done|fertig|completed/i.test(t)) return 'status_note'
  return 'comment_added'
}

export function formatSlackSignalContent(text: string, userId?: string): string {
  const prefix = userId ? `[Slack ${userId}] ` : '[Slack] '
  return `${prefix}${text.trim()}`.slice(0, 8000)
}
