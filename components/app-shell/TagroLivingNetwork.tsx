'use client'

/**
 * Tagro Living Network — Overview visual identity.
 * Idle = silence (disconnected nodes). Motion only when context requires it.
 * Spec: docs / mock Living Network Interface.
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
  x: number
  y: number
  Icon: typeof FolderSimple
}

/** Organic scatter matching Living Network mock */
const NODES: NodeDef[] = [
  { kind: 'document', x: 24, y: 26, Icon: FileText },
  { kind: 'github', x: 16, y: 48, Icon: GithubLogo },
  { kind: 'developer', x: 26, y: 70, Icon: Code },
  { kind: 'client', x: 44, y: 80, Icon: User },
  { kind: 'decision', x: 74, y: 36, Icon: CheckCircle },
  { kind: 'project', x: 82, y: 56, Icon: FolderSimple },
  { kind: 'deployment', x: 70, y: 76, Icon: RocketLaunch },
  { kind: 'automation', x: 60, y: 20, Icon: Lightning },
]

const CX = 48
const CY = 46

export default function TagroLivingNetwork({
  active,
  className = '',
  onNodeActivate,
  onCoreActivate,
}: Props) {
  const activeNode = useMemo(
    () => (active ? NODES.find((n) => n.kind === active.kind) : null),
    [active],
  )

  const line = useMemo(() => {
    if (!activeNode) return null
    return { x1: CX, y1: CY, x2: activeNode.x, y2: activeNode.y }
  }, [activeNode])

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

      <svg className="tln-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {line ? (
          <line
            key={`${active?.kind}-${active?.label}`}
            className="tln-link"
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
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
          width={26}
          height={26}
        />
      </button>

      {NODES.map((node) => {
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
            <span className="tln-node-orb">
              <Icon
                className="tln-node-icon"
                size={isHot ? 15 : 13}
                weight={isHot ? 'fill' : 'regular'}
              />
            </span>
          </button>
        )
      })}

      {active && activeNode ? (
        <div
          className="tln-label"
          style={{
            left: `${Math.min(activeNode.x + 6.5, 84)}%`,
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
