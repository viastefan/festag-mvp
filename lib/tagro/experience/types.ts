/**
 * Tagro Experience System — shared types.
 *
 * Tagro is an interaction layer, not a chat product. Everything here describes
 * *what the user is working on* so that no surface ever has to ask.
 */

/** What kind of thing the user currently has under their attention. */
export type TagroSubjectKind =
  | 'text'
  | 'task'
  | 'project'
  | 'decision'
  | 'document'
  | 'file'
  | 'meeting'
  | 'image'
  | 'design'
  | 'report'
  | 'note'
  | 'issue'
  | 'client'
  | 'page'

/**
 * A subject is one addressable thing on the current screen. Pages declare
 * subjects via `useTagroSubject()` or `data-tagro-*` attributes; the selection
 * layer derives them from what the user actually highlighted.
 */
export type TagroSubject = {
  kind: TagroSubjectKind
  /** Domain id when the subject is a stored record. */
  id?: string
  title?: string
  /** Short human line shown on the context chip, e.g. "In Arbeit, Mira". */
  detail?: string
  /** Raw content the actions operate on — selected text, description, transcript. */
  content?: string
  /** Extra structured facts handed to the model verbatim. */
  facts?: Record<string, string | number | boolean | null | undefined>
  projectId?: string
  /** Set when the subject came from a live text selection. */
  fromSelection?: boolean
}

/** Where the user is, resolved once and reused by every Tagro surface. */
export type TagroPlace = {
  pathname: string
  /** Human label for the route, e.g. "Entscheidungen". */
  label: string
  /** 'client' | 'dev' — which portal chrome is active. */
  portal: 'client' | 'dev' | 'public'
  projectId?: string
  projectTitle?: string
  workspaceId?: string
  role?: string
}

/**
 * The complete picture Tagro holds before it answers anything. Assembled on the
 * client from ambient signals, then enriched server-side from the database.
 */
export type TagroContextSnapshot = {
  place: TagroPlace
  /** The subject the action applies to. */
  subject: TagroSubject
  /** Other subjects visible on this screen — background awareness. */
  ambient: TagroSubject[]
  /** Explicitly attached references (@-mentions, pinned records). */
  references: TagroSubject[]
  /** Recent Tagro turns on this surface, for continuity. */
  recent?: Array<{ role: 'user' | 'assistant'; text: string }>
}

/** Editable DOM target an inline result can be written back into. */
export type TagroEditTarget = {
  element: HTMLElement
  /** Character range inside the field the action applies to. */
  start: number
  end: number
  /** Original text of that range, so Reject can restore it. */
  original: string
}

// ── Actions ────────────────────────────────────────────────────────────────

export type TagroActionId = string

export type TagroAction = {
  id: TagroActionId
  label: string
  /** Which subject kinds this action is offered for. */
  kinds: TagroSubjectKind[]
  /** Instruction handed to the model. */
  instruction: string
  /**
   * 'replace' — result overwrites the subject text inline (accept/reject).
   * 'answer'  — result is an explanation shown next to the subject.
   * 'compose' — result is a new artifact (email, report, plan) shown in the panel.
   */
  mode: 'replace' | 'answer' | 'compose'
  /** Shown in the compact toolbar rather than behind "Mehr". */
  primary?: boolean
  /** Requires a non-empty text selection. */
  needsContent?: boolean
}

// ── Panel geometry ─────────────────────────────────────────────────────────

export type TagroDock = 'float' | 'right' | 'left' | 'bottom'

export type TagroPanelGeometry = {
  x: number
  y: number
  width: number
  height: number
}

export type TagroPanelPrefs = {
  dock: TagroDock
  geometry: TagroPanelGeometry
  /** Docked edge sizes are kept separately so switching modes feels stable. */
  dockSize: number
}

// ── Conversation ───────────────────────────────────────────────────────────

export type TagroTurn = {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Action that produced this turn, when it was not free-form. */
  actionId?: TagroActionId
  /** Context chip label shown above the turn. */
  contextLabel?: string
  streaming?: boolean
  error?: string
  createdAt: number
}

/** A subtle, non-blocking observation Tagro makes about the current screen. */
export type TagroHint = {
  id: string
  text: string
  /** Action to run if the user accepts the hint. */
  actionId?: TagroActionId
  /** Free-form prompt to run instead of an action. */
  prompt?: string
  subject?: TagroSubject
  /** Hints are dismissed permanently per key. */
  dismissKey: string
}
