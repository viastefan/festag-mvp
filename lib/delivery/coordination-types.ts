/**
 * Delivery Coordination — shared types for the client↔dev bridge.
 *
 * Tagro orchestrates proposals, decisions, and status without email/WhatsApp.
 * Direct chat remains available via inbox threads.
 */

export type CoordinationActor = 'client' | 'dev' | 'tagro' | 'system'

export type CoordinationEventKind =
  | 'client_request'
  | 'dev_proposal'
  | 'decision_pending'
  | 'decision_accepted'
  | 'decision_rejected'
  | 'tagro_counter'
  | 'task_in_progress'
  | 'task_completed'
  | 'status_snippet'

export type CoordinationEvent = {
  id: string
  kind: CoordinationEventKind
  title: string
  body?: string | null
  actor: CoordinationActor
  timestamp: string
  taskId?: string | null
  decisionId?: string | null
  status?: string | null
  actionable?: boolean
  link?: string | null
}

export type CoordinationState = {
  projectId: string
  taskId?: string | null
  events: CoordinationEvent[]
  openDecisions: Array<{
    id: string
    title: string
    status: string
    urgency: string
    tagroRecommended?: string | null
  }>
  pendingClientActions: number
  pendingDevActions: number
}

export type IntakeClientRequestInput = {
  projectId: string
  title: string
  description?: string | null
  priority?: 'critical' | 'high' | 'medium' | 'low'
  workType?: string | null
  actorId: string
  source?: 'client_portal' | 'email_capture' | 'tagro' | 'status_report'
}

export type DevProposeInput = {
  projectId: string
  taskId?: string | null
  question: string
  suggestedOptions?: string[]
  recommendation?: string | null
  urgency?: 'low' | 'normal' | 'high' | 'critical'
  actorId: string
}

export type DecisionOutcomeInput = {
  decisionId: string
  projectId: string
  taskId?: string | null
  accepted: boolean
  responseLabel?: string | null
  rationale?: string | null
  actorId: string
}
