'use client'

/**
 * Tagro Living Core — living orbital intelligence for Overview.
 * Soft glass orbs drift on calm orbits; edges breathe; hover reveals signals.
 * Motion runs via rAF + DOM mutation (no React re-render per frame).
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

type OrbitDef = {
  id: string
  kind: TagroSignalKind
  angle: number
  radius: number
  size: number
  speed: number
  squash: number
  wobble: number
  labelDist: number
}

const CX = 200
const CY = 148
const VIEW_W = 400
const VIEW_H = 300

const ORBITS: OrbitDef[] = [
  { id: 'n1', kind: 'decisions', angle: -2.35, radius: 92, size: 7.5, speed: 0.11, squash: 0.86, wobble: 4, labelDist: 22 },
  { id: 'n2', kind: 'risks', angle: -1.05, radius: 98, size: 6.8, speed: 0.09, squash: 0.86, wobble: 5, labelDist: 22 },
  { id: 'n3', kind: 'projects', angle: 0.15, radius: 104, size: 8.2, speed: 0.08, squash: 0.86, wobble: 3.5, labelDist: 24 },
  { id: 'n4', kind: 'tasks', angle: 1.2, radius: 96, size: 6.4, speed: 0.12, squash: 0.86, wobble: 4.5, labelDist: 22 },
  { id: 'n5', kind: 'activity', angle: 2.2, radius: 90, size: 7.2, speed: 0.1, squash: 0.86, wobble: 4, labelDist: 22 },
  { id: 'n6', kind: 'team', angle: 2.95, radius: 88, size: 6, speed: 0.13, squash: 0.86, wobble: 3.8, labelDist: 22 },
  { id: 'n7', kind: 'milestone', angle: -1.75, radius: 72, size: 5.2, speed: -0.14, squash: 0.9, wobble: 3, labelDist: 20 },
  { id: 'n8', kind: 'briefing', angle: 0.75, radius: 58, size: 5, speed: 0.16, squash: 0.92, wobble: 2.5, labelDist: 18 },
]

const CORE_EDGES: Array<[string, string]> = ORBITS.map((o) => ['c', o.id])
const RING_EDGES: Array<[string, string]> = [
  ['n1', 'n2'],
  ['n2', 'n3'],
  ['n3', 'n4'],
  ['n4', 'n5'],
  ['n5', 'n6'],
  ['n6', 'n1'],
  ['n7', 'n1'],
  ['n7', 'n2'],
  ['n8', 'n3'],
  ['n8', 'n4'],
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

function positionAt(def: OrbitDef, tSec: number, speedMul: number): Pos {
  const a = def.angle + tSec * def.speed * speedMul
  const wob = Math.sin(tSec * 0.7 + def.angle * 2) * def.wobble
  const r = def.radius + wob
  const x = CX + Math.cos(a) * r
  const y = CY + Math.sin(a) * r * def.squash
  const lx = CX + Math.cos(a) * (r + def.labelDist)
  const ly = CY + Math.sin(a) * (r + def.labelDist) * def.squash
  return { x, y, lx, ly, size: def.size }
}

function speedForState(state: TagroLivingState): number {
  if (state === 'audio' || state === 'speaking') return 1.55
  if (state === 'listening') return 0.55
  if (state === 'blocked') return 0.35
  if (state === 'attention') return 0.85
  return 0.65
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
  const positionsRef = useRef<Map<string, Pos>>(new Map())
  const startRef = useRef<number | null>(null)
  const rafRef = useRef(0)

  const nodeEls = useRef(new Map<string, SVGGElement | null>())
  const edgeEls = useRef(new Map<string, SVGLineElement | null>())
  const particleEls = useRef(new Map<string, SVGCircleElement | null>())
  const hitEls = useRef(new Map<string, HTMLButtonElement | null>())
  const chipEls = useRef(new Map<string, HTMLSpanElement | null>())
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
    map.set('c', { x: CX, y: CY, lx: CX, ly: CY + 34, size: 20 })
    for (const def of ORBITS) {
      map.set(def.id, positionAt(def, 0, speedForState(state)))
    }
    return map
  }, [state])

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
    const applyFrame = (tSec: number) => {
      const speedMul = speedForState(stateRef.current)
      const map = positionsRef.current
      map.set('c', { x: CX, y: CY, lx: CX, ly: CY + 34, size: 20 })

      for (const def of ORBITS) {
        const pos = positionAt(def, tSec, speedMul)
        map.set(def.id, pos)

        const g = nodeEls.current.get(def.id)
        if (g) {
          const halo = g.querySelector('.tlc-node-halo') as SVGCircleElement | null
          const node = g.querySelector('.tlc-node') as SVGCircleElement | null
          if (halo) {
            halo.setAttribute('cx', String(pos.x))
            halo.setAttribute('cy', String(pos.y))
          }
          if (node) {
            node.setAttribute('cx', String(pos.x))
            node.setAttribute('cy', String(pos.y))
          }
        }

        const hit = hitEls.current.get(def.id)
        if (hit) {
          hit.style.left = `${(pos.x / VIEW_W) * 100}%`
          hit.style.top = `${(pos.y / VIEW_H) * 100}%`
        }
        const chip = chipEls.current.get(def.id)
        if (chip) {
          chip.style.left = `${(pos.lx / VIEW_W) * 100}%`
          chip.style.top = `${(pos.ly / VIEW_H) * 100}%`
        }
      }

      for (const [a, b] of [...CORE_EDGES, ...RING_EDGES]) {
        const pa = map.get(a)
        const pb = map.get(b)
        const line = edgeEls.current.get(`${a}-${b}`)
        if (!pa || !pb || !line) continue
        line.setAttribute('x1', String(pa.x))
        line.setAttribute('y1', String(pa.y))
        line.setAttribute('x2', String(pb.x))
        line.setAttribute('y2', String(pb.y))
      }

      CORE_EDGES.forEach(([a, b], i) => {
        const pa = map.get(a)
        const pb = map.get(b)
        const dot = particleEls.current.get(b)
        if (!pa || !pb || !dot) return
        const p = (Math.sin(tSec * 0.9 + i * 0.85) + 1) / 2
        dot.setAttribute('cx', String(pa.x + (pb.x - pa.x) * p))
        dot.setAttribute('cy', String(pa.y + (pb.y - pa.y) * p))
      })

      const hk = hoverKindRef.current
      if (hk && popEl.current) {
        const id = hk === 'core' ? 'c' : ORBITS.find((n) => n.kind === hk)?.id
        const pos = id ? map.get(id) : null
        if (pos) {
          popEl.current.style.left = `${(pos.x / VIEW_W) * 100}%`
          popEl.current.style.top = `${(pos.y / VIEW_H) * 100}%`
        }
      }
    }

    positionsRef.current = new Map(initialPositions)
    applyFrame(0)

    if (reducedRef.current) return

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      applyFrame((now - startRef.current) / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [initialPositions, reduced])

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
    hoverKind === 'core' ? 'c' : hoverKind ? ORBITS.find((n) => n.kind === hoverKind)?.id : null
  const hoverPos = hoverId ? positionsRef.current.get(hoverId) || initialPositions.get(hoverId) : null

  return (
    <div
      className={`tlc ${className}`.trim()}
      data-state={state}
      aria-label={ariaLabel}
      onMouseLeave={() => setHoverKind(null)}
    >
      <div className="tlc-aura" aria-hidden />
      <div className="tlc-aura tlc-aura--soft" aria-hidden />

      <svg
        className="tlc-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}-core`} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="rgba(255,255,255,1)" />
            <stop offset="42%" stopColor="rgba(220,226,238,0.88)" />
            <stop offset="78%" stopColor="rgba(130,142,170,0.42)" />
            <stop offset="100%" stopColor="rgba(91,100,125,0.12)" />
          </radialGradient>
          <radialGradient id={`${uid}-node`} cx="32%" cy="28%" r="72%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
            <stop offset="55%" stopColor="rgba(200,208,224,0.75)" />
            <stop offset="100%" stopColor="rgba(120,132,158,0.38)" />
          </radialGradient>
          <radialGradient id={`${uid}-node-hot`} cx="32%" cy="28%" r="72%">
            <stop offset="0%" stopColor="rgba(255,255,255,1)" />
            <stop offset="50%" stopColor="rgba(186,194,210,0.9)" />
            <stop offset="100%" stopColor="rgba(91,100,125,0.55)" />
          </radialGradient>
          <linearGradient id={`${uid}-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(91,100,125,0.05)" />
            <stop offset="50%" stopColor="rgba(91,100,125,0.42)" />
            <stop offset="100%" stopColor="rgba(91,100,125,0.05)" />
          </linearGradient>
          <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}-bloom`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="tlc-guide" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <ellipse className="tlc-guide-ring" cx={CX} cy={CY} rx={96} ry={82} />
          <ellipse className="tlc-guide-ring tlc-guide-ring--inner" cx={CX} cy={CY} rx={62} ry={54} />
        </g>

        <g className="tlc-edges">
          {[...CORE_EDGES, ...RING_EDGES].map(([a, b]) => {
            const pa = initialPositions.get(a)!
            const pb = initialPositions.get(b)!
            const isCore = a === 'c' || b === 'c'
            return (
              <line
                key={`${a}-${b}`}
                ref={(el) => {
                  edgeEls.current.set(`${a}-${b}`, el)
                }}
                className={`tlc-edge${isCore ? ' is-spoke' : ' is-ring'}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={`url(#${uid}-edge)`}
              />
            )
          })}
        </g>

        <g className="tlc-particles">
          {CORE_EDGES.map(([, b]) => {
            const pb = initialPositions.get(b)!
            return (
              <circle
                key={`p-${b}`}
                ref={(el) => {
                  particleEls.current.set(b, el)
                }}
                className="tlc-particle"
                cx={pb.x}
                cy={pb.y}
                r={1.35}
              />
            )
          })}
        </g>

        <g className="tlc-nodes" filter={`url(#${uid}-soft)`}>
          {ORBITS.map((def) => {
            const pos = initialPositions.get(def.id)!
            const sig = resolved[def.kind]
            const accent = sig.accent || ((sig.count || 0) > 0 ? 'attention' : 'calm')
            const hot = hoverKind === def.kind
            return (
              <g
                key={def.id}
                ref={(el) => {
                  nodeEls.current.set(def.id, el)
                }}
                className={`tlc-node-g is-${accent}${hot ? ' is-hot' : ''}`}
              >
                {(sig.count || 0) > 0 || accent !== 'calm' ? (
                  <circle className="tlc-node-halo" cx={pos.x} cy={pos.y} r={pos.size + 5} />
                ) : null}
                <circle
                  className="tlc-node"
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.size}
                  fill={hot ? `url(#${uid}-node-hot)` : `url(#${uid}-node)`}
                />
              </g>
            )
          })}

          <g className="tlc-core-g" filter={`url(#${uid}-bloom)`}>
            <circle className="tlc-core-halo" cx={CX} cy={CY} r={36} />
            <circle className="tlc-core-ring" cx={CX} cy={CY} r={30} />
            <circle className="tlc-core-ring tlc-core-ring--mid" cx={CX} cy={CY} r={24} />
            <circle className="tlc-core" cx={CX} cy={CY} r={18} fill={`url(#${uid}-core)`} />
            <circle className="tlc-core-spec" cx={CX - 5} cy={CY - 6} r={4.5} />
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
            style={{ left: `${(CX / VIEW_W) * 100}%`, top: `${((CY + 34) / VIEW_H) * 100}%` }}
            onMouseEnter={() => setHoverKind('core')}
          >
            <span className="tlc-chip-label">Tagro</span>
          </span>
        </div>

        {ORBITS.map((def) => {
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
