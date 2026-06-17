import type { Icon } from '@phosphor-icons/react'
import {
  Bell, Briefcase, Receipt, UsersThree, Sparkle, Tray,
  WarningCircle, CheckCircle, ClipboardText, PaperPlaneTilt, Robot,
} from '@phosphor-icons/react'

export type InboxVariant = 'client' | 'dev'

export type InboxCategoryId =
  | 'all' | 'project' | 'billing' | 'account' | 'tagro'
  | 'client' | 'blockers' | 'review' | 'approved' | 'assigned'

export type InboxCategoryDef = {
  id: InboxCategoryId
  label: string
  icon: Icon
  hint: string
  /** DB category filter — undefined means "all" or kind-based */
  dbCategory?: string
  /** Dev-only: filter by metadata.kind groups */
  kinds?: string[]
}

export const CLIENT_CATEGORIES: InboxCategoryDef[] = [
  { id: 'all', label: 'Alle', icon: Tray, hint: 'Alle Eingänge zusammen.' },
  { id: 'project', label: 'Projekt', icon: Briefcase, hint: 'Updates, Deliverables und Fragen aus deinen Projekten.', dbCategory: 'client' },
  { id: 'billing', label: 'Rechnungen & Verträge', icon: Receipt, hint: 'Festag-Rechnungen, Vertragsversand, Zahlungsbestätigungen.', dbCategory: 'billing' },
  { id: 'account', label: 'Konto & Team', icon: UsersThree, hint: 'Seats, Einladungen, Rollen.', dbCategory: 'system' },
  { id: 'tagro', label: 'Tagro Assist', icon: Sparkle, hint: 'Kuratierte Zusammenfassungen und Vorschläge von Tagro.', dbCategory: 'tagro' },
]

export const DEV_KIND_GROUPS: Record<string, string[]> = {
  client: ['client_request_created', 'decision_answered', 'decision_applied'],
  blockers: ['blocker_reported', 'owner_changes_requested', 'quality_issue'],
  review: ['finished_by_dev', 'needs_review', 'proof_missing', 'tagro_verified'],
  approved: ['approved_by_owner'],
  assigned: ['task_assigned', 'project_available', 'proposal_received', 'tagro_daily_prompt', 'decision_requested'],
}

export const DEV_CATEGORIES: InboxCategoryDef[] = [
  { id: 'all', label: 'Alle', icon: Bell, hint: 'Alle operativen Eingänge.' },
  { id: 'client', label: 'Client', icon: PaperPlaneTilt, hint: 'Neue Client-Anfragen und Rückfragen.', kinds: DEV_KIND_GROUPS.client },
  { id: 'blockers', label: 'Blocker', icon: WarningCircle, hint: 'Blocker, Änderungswünsche, Qualitätsfragen.', kinds: DEV_KIND_GROUPS.blockers },
  { id: 'review', label: 'Prüfung', icon: Robot, hint: 'Abgeschlossene Tasks, Reviews, Nachweise.', kinds: DEV_KIND_GROUPS.review },
  { id: 'approved', label: 'Freigaben', icon: CheckCircle, hint: 'Vom Owner freigegebene Arbeit.', kinds: DEV_KIND_GROUPS.approved },
  { id: 'assigned', label: 'Zugewiesen', icon: ClipboardText, hint: 'Neue Zuweisungen und verfügbare Projekte.', kinds: DEV_KIND_GROUPS.assigned },
]

export const DEV_ACTIONABLE_KINDS = new Set([
  'client_request_created', 'blocker_reported', 'owner_changes_requested',
  'quality_issue', 'needs_review', 'proof_missing', 'task_assigned',
  'tagro_daily_prompt', 'proposal_received',
  'decision_answered', 'decision_applied', 'decision_requested',
])

export const DEV_KIND_LABEL: Record<string, string> = {
  client_request_created: 'Client-Anfrage',
  blocker_reported: 'Blocker',
  owner_changes_requested: 'Änderungen angefordert',
  quality_issue: 'Qualitätsfrage',
  finished_by_dev: 'Zur Prüfung',
  needs_review: 'Review nötig',
  proof_missing: 'Nachweise fehlen',
  tagro_verified: 'Verifiziert',
  approved_by_owner: 'Freigegeben',
  task_assigned: 'Zugewiesen',
  project_available: 'Neues Projekt',
  proposal_received: 'Team-Vorschlag',
  tagro_daily_prompt: 'Tagesabschluss',
  work_log: 'Update',
  status_changed: 'Status',
  proof_added: 'Nachweis',
  conversation_summary: 'Zusammenfassung',
  dev_joined: 'Beigetreten',
  decision_answered: 'Entscheidung beantwortet',
  decision_applied: 'Entscheidung angewendet',
  decision_requested: 'Entscheidung angefordert',
}

export const DEV_KIND_ACTION: Record<string, string> = {
  client_request_created: 'Anfrage sichten',
  blocker_reported: 'Klärung vorbereiten',
  owner_changes_requested: 'Änderungen umsetzen',
  quality_issue: 'Task überarbeiten',
  needs_review: 'Nachweise ergänzen',
  proof_missing: 'Belege hochladen',
  task_assigned: 'Task öffnen',
  project_available: 'Projekt ansehen',
  proposal_received: 'Vorschlag prüfen',
  tagro_daily_prompt: 'Update senden',
  decision_answered: 'Antwort umsetzen',
  decision_applied: 'Task fortsetzen',
  decision_requested: 'Entscheidung prüfen',
}

export const CLIENT_ITEM_TYPE_LABEL: Record<string, string> = {
  update: 'Update',
  action: 'Aktion erforderlich',
  question: 'Frage',
  deliverable: 'Deliverable',
  note: 'Notiz',
  task_event: 'Aufgabe',
  status_update: 'Status',
  project_event: 'Projekt',
  system_event: 'System',
  invoice_created: 'Rechnung',
  payment_event: 'Zahlung',
  guarantee_event: 'Garantie',
  support_event: 'Support',
  chat_message: 'Nachricht',
}
