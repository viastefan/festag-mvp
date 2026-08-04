'use client'

/**
 * Tagro Living Core — neural sphere for Overview.
 * Interface, not decoration. Extremely subtle motion. Silence is default.
 */

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'

export type TagroLivingState =
  | 'calm'
  | 'attention'
  | 'blocked'
  | 'listening'
  | 'speaking'
  | 'audio'
  | 'thinking'

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

type NodeDef = {
  id: string
  kind: TagroSignalKind
  angle: number
  radius: number
  size: number
}

/** Square sphere composition ≈ 250px rendered */
const CX = 140
const CY = 140
const VIEW = 280

const NODES: NodeDef[] = [
  { id: 'n1', kind: 'decisions', angle: -Math.PI / 2.15, radius: 92, size: 7.2 },
  { id: 'n2', kind: 'risks', angle: -Math.PI / 7, radius: 96, size: 6.4 },
  { id: 'n3', kind: 'projects', angle: Math.PI / 4.2, radius: 98, size: 7.6 },
  { id: 'n4', kind: 'tasks', angle: (2.1 * Math.PI) / 3, radius: 94, size: 6.8 },
  { id: 'n5', kind: 'activity', angle: Math.PI * 0.98, radius: 90, size: 6.6 },
  { id: 'n6', kind: 'team', angle: (-2.55 * Math.PI) / 3, radius: 94, size: 6.2 },
  { id: 'n7', kind: 'milestone', angle: (-4.2 * Math.PI) / 5, radius: 58, size: 5.4 },
  { id: 'n8', kind: 'briefing', angle: Math.PI / 2.1, radius: 48, size: 5.2 },
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

type Pos = { x: number; y: number; size: number }

function restPos(def: NodeDef): Pos {
  return {
    x: CX + Math.cos(def.angle) * def.radius,
    y: CY + Math.sin(def.angle) * def.radius,
    size: def.size,
  }
}

export default function TagroLivingCore({
  state = 'calm',
  className = '',
  signals,
  onCoreActivate,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const [hoverKind, setHoverKind] = useState<TagroSignalKind | null>(null)

  const resolved = useMemo(() => {
    const out = { ...DEFAULT_SIGNALS }
    if (signals) {
      for (const [k, v] of Object.entries(signals) as Array<[TagroSignalKind, TagroNodeSignal]>) {
        if (v) out[k] = { ...DEFAULT_SIGNALS[k], ...v }
      }
    }
    return out
  }, [signals])

  const positions = useMemo(() => {
    const map = new Map<string, Pos>()
    map.set('c', { x: CX, y: CY, size: 18 })
    for (const def of NODES) map.set(def.id, restPos(def))
    return map
  }, [])

  const ariaLabel =
    state === 'blocked'
      ? 'Tagro erkennt Blocker'
      : state === 'attention'
        ? 'Tagro wartet auf eine Entscheidung'
        : state === 'audio' || state === 'speaking'
          ? 'Tagro spricht'
          : state === 'listening' || state === 'thinking'
            ? 'Tagro denkt'
            : 'Tagro — Workspace ruhig'

  const hoverSignal = hoverKind ? resolved[hoverKind] : null
  const hoverId =
    hoverKind === 'core' ? 'c' : hoverKind ? NODES.find((n) => n.kind === hoverKind)?.id : null
  const hoverPos = hoverId ? positions.get(hoverId) : null

  return (
    <div
      className={`tlc${hoverKind ? ' has-hover' : ''} ${className}`.trim()}
      data-state={state}
      aria-label={ariaLabel}
      onMouseLeave={() => setHoverKind(null)}
    >
      <div className="tlc-field" aria-hidden />

      <svg
        className="tlc-svg"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}-core`} cx="34%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="42%" stopColor="#E6EAF2" />
            <stop offset="78%" stopColor="#A8B0C4" />
            <stop offset="100%" stopColor="#7A849A" />
          </radialGradient>
          <radialGradient id={`${uid}-node`} cx="32%" cy="26%" r="74%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
            <stop offset="48%" stopColor="rgba(220,226,238,0.92)" />
            <stop offset="100%" stopColor="rgba(154,164,186,0.88)" />
          </radialGradient>
          <radialGradient id={`${uid}-node-hot`} cx="30%" cy="24%" r="76%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#E8ECF4" />
            <stop offset="100%" stopColor="#6E7A92" />
          </radialGradient>
          <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle className="tlc-orbit tlc-orbit--outer" cx={CX} cy={CY} r={102} />
        <circle className="tlc-orbit tlc-orbit--inner" cx={CX} cy={CY} r={56} />

        <g className="tlc-edges">
          {NODES.map((def, i) => {
            const pb = positions.get(def.id)!
            const sig = resolved[def.kind]
            const lit = (sig.count || 0) > 0 || (sig.accent && sig.accent !== 'calm')
            return (
              <line
                key={def.id}
                className={`tlc-edge${hoverKind === def.kind ? ' is-hot' : ''}${lit ? ' is-lit' : ''}`}
                style={{ ['--i' as string]: i }}
                x1={CX}
                y1={CY}
                x2={pb.x}
                y2={pb.y}
              />
            )
          })}
        </g>

        <g className="tlc-nodes" filter={`url(#${uid}-soft)`}>
          {NODES.map((def, i) => {
            const pos = positions.get(def.id)!
            const sig = resolved[def.kind]
            const accent = sig.accent || ((sig.count || 0) > 0 ? 'attention' : 'calm')
            const hot = hoverKind === def.kind
            const lit = (sig.count || 0) > 0 || accent !== 'calm'
            const pulseDecision = def.kind === 'decisions' && state === 'attention' && lit
            return (
              <g
                key={def.id}
                className={`tlc-node-g is-${accent}${hot ? ' is-hot' : ''}${lit ? ' is-lit' : ''}${pulseDecision ? ' is-pulse' : ''}`}
                style={{ ['--i' as string]: i }}
                transform={`translate(${pos.x},${pos.y})`}
              >
                <g className={`tlc-node-scale${hot ? ' is-hot' : ''}`}>
                  {lit ? <circle className="tlc-node-halo" cx={0} cy={0} r={pos.size + 6} /> : null}
                  <circle
                    className="tlc-node"
                    cx={0}
                    cy={0}
                    r={pos.size}
                    fill={hot ? `url(#${uid}-node-hot)` : `url(#${uid}-node)`}
                  />
                  <circle
                    className="tlc-node-spec"
                    cx={-pos.size * 0.28}
                    cy={-pos.size * 0.32}
                    r={pos.size * 0.26}
                  />
                </g>
              </g>
            )
          })}

          <g
            className={`tlc-core-g${hoverKind === 'core' ? ' is-hot' : ''}`}
            transform={`translate(${CX},${CY})`}
          >
            <g className={`tlc-core-scale${hoverKind === 'core' ? ' is-hot' : ''}`}>
              <circle className="tlc-core-halo" cx={0} cy={0} r={36} />
              <circle className="tlc-core-ring" cx={0} cy={0} r={26} />
              <circle className="tlc-core" cx={0} cy={0} r={18} fill={`url(#${uid}-core)`} />
              <circle className="tlc-core-spec" cx={-5.5} cy={-6.5} r={4.2} />
            </g>
          </g>
        </g>
      </svg>

      <div className="tlc-hits">
        <button
          type="button"
          className={`tlc-hit is-core${hoverKind === 'core' ? ' is-hot' : ''}`}
          style={{ left: `${(CX / VIEW) * 100}%`, top: `${(CY / VIEW) * 100}%` }}
          aria-label="Tagro"
          onMouseEnter={() => setHoverKind('core')}
          onFocus={() => setHoverKind('core')}
          onClick={(e) => {
            e.stopPropagation()
            onCoreActivate?.()
          }}
        />

        {NODES.map((def) => {
          const pos = positions.get(def.id)!
          const sig = resolved[def.kind]
          const showCount = typeof sig.count === 'number' && sig.count > 0
          return (
            <button
              key={def.id}
              type="button"
              className={`tlc-hit${hoverKind === def.kind ? ' is-hot' : ''}${showCount ? ' has-signal' : ''}`}
              style={{
                left: `${(pos.x / VIEW) * 100}%`,
                top: `${(pos.y / VIEW) * 100}%`,
              }}
              aria-label={showCount ? `${sig.label}, ${sig.count}` : sig.label}
              onMouseEnter={() => setHoverKind(def.kind)}
              onFocus={() => setHoverKind(def.kind)}
              onClick={(e) => {
                e.stopPropagation()
                if (sig.href) window.location.assign(sig.href)
              }}
            />
          )
        })}
      </div>

      {hoverPos && hoverSignal ? (
        <div
          className="tlc-pop"
          role="tooltip"
          style={{
            left: `${(hoverPos.x / VIEW) * 100}%`,
            top: `${(hoverPos.y / VIEW) * 100}%`,
          }}
        >
          <div className="tlc-pop-card">
            <p className="tlc-pop-title">
              {hoverSignal.label}
              {typeof hoverSignal.count === 'number' && hoverSignal.count > 0
                ? `, ${hoverSignal.count}`
                : ''}
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
      detail: topDecision ? `Offen: ${topDecision}` : 'Keine offenen Entscheidungen.',
      href: '/overview/inbox',
      accent: data.summary.pendingDecisions > 0 ? 'attention' : 'calm',
    },
    risks: {
      kind: 'risks',
      label: 'Risiken',
      count: riskProjects.length,
      detail: topRisk ? `${topRisk} braucht Aufmerksamkeit.` : 'Keine kritischen Risiken.',
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
      detail: data.activity[0]?.title ? `Zuletzt: ${data.activity[0].title}` : 'Noch keine Aktivität.',
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
