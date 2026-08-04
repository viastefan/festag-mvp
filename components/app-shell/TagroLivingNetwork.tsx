'use client'

/**
 * @deprecated Overview identity is Decision Canvas (v3.9).
 * Kept for reference / possible future constellation views.
 * Do not mount on /overview.
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
  angle: number
  radius: number
  Icon: typeof FolderSimple
}

const NODES: NodeDef[] = [
  { kind: 'document', angle: -145, radius: 34, Icon: FileText },
  { kind: 'github', angle: -105, radius: 36, Icon: GithubLogo },
  { kind: 'automation', angle: -55, radius: 33, Icon: Lightning },
  { kind: 'decision', angle: -8, radius: 35, Icon: CheckCircle },
  { kind: 'project', angle: 32, radius: 36, Icon: FolderSimple },
  { kind: 'deployment', angle: 78, radius: 34, Icon: RocketLaunch },
  { kind: 'client', angle: 128, radius: 35, Icon: User },
  { kind: 'developer', angle: 175, radius: 33, Icon: Code },
]

const CX = 50
const CY = 44

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
  }
}

/** @deprecated */
export default function TagroLivingNetwork({
  active,
  className = '',
  onNodeActivate,
  onCoreActivate,
}: Props) {
  const placed = useMemo(
    () => NODES.map((n) => ({ ...n, ...polar(n.angle, n.radius) })),
    [],
  )
  const activeNode = useMemo(
    () => (active ? placed.find((n) => n.kind === active.kind) : null),
    [active, placed],
  )

  return (
    <div
      className={`tln${active ? ' is-active' : ' is-idle'} ${className}`.trim()}
      aria-label="Deprecated Living Network"
    >
      <button
        type="button"
        className="tln-core"
        style={{ left: `${CX}%`, top: `${CY}%` }}
        aria-label="Tagro"
        onClick={() => onCoreActivate?.()}
      >
        <span className="tln-core-disc" aria-hidden />
      </button>
      {placed.map((node) => {
        const isHot = active?.kind === node.kind
        const Icon = node.Icon
        return (
          <button
            key={node.kind}
            type="button"
            className={`tln-node${isHot ? ' is-hot' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            aria-label={node.kind}
            onClick={() => onNodeActivate?.(node.kind)}
          >
            <span className="tln-node-orb">
              <Icon size={14} weight="regular" />
            </span>
          </button>
        )
      })}
      {active && activeNode ? (
        <div
          className="tln-label"
          style={{ left: `${activeNode.x + 6}%`, top: `${activeNode.y}%` }}
        >
          <p className="tln-label-title">{active.label}</p>
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
