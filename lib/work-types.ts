// ─────────────────────────────────────────────────────────────────────────────
// Festag Work Type system
//
// Each project has a broad work_type that drives which modules surface in
// the Execution Panel (Phase: rename of "Dev Panel" — same routes, new
// concept) and which Work Signal types Tagro accepts.
//
// MVP work types: software / design / marketing / general.
// V2 work types (architecture reserves these, but no UI yet):
// construction / field_service / event / facility / operations.
//
// Principle:
//   The interface changes by work type.
//   The intelligence (Tagro) stays the same.
// ─────────────────────────────────────────────────────────────────────────────

export const WORK_TYPES_MVP = ['software', 'design', 'marketing', 'general'] as const
export const WORK_TYPES_V2 = ['construction', 'field_service', 'event', 'facility', 'operations'] as const
export const WORK_TYPES = [...WORK_TYPES_MVP, ...WORK_TYPES_V2] as const
export type WorkType = (typeof WORK_TYPES)[number]

export function isWorkType(value: unknown): value is WorkType {
  return typeof value === 'string' && (WORK_TYPES as readonly string[]).includes(value)
}

// ── Module ids that an Execution Panel can render ──────────────────────────
// The Execution Panel reads the active project's work_type, looks up the
// module list, and renders only those panels. Same panel shell, different
// modules — that's the whole point.

export type ExecutionModuleId =
  | 'tasks'
  | 'updates'
  | 'blockers'
  | 'decisions_link'
  | 'website_stack'
  | 'provider_connection'
  | 'module_automation'
  | 'proof_pipeline'
  | 'client_status_reports'
  | 'github'
  | 'deployments'
  | 'bug_reports'
  | 'design_assets'
  | 'design_feedback'
  | 'approvals'
  | 'campaigns'
  | 'content_pipeline'
  | 'spend_leads'
  | 'photo_uploads'
  | 'location_checkins'
  | 'voice_notes'
  | 'material_status'
  | 'completion_reports'

export type WorkTypeConfig = {
  id: WorkType
  label: string
  /** Short tagline used in setup screens and project headers. */
  positioning: string
  /** Modules the Execution Panel surfaces for this type. Order = render order. */
  executionModules: ExecutionModuleId[]
  /** Work Signal types Tagro accepts from this project. */
  allowedSignalTypes: WorkSignalType[]
  /** Tagro question seeds — what the interpreter primarily looks for. */
  tagroQuestions: string[]
}

// ── Work Signal types ──────────────────────────────────────────────────────

export const WORK_SIGNAL_TYPES = [
  'task_completed',
  'blocker_reported',
  'decision_needed',
  'approval_requested',
  'approval_received',
  'file_uploaded',
  'comment_added',
  'status_note',
  'scope_change',
  'risk_reported',
  'design_update',
  'code_update',
  'deployment_update',
  'website_publish',
  'cms_update',
  'provider_event',
  'meeting_note',
  'voice_note',
  'photo_uploaded',
  'location_checkin',
] as const

export type WorkSignalType = (typeof WORK_SIGNAL_TYPES)[number]

// ── Per-work-type configuration ────────────────────────────────────────────

const SOFTWARE: WorkTypeConfig = {
  id: 'software',
  label: 'Software / Web / App',
  positioning: 'Code, Deploys, Bugs, technische Entscheidungen — übersetzt in Client-Sprache.',
  executionModules: [
    'tasks', 'updates', 'website_stack', 'provider_connection', 'module_automation',
    'proof_pipeline', 'client_status_reports', 'github', 'deployments', 'bug_reports',
    'blockers', 'decisions_link', 'approvals',
  ],
  allowedSignalTypes: [
    'task_completed', 'blocker_reported', 'decision_needed', 'approval_requested',
    'approval_received', 'code_update', 'deployment_update', 'risk_reported',
    'website_publish', 'cms_update', 'provider_event',
    'scope_change', 'status_note', 'comment_added', 'file_uploaded',
  ],
  tagroQuestions: [
    'Was wurde gebaut?',
    'Was ist gemerged?',
    'Was blockiert?',
    'Was ist bereit zur Abnahme?',
  ],
}

const DESIGN: WorkTypeConfig = {
  id: 'design',
  label: 'Design / Branding',
  positioning: 'Design-Updates, Feedback und Freigaben — strukturiert sichtbar.',
  executionModules: [
    'tasks', 'updates', 'design_assets', 'design_feedback',
    'approvals', 'decisions_link', 'blockers',
  ],
  allowedSignalTypes: [
    'task_completed', 'design_update', 'file_uploaded', 'approval_requested',
    'approval_received', 'comment_added', 'status_note', 'scope_change',
    'blocker_reported', 'decision_needed',
  ],
  tagroQuestions: [
    'Wurden Designs aktualisiert?',
    'Gibt es offene Feedback-Kommentare?',
    'Ist etwas zur Freigabe bereit?',
    'Was hängt am Client?',
  ],
}

