/**
 * Workspace Board — knowledge constellation + project decision path.
 *
 * Level 1 answers WHERE ARE WE?  (radial constellation around one focus)
 * Level 2 answers WHY ARE WE HERE? (vertical path + branch from current)
 */

import {
  buildDecisionCanvasTopic,
  enrichDecisionFocus,
  type CanvasDecisionFocus,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'

export type BoardNodeKind =
  | 'project'
  | 'decision'
  | 'task'
  | 'risk'
  | 'resource'
  | 'knowledge'

export type BoardNode = {
  id: string
  kind: BoardNodeKind
  label: string
  meta: string | null
  x: number
  y: number
  projectId: string | null
  attention: boolean
  /** Center focus of the constellation */
  center?: boolean
}

export type BoardEdge = {
  id: string
  from: string
  to: string
}

export type PathStepKind = 'done' | 'current' | 'planned'

export type PathStep = {
  id: string
  label: string
  meta: string | null
  kind: PathStepKind
}

export type PathBranch = {
  id: string
  label: string
  recommended: boolean
  hint: string | null
}

export type WorkspaceConstellation = {
  nodes: BoardNode[]
  edges: BoardEdge[]
  focusNodeId: string | null
}

export type ProjectPathView = {
  projectId: string
  projectTitle: string
  steps: PathStep[]
  branches: PathBranch[]
  topic: DecisionCanvasTopic | null
  insight: string | null
}

export type OverviewBoardInput = {
  workspaceName: string
  calmLine: string
  projects: Array<{
    id: string
    title: string
    phase: string | null
    progress: number
    health: string
    status: string | null
    nextMilestone: string | null
  }>
  tasks: Array<{
    id: string
    title: string
    projectId: string | null
    projectTitle: string
    status: string | null
  }>
  decisions: Array<{
    id: string
    title: string
    summary?: string | null
    projectId: string | null
    projectTitle: string
    urgency: string | null
    dueDate: string | null
    responseType?: string | null
    decisionType?: string | null
    recommendedOptionId?: string | null
    recommendationReason?: string | null
    tagroReasoning?: string | null
    options?: Array<{
      id: string
      label: string
      hint: string | null
      recommended: boolean
    }>
    reasons?: string[]
    explainSteps?: Array<{ n: number; label: string }>
    needsSuggestion?: boolean
  }>
  activity: Array<{
    id: string
    title: string
    createdAt: string
    projectTitle: string | null
  }>
  team: Array<{
    id: string
    name: string
    role: string | null
  }>
}

function trunc(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function phaseLabel(raw: string | null): string {
  if (!raw) return 'Projekt'
  const map: Record<string, string> = {
    discovery: 'Discovery',
    design: 'Design',
    build: 'Umsetzung',
    launch: 'Launch',
    planning: 'Planung',
  }
  const key = raw.toLowerCase().replace(/\s+/g, '_')
  return map[key] || raw.replace(/_/g, ' ')
}

/** Place satellites on an ellipse around the center — screenshot star layout. */
function ringPoint(index: number, total: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2
  const rx = 28
  const ry = 22
  return {
    x: Math.max(10, Math.min(90, 50 + Math.cos(angle) * rx)),
    y: Math.max(16, Math.min(84, 48 + Math.sin(angle) * ry)),
  }
}

export function buildWorkspaceConstellation(
  input: OverviewBoardInput,
): WorkspaceConstellation {
  const nodes: BoardNode[] = []
  const edges: BoardEdge[] = []

  const decisionByProject = new Map<string, number>()
  for (const d of input.decisions) {
    if (!d.projectId) continue
    decisionByProject.set(d.projectId, (decisionByProject.get(d.projectId) || 0) + 1)
  }
  const taskByProject = new Map<string, number>()
  for (const t of input.tasks) {
    if (!t.projectId) continue
    taskByProject.set(t.projectId, (taskByProject.get(t.projectId) || 0) + 1)
  }

  const focusDecision = input.decisions[0] || null
  const focusProject =
    input.projects.find((p) => p.id === focusDecision?.projectId) ||
    input.projects[0] ||
    null

  if (!focusProject) {
    nodes.push({
      id: 'empty:start',
      kind: 'project',
      label: 'Erstes Projekt',
      meta: 'Bereit zum Start',
      x: 50,
      y: 48,
      projectId: null,
      attention: true,
      center: true,
    })
    return { nodes, edges, focusNodeId: 'empty:start' }
  }

  const centerId = `project:${focusProject.id}`
  const openDec = decisionByProject.get(focusProject.id) || 0
  nodes.push({
    id: centerId,
    kind: openDec > 0 ? 'decision' : 'project',
    label: trunc(focusProject.title, 24),
    meta:
      openDec > 0
        ? openDec === 1
          ? '1 Entscheidung'
          : `${openDec} Entscheidungen`
        : phaseLabel(focusProject.phase),
    x: 50,
    y: 48,
    projectId: focusProject.id,
    attention: true,
    center: true,
  })

  type Sat = { kind: BoardNodeKind; label: string; meta: string; projectId: string | null }
  const sats: Sat[] = []

  /* Domain satellites — knowledge around the focus project */
  const knowledge = [
    { label: 'Design System', meta: 'Kontext', kind: 'knowledge' as const },
    { label: 'Brand', meta: 'Identität', kind: 'knowledge' as const },
    { label: 'Content', meta: 'Strategie', kind: 'knowledge' as const },
    { label: 'SEO', meta: openDec > 0 ? `${openDec} Entscheidungen` : 'Reichweite', kind: 'task' as const },
    { label: 'Navigation', meta: 'Struktur', kind: 'task' as const },
    {
      label: 'Umsetzung',
      meta: `${taskByProject.get(focusProject.id) || 0} Aufgaben`,
      kind: 'task' as const,
    },
    { label: 'Deployment', meta: 'Release', kind: 'task' as const },
  ]
  for (const k of knowledge) {
    sats.push({
      kind: k.kind,
      label: k.label,
      meta: k.meta,
      projectId: focusProject.id,
    })
  }

  if (
    focusProject.health === 'risk' ||
    focusProject.health === 'blocked' ||
    focusProject.health === 'watch'
  ) {
    sats.push({
      kind: 'risk',
      label: 'Risiken',
      meta: focusProject.health === 'blocked' ? 'Blockiert' : 'Beobachten',
      projectId: focusProject.id,
    })
  }

  if (input.team.length > 0) {
    sats.push({
      kind: 'resource',
      label: 'Team',
      meta: `${input.team.length} Personen`,
      projectId: focusProject.id,
    })
  }

  /* Other projects as quieter outer stars */
  for (const p of input.projects) {
    if (p.id === focusProject.id) continue
    sats.push({
      kind: 'project',
      label: trunc(p.title, 18),
      meta: phaseLabel(p.phase),
      projectId: p.id,
    })
  }

  const ring = sats.slice(0, 9)
  ring.forEach((s, idx) => {
    const pos = ringPoint(idx, ring.length)
    const sid = `sat:${s.projectId || 'x'}:${s.label}:${idx}`
    nodes.push({
      id: sid,
      kind: s.kind,
      label: s.label,
      meta: s.meta,
      x: pos.x,
      y: pos.y,
      projectId: s.projectId,
      attention: s.kind === 'risk' || s.kind === 'decision',
    })
    edges.push({ id: `e:${centerId}:${sid}`, from: centerId, to: sid })
  })

  return { nodes, edges, focusNodeId: centerId }
}

function toFocus(d: OverviewBoardInput['decisions'][number]): CanvasDecisionFocus {
  const focus = enrichDecisionFocus({
    id: d.id,
    title: d.title,
    summary: d.summary || null,
    projectId: d.projectId,
    projectTitle: d.projectTitle,
    urgency: d.urgency,
    dueDate: d.dueDate,
    responseType: d.responseType || null,
    decisionType: d.decisionType || null,
    recommendedOptionId: d.recommendedOptionId || null,
    recommendationReason: d.recommendationReason || null,
    tagroReasoning: d.tagroReasoning || null,
    options: d.options || [],
  })
  if (d.reasons?.length) focus.reasons = d.reasons
  if (d.explainSteps?.length) focus.explainSteps = d.explainSteps
  if (typeof d.needsSuggestion === 'boolean') focus.needsSuggestion = d.needsSuggestion
  return focus
}

export function buildProjectPathView(
  input: OverviewBoardInput,
  projectId: string | null,
): ProjectPathView | null {
  if (!projectId && input.projects.length === 0) {
    const topic = buildDecisionCanvasTopic({
      workspaceName: input.workspaceName,
      activeProjects: 0,
      pendingDecisions: 0,
      calmLine: input.calmLine,
      focus: null,
    })
    return {
      projectId: 'first-project',
      projectTitle: 'Erstes Projekt',
      steps: [
        { id: 's1', label: 'Workspace bereit', meta: null, kind: 'done' },
        { id: 's2', label: 'Projekt starten', meta: 'Heute', kind: 'current' },
        { id: 's3', label: 'Team einladen', meta: 'Geplant', kind: 'planned' },
        { id: 's4', label: 'Erste Lieferung', meta: 'Geplant', kind: 'planned' },
      ],
      branches:
        topic?.options.map((o) => ({
          id: o.id,
          label: o.label,
          recommended: o.recommended,
          hint: o.hint,
        })) || [],
      topic,
      insight:
        'Ein klares erstes Projekt gibt dem Workspace Richtung — Tagro strukturiert den Rest.',
    }
  }

  const project =
    input.projects.find((p) => p.id === projectId) || input.projects[0] || null
  if (!project) return null

  const decision =
    input.decisions.find((d) => d.projectId === project.id) ||
    input.decisions[0] ||
    null

  const topic = decision
    ? buildDecisionCanvasTopic({
        workspaceName: input.workspaceName,
        activeProjects: input.projects.length,
        pendingDecisions: input.decisions.length,
        calmLine: input.calmLine,
        focus: toFocus(decision),
      })
    : null

  const steps: PathStep[] = [
    { id: 'kickoff', label: 'Projekt Kickoff', meta: null, kind: 'done' },
    { id: 'goals', label: 'Zieldefinition', meta: null, kind: 'done' },
    { id: 'research', label: 'User Research', meta: null, kind: 'done' },
  ]

  if (decision) {
    steps.push({
      id: decision.id,
      label: trunc(project.title, 28),
      meta: 'Entscheidung, Heute',
      kind: 'current',
    })
  } else {
    steps.push({
      id: 'focus',
      label: trunc(project.title, 28),
      meta: project.nextMilestone || 'Fokus',
      kind: 'current',
    })
  }

  steps.push(
    { id: 'design-system', label: 'Design System', meta: 'Geplant', kind: 'planned' },
    { id: 'deploy', label: 'Deployment', meta: 'Geplant', kind: 'planned' },
  )

  const branches: PathBranch[] = topic
    ? topic.options.map((o) => ({
        id: o.id,
        label: o.label,
        recommended: o.recommended,
        hint: o.recommended ? 'Empfohlene Entscheidung' : o.hint,
      }))
    : [
        {
          id: 'continue',
          label: 'Weiterarbeiten',
          recommended: true,
          hint: 'Empfohlene Entscheidung',
        },
      ]

  /* Planned follow-ons after the decision options — like the screenshot list */
  if (branches.length < 5) {
    const extras = [
      { id: 'plan-content', label: 'Content Konzept', hint: null },
      { id: 'plan-build', label: 'Technische Umsetzung', hint: null },
      { id: 'plan-qa', label: 'QA & Testing', hint: null },
      { id: 'plan-live', label: 'Go Live', hint: null },
    ]
    for (const ex of extras) {
      if (branches.length >= 5) break
      if (branches.some((b) => b.label === ex.label)) continue
      branches.push({
        id: ex.id,
        label: ex.label,
        recommended: false,
        hint: ex.hint,
      })
    }
  }

  const insight =
    topic?.reasons[0] ||
    (decision?.tagroReasoning
      ? trunc(decision.tagroReasoning, 180)
      : 'Eine klare Richtung jetzt reduziert spätere Änderungen und beschleunigt die Umsetzung.')

  return {
    projectId: project.id,
    projectTitle: project.title,
    steps,
    branches,
    topic,
    insight,
  }
}

/** SVG cubic for organic edge between two % points */
export function edgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const cx1 = x1 + dx * 0.35 - dy * 0.08
  const cy1 = y1 + dy * 0.35 + dx * 0.06
  const cx2 = x1 + dx * 0.65 + dy * 0.06
  const cy2 = y1 + dy * 0.65 - dx * 0.05
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}
