// ─────────────────────────────────────────────────────────────────────────────
// Festag Work Signals
//
// A Work Signal is a raw event observed in or submitted to a project.
// Veyra interprets signals into status / risks / decisions / next actions
// and the client-safe translation that lands on the Client Panel.
//
// Pipeline:
//   Signal  →  Veyra Classification  →  (Decision / Status Report / Task / Note)
//
// This module gives the canonical types + lightweight helpers to create
// and read signals. The Execution Panel and integration adapters (GitHub,
// Slack, Figma later) all funnel through here.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  WORK_SIGNAL_TYPES,
  type WorkSignalType,
  type WorkType,
  isSignalAllowed,
} from './work-types'

// ── Row shape mirrors the work_signals table ──────────────────────────────

export type WorkSignalVisibility = 'internal' | 'team' | 'client'

export type WorkSignalAttachment = {
  kind: 'file' | 'image' | 'link' | 'screenshot' | 'photo' | 'document'
  url?: string
  storage_path?: string
  label?: string
  mime?: string
}

export type WorkSignalClassification = {
  /** Veyra's reading of what this signal means for the project. */
  meaning?: 'progress' | 'blocker' | 'risk' | 'decision_needed' | 'approval_needed'
    | 'scope_change' | 'quality_issue' | 'delay' | 'next_step' | 'internal_noise'
    | 'client_relevant'
  /** Should this surface in the Client Panel (after translation)? */
  client_visible?: boolean
  /** Veyra-generated client-safe sentence — what the client reads. */
  client_translation?: string
  /** Internal short summary for the team/owner. */
  internal_summary?: string
  /** Optional suggested follow-ups Veyra extracted. */
  suggested_actions?: Array<{
    kind: 'create_task' | 'create_decision' | 'create_risk'
      | 'request_approval' | 'notify_client' | 'update_status_report'
    title: string
    payload?: Record<string, unknown>
  }>
}

export type WorkSignalRow = {
  id: string
  project_id: string
  type: WorkSignalType
  source: string
  content: string | null
  attachments_json: WorkSignalAttachment[]
  related_task_id: string | null
  related_decision_id: string | null
  visibility: WorkSignalVisibility
  tagro_classification_json: WorkSignalClassification
  confidence: number | null
  created_by: string | null
  created_at: string
}

// ── Validators ────────────────────────────────────────────────────────────

export function isWorkSignalType(value: unknown): value is WorkSignalType {
  return typeof value === 'string' && (WORK_SIGNAL_TYPES as readonly string[]).includes(value)
}

export function isVisibility(value: unknown): value is WorkSignalVisibility {
  return value === 'internal' || value === 'team' || value === 'client'
}

// ── Creation helper ───────────────────────────────────────────────────────

export type CreateWorkSignalInput = {
  projectId: string
  type: WorkSignalType
  source?: string
  content?: string
  attachments?: WorkSignalAttachment[]
  relatedTaskId?: string | null
  relatedDecisionId?: string | null
  visibility?: WorkSignalVisibility
  createdBy?: string | null
}

/**
 * Insert a Work Signal. Validates against the project's work_type so
 * accidental cross-type signals don't pollute the timeline.
 * Returns the inserted row, or null on validation/insert failure.
 *
 * Veyra classification stays empty here — the interpreter runs as a
 * downstream step (Phase: separate `lib/tagro/classify-signal.ts` similar
 * to the decisions framer).
 */
export async function createWorkSignal(
  supa: SupabaseClient<any>,
  input: CreateWorkSignalInput,
  // Pass-through for the project's work type so we can validate without
  // a second round-trip. Callers that don't know it can pass null and we
  // fetch it.
  workType: WorkType | string | null = null,
): Promise<WorkSignalRow | null> {
  if (!input.projectId || !isWorkSignalType(input.type)) return null

  let resolvedWorkType = workType
  if (!resolvedWorkType) {
    const { data: proj } = await (supa as any)
      .from('projects')
      .select('work_type')
      .eq('id', input.projectId)
      .maybeSingle()
    resolvedWorkType = proj?.work_type ?? 'software'
  }

  if (!isSignalAllowed(input.type, resolvedWorkType)) {
    // Don't throw — surface to caller as null; logging is on the caller.
    return null
  }

  const visibility: WorkSignalVisibility = input.visibility && isVisibility(input.visibility)
    ? input.visibility
    : 'internal'

  const { data, error } = await (supa as any)
    .from('work_signals')
    .insert({
      project_id: input.projectId,
      type: input.type,
      source: input.source || 'manual',
      content: input.content?.slice(0, 8000) ?? null,
      attachments_json: input.attachments ?? [],
      related_task_id: input.relatedTaskId ?? null,
      related_decision_id: input.relatedDecisionId ?? null,
      visibility,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single()

  if (error || !data) return null
  return data as WorkSignalRow
}

// ── Read helpers ─────────────────────────────────────────────────────────

export type WorkSignalListFilters = {
  projectId: string
  types?: WorkSignalType[]
  visibility?: WorkSignalVisibility | WorkSignalVisibility[]
  limit?: number
}

export async function listWorkSignals(
  supa: SupabaseClient<any>,
  filters: WorkSignalListFilters,
): Promise<WorkSignalRow[]> {
  let q = (supa as any)
    .from('work_signals')
    .select('*')
    .eq('project_id', filters.projectId)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 50)

  if (filters.types && filters.types.length > 0) q = q.in('type', filters.types)
  if (filters.visibility) {
    const v = Array.isArray(filters.visibility) ? filters.visibility : [filters.visibility]
    q = q.in('visibility', v)
  }

  const { data, error } = await q
  if (error || !data) return []
  return data as WorkSignalRow[]
}

/**
 * Convenience: return only signals that have been translated for the client
 * (Veyra classification marked client_visible). This is what feeds the
 * Client Panel timeline.
 */
export async function listClientVisibleSignals(
  supa: SupabaseClient<any>,
  projectId: string,
  limit = 30,
): Promise<WorkSignalRow[]> {
  const rows = await listWorkSignals(supa, { projectId, visibility: 'client', limit: limit * 2 })
  return rows.filter((row) => row.tagro_classification_json?.client_visible !== false).slice(0, limit)
}
