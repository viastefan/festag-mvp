/**
 * Workspace Board — knowledge constellation + project decision path.
 *
 * Level 1 answers WHERE ARE WE?
 * Level 2 answers WHY ARE WE HERE?
 *
 * Not a dashboard. Not task cards. Relationships first.
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
  /** Normalized 0–100 canvas coords */
  x: number
  y: number
  projectId: string | null
  attention: boolean
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

/** Deterministic soft constellation layout — calm, not force-sim chaos. */
function layoutPoint(index: number, total: number, seed: number): { x: number; y: number } {
  if (total <= 1) return { x: 50, y: 48 }
  const golden = 2.399963229728653
  const angle = index * golden + seed * 0.17
  const ring = 18 + (index % 4) * 9 + (seed % 5)
  const cx = 50 + Math.cos(angle) * ring * 0.9
  const cy = 48 + Math.sin(angle) * ring * 0.72
  return {
    x: Math.max(12, Math.min(88, cx)),
    y: Math.max(14, Math.min(86, cy)),
  }
}

export function buildWorkspaceConstellation(
  input: OverviewBoardInput,
): WorkspaceConstellation {
  const nodes: BoardNode[] = []
  const edges: BoardEdge[] = []
  let i = 0

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

  let focusNodeId: string | null = null
  const focusDecision = input.decisions[0] || null

  for (const p of input.projects) {
    const pos = layoutPoint(i++, Math.max(input.projects.length, 6), 1)
    const openDec = decisionByProject.get(p.id) || 0
    const attention =
      openDec > 0 || p.health === 'risk' || p.health === 'blocked' || p.health === 'watch'
    const id = `project:${p.id}`
    if (focusDecision?.projectId === p.id) focusNodeId = id
    nodes.push({
      id,
      kind: 'project',
      label: trunc(p.title, 22),
      meta:
        openDec > 0
          ? openDec === 1
            ? '1 Entscheidung'
            : `${openDec} Entscheidungen`
          : phaseLabel(p.phase),
      x: pos.x,
      y: pos.y,
      projectId: p.id,
      attention,
    })
  }

  if (!focusNodeId && nodes[0]) focusNodeId = nodes[0].id

  /* Knowledge / context satellites around focused project */
  const focusProject = input.projects.find((p) => `project:${p.id}` === focusNodeId)
  if (focusProject) {
    const satellites: Array<{ kind: BoardNodeKind; label: string; meta: string }> = [
      {
        kind: 'knowledge',
        label: 'Brand',
        meta: 'Kontext',
      },
      {
        kind: 'knowledge',
        label: 'Design',
        meta: phaseLabel(focusProject.phase),
      },
      {
        kind: 'task',
        label: 'Umsetzung',
        meta: `${taskByProject.get(focusProject.id) || 0} offen`,
      },
    ]
    if (
      focusProject.health === 'risk' ||
      focusProject.health === 'blocked' ||
      focusProject.health === 'watch'
    ) {
      satellites.push({
        kind: 'risk',
        label: 'Risiken',
        meta: focusProject.health === 'blocked' ? 'Blockiert' : 'Beobachten',
      })
    }
    for (const s of satellites) {
      const pos = layoutPoint(i++, 12, 3)
      const sid = `sat:${focusProject.id}:${s.label}`
      nodes.push({
        id: sid,
        kind: s.kind,
        label: s.label,
        meta: s.meta,
        x: pos.x,
        y: pos.y,
        projectId: focusProject.id,
        attention: s.kind === 'risk' || s.kind === 'decision',
      })
      edges.push({
        id: `e:${focusNodeId}:${sid}`,
        from: focusNodeId!,
        to: sid,
      })
    }
  }

  /* Soft links between projects (same workspace — shared work) */
  for (let a = 0; a < input.projects.length - 1 && a < 4; a++) {
    const from = `project:${input.projects[a].id}`
    const to = `project:${input.projects[a + 1].id}`
    edges.push({ id: `e:${from}:${to}`, from, to })
  }

  if (input.team.length > 0) {
    const pos = layoutPoint(i++, 10, 7)
    const rid = 'resource:team'
    nodes.push({
      id: rid,
      kind: 'resource',
      label: 'Team',
      meta: `${input.team.length} Personen`,
      x: pos.x,
      y: pos.y,
      projectId: focusProject?.id || null,
      attention: false,
    })
    if (focusNodeId) {
      edges.push({ id: `e:${focusNodeId}:${rid}`, from: focusNodeId, to: rid })
    }
  }

  if (focusDecision) {
    const pos = layoutPoint(i++, 10, 9)
    const did = `decision:${focusDecision.id}`
    nodes.push({
      id: did,
      kind: 'decision',
      label: trunc(focusDecision.title, 24),
      meta: 'Jetzt',
      x: pos.x,
      y: pos.y,
      projectId: focusDecision.projectId,
      attention: true,
    })
    const linkTo =
      focusDecision.projectId != null
        ? `project:${focusDecision.projectId}`
        : focusNodeId
    if (linkTo) {
      edges.push({ id: `e:${linkTo}:${did}`, from: linkTo, to: did })
    }
    focusNodeId = did
  }

  /* Empty workspace — gentle first star */
  if (nodes.length === 0) {
    nodes.push({
      id: 'empty:start',
      kind: 'project',
      label: 'Erstes Projekt',
      meta: 'Bereit',
      x: 50,
      y: 48,
      projectId: null,
      attention: true,
    })
    focusNodeId = 'empty:start'
  }

  return { nodes, edges, focusNodeId }
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
        { id: 's2', label: 'Projekt starten', meta: 'Jetzt', kind: 'current' },
        { id: 's3', label: 'Team einladen', meta: 'Geplant', kind: 'planned' },
      ],
      branches: topic?.options.map((o) => ({
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
    {
      id: 'kickoff',
      label: 'Projekt gestartet',
      meta: null,
      kind: 'done',
    },
    {
      id: 'scope',
      label: phaseLabel(project.phase) || 'Richtung geklärt',
      meta: null,
      kind: 'done',
    },
  ]

  if (decision) {
    steps.push({
      id: decision.id,
      label: trunc(decision.title.replace(/\?$/, ''), 40),
      meta: 'Entscheidung heute',
      kind: 'current',
    })
  } else {
    steps.push({
      id: 'focus',
      label: project.nextMilestone || 'Nächster Schritt',
      meta: 'Fokus',
      kind: 'current',
    })
  }

  steps.push({
    id: 'build',
    label: 'Umsetzung',
    meta: 'Geplant',
    kind: 'planned',
  })
  steps.push({
    id: 'launch',
    label: 'Launch',
    meta: 'Geplant',
    kind: 'planned',
  })

  const branches: PathBranch[] = topic
    ? topic.options.map((o) => ({
        id: o.id,
        label: o.label,
        recommended: o.recommended,
        hint: o.hint,
      }))
    : [
        {
          id: 'continue',
          label: 'Weiterarbeiten',
          recommended: true,
          hint: 'Kein offener Entscheidungsbedarf.',
        },
      ]

  const insight =
    topic?.reasons[0] ||
    (decision?.tagroReasoning
      ? trunc(decision.tagroReasoning, 160)
      : 'Der Pfad zeigt, warum wir hier sind — und was als Nächstes Aufmerksamkeit verdient.')

  return {
    projectId: project.id,
    projectTitle: project.title,
    steps,
    branches,
    topic,
    insight,
  }
}
