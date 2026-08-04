'use client'

/**
 * Tagro Living Core — calm constellation for Overview.
 * Static layout + CSS hover grow. No continuous rAF (perf).
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
  labelDist: number
}

const CX = 200
const CY = 142
const VIEW_W = 400
const VIEW_H = 300
const SQUASH = 0.88

const NODES: NodeDef[] = [
  { id: 'n1', kind: 'decisions', angle: -Math.PI / 2, radius: 108, size: 9, labelDist: 26 },
  { id: 'n2', kind: 'risks', angle: -Math.PI / 6, radius: 112, size: 8.2, labelDist: 26 },
  { id: 'n3', kind: 'projects', angle: Math.PI / 5, radius: 114, size: 9.4, labelDist: 28 },
  { id: 'n4', kind: 'tasks', angle: (2 * Math.PI) / 3, radius: 110, size: 8.6, labelDist: 26 },
  { id: 'n5', kind: 'activity', angle: Math.PI, radius: 106, size: 8.4, labelDist: 26 },
  { id: 'n6', kind: 'team', angle: (-3 * Math.PI) / 4, radius: 110, size: 7.8, labelDist: 26 },
  { id: 'n7', kind: 'milestone', angle: (-5 * Math.PI) / 6, radius: 72, size: 6.4, labelDist: 22 },
  { id: 'n8', kind: 'briefing', angle: Math.PI / 2, radius: 52, size: 6.2, labelDist: 22 },
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

type Pos = { x: number; y: number; lx: number; ly: number; size: number }

function restPos(def: NodeDef): Pos {
  const x = CX + Math.cos(def.angle) * def.radius
  const y = CY + Math.sin(def.angle) * def.radius * SQUASH
  const lx = CX + Math.cos(def.angle) * (def.radius + def.labelDist)
  const ly = CY + Math.sin(def.angle) * (def.radius + def.labelDist) * SQUASH
  return { x, y, lx, ly, size: def.size }
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
    map.set('c', { x: CX, y: CY, lx: CX, ly: CY + 36, size: 22 })
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
          : state === 'listening'
            ? 'Tagro hört zu'
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
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}-core`} cx="34%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="38%" stopColor="#E8ECF4" />
            <stop offset="72%" stopColor="#B8C0D4" />
            <stop offset="100%" stopColor="#8A94AA" />
          </radialGradient>
          <radialGradient id={`${uid}-node`} cx="32%" cy="26%" r="74%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#DCE2EE" />
            <stop offset="100%" stopColor="#9AA4BA" />
          </radialGradient>
          <radialGradient id={`${uid}-node-hot`} cx="30%" cy="24%" r="76%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#E6EAF4" />
            <stop offset="100%" stopColor="#7A869E" />
          </radialGradient>
          <radialGradient id={`${uid}-shadow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(40,48,70,0.2)" />
            <stop offset="100%" stopColor="rgba(40,48,70,0)" />
          </radialGradient>
        </defs>

        <ellipse className="tlc-guide" cx={CX} cy={CY} rx={110} ry={96} />
        <ellipse className="tlc-guide tlc-guide--inner" cx={CX} cy={CY} rx={64} ry={56} />

        <g className="tlc-edges">
          {NODES.map((def) => {
            const pb = positions.get(def.id)!
            return (
              <line
                key={def.id}
                className={`tlc-edge${hoverKind === def.kind ? ' is-hot' : ''}`}
                x1={CX}
                y1={CY}
                x2={pb.x}
                y2={pb.y}
              />
            )
          })}
        </g>

        <g className="tlc-nodes">
          {NODES.map((def) => {
            const pos = positions.get(def.id)!
            const sig = resolved[def.kind]
            const accent = sig.accent || ((sig.count || 0) > 0 ? 'attention' : 'calm')
            const hot = hoverKind === def.kind
            const lit = (sig.count || 0) > 0 || accent !== 'calm'
            return (
              <g
                key={def.id}
                className={`tlc-node-g is-${accent}${hot ? ' is-hot' : ''}${lit ? ' is-lit' : ''}`}
                transform={`translate(${pos.x},${pos.y})`}
              >
                <g className={`tlc-node-scale${hot ? ' is-hot' : ''}`}>
                  <ellipse
                    className="tlc-node-shadow"
                    cx={0}
                    cy={def.size * 0.55}
                    rx={def.size * 1.15}
                    ry={def.size * 0.42}
                    fill={`url(#${uid}-shadow)`}
                  />
                  {lit ? <circle className="tlc-node-halo" cx={0} cy={0} r={def.size + 7} /> : null}
                  <circle
                    className="tlc-node"
                    cx={0}
                    cy={0}
                    r={def.size}
                    fill={hot ? `url(#${uid}-node-hot)` : `url(#${uid}-node)`}
                  />
                  <circle
                    className="tlc-node-spec"
                    cx={-def.size * 0.28}
                    cy={-def.size * 0.32}
                    r={def.size * 0.28}
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
              <circle className="tlc-core-halo" cx={0} cy={0} r={42} />
              <ellipse
                className="tlc-core-shadow"
                cx={0}
                cy={14}
                rx={26}
                ry={10}
                fill={`url(#${uid}-shadow)`}
              />
              <circle className="tlc-core-ring" cx={0} cy={0} r={32} />
              <circle className="tlc-core" cx={0} cy={0} r={22} fill={`url(#${uid}-core)`} />
              <circle className="tlc-core-spec" cx={-7} cy={-8} r={5.5} />
            </g>
          </g>
        </g>
      </svg>

      <div className="tlc-hits">
        <div className="tlc-anchor">
          <button
            type="button"
            className={`tlc-hit is-core${hoverKind === 'core' ? ' is-hot' : ''}`}
            style={{ left: `${(CX / VIEW_W) * 100}%`, top: `${(CY / VIEW_H) * 100}%` }}
            aria-label="Tagro"
            onMouseEnter={() => setHoverKind('core')}
            onFocus={() => setHoverKind('core')}
            onClick={(e) => {
              e.stopPropagation()
              onCoreActivate?.()
            }}
          />
          <span
            className={`tlc-chip is-core${hoverKind === 'core' ? ' is-hot' : ''}`}
            style={{ left: `${(CX / VIEW_W) * 100}%`, top: `${((CY + 36) / VIEW_H) * 100}%` }}
            onMouseEnter={() => setHoverKind('core')}
          >
            <span className="tlc-chip-label">Tagro</span>
          </span>
        </div>

        {NODES.map((def) => {
          const pos = positions.get(def.id)!
          const sig = resolved[def.kind]
          const showCount = typeof sig.count === 'number' && sig.count > 0
          return (
            <div key={def.id} className="tlc-anchor">
              <button
                type="button"
                className={`tlc-hit${hoverKind === def.kind ? ' is-hot' : ''}`}
                style={{
                  left: `${(pos.x / VIEW_W) * 100}%`,
                  top: `${(pos.y / VIEW_H) * 100}%`,
                }}
                aria-label={showCount ? `${sig.label}, ${sig.count}` : sig.label}
                onMouseEnter={() => setHoverKind(def.kind)}
                onFocus={() => setHoverKind(def.kind)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (sig.href) window.location.assign(sig.href)
                }}
              />
              <span
                className={`tlc-chip${hoverKind === def.kind ? ' is-hot' : ''}${showCount ? ' has-count' : ''}`}
                style={{
                  left: `${(pos.lx / VIEW_W) * 100}%`,
                  top: `${(pos.ly / VIEW_H) * 100}%`,
                }}
                onMouseEnter={() => setHoverKind(def.kind)}
              >
                <span className="tlc-chip-label">{sig.label}</span>
                {showCount ? <span className="tlc-chip-count">{sig.count}</span> : null}
              </span>
            </div>
          )
        })}
      </div>

      {hoverPos && hoverSignal ? (
        <div
          className="tlc-pop"
          role="tooltip"
          style={{
            left: `${(hoverPos.x / VIEW_W) * 100}%`,
            top: `${(hoverPos.y / VIEW_H) * 100}%`,
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
