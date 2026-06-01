/**
 * Festag work types — single source of truth for what kind of work a task
 * represents and which proofs Veyra should expect on "Mark as finished".
 *
 * The shape is intentionally additive: each work type names
 *   • required proof types   — at least one must be present to pass verification
 *   • optional proof types   — accepted, contribute to confidence
 *   • verification hints     — short rules Veyra applies on top of generic checks
 *
 * UI uses the labels + descriptions. The verification engine only looks at
 * `requiredProofs` / `optionalProofs` and the hint flags.
 */

export type ProofType =
  | 'commit'
  | 'pull_request'
  | 'branch'
  | 'deployment'
  | 'preview_url'
  | 'website_url'
  | 'screenshot'
  | 'screenshot_before'
  | 'screenshot_after'
  | 'mobile_screenshot'
  | 'video'
  | 'loom'
  | 'figma'
  | 'file'
  | 'document'
  | 'analytics'
  | 'seo_report'
  | 'lighthouse'
  | 'test_result'
  | 'log'
  | 'comment'
  | 'work_log'
  | 'check_result'

export type WorkTypeId =
  | 'software'
  | 'website_design'
  | 'website_build'
  | 'ui_ux'
  | 'marketing'
  | 'copywriting'
  | 'branding'
  | 'seo'
  | 'automation'
  | 'research'
  | 'qa'
  | 'support'
  | 'content'
  | 'strategy'
  | 'other'

export type WorkTypeDef = {
  id: WorkTypeId
  label: string
  description: string
  /** at least one of these is required by Veyra before verification can pass */
  requiredProofs: ProofType[]
  /** allowed extras — count toward confidence but not strictly required */
  optionalProofs: ProofType[]
  /** machine-readable rule hints for the verification engine */
  hints: Partial<{
    expectsCodeChange: boolean
    expectsDeployment: boolean
    expectsVisualEvidence: boolean
    expectsDocument: boolean
    expectsExternalAsset: boolean
  }>
  defaultBranchSlug?: string
}

