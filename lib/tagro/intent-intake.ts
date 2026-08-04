/**
 * Tagro Intent Intake — freestyle / first-project request → structured draft (human confirms).
 *
 * First project (v3.7): name + optional description → real prepare → milestones/tasks draft.
 * Later: describe goals in one input; Tagro proposes Project / Task / Invite / Answer / Briefing.
 * Nothing structural is saved until the human confirms.
 *
 * @see docs/festag-create-project-flow.md
 */

export type TagroIntentKind =
  | 'new_project'
  | 'bug_task'
  | 'feature_task'
  | 'question'
  | 'invite'
  | 'status_briefing'

export type EstimatedScope = 'small' | 'medium' | 'large'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type InviteDraftRole =
  | 'workspace_owner'
  | 'project_owner'
  | 'developer'
  | 'designer'
  | 'client'
  | 'viewer'

export type ProjectDraft = {
  name: string
  summary: string
  features: string[]
  estimatedScope: EstimatedScope
}

export type TaskDraft = {
  kind: 'bug' | 'feature'
  projectId: string | null
  projectTitle: string | null
  title: string
  description: string
  priority: TaskPriority
  assigned: null
}

export type InviteDraft = {
  username: string
  email: string
  role: InviteDraftRole
  projectId: string | null
  projectTitle: string | null
}

export type AnswerDraft = {
  question: string
  answer: string
}

export type BriefingDraft = {
  headline: string
  summary: string
}

export type TagroIntentResult = {
  intent: TagroIntentKind
  confidence: number
  processingLabels: string[]
  project?: ProjectDraft
  task?: TaskDraft
  invite?: InviteDraft
  answer?: AnswerDraft
  briefing?: BriefingDraft
  rawText: string
}

export type WorkspaceProjectHint = {
  id: string
  title: string
}

export const INTENT_PLACEHOLDERS = [
  'I want to build a booking platform for my hotel.',
  'The login does not work on iPhone.',
  'We need a new payment feature.',
  'Invite Max to the project.',
  'Create a landing page for our new product.',
] as const

export const INTENT_PROCESSING_STEPS = [
  'Understanding your request…',
  'Analyzing context…',
  'Preparing your workspace…',
] as const

export const INVITE_ROLE_OPTIONS: { id: InviteDraftRole; label: string }[] = [
  { id: 'workspace_owner', label: 'Workspace Owner' },
  { id: 'project_owner', label: 'Project Owner' },
  { id: 'developer', label: 'Developer' },
  { id: 'designer', label: 'Designer' },
  { id: 'client', label: 'Client' },
  { id: 'viewer', label: 'Observer' },
]

