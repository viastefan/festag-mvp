export type WorkflowTriggerId =
  | 'manual'
  | 'schedule_daily'
  | 'schedule_weekly'
  | 'task_completed'
  | 'blocker_detected'
  | 'phase_change'
  | 'deadline_approaching'
  | 'ai_delay_risk'
  | 'client_message'

export type WorkflowStepId =
  | 'project_summary'
  | 'progress'
  | 'blockers'
  | 'next_steps'
  | 'ai_insight'
  | 'output_dashboard'
  | 'output_whatsapp'
  | 'output_email'
  | 'output_audio'

export type StatusWorkflow = {
  id: string
  name: string
  trigger: WorkflowTriggerId | null
  triggerConfig?: {
    time?: string
    weekday?: number
  }
  steps: WorkflowStepId[]
  updatedAt: string
}

export type WorkflowTriggerDef = {
  id: WorkflowTriggerId
  label: string
  description: string
  group: 'user' | 'system' | 'ai'
}

export type WorkflowStepDef = {
  id: WorkflowStepId
  label: string
  description: string
  group: 'report' | 'output'
}

export const WORKFLOW_TRIGGERS: WorkflowTriggerDef[] = [
  { id: 'manual', label: 'Manuell starten', description: 'Du startest den Statusbericht per Klick', group: 'user' },
  { id: 'schedule_daily', label: 'Täglicher Rhythmus', description: 'Jeden Tag um 18:00 Uhr automatisch', group: 'system' },
  { id: 'schedule_weekly', label: 'Wöchentlicher Bericht', description: 'Freitag, vor dem Client-Update', group: 'system' },
  { id: 'task_completed', label: 'Nach Task-Abschluss', description: 'Sobald ein Task erledigt ist', group: 'system' },
  { id: 'blocker_detected', label: 'Bei Blocker', description: 'Wenn ein Task blockiert ist', group: 'system' },
  { id: 'phase_change', label: 'Bei Phasenwechsel', description: 'Intake, Planung, Execution, Review, Delivery', group: 'system' },
  { id: 'deadline_approaching', label: 'Deadline naht', description: '48 Stunden vor Meilenstein', group: 'system' },
  { id: 'client_message', label: 'Kundennachricht', description: 'Wenn eine Client-Nachricht eintrifft', group: 'user' },
  { id: 'ai_delay_risk', label: 'AI erkennt Verzögerung', description: 'Tagro meldet Risiko auf dem kritischen Pfad', group: 'ai' },
]

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  { id: 'project_summary', label: 'Projekt-Zusammenfassung', description: 'Was wurde heute gemacht?', group: 'report' },
  { id: 'progress', label: 'Fortschritt', description: 'Prozent, erledigte und offene Tasks', group: 'report' },
  { id: 'blockers', label: 'Blocker', description: 'Was blockiert aktuell?', group: 'report' },
  { id: 'next_steps', label: 'Nächste Schritte', description: 'Was passiert als Nächstes?', group: 'report' },
  { id: 'ai_insight', label: 'AI-Einschätzung', description: 'Risiko und Verzögerungsvorhersage', group: 'report' },
  { id: 'output_dashboard', label: 'App-Dashboard', description: 'Bericht im Status-Home sichtbar', group: 'output' },
  { id: 'output_whatsapp', label: 'WhatsApp', description: 'Kurzupdate an den Client (optional)', group: 'output' },
  { id: 'output_email', label: 'E-Mail', description: 'Vollständiger Bericht per Mail', group: 'output' },
  { id: 'output_audio', label: 'Audio-Briefing', description: 'Tagro liest den Bericht vor', group: 'output' },
]

export const DEFAULT_STATUS_WORKFLOW: Omit<StatusWorkflow, 'id' | 'updatedAt'> = {
  name: 'Standard',
  trigger: 'schedule_daily',
  triggerConfig: { time: '18:00' },
  steps: ['project_summary', 'progress', 'blockers', 'next_steps', 'ai_insight', 'output_dashboard'],
}
