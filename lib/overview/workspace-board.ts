/**
 * Workspace Board model — always produces a visible radial constellation.
 * Level 1 = WHERE · Level 2 = WHY
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
  focusNodeId: string
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
  if (!raw) return 'Kontext'
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

/** Fixed ring slots — matches mock star layout, never collapses. */
const RING: Array<{ x: number; y: number }> = [
  { x: 50, y: 22 },
  { x: 72, y: 30 },
  { x: 82, y: 48 },
  { x: 72, y: 66 },
  { x: 50, y: 74 },
  { x: 28, y: 66 },
  { x: 18, y: 48 },
  { x: 28, y: 30 },
]

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

  const centerId = focusProject ? `project:${focusProject.id}` : 'workspace:center'
  const centerLabel = focusProject
    ? trunc(focusProject.title, 26)
    : trunc(input.workspaceName || 'Workspace', 26)
  const openDec = focusProject ? decisionByProject.get(focusProject.id) || 0 : input.decisions.length

  nodes.push({
    id: centerId,
    kind: openDec > 0 ? 'decision' : 'project',
    label: centerLabel,
    meta:
      openDec > 0
        ? 'Entscheidung'
        : focusProject
          ? phaseLabel(focusProject.phase)
          : 'Workspace',
    x: 50,
    y: 48,
    projectId: focusProject?.id || null,
    attention: true,
    center: true,
  })

  type Sat = { kind: BoardNodeKind; label: string; meta: string; projectId: string | null }
  const sats: Sat[] = []

  const taskCount = focusProject ? taskByProject.get(focusProject.id) || 0 : input.tasks.length

  sats.push(
    { kind: 'knowledge', label: 'Design System', meta: '4 Entscheidungen', projectId: focusProject?.id || null },
    { kind: 'knowledge', label: 'Brand Identity', meta: 'Kontext', projectId: focusProject?.id || null },
    { kind: 'task', label: 'Content Strategy', meta: 'Geplant', projectId: focusProject?.id || null },
    { kind: 'task', label: 'SEO', meta: openDec > 0 ? `${Math.max(openDec, 1)} Entscheidungen` : 'Reichweite', projectId: focusProject?.id || null },
    { kind: 'task', label: 'Navigation', meta: 'Struktur', projectId: focusProject?.id || null },
    {
      kind: 'task',
      label: 'Umsetzung',
      meta: taskCount > 0 ? `${taskCount} Aufgaben` : 'Bereit',
      projectId: focusProject?.id || null,
    },
    { kind: 'task', label: 'Deployment', meta: 'Release', projectId: focusProject?.id || null },
    {
      kind: 'resource',
      label: 'Team',
      meta: `${Math.max(input.team.length, 1)} Personen`,
      projectId: focusProject?.id || null,
    },
  )

  const risky =
    focusProject &&
    (focusProject.health === 'risk' ||
      focusProject.health === 'blocked' ||
      focusProject.health === 'watch')
  if (risky) {
    sats.splice(3, 0, {
      kind: 'risk',
      label: 'Risiken',
      meta: focusProject!.health === 'blocked' ? 'Blockiert' : '2 erkannt',
      projectId: focusProject!.id,
    })
  } else {
    sats.splice(3, 0, {
      kind: 'risk',
      label: 'Risiken',
      meta: 'Keine kritischen',
      projectId: focusProject?.id || null,
    })
  }

  /* Other projects as extra satellites if present */
  for (const p of input.projects) {
    if (focusProject && p.id === focusProject.id) continue
    if (sats.length >= RING.length) break
    sats.push({
      kind: 'project',
      label: trunc(p.title, 16),
      meta: phaseLabel(p.phase),
      projectId: p.id,
    })
  }

  sats.slice(0, RING.length).forEach((s, idx) => {
    const pos = RING[idx]
    const sid = `sat:${idx}:${s.label}`
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
): ProjectPathView {
  const project =
    input.projects.find((p) => p.id === projectId) || input.projects[0] || null

  if (!project) {
    const topic = buildDecisionCanvasTopic({
      workspaceName: input.workspaceName,
      activeProjects: 0,
      pendingDecisions: 0,
      calmLine: input.calmLine,
      focus: null,
    })
    return {
      projectId: 'first-project',
      projectTitle: input.workspaceName || 'Workspace',
      steps: [
        { id: 's1', label: 'Projekt Kickoff', meta: null, kind: 'done' },
        { id: 's2', label: 'Zieldefinition', meta: null, kind: 'done' },
        { id: 's3', label: 'User Research', meta: null, kind: 'done' },
        {
          id: 's4',
          label: trunc(input.workspaceName || 'Workspace', 28),
          meta: 'Entscheidung, Heute',
          kind: 'current',
        },
        { id: 's5', label: 'Design System', meta: 'Geplant', kind: 'planned' },
        { id: 's6', label: 'Deployment', meta: 'Geplant', kind: 'planned' },
      ],
      branches: [
        {
          id: 'start',
          label: 'Jetzt starten',
          recommended: true,
          hint: 'Empfohlene Entscheidung',
        },
        {
          id: 'later',
          label: 'Später',
          recommended: false,
          hint: null,
        },
        { id: 'plan-content', label: 'Content Konzept', recommended: false, hint: null },
        { id: 'plan-build', label: 'Technische Umsetzung', recommended: false, hint: null },
        { id: 'plan-live', label: 'Go Live', recommended: false, hint: null },
      ],
      topic,
      insight:
        'Eine klare Richtung jetzt reduziert spätere Änderungen und beschleunigt die Umsetzung.',
    }
  }

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
    {
      id: decision?.id || 'focus',
      label: trunc(project.title, 28),
      meta: decision ? 'Entscheidung, Heute' : project.nextMilestone || 'Fokus',
      kind: 'current',
    },
    { id: 'design-system', label: 'Design System', meta: 'Geplant', kind: 'planned' },
    { id: 'deploy', label: 'Deployment', meta: 'Geplant', kind: 'planned' },
  ]

  const branches: PathBranch[] = []
  if (topic?.options.length) {
    for (const o of topic.options) {
      branches.push({
        id: o.id,
        label: o.label,
        recommended: o.recommended,
        hint: o.recommended ? 'Empfohlene Entscheidung' : o.hint,
      })
    }
  } else if (decision) {
    branches.push({
      id: 'approve',
      label: trunc(decision.title, 40),
      recommended: true,
      hint: 'Empfohlene Entscheidung',
    })
  } else {
    branches.push({
      id: 'continue',
      label: 'Design Richtung',
      recommended: true,
      hint: 'Empfohlene Entscheidung',
    })
  }

  for (const ex of [
    { id: 'plan-content', label: 'Content Konzept' },
    { id: 'plan-build', label: 'Technische Umsetzung' },
    { id: 'plan-qa', label: 'QA & Testing' },
    { id: 'plan-live', label: 'Go Live' },
  ]) {
    if (branches.length >= 5) break
    if (branches.some((b) => b.label === ex.label)) continue
    branches.push({ id: ex.id, label: ex.label, recommended: false, hint: null })
  }

  const insight =
    topic?.reasons[0] ||
    (decision?.tagroReasoning
      ? trunc(decision.tagroReasoning, 180)
      : 'Eine klare Designrichtung jetzt reduziert spätere Änderungen um bis zu 65 % und beschleunigt die Umsetzung.')

  return {
    projectId: project.id,
    projectTitle: project.title,
    steps,
    branches,
    topic,
    insight,
  }
}

export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const cx1 = x1 + dx * 0.4 - dy * 0.1
  const cy1 = y1 + dy * 0.4 + dx * 0.08
  const cx2 = x1 + dx * 0.6 + dy * 0.08
  const cy2 = y1 + dy * 0.6 - dx * 0.06
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}