export const SCOPE_LABELS: Record<EstimatedScope, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const BUG_RE =
  /\b(bug|fehler|kaputt|funktioniert\s+nicht|geht\s+nicht|broken|crash|error|login\s+(does\s+not|doesn'?t|not)|iphone|safari|android)\b/i
const FEATURE_RE =
  /\b(feature|funktion|payment|zahlung|landing\s*page|add|brauchen|need(s)?\s+a\s+new|neue[rn]?\s+\w+|erweitern|improvement)\b/i
const INVITE_RE =
  /\b(invite|einladen|lade\s+\w+\s+ein|add\s+\w+\s+to\s+(the\s+)?(project|team)|mitwirkende)\b/i
const STATUS_RE =
  /\b(status|briefing|stand|update|wie\s+(steht|läuft)|overview|zusammenfassung|report)\b/i
const QUESTION_RE =
  /^(wie|was|warum|wo|wann|wer|how|what|why|where|when|who|kann|kannst|gibt\s+es)\b|\?$/i
const PROJECT_RE =
  /\b(build|bauen|create|erstelle|neues?\s+projekt|website|plattform|platform|app|software|cms|product|produkt|hotel|airport)\b/i

function cleanText(raw: string) {
  return String(raw || '').replace(/\s+/g, ' ').trim()
}

function titleCaseWords(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Pull a short project-ish name from free text. */
export function inferProjectName(raw: string): string {
  const t = cleanText(raw)
  if (!t) return 'New Project'

  const forMatch = t.match(
    /(?:for|für|fuer)\s+(?:my|our|mein(?:en|e)?|unser(?:en|e)?)\s+([^.,:;!?]{2,48})/i,
  )
  if (forMatch?.[1]) {
    const subject = titleCaseWords(forMatch[1].trim())
    if (/\b(website|plattform|platform|app|landing)\b/i.test(t)) {
      return `${subject} Website`.slice(0, 80)
    }
    return subject.slice(0, 80)
  }

  const named = t.match(
    /(?:build|bauen|create|erstelle|landing\s*page\s+for)\s+(?:a\s+|an\s+|eine[rn]?\s+|einen?\s+)?([^.,:;!?]{3,60})/i,
  )
  if (named?.[1]) {
    let name = named[1]
      .replace(/\b(for|für|fuer|with|mit|that|die|der|das)\b.*$/i, '')
      .trim()
    name = titleCaseWords(name)
    if (name.length >= 3) return name.slice(0, 80)
  }

  const words = t.split(/\s+/).slice(0, 6).join(' ')
  return titleCaseWords(words).slice(0, 80) || 'New Project'
}

export function inferFeatures(raw: string): string[] {
  const t = cleanText(raw).toLowerCase()
  const features: string[] = []
  const push = (f: string) => {
    if (!features.includes(f)) features.push(f)
  }

  if (/\b(website|marketing|landing)\b/.test(t)) {
    push('Homepage')
    push('About')
    push('Contact')
  }
  if (/\bcms\b/.test(t)) push('CMS')
  if (/\b(booking|buchung|hotel)\b/.test(t)) {
    push('Booking flow')
    push('Availability')
    push('Confirmation emails')
  }
  if (/\b(payment|zahlung|stripe|checkout)\b/.test(t)) push('Payments')
  if (/\b(login|auth|anmeld)\b/.test(t)) push('Authentication')
  if (/\b(dashboard|admin)\b/.test(t)) push('Admin dashboard')
  if (/\b(contact|kontakt)\b/.test(t)) push('Contact forms')
  if (/\b(blog|news)\b/.test(t)) push('Blog')

  if (features.length === 0) {
    push('Core experience')
    push('Content structure')
    push('Launch readiness')
  }
  return features.slice(0, 8)
}

export function inferScope(raw: string, features: string[]): EstimatedScope {
  const t = cleanText(raw)
  if (features.length >= 6 || t.length > 280 || /\b(platform|plattform|marketplace)\b/i.test(t)) {
    return 'large'
  }
  if (features.length <= 3 && t.length < 120) return 'small'
  return 'medium'
}

export function inferTaskTitle(raw: string, kind: 'bug' | 'feature'): string {
  const t = cleanText(raw)
  if (!t) return kind === 'bug' ? 'Investigate issue' : 'New feature'

  if (kind === 'bug') {
    if (/\blogin\b/i.test(t) && /\biphone|safari|ios\b/i.test(t)) {
      return 'Fix Login on iPhone Safari'
    }
    const clipped = t.replace(/^(the|der|die|das)\s+/i, '')
    return titleCaseWords(clipped.slice(0, 72))
  }

  const need = t.match(
    /(?:need|brauchen|neue[rn]?\s+|add|hinzufügen)\s+(?:a\s+|an\s+|eine[rn]?\s+)?([^.,:;!?]{3,60})/i,
  )
  if (need?.[1]) return titleCaseWords(need[1].trim()).slice(0, 72)
  return titleCaseWords(t.slice(0, 72))
}

export function inferPriority(raw: string, kind: 'bug' | 'feature'): TaskPriority {
  const t = cleanText(raw)
  if (/\b(critical|kritisch|blocker|down|production)\b/i.test(t)) return 'critical'
  if (kind === 'bug' || /\b(urgent|sofort|asap|high|hoch)\b/i.test(t)) return 'high'
  if (/\b(low|niedrig|nice\s*to\s*have)\b/i.test(t)) return 'low'
  return 'medium'
}

export function inferInviteTarget(raw: string): { username: string; email: string } {
  const t = cleanText(raw)
  const email = t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ''
  const handle = t.match(/@([a-z0-9._-]{2,32})/i)?.[1] || ''
  const named = t.match(
    /(?:invite|einladen|lade)\s+([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]{1,32})/i,
  )?.[1]
  const username = handle || (named && !/^(to|the|to|zum|zur|ins|in)$/i.test(named) ? named : '')
  return { username: username || '', email }
}

function pickProject(projects: WorkspaceProjectHint[]): WorkspaceProjectHint | null {
  return projects[0] || null
}

/**
 * Deterministic intent classification — always available without LLM.
 * LLM may refine via the API route when keys are present.
 */
export function classifyIntentHeuristic(
  raw: string,
  projects: WorkspaceProjectHint[] = [],
): TagroIntentResult {
  const text = cleanText(raw)
  const project = pickProject(projects)

  if (!text) {
    return {
      intent: 'new_project',
      confidence: 0.2,
      processingLabels: [...INTENT_PROCESSING_STEPS],
      project: {
        name: 'New Project',
        summary: '',
        features: ['Core experience'],
        estimatedScope: 'medium',
      },
      rawText: text,
    }
  }

  if (INVITE_RE.test(text)) {
    const target = inferInviteTarget(text)
    return {
      intent: 'invite',
      confidence: 0.86,
      processingLabels: [...INTENT_PROCESSING_STEPS],
      invite: {
        username: target.username,
        email: target.email,
        role: 'developer',
        projectId: project?.id || null,
        projectTitle: project?.title || null,
      },
      rawText: text,
    }
  }

  if (STATUS_RE.test(text) && !PROJECT_RE.test(text)) {
    return {
      intent: 'status_briefing',
      confidence: 0.78,
      processingLabels: [...INTENT_PROCESSING_STEPS],
      briefing: {
        headline: 'Workspace Briefing',
        summary:
          'Tagro prepares a calm status overview from your projects, open decisions, and recent activity. Confirm to open Overview.',
      },
      rawText: text,
    }
  }

  if (QUESTION_RE.test(text) && !BUG_RE.test(text) && !PROJECT_RE.test(text) && !FEATURE_RE.test(text)) {
    return {
      intent: 'question',
      confidence: 0.72,
      processingLabels: [...INTENT_PROCESSING_STEPS],
      answer: {
        question: text,
        answer:
          'Based on your workspace context, Tagro will answer from project knowledge first. Open Overview or ask again with a project name for a sharper reply.',
      },
      rawText: text,
    }
  }

  if (BUG_RE.test(text)) {
    return {
      intent: 'bug_task',
      confidence: 0.84,
      processingLabels: [...INTENT_PROCESSING_STEPS],
      task: {
        kind: 'bug',
        projectId: project?.id || null,
        projectTitle: project?.title || null,
        title: inferTaskTitle(text, 'bug'),
        description: text,
        priority: inferPriority(text, 'bug'),
        assigned: null,
      },
      rawText: text,
    }
  }

  if (FEATURE_RE.test(text) && !PROJECT_RE.test(text) && projects.length > 0) {
    return {
      intent: 'feature_task',
      confidence: 0.8,
      processingLabels: [...INTENT_PROCESSING_STEPS],
      task: {
        kind: 'feature',
        projectId: project?.id || null,
        projectTitle: project?.title || null,
        title: inferTaskTitle(text, 'feature'),
        description: text,
        priority: inferPriority(text, 'feature'),
        assigned: null,
      },
      rawText: text,
    }
  }

  const features = inferFeatures(text)
  const name = inferProjectName(text)
  const summary =
    text.length > 12
      ? text.charAt(0).toUpperCase() + text.slice(1).replace(/\s+/g, ' ').trim().slice(0, 280)
      : `Draft for ${name}.`

  return {
    intent: 'new_project',
    confidence: PROJECT_RE.test(text) ? 0.88 : 0.65,
    processingLabels: [...INTENT_PROCESSING_STEPS],
    project: {
      name,
      summary: /[.!?]$/.test(summary) ? summary : `${summary}.`,
      features,
      estimatedScope: inferScope(text, features),
    },
    rawText: text,
  }
}

export function normalizeIntentResult(
  partial: Partial<TagroIntentResult> & { intent?: string },
  raw: string,
  projects: WorkspaceProjectHint[] = [],
): TagroIntentResult {
  const base = classifyIntentHeuristic(raw, projects)
  const intent = (partial.intent as TagroIntentKind) || base.intent
  return {
    ...base,
    ...partial,
    intent,
    confidence: typeof partial.confidence === 'number' ? partial.confidence : base.confidence,
    processingLabels: Array.isArray(partial.processingLabels)
      ? partial.processingLabels.map(String)
      : base.processingLabels,
    rawText: raw,
    project: partial.project
      ? {
          name: String(partial.project.name || base.project?.name || 'New Project').slice(0, 120),
          summary: String(partial.project.summary || base.project?.summary || '').slice(0, 800),
          features: Array.isArray(partial.project.features)
            ? partial.project.features.map(String).filter(Boolean).slice(0, 12)
            : base.project?.features || [],
          estimatedScope:
            partial.project.estimatedScope === 'small' ||
            partial.project.estimatedScope === 'large' ||
            partial.project.estimatedScope === 'medium'
              ? partial.project.estimatedScope
              : base.project?.estimatedScope || 'medium',
        }
      : base.project,
    task: partial.task
      ? {
          kind: partial.task.kind === 'bug' ? 'bug' : 'feature',
          projectId: partial.task.projectId ?? base.task?.projectId ?? null,
          projectTitle: partial.task.projectTitle ?? base.task?.projectTitle ?? null,
          title: String(partial.task.title || base.task?.title || '').slice(0, 160),
          description: String(partial.task.description || raw).slice(0, 2000),
          priority: (['low', 'medium', 'high', 'critical'] as TaskPriority[]).includes(
            partial.task.priority as TaskPriority,
          )
            ? (partial.task.priority as TaskPriority)
            : base.task?.priority || 'medium',
          assigned: null,
        }
      : base.task,
    invite: partial.invite
      ? {
          username: String(partial.invite.username || '').replace(/^@+/, ''),
          email: String(partial.invite.email || ''),
          role: (INVITE_ROLE_OPTIONS.some((r) => r.id === partial.invite?.role)
            ? partial.invite.role
            : 'developer') as InviteDraftRole,
          projectId: partial.invite.projectId ?? base.invite?.projectId ?? null,
          projectTitle: partial.invite.projectTitle ?? base.invite?.projectTitle ?? null,
        }
      : base.invite,
    answer: partial.answer || base.answer,
    briefing: partial.briefing || base.briefing,
  }
}