const MARKETING: WorkTypeConfig = {
  id: 'marketing',
  label: 'Marketing / Kampagnen',
  positioning: 'Kampagnen, Content, Spend, Leads — verständlich für den Auftraggeber.',
  executionModules: [
    'tasks', 'updates', 'campaigns', 'content_pipeline',
    'spend_leads', 'approvals', 'decisions_link', 'blockers',
  ],
  allowedSignalTypes: [
    'task_completed', 'status_note', 'file_uploaded', 'approval_requested',
    'approval_received', 'scope_change', 'comment_added', 'risk_reported',
    'blocker_reported', 'decision_needed',
  ],
  tagroQuestions: [
    'Läuft die Kampagne?',
    'Was wurde geliefert?',
    'Welche Freigabe fehlt?',
    'Wie performt die letzte Iteration?',
  ],
}

const GENERAL: WorkTypeConfig = {
  id: 'general',
  label: 'Allgemeines Projekt',
  positioning: 'Catch-all für Projekte, die nicht in eine spezialisierte Kategorie passen.',
  executionModules: [
    'tasks', 'updates', 'completion_reports', 'blockers',
    'decisions_link', 'approvals',
  ],
  allowedSignalTypes: [
    'task_completed', 'status_note', 'blocker_reported', 'decision_needed',
    'approval_requested', 'approval_received', 'file_uploaded',
    'comment_added', 'scope_change',
  ],
  tagroQuestions: [
    'Was wurde erledigt?',
    'Was fehlt?',
    'Was ist offen?',
  ],
}

// V2 placeholders — architecture reserves them so signal types align,
// but they intentionally have no execution modules wired yet.
const CONSTRUCTION: WorkTypeConfig = {
  id: 'construction',
  label: 'Baustelle / Handwerk',
  positioning: 'Fotos, Standort, Material, Mängel, Abnahmen — vor Ort sichtbar gemacht.',
  executionModules: [
    'tasks', 'photo_uploads', 'location_checkins', 'material_status',
    'voice_notes', 'approvals', 'completion_reports', 'blockers',
  ],
  allowedSignalTypes: [
    'task_completed', 'photo_uploaded', 'location_checkin', 'voice_note',
    'status_note', 'approval_requested', 'approval_received', 'blocker_reported',
    'risk_reported', 'scope_change',
  ],
  tagroQuestions: [
    'Was wurde vor Ort fertiggestellt?',
    'Gibt es einen Mangel?',
    'Fehlt Material?',
    'Braucht jemand eine Freigabe?',
  ],
}

const FIELD_SERVICE: WorkTypeConfig = { ...CONSTRUCTION, id: 'field_service', label: 'Außendienst / Service', positioning: 'Einsätze, Nachweise, Freigaben aus dem Feld.' }
const EVENT: WorkTypeConfig = { ...CONSTRUCTION, id: 'event', label: 'Event / Messe', positioning: 'Aufbau, Technik, Catering, Abbau — koordiniert in Echtzeit.' }
const FACILITY: WorkTypeConfig = { ...CONSTRUCTION, id: 'facility', label: 'Reinigung / Facility', positioning: 'Objektpflege, Schäden, Verbrauchsmaterial — strukturiert.' }
const OPERATIONS: WorkTypeConfig = { ...CONSTRUCTION, id: 'operations', label: 'Operations / Schichten', positioning: 'Schichten, Einsätze, Probleme — verständlich für die Leitung.' }

export const WORK_TYPE_CONFIG: Record<WorkType, WorkTypeConfig> = {
  software: SOFTWARE,
  design: DESIGN,
  marketing: MARKETING,
  general: GENERAL,
  construction: CONSTRUCTION,
  field_service: FIELD_SERVICE,
  event: EVENT,
  facility: FACILITY,
  operations: OPERATIONS,
}

export function getWorkTypeConfig(value: WorkType | string | null | undefined): WorkTypeConfig {
  if (value && isWorkType(value)) return WORK_TYPE_CONFIG[value]
  return WORK_TYPE_CONFIG.software
}

/** Quick check used by Execution Panel: is this module active for this work type? */
export function moduleActive(
  module: ExecutionModuleId,
  workType: WorkType | string | null | undefined,
): boolean {
  return getWorkTypeConfig(workType).executionModules.includes(module)
}

/** Validation used by the signal ingestor: is this signal type allowed for the project's work type? */
export function isSignalAllowed(
  signalType: WorkSignalType,
  workType: WorkType | string | null | undefined,
): boolean {
  return getWorkTypeConfig(workType).allowedSignalTypes.includes(signalType)
}