export const WORK_TYPES: WorkTypeDef[] = [
  {
    id: 'software',
    label: 'Software Development',
    description: 'Feature, Bugfix, Refactor, API, DB — alles wo Code entsteht oder verändert wird.',
    requiredProofs: ['commit'],
    optionalProofs: ['pull_request', 'branch', 'deployment', 'preview_url', 'test_result', 'screenshot', 'log'],
    hints: { expectsCodeChange: true },
    defaultBranchSlug: 'feature',
  },
  {
    id: 'website_design',
    label: 'Website Design',
    description: 'UI/UX, Layouts, Komponentendesign, Hi-Fi-Mockups, Iterationen.',
    requiredProofs: ['figma'],
    optionalProofs: ['screenshot_before', 'screenshot_after', 'preview_url', 'file', 'video'],
    hints: { expectsVisualEvidence: true, expectsExternalAsset: true },
  },
  {
    id: 'website_build',
    label: 'Website Build',
    description: 'Implementierung im Website-Builder oder CMS, Landingpages, Mobile-Fixes.',
    requiredProofs: ['preview_url'],
    optionalProofs: ['deployment', 'screenshot', 'mobile_screenshot', 'lighthouse', 'video', 'commit'],
    hints: { expectsVisualEvidence: true, expectsDeployment: true },
  },
  {
    id: 'ui_ux',
    label: 'UI / UX Design',
    description: 'Interaktion, Flows, Prototypen, Akzeptanztests.',
    requiredProofs: ['figma'],
    optionalProofs: ['screenshot', 'video', 'document'],
    hints: { expectsVisualEvidence: true },
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Kampagne, Ads, Newsletter, Social — alles was Reichweite erzeugt.',
    requiredProofs: ['screenshot'],
    optionalProofs: ['analytics', 'preview_url', 'document', 'file', 'video'],
    hints: { expectsVisualEvidence: true, expectsExternalAsset: true },
  },
  {
    id: 'copywriting',
    label: 'Copywriting',
    description: 'Texte für Web, Email, Anzeigen, Pitch-Decks.',
    requiredProofs: ['document'],
    optionalProofs: ['preview_url', 'screenshot', 'file'],
    hints: { expectsDocument: true },
  },
  {
    id: 'branding',
    label: 'Branding',
    description: 'Logo, Identity, Style Guide, Brand-Assets.',
    requiredProofs: ['figma'],
    optionalProofs: ['file', 'document', 'screenshot'],
    hints: { expectsVisualEvidence: true, expectsExternalAsset: true },
  },
  {
    id: 'seo',
    label: 'SEO',
    description: 'On-Page, Meta-Tags, Keywords, technische Audits.',
    requiredProofs: ['seo_report'],
    optionalProofs: ['website_url', 'screenshot', 'lighthouse', 'document', 'analytics'],
    hints: { expectsDocument: true, expectsExternalAsset: true },
  },
  {
    id: 'automation',
    label: 'Automation / Integration',
    description: 'Zapier, Make, Webhooks, API-Integrationen.',
    requiredProofs: ['log'],
    optionalProofs: ['screenshot', 'video', 'document', 'commit'],
    hints: { expectsDocument: true, expectsCodeChange: false },
  },
  {
    id: 'research',
    label: 'Research / Strategy',
    description: 'Marktanalyse, Strategie-Dokumente, Empfehlungen.',
    requiredProofs: ['document'],
    optionalProofs: ['file', 'analytics', 'screenshot'],
    hints: { expectsDocument: true },
  },
  {
    id: 'qa',
    label: 'QA / Testing',
    description: 'Manuelle Tests, Test-Reports, Regressionschecks.',
    requiredProofs: ['check_result'],
    optionalProofs: ['screenshot', 'video', 'log', 'test_result', 'document'],
    hints: { expectsVisualEvidence: true },
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Client-Support, Ticket-Bearbeitung, Klärungen.',
    requiredProofs: ['comment'],
    optionalProofs: ['document', 'screenshot'],
    hints: {},
  },
  {
    id: 'content',
    label: 'Content',
    description: 'Blog, Long-Form, Video-Skripte, redaktioneller Output.',
    requiredProofs: ['document'],
    optionalProofs: ['preview_url', 'screenshot', 'file'],
    hints: { expectsDocument: true },
  },
  {
    id: 'strategy',
    label: 'Strategy',
    description: 'Pläne, Roadmaps, Entscheidungen.',
    requiredProofs: ['document'],
    optionalProofs: ['file', 'screenshot'],
    hints: { expectsDocument: true },
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Alles, was sich nicht in die Standardkategorien einordnen lässt.',
    requiredProofs: ['comment'],
    optionalProofs: ['screenshot', 'document', 'file', 'work_log'],
    hints: {},
  },
]

export const WORK_TYPE_MAP: Record<WorkTypeId, WorkTypeDef> =
  Object.fromEntries(WORK_TYPES.map(w => [w.id, w])) as Record<WorkTypeId, WorkTypeDef>

export function workTypeOf(id?: string | null): WorkTypeDef {
  if (!id) return WORK_TYPE_MAP.other
  const m = WORK_TYPE_MAP[id as WorkTypeId]
  return m ?? WORK_TYPE_MAP.other
}

export const PROOF_LABELS: Record<ProofType, string> = {
  commit: 'GitHub Commit',
  pull_request: 'Pull Request',
  branch: 'Branch',
  deployment: 'Deployment',
  preview_url: 'Preview URL',
  website_url: 'Live URL',
  screenshot: 'Screenshot',
  screenshot_before: 'Screenshot vorher',
  screenshot_after: 'Screenshot nachher',
  mobile_screenshot: 'Mobile Screenshot',
  video: 'Video',
  loom: 'Loom Link',
  figma: 'Figma Link',
  file: 'Datei',
  document: 'Dokument',
  analytics: 'Analytics',
  seo_report: 'SEO Report',
  lighthouse: 'Lighthouse Report',
  test_result: 'Test Result',
  log: 'Log / Run',
  comment: 'Kommentar',
  work_log: 'Work Log',
  check_result: 'Check Result',
}

