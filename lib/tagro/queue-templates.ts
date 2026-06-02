/**
 * Tagro Queue — job templates.
 *
 * Recurring/scheduled Tagro work. Drafts by default; client-facing jobs require
 * approval before anything is sent. These templates seed the Queue UI; the
 * scheduler/runner consumes `scheduled_ai_jobs` rows created from them.
 */

export type ScheduleType = 'once' | 'recurring' | 'event_based' | 'manual_only' | 'quota_aware'
export type Audience = 'internal' | 'client' | 'executive'
export type DeliveryMode = 'draft_only' | 'send_after_approval' | 'auto_send' | 'no_delivery'

export type QueueTemplate = {
  job_type: string
  label: string
  desc: string
  schedule_type: ScheduleType
  /** Human-readable cadence shown in the UI. */
  cron: string
  audience: Audience
  output_type: string
  delivery_mode: DeliveryMode
  review_required: boolean
}

export const QUEUE_TEMPLATES: QueueTemplate[] = [
  {
    job_type: 'weekly_report',
    label: 'Wöchentlicher Statusbericht',
    desc: 'Tagro verdichtet Fortschritt, offene Punkte und nächste Schritte zu einem kundenfähigen Bericht.',
    schedule_type: 'recurring', cron: 'Freitags 16:00',
    audience: 'client', output_type: 'report', delivery_mode: 'send_after_approval', review_required: true,
  },
  {
    job_type: 'health_refresh',
    label: 'Täglicher Health-Check',
    desc: 'Ruhige interne Aktualisierung des Projektstatus — nur bei Bedarf sichtbar.',
    schedule_type: 'recurring', cron: 'Werktags 09:00',
    audience: 'internal', output_type: 'health', delivery_mode: 'no_delivery', review_required: false,
  },
  {
    job_type: 'nexora_scan',
    label: 'Nexora Readiness-Scan',
    desc: 'Prüft Belege, offene Entscheidungen, Freigaben und client-safe Inhalte vor dem Versand.',
    schedule_type: 'recurring', cron: 'Werktags 08:00',
    audience: 'internal', output_type: 'nexora', delivery_mode: 'no_delivery', review_required: false,
  },
  {
    job_type: 'proofgrid_check',
    label: 'ProofGrid-Check',
    desc: 'Erinnert an fehlende Nachweise für berichtete Arbeit.',
    schedule_type: 'recurring', cron: 'Freitags 15:00',
    audience: 'internal', output_type: 'proofgrid', delivery_mode: 'no_delivery', review_required: false,
  },
  {
    job_type: 'decision_digest',
    label: 'Entscheidungs-Digest',
    desc: 'Sammelt offene Entscheidungen und bereitet sie als klare Ja/Nein-Fragen auf.',
    schedule_type: 'recurring', cron: 'Werktags 17:00',
    audience: 'internal', output_type: 'digest', delivery_mode: 'draft_only', review_required: true,
  },
  {
    job_type: 'executive_briefing',
    label: 'Executive Briefing',
    desc: 'Kurzer, ruhiger Überblick für Entscheider — Status, Risiken, nächste Schritte.',
    schedule_type: 'recurring', cron: 'Montags 08:00',
    audience: 'executive', output_type: 'briefing', delivery_mode: 'draft_only', review_required: true,
  },
  {
    job_type: 'audio_briefing',
    label: 'Audio-Briefing (mit Transkript)',
    desc: 'Gesprochener Wochenüberblick — immer mit Text-Transkript.',
    schedule_type: 'recurring', cron: 'Freitags 16:30',
    audience: 'client', output_type: 'audio', delivery_mode: 'send_after_approval', review_required: true,
  },
]

export const AUDIENCE_LABEL: Record<Audience, string> = {
  internal: 'Intern', client: 'Kunde', executive: 'Executive',
}

export const DELIVERY_LABEL: Record<DeliveryMode, string> = {
  draft_only: 'Nur Entwurf',
  send_after_approval: 'Nach Freigabe senden',
  auto_send: 'Automatisch senden',
  no_delivery: 'Keine Zustellung',
}

export function queueTemplate(jobType: string): QueueTemplate | undefined {
  return QUEUE_TEMPLATES.find(t => t.job_type === jobType)
}
