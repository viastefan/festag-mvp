'use client'

/**
 * Tagro Living Core — calm constellation for Overview.
 * Fixed layout + micro-breath. Hover grows the orb. No racing orbits.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
  /** Fixed angle from center (radians) */
  angle: number
  /** Distance from center */
  radius: number
  /** Resting visual radius */
  size: number
  /** Label distance beyond node */
  labelDist: number
  /** Micro-float phase offset */
  phase: number
}

const CX = 200
const CY = 142
const VIEW_W = 400
const VIEW_H = 300
const SQUASH = 0.88

/**
 * Stable constellation — clock positions, generous gaps so chips never collide.
 * Inner: Briefing · Milestone. Outer: Decisions · Risks · Projects · Tasks · Activity · Team.
 */
const NODES: NodeDef[] = [
  { id: 'n1', kind: 'decisions', angle: -Math.PI / 2, radius: 108, size: 9, labelDist: 26, phase: 0.2 },
  { id: 'n2', kind: 'risks', angle: -Math.PI / 6, radius: 112, size: 8.2, labelDist: 26, phase: 1.1 },
  { id: 'n3', kind: 'projects', angle: Math.PI / 5, radius: 114, size: 9.4, labelDist: 28, phase: 2.0 },
  { id: 'n4', kind: 'tasks', angle: (2 * Math.PI) / 3, radius: 110, size: 8.6, labelDist: 26, phase: 2.8 },
  { id: 'n5', kind: 'activity', angle: Math.PI, radius: 106, size: 8.4, labelDist: 26, phase: 0.7 },
  { id: 'n6', kind: 'team', angle: (-3 * Math.PI) / 4, radius: 110, size: 7.8, labelDist: 26, phase: 1.6 },
  { id: 'n7', kind: 'milestone', angle: (-5 * Math.PI) / 6, radius: 72, size: 6.4, labelDist: 22, phase: 3.2 },
  { id: 'n8', kind: 'briefing', angle: Math.PI / 2, radius: 52, size: 6.2, labelDist: 22, phase: 0.4 },
]

const SPOKES: Array<[string, string]> = NODES.map((n) => ['c', n.id])

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

function livePos(def: NodeDef, tSec: number, breath: number): Pos {
  const rest = restPos(def)
  // Barely conscious float — 1.2px max
  const dx = Math.sin(tSec * 0.35 + def.phase) * 1.2 * breath
  const dy = Math.cos(tSec * 0.28 + def.phase * 1.3) * 1.0 * breath
  return {
    x: rest.x + dx,
    y: rest.y + dy,
    lx: rest.lx + dx * 0.4,
    ly: rest.ly + dy * 0.4,
    size: def.size,
  }
}

