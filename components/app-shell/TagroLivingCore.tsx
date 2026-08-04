'use client'

/**
 * Tagro Living Core — abstract neural system for Overview.
 * Nodes carry workspace signals (decisions, risks, …) with calm hover popovers.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type TagroLivingState =
  | 'calm'
  | 'attention'
  | 'blocked'
  | 'listening'
  | 'speaking'
  | 'audio'

export type TagroSignalKind =
  | 'core'
  | 'decisions'
  | 'risks'
  | 'projects'
  | 'tasks'
  | 'activity'
  | 'team'
  | 'milestone'
  | 'briefing'

export type TagroNodeSignal = {
  kind: TagroSignalKind
  label: string
  count?: number
  detail: string
  href?: string
  accent?: 'calm' | 'attention' | 'risk'
}

type Props = {
  state?: TagroLivingState
  className?: string
  signals?: Partial<Record<TagroSignalKind, TagroNodeSignal>>
  onCoreActivate?: () => void
}

type Node = {
  id: string
  kind: TagroSignalKind
  x: number
  y: number
  r: number
  orbit: number
  labelX: number
  labelY: number
}

const NODES: Node[] = [
  { id: 'c', kind: 'core', x: 200, y: 140, r: 18, orbit: 0, labelX: 200, labelY: 178 },
  { id: 'n1', kind: 'decisions', x: 118, y: 78, r: 7, orbit: 1, labelX: 88, labelY: 58 },
  { id: 'n2', kind: 'risks', x: 282, y: 72, r: 6.5, orbit: 2, labelX: 312, labelY: 52 },
  { id: 'n3', kind: 'projects', x: 310, y: 158, r: 8, orbit: 3, labelX: 348, labelY: 158 },
  { id: 'n4', kind: 'tasks', x: 248, y: 230, r: 6, orbit: 4, labelX: 268, labelY: 256 },
  { id: 'n5', kind: 'activity', x: 132, y: 218, r: 7.5, orbit: 5, labelX: 100, labelY: 246 },
  { id: 'n6', kind: 'team', x: 86, y: 148, r: 5.5, orbit: 6, labelX: 48, labelY: 148 },
  { id: 'n7', kind: 'milestone', x: 200, y: 52, r: 5, orbit: 7, labelX: 200, labelY: 28 },
  { id: 'n8', kind: 'briefing', x: 188, y: 198, r: 4.5, orbit: 8, labelX: 158, labelY: 214 },
]

const EDGES: Array<[string, string]> = [
  ['c', 'n1'],
  ['c', 'n2'],
  ['c', 'n3'],
  ['c', 'n4'],
  ['c', 'n5'],
  ['c', 'n6'],
  ['c', 'n7'],
  ['n1', 'n2'],
  ['n2', 'n3'],
  ['n3', 'n4'],
  ['n5', 'n6'],
  ['n6', 'n1'],
  ['n7', 'n1'],
  ['n4', 'n8'],
  ['n5', 'n8'],
  ['n8', 'c'],
]

const DEFAULT_SIGNALS: Record<TagroSignalKind, TagroNodeSignal> = {
  core: { kind: 'core', label: 'Tagro', detail: 'Workspace-Intelligenz' },
  decisions: { kind: 'decisions', label: 'Entscheidungen', count: 0, detail: 'Keine offenen Entscheidungen.' },
  risks: { kind: 'risks', label: 'Risiken', count: 0, detail: 'Keine kritischen Risiken.' },
  projects: { kind: 'projects', label: 'Projekte', count: 0, detail: 'Noch keine Projekte.' },
  tasks: { kind: 'tasks', label: 'Aufgaben', count: 0, detail: 'Keine offenen Aufgaben.' },
  activity: { kind: 'activity', label: 'Aktivität', count: 0, detail: 'Noch keine Aktivität.' },
  team: { kind: 'team', label: 'Team', count: 0, detail: 'Nur du im Workspace.' },
  milestone: { kind: 'milestone', label: 'Meilenstein', detail: 'Kein Meilenstein geplant.' },
  briefing: { kind: 'briefing', label: 'Briefing', detail: 'Status wird fortlaufend gelesen.' },
}

function MiniSpark({ accent }: { accent: 'calm' | 'attention' | 'risk' }) {
  return (
    <svg className="tlc-pop-spark" viewBox="0 0 64 28" aria-hidden>
      <path
        className={`tlc-pop-spark-line is-${accent}`}
        d="M2 20 C10 18, 14 8, 22 12 S34 24, 42 14 S54 6, 62 10"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle className={`tlc-pop-spark-dot is-${accent}`} cx="22" cy="12" r="2.2" />
      <circle className={`tlc-pop-spark-dot is-${accent}`} cx="42" cy="14" r="2.2" />
    </svg>
  )
}

export default function TagroLivingCore({
  state = 'calm',
  className = '',
  signals,
  onCoreActivate,
}: Props) {
  const [hoverKind, setHoverKind] = useState<TagroSignalKind | null>(null)

  const byId = useMemo(() => {
    const m = new Map<string, Node>()
    for (const n of NODES) m.set(n.id, n)
    return m
  }, [])

  const resolved = useMemo(() => {
    const out = { ...DEFAULT_SIGNALS }
    if (signals) {
      for (const [k, v] of Object.entries(signals) as Array<[TagroSignalKind, TagroNodeSignal]>) {
        if (v) out[k] = { ...DEFAULT_SIGNALS[k], ...v }
      }
    }
    return out
  }, [signals])

  const ariaLabel =
    state === 'blocked'
      ? 'Tagro erkennt Blocker'
      : state === 'attention'
        ? 'Tagro wartet auf eine Entscheidung'
        : state === 'audio' || state === 'speaking'
          ? 'Tagro spricht'
          : state === 'listening'
            ? 'Tagro hört zu'
            : 'Tagro — Workspace ruhig'

  const hoverNode = hoverKind ? NODES.find((n) => n.kind === hoverKind) : null
  const hoverSignal = hoverKind ? resolved[hoverKind] : null

  return (
    <div
      className={`tlc ${className}`.trim()}
      data-state={state}
      aria-label={ariaLabel}
      onMouseLeave={() => setHoverKind(null)}
    >
      <div className="tlc-glow" aria-hidden />
      <svg className="tlc-svg" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <radialGradient id="tlc-core" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="55%" stopColor="rgba(186,194,210,0.55)" />
            <stop offset="100%" stopColor="rgba(91,100,125,0.18)" />
          </radialGradient>
          <radialGradient id="tlc-node" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="100%" stopColor="rgba(140,148,168,0.45)" />
          </radialGradient>
          <filter id="tlc-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="tlc-edges">
          {EDGES.map(([a, b]) => {
            const na = byId.get(a)
            const nb = byId.get(b)
            if (!na || !nb) return null
            return (
              <line
                key={`${a}-${b}`}
                className="tlc-edge"
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
              />
            )
          })}
        </g>

        <g className="tlc-nodes" filter="url(#tlc-soft)">
          {NODES.filter((n) => n.kind !== 'core').map((n) => {
            const sig = resolved[n.kind]
            const accent = sig.accent || ((sig.count || 0) > 0 ? 'attention' : 'calm')
            const hot = hoverKind === n.kind
            return (
              <circle
                key={n.id}
                className={`tlc-node tlc-orbit-${n.orbit}${hot ? ' is-hot' : ''} is-${accent}`}
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill="url(#tlc-node)"
              />
            )
          })}
          <circle className="tlc-core" cx={200} cy={140} r={18} fill="url(#tlc-core)" />
          <circle className="tlc-core-ring" cx={200} cy={140} r={28} />
        </g>
      </svg>

      <div className="tlc-hits">
        {NODES.map((n) => {
          const sig = resolved[n.kind]
          const showCount = typeof sig.count === 'number' && sig.count > 0
          const isCore = n.kind === 'core'
          return (
            <div key={n.id} className="tlc-anchor">
              <button
                type="button"
                className={`tlc-hit${hoverKind === n.kind ? ' is-hot' : ''}${isCore ? ' is-core' : ''}`}
                style={{
                  left: `${(n.x / 400) * 100}%`,
                  top: `${(n.y / 280) * 100}%`,
                }}
                aria-label={showCount ? `${sig.label}, ${sig.count}` : sig.label}
                onMouseEnter={() => setHoverKind(n.kind)}
                onFocus={() => setHoverKind(n.kind)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isCore) {
                    onCoreActivate?.()
                    return
                  }
                  if (sig.href) window.location.assign(sig.href)
                }}
              ></button>
              <span
                className={`tlc-chip${hoverKind === n.kind ? ' is-hot' : ''}`}
                style={{
                  left: `${(n.labelX / 400) * 100}%`,
                  top: `${(n.labelY / 280) * 100}%`,
                }}
                onMouseEnter={() => setHoverKind(n.kind)}
              >
                <span className="tlc-chip-label">{sig.label}</span>
                {showCount ? <span className="tlc-chip-count">{sig.count}</span> : null}
              </span>
            </div>
          )
        })}
      </div>

      {hoverNode && hoverSignal ? (
        <div
          className="tlc-pop"
          role="tooltip"
          style={{
            left: `${(hoverNode.x / 400) * 100}%`,
            top: `${(hoverNode.y / 280) * 100}%`,
          }}
        >
          <div className="tlc-pop-card">
            <MiniSpark accent={hoverSignal.accent || ((hoverSignal.count || 0) > 0 ? 'attention' : 'calm')} />
            <p className="tlc-pop-title">
              {hoverSignal.label}
              {typeof hoverSignal.count === 'number' ? `, ${hoverSignal.count}` : ''}
            </p>
            <p className="tlc-pop-body">{hoverSignal.detail}</p>
            {hoverSignal.href ? (
              <Link href={hoverSignal.href} className="tlc-pop-link" onClick={(e) => e.stopPropagation()}>
                Öffnen
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function deriveTagroLivingState(input: {
  pendingDecisions: number
  projects: Array<{ health: 'healthy' | 'watch' | 'risk' | 'blocked' }>
}): TagroLivingState {
  if (input.projects.some((p) => p.health === 'blocked' || p.health === 'risk')) {
    return 'blocked'
  }
  if (input.pendingDecisions > 0 || input.projects.some((p) => p.health === 'watch')) {
    return 'attention'
  }
  return 'calm'
}

export function buildTagroSignals(data: {
  workspaceName: string
  summary: {
    activeProjects: number
    pendingDecisions: number
    teamMembers: number
    nextMilestone: string | null
    calmLine: string
  }
  projects: Array<{ health: 'healthy' | 'watch' | 'risk' | 'blocked'; title: string }>
  tasks?: Array<{ title: string }>
  decisions: Array<{ title: string }>
  activity: Array<{ title: string }>
  team: Array<{ name: string }>
  briefingProject?: string | null
}): Partial<Record<TagroSignalKind, TagroNodeSignal>> {
  const riskProjects = data.projects.filter((p) => p.health === 'risk' || p.health === 'blocked')
  const openTasks = data.tasks?.length ?? 0
  const topDecision = data.decisions[0]?.title
  const topRisk = riskProjects[0]?.title

  return {
    core: {
      kind: 'core',
      label: 'Tagro',
      detail: data.summary.calmLine || `${data.workspaceName} läuft.`,
      accent: riskProjects.length > 0 ? 'risk' : data.summary.pendingDecisions > 0 ? 'attention' : 'calm',
    },
    decisions: {
      kind: 'decisions',
      label: 'Entscheidungen',
      count: data.summary.pendingDecisions,
      detail: topDecision
        ? `Offen: ${topDecision}`
        : 'Keine offenen Entscheidungen.',
      href: '/overview/inbox',
      accent: data.summary.pendingDecisions > 0 ? 'attention' : 'calm',
    },
    risks: {
      kind: 'risks',
      label: 'Risiken',
      count: riskProjects.length,
      detail: topRisk
        ? `${topRisk} braucht Aufmerksamkeit.`
        : 'Keine kritischen Risiken.',
      href: '/overview/projects',
      accent: riskProjects.length > 0 ? 'risk' : 'calm',
    },
    projects: {
      kind: 'projects',
      label: 'Projekte',
      count: data.summary.activeProjects,
      detail:
        data.summary.activeProjects === 0
          ? 'Noch keine Projekte.'
          : `${data.summary.activeProjects} aktive Projekte im Workspace.`,
      href: '/overview/projects',
      accent: 'calm',
    },
    tasks: {
      kind: 'tasks',
      label: 'Aufgaben',
      count: openTasks,
      detail:
        openTasks === 0
          ? 'Keine offenen Aufgaben in der Übersicht.'
          : `${openTasks} Aufgaben in Bewegung.`,
      href: '/overview/tasks',
      accent: openTasks > 8 ? 'attention' : 'calm',
    },
    activity: {
      kind: 'activity',
      label: 'Aktivität',
      count: data.activity.length,
      detail: data.activity[0]?.title
        ? `Zuletzt: ${data.activity[0].title}`
        : 'Noch keine Aktivität.',
      href: '/overview/activity',
      accent: 'calm',
    },
    team: {
      kind: 'team',
      label: 'Team',
      count: data.summary.teamMembers,
      detail:
        data.summary.teamMembers <= 1
          ? 'Nur du im Workspace.'
          : `${data.summary.teamMembers} Personen verbunden.`,
      href: '/overview/team',
      accent: 'calm',
    },
    milestone: {
      kind: 'milestone',
      label: 'Meilenstein',
      detail: data.summary.nextMilestone
        ? `Nächster: ${data.summary.nextMilestone}`
        : 'Kein Meilenstein geplant.',
      href: '/overview/projects',
      accent: data.summary.nextMilestone ? 'attention' : 'calm',
    },
    briefing: {
      kind: 'briefing',
      label: 'Briefing',
      detail: data.briefingProject
        ? `Status zu ${data.briefingProject}.`
        : 'Tagro liest den Workspace-Zustand vor.',
      accent: 'calm',
    },
  }
}
