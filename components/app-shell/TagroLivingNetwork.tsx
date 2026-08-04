'use client'

/**
 * Tagro Living Network — Overview identity (mock-faithful).
 * Center Tagro orb · peripheral icon nodes · faint idle spokes ·
 * one blue active path when context requires attention.
 */

import { useMemo } from 'react'
import {
  CheckCircle,
  Code,
  FileText,
  FolderSimple,
  GithubLogo,
  Lightning,
  RocketLaunch,
  User,
} from '@phosphor-icons/react'

export type NetworkNodeKind =
  | 'decision'
  | 'project'
  | 'developer'
  | 'github'
  | 'automation'
  | 'document'
  | 'deployment'
  | 'client'

export type NetworkActive = {
  kind: NetworkNodeKind
  label: string
  sublabel?: string
} | null

type Props = {
  active: NetworkActive
  className?: string
  onNodeActivate?: (kind: NetworkNodeKind) => void
  onCoreActivate?: () => void
}

type NodeDef = {
  kind: NetworkNodeKind
  /** angle in degrees, 0 = east, CCW */
  angle: number
  radius: number
  Icon: typeof FolderSimple
}

/** Ring layout matching Living Network mock */
const NODES: NodeDef[] = [
  { kind: 'automation', angle: -70, radius: 38, Icon: Lightning },
  { kind: 'document', angle: -130, radius: 40, Icon: FileText },
  { kind: 'github', angle: -170, radius: 36, Icon: GithubLogo },
  { kind: 'developer', angle: 155, radius: 39, Icon: Code },
  { kind: 'client', angle: 115, radius: 37, Icon: User },
  { kind: 'deployment', angle: 70, radius: 40, Icon: RocketLaunch },
  { kind: 'project', angle: 25, radius: 38, Icon: FolderSimple },
  { kind: 'decision', angle: -15, radius: 39, Icon: CheckCircle },
]

const CX = 50
const CY = 46

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
  }
}

export default function TagroLivingNetwork({
  active,
  className = '',
  onNodeActivate,
  onCoreActivate,
}: Props) {
  const placed = useMemo(
    () =>
      NODES.map((n) => ({
        ...n,
        ...polar(n.angle, n.radius),
      })),
    [],
  )

  const activeNode = useMemo(
    () => (active ? placed.find((n) => n.kind === active.kind) : null),
    [active, placed],
  )

  return (
    <div
      className={`tln${active ? ' is-active' : ' is-idle'} ${className}`.trim()}
      data-active={active?.kind || 'none'}
      aria-label={
        active
          ? `Tagro verbunden mit ${active.label}`
          : 'Tagro Living Network — ruhig'
      }
    >
      <div className="tln-grid" aria-hidden />

      <svg className="tln-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <g className="tln-spokes">
          {placed.map((node) => {
            const hot = active?.kind === node.kind
            return (
              <line
                key={`spoke-${node.kind}`}
                className={`tln-spoke${hot ? ' is-hot' : ''}`}
                x1={CX}
                y1={CY}
                x2={node.x}
                y2={node.y}
              />
            )
          })}
        </g>
        {activeNode ? (
          <line
            key={`hot-${active?.kind}`}
            className="tln-link"
            x1={CX}
            y1={CY}
            x2={activeNode.x}
            y2={activeNode.y}
          />
        ) : null}
      </svg>

      <button
        type="button"
        className="tln-core"
        style={{ left: `${CX}%`, top: `${CY}%` }}
        aria-label="Tagro"
        onClick={() => onCoreActivate?.()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="tln-core-mark"
          src="/brand/festag-mark-fluid.png?v=20260731"
          alt=""
          width={28}
          height={28}
        />
      </button>

      {placed.map((node) => {
        const isHot = active?.kind === node.kind
        const Icon = node.Icon
        return (
          <button
            key={node.kind}
            type="button"
            className={`tln-node${isHot ? ' is-hot' : ''}${active && !isHot ? ' is-dim' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            aria-label={node.kind}
            aria-pressed={isHot}
            onClick={() => onNodeActivate?.(node.kind)}
          >
            {isHot ? <span className="tln-node-glow" aria-hidden /> : null}
            <span className="tln-node-orb">
              <Icon size={isHot ? 16 : 14} weight={isHot ? 'fill' : 'regular'} />
            </span>
          </button>
        )
      })}

      {active && activeNode ? (
        <div
          className="tln-label"
          style={{
            left: `${Math.min(activeNode.x + 5.5, 82)}%`,
            top: `${activeNode.y}%`,
          }}
        >
          <p className="tln-label-title">{active.label}</p>
          {active.sublabel ? <p className="tln-label-sub">{active.sublabel}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function deriveNetworkActive(input: {
  pendingDecisions: number
  decisionTitle?: string | null
  activeProjects: number
  riskCount: number
}): NetworkActive {
  if (input.pendingDecisions > 0) {
    return {
      kind: 'decision',
      label: input.decisionTitle || 'Entscheidung',
      sublabel: 'Entscheidung erforderlich',
    }
  }
  if (input.activeProjects === 0) {
    return {
      kind: 'project',
      label: 'Erstes Projekt',
      sublabel: 'Bereit zum Start',
    }
  }
  if (input.riskCount > 0) {
    return {
      kind: 'deployment',
      label: 'Aufmerksamkeit',
      sublabel: 'Risiko erkannt',
    }
  }
  return null
}