function breathForState(state: TagroLivingState): number {
  if (state === 'audio' || state === 'speaking') return 1.35
  if (state === 'listening') return 0.7
  if (state === 'blocked') return 0.45
  if (state === 'attention') return 1.0
  return 0.85
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
  const [reduced, setReduced] = useState(false)

  const stateRef = useRef(state)
  const reducedRef = useRef(false)
  const hoverKindRef = useRef<TagroSignalKind | null>(null)
  const scalesRef = useRef(new Map<string, number>())
  const positionsRef = useRef(new Map<string, Pos>())
  const startRef = useRef<number | null>(null)
  const rafRef = useRef(0)

  const nodeEls = useRef(new Map<string, SVGGElement | null>())
  const edgeEls = useRef(new Map<string, SVGLineElement | null>())
  const hitEls = useRef(new Map<string, HTMLButtonElement | null>())
  const chipEls = useRef(new Map<string, HTMLSpanElement | null>())
  const coreGRef = useRef<SVGGElement | null>(null)
  const popEl = useRef<HTMLDivElement | null>(null)

  stateRef.current = state
  hoverKindRef.current = hoverKind

  const resolved = useMemo(() => {
    const out = { ...DEFAULT_SIGNALS }
    if (signals) {
      for (const [k, v] of Object.entries(signals) as Array<[TagroSignalKind, TagroNodeSignal]>) {
        if (v) out[k] = { ...DEFAULT_SIGNALS[k], ...v }
      }
    }
    return out
  }, [signals])

  const initialPositions = useMemo(() => {
    const map = new Map<string, Pos>()
    map.set('c', { x: CX, y: CY, lx: CX, ly: CY + 36, size: 22 })
    for (const def of NODES) map.set(def.id, restPos(def))
    return map
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      reducedRef.current = mq.matches
      setReduced(mq.matches)
    }
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  useEffect(() => {
    for (const def of NODES) {
      if (!scalesRef.current.has(def.id)) scalesRef.current.set(def.id, 1)
    }
    if (!scalesRef.current.has('c')) scalesRef.current.set('c', 1)

    const applyFrame = (tSec: number) => {
      const breath = reducedRef.current ? 0 : breathForState(stateRef.current)
      const hover = hoverKindRef.current
      const map = positionsRef.current
      map.set('c', { x: CX, y: CY, lx: CX, ly: CY + 36, size: 22 })

      // Soft approach toward hover scale (no overshoot)
      const approach = (id: string, target: number) => {
        const cur = scalesRef.current.get(id) ?? 1
        const next = cur + (target - cur) * 0.14
        scalesRef.current.set(id, Math.abs(next - target) < 0.002 ? target : next)
        return scalesRef.current.get(id)!
      }

      const coreScale = approach('c', hover === 'core' ? 1.28 : 1)
      if (coreGRef.current) {
        coreGRef.current.setAttribute(
          'transform',
          `translate(${CX},${CY}) scale(${coreScale})`,
        )
      }
      const coreHit = hitEls.current.get('c')
      if (coreHit) {
        coreHit.style.transform = `translate(-50%, -50%) scale(${0.9 + coreScale * 0.25})`
      }

      for (const def of NODES) {
        const pos = livePos(def, tSec, breath)
        map.set(def.id, pos)
        const target =
          hover === def.kind ? 1.62 : hover && hover !== 'core' ? 0.9 : 1
        const scale = approach(def.id, target)

        const g = nodeEls.current.get(def.id)
        if (g) {
          g.setAttribute('transform', `translate(${pos.x},${pos.y}) scale(${scale})`)
        }

        const hit = hitEls.current.get(def.id)
        if (hit) {
          hit.style.left = `${(pos.x / VIEW_W) * 100}%`
          hit.style.top = `${(pos.y / VIEW_H) * 100}%`
          const hitScale = 0.85 + scale * 0.35
          hit.style.transform = `translate(-50%, -50%) scale(${hitScale})`
        }
        const chip = chipEls.current.get(def.id)
        if (chip) {
          chip.style.left = `${(pos.lx / VIEW_W) * 100}%`
          chip.style.top = `${(pos.ly / VIEW_H) * 100}%`
          chip.classList.toggle('is-hot', hover === def.kind)
        }
      }

      for (const [a, b] of SPOKES) {
        const pa = map.get(a)
        const pb = map.get(b)
        const line = edgeEls.current.get(`${a}-${b}`)
        if (!pa || !pb || !line) continue
        // Pull spoke end slightly toward scaled node surface
        const scale = scalesRef.current.get(b) ?? 1
        const def = NODES.find((n) => n.id === b)!
        const dx = pb.x - CX
        const dy = pb.y - CY
        const len = Math.hypot(dx, dy) || 1
        const pull = def.size * scale * 0.15
        line.setAttribute('x1', String(CX))
        line.setAttribute('y1', String(CY))
        line.setAttribute('x2', String(pb.x - (dx / len) * pull))
        line.setAttribute('y2', String(pb.y - (dy / len) * pull))
        line.classList.toggle('is-hot', hover === def.kind)
      }

      if (hover && popEl.current) {
        const id = hover === 'core' ? 'c' : NODES.find((n) => n.kind === hover)?.id
        const pos = id ? map.get(id) : null
        if (pos) {
          popEl.current.style.left = `${(pos.x / VIEW_W) * 100}%`
          popEl.current.style.top = `${(pos.y / VIEW_H) * 100}%`
        }
      }
    }

    positionsRef.current = new Map(initialPositions)
    applyFrame(0)

    // Always run the loop — reduced motion freezes float but keeps hover grow.
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      applyFrame((now - startRef.current) / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [initialPositions, reduced])

  // Keep hover scale responsive even when reduced motion freezes float
  useEffect(() => {
    hoverKindRef.current = hoverKind
  }, [hoverKind])

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
  const hoverPos = hoverId
    ? positionsRef.current.get(hoverId) || initialPositions.get(hoverId)
    : null

  return (
    <div
      className={`tlc ${className}`.trim()}
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
            <stop offset="0%" stopColor="rgba(40,48,70,0.22)" />
            <stop offset="70%" stopColor="rgba(40,48,70,0.06)" />
            <stop offset="100%" stopColor="rgba(40,48,70,0)" />
          </radialGradient>
          <filter id={`${uid}-soft`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}-bloom`} x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Quiet orbital guides — static, almost invisible */}
        <ellipse className="tlc-guide" cx={CX} cy={CY} rx={110} ry={96} />
        <ellipse className="tlc-guide tlc-guide--inner" cx={CX} cy={CY} rx={64} ry={56} />

        <g className="tlc-edges">
          {SPOKES.map(([a, b]) => {
            const pb = initialPositions.get(b)!
            return (
              <line
                key={`${a}-${b}`}
                ref={(el) => {
                  edgeEls.current.set(`${a}-${b}`, el)
                }}
                className="tlc-edge"
                x1={CX}
                y1={CY}
                x2={pb.x}
                y2={pb.y}
              />
            )
          })}
        </g>

        <g className="tlc-nodes" filter={`url(#${uid}-soft)`}>
          {NODES.map((def) => {
            const sig = resolved[def.kind]
            const accent = sig.accent || ((sig.count || 0) > 0 ? 'attention' : 'calm')
            const hot = hoverKind === def.kind
            const lit = (sig.count || 0) > 0 || accent !== 'calm'
            return (
              <g
                key={def.id}
                ref={(el) => {
                  nodeEls.current.set(def.id, el)
                }}
                className={`tlc-node-g is-${accent}${hot ? ' is-hot' : ''}${lit ? ' is-lit' : ''}`}
                transform={`translate(${initialPositions.get(def.id)!.x},${initialPositions.get(def.id)!.y})`}
              >
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
                <circle className="tlc-node-spec" cx={-def.size * 0.28} cy={-def.size * 0.32} r={def.size * 0.28} />
              </g>
            )
          })}

          <g
            ref={coreGRef}
            className={`tlc-core-g${hoverKind === 'core' ? ' is-hot' : ''}`}
            filter={`url(#${uid}-bloom)`}
            transform={`translate(${CX},${CY})`}
          >
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
      </svg>

      <div className="tlc-hits">
        <div className="tlc-anchor">
          <button
            type="button"
            ref={(el) => {
              hitEls.current.set('c', el)
            }}
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
          const pos = initialPositions.get(def.id)!
          const sig = resolved[def.kind]
          const showCount = typeof sig.count === 'number' && sig.count > 0
          return (
            <div key={def.id} className="tlc-anchor">
              <button
                type="button"
                ref={(el) => {
                  hitEls.current.set(def.id, el)
                }}
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
                ref={(el) => {
                  chipEls.current.set(def.id, el)
                }}
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
          ref={popEl}
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