/**
 * Dev workflow status — finer than the legacy `status` column. The
 * UI maps it to a step bar and Veyra uses it to decide which checks to run.
 */
export const DEV_FLOW = [
  'new',
  'assigned',
  'in_progress',
  'needs_review',
  'blocked',
  'finished_by_dev',
  'verified_by_tagro',
  'approved_by_owner',
  'completed',
  'cancelled',
] as const
export type DevFlow = typeof DEV_FLOW[number]

export const DEV_FLOW_LABEL: Record<DevFlow, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  needs_review: 'Needs Review',
  blocked: 'Blocked',
  finished_by_dev: 'Finished by Dev',
  verified_by_tagro: 'Verified by Veyra',
  approved_by_owner: 'Approved by Project Owner',
  completed: 'Completed · visible to Client',
  cancelled: 'Cancelled',
}

/** Client-side translation — these are the only states the client UI shows. */
export type ClientVisibleStatus =
  | 'planned'
  | 'in_progress'
  | 'in_review'
  | 'waiting'
  | 'on_hold'
  | 'completed'

export const CLIENT_VISIBLE_LABEL: Record<ClientVisibleStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  in_review: 'In review',
  waiting: 'Waiting',
  on_hold: 'On hold',
  completed: 'Completed',
}

export function clientStatusFromDevFlow(flow: DevFlow): ClientVisibleStatus {
  switch (flow) {
    case 'new':
    case 'assigned':
      return 'planned'
    case 'in_progress':
      return 'in_progress'
    case 'needs_review':
    case 'finished_by_dev':
      return 'in_review'
    case 'verified_by_tagro':
      return 'in_review'   // still hold for owner approval before "completed"
    case 'approved_by_owner':
    case 'completed':
      return 'completed'
    case 'blocked':
      return 'waiting'
    case 'cancelled':
      return 'on_hold'
    default:
      return 'planned'
  }
}

/** Numeric progress used by client-side overall progress. */
export function progressFromDevFlow(flow: DevFlow): number {
  switch (flow) {
    case 'new':
    case 'assigned':       return 0
    case 'in_progress':    return 30
    case 'needs_review':   return 70
    case 'finished_by_dev':return 80
    case 'verified_by_tagro': return 90
    case 'approved_by_owner':
    case 'completed':      return 100
    case 'blocked':        return 30  // keep last visible progress
    case 'cancelled':      return 0
  }
  return 0
}

/**
 * Lossy mapping legacy `tasks.status` → DevFlow. Lets us read pre-migration
 * rows without choking. Only used as a read-side fallback.
 */
export function devFlowFromLegacy(legacy?: string | null, devStatus?: string | null): DevFlow {
  const raw = String(devStatus || legacy || '').toLowerCase()
  if (['done','completed','delivered'].includes(raw))                       return 'completed'
  if (['approved','approved_by_owner'].includes(raw))                       return 'approved_by_owner'
  if (['verified','verified_by_tagro'].includes(raw))                       return 'verified_by_tagro'
  if (['finished_by_dev','finished','submitted_for_review'].includes(raw))  return 'finished_by_dev'
  if (['review','ready_review','ready_for_review','in_review','needs_review'].includes(raw)) return 'needs_review'
  if (['blocked','waiting'].includes(raw))                                  return 'blocked'
  if (['in_progress','doing','active','accepted'].includes(raw))            return 'in_progress'
  if (['cancelled'].includes(raw))                                          return 'cancelled'
  if (['assigned'].includes(raw))                                           return 'assigned'
  return 'new'
}
