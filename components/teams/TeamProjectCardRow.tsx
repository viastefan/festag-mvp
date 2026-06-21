'use client'

import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import ClampedTip from '@/components/decisions/ClampedTip'

type Props = {
  project: { id: string; title: string; color?: string | null; status?: string | null }
  ownerName: string
  teamLabel: string
  openCount: number
  coverage: string
  blocked: number
  isLast?: boolean
}

export default function TeamProjectCardRow({
  project,
  ownerName,
  teamLabel,
  openCount,
  coverage,
  blocked,
  isLast,
}: Props) {
  return (
    <Link
      href={`/project/${project.id}`}
      className="dec-card team-panel-row"
      style={isLast ? { borderBottom: 'none' } : undefined}
    >
      <div className="dec-card-left">
        <div className="dec-card-title-block">
          <p className="dec-card-title">{project.title}</p>
          <p className="dec-card-project">{project.status || 'intake'} · {blocked} Blocker</p>
        </div>
        <span className="dec-card-type-pill">
          <span className="dec-card-dot" style={{ background: project.color || '#94a3b8' }} />
          Projekt
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Owner</span>
          <ClampedTip text={ownerName} className="dec-card-muted" lines={1} />
        </div>
        <div className="dec-card-section">
          <span className="dec-card-label">Team</span>
          <ClampedTip text={teamLabel} className="dec-card-muted" lines={1} />
        </div>
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Offen</span>
          <span className="dec-card-muted">{openCount} Tasks</span>
        </div>
        <span className="dec-card-prio-pill">{coverage}</span>
      </div>

      <div className="dec-card-actions team-panel-arrow">
        <ArrowRight size={16} />
      </div>
    </Link>
  )
}
