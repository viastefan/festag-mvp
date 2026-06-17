'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive, ChatCircleText, Lightning, Sparkle, Trash, WarningCircle,
} from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import ClampedTip from '@/components/decisions/ClampedTip'
import DecisionExternalHandoffModal from '@/components/decisions/DecisionExternalHandoffModal'
import { openTagro } from '@/components/TagroOverlay'
import type { ExternalHandoff } from '@/lib/decisions/external-handoffs'
import { resolvePrimaryHandoff } from '@/lib/decisions/external-handoffs'
import type { Decision, ProjectLite } from '@/components/decisions/decisions-shared'
import {
  OPEN_STATES, URGENCY_LABEL, impactLine, listStatusLabel, resolveDecisionType, tagroSummaryLine,
  urgencyDotColor, isOpenDecisionStatus,
} from '@/components/decisions/decisions-shared'

export function capitalizeDE(s: string): string {
  const t = (s || '').trim()
  if (!t) return t
  return t.charAt(0).toLocaleUpperCase('de-DE') + t.slice(1)
}

type Props = {
  decision: Decision
  project: ProjectLite | null
  isLast?: boolean
  onPatch: (id: string, patch: Partial<Decision>) => void
  onRemove: (id: string) => void
}

type MenuAction = {
  id: string
  label: string
  icon: React.ReactNode
  tone?: 'danger'
  onClick: () => void | Promise<void>
}

export default function DecisionCardRow({
  decision: d,
  project: proj,
  isLast,
  onPatch,
  onRemove,
}: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [handoff, setHandoff] = useState<ExternalHandoff | null>(null)
  const menuWrapRef = useRef<HTMLDivElement>(null)

  const displayTitle = d.client_title || d.title
  const isOpen = isOpenDecisionStatus(d.status)
  const isAnswered = d.status === 'decided' || d.status === 'applied'
  const tagroText = tagroSummaryLine(d)
  const impactText = impactLine(d)
  const timeNeeded = d.response_type === 'multi_choice' ? '2 Minuten' : '30 Sekunden'

  const rawPrimary = isAnswered
    ? (d.selected_option || 'Entschieden')
    : d.recommended_option && d.recommended_option !== 'freeform'
      ? d.recommended_option
      : 'Freigeben'
  const primaryLabel = capitalizeDE(rawPrimary)
  const secondaryLabel = d.response_type === 'binary' ? 'Ablehnen' : 'Optionen'
  const typeMeta = resolveDecisionType(d.decision_type)

  const isMock = d.id.startsWith('mock-')
  const canDelegate =
    !!d.delegate_allowed &&
    d.reversibility === 'two_way_door' &&
    d.response_type !== 'free_text' &&
    !isAnswered &&
    isOpen

  const showPrioWarn =
    (d.urgency === 'critical' || (d.escalation_level ?? 0) >= 2) && isOpen

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function openTagroForDecision() {
    setMenuOpen(false)
    openTagro({
      contextType: 'decision',
      id: d.id,
      title: displayTitle,
      subtitle: proj?.title,
      status: d.status,
      projectId: d.project_id ?? proj?.id,
    })
  }

  async function runAction(fn: () => void | Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
      setMenuOpen(false)
    }
  }

  async function markUrgent() {
    if (isMock) {
      onPatch(d.id, { urgency: 'critical' })
      return
    }
    const res = await fetch(`/api/decisions/${d.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urgency: 'critical' }),
    })
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    if (data?.decision) onPatch(d.id, data.decision)
    else onPatch(d.id, { urgency: 'critical' })
  }

  async function archiveDecision() {
    if (isMock) {
      onPatch(d.id, { status: 'archived' })
      return
    }
    const res = await fetch(`/api/decisions/${d.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    if (data?.decision) onPatch(d.id, data.decision)
    else onPatch(d.id, { status: 'archived' })
  }

  async function cancelDecision() {
    if (isMock) {
      onRemove(d.id)
      return
    }
    const res = await fetch(`/api/decisions/${d.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) return
    onRemove(d.id)
  }

  async function delegateToTagro() {
    if (isMock) {
      onPatch(d.id, { status: 'decided', tagro_delegation_reason: 'Tagro hat diese Entscheidung übernommen.' })
      return
    }
    const res = await fetch(`/api/decisions/${d.id}/delegate`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    if (data?.decision) onPatch(d.id, data.decision)
  }

  const menuActions: MenuAction[] = [
    {
      id: 'tagro',
      label: 'Mit Tagro bearbeiten',
      icon: <Lightning size={14} weight="regular" />,
      onClick: openTagroForDecision,
    },
    ...(canDelegate ? [{
      id: 'delegate',
      label: 'Tagro entscheiden lassen',
      icon: <Sparkle size={14} weight="fill" />,
      onClick: () => runAction(delegateToTagro),
    }] : []),
    {
      id: 'discuss',
      label: 'Rückfrage stellen',
      icon: <ChatCircleText size={14} weight="regular" />,
      onClick: () => {
        setMenuOpen(false)
        router.push(`/decisions/${d.id}?discuss=1`)
      },
    },
    ...(isOpen && !isAnswered ? [{
      id: 'urgent',
      label: 'Als dringend markieren',
      icon: <WarningCircle size={14} weight="fill" />,
      onClick: () => runAction(markUrgent),
    }] : []),
    {
      id: 'archive',
      label: 'Archivieren',
      icon: <Archive size={14} weight="regular" />,
      onClick: () => runAction(archiveDecision),
    },
    ...(isOpen ? [{
      id: 'cancel',
      label: 'Entscheidung abbrechen',
      icon: <Trash size={14} weight="regular" />,
      tone: 'danger' as const,
      onClick: () => runAction(cancelDecision),
    }] : []),
  ]

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(v => !v)
  }

  async function confirmHandoffChoice(active: ExternalHandoff) {
    if (isMock) {
      onPatch(d.id, {
        status: 'decided',
        selected_option: active.optionId,
        decided_at: new Date().toISOString(),
      })
      return
    }
    const res = await fetch(`/api/decisions/${d.id}/decide`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_value: { selected_option_id: active.optionId },
        rationale: `Einrichtung in ${active.providerLabel} bestätigt.`,
        selected_option: active.optionId,
      }),
    })
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    if (data?.decision) onPatch(d.id, data.decision)
    else onPatch(d.id, { status: 'decided', selected_option: active.optionId })
  }

  async function handlePrimaryClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isOpen || isAnswered) {
      router.push(`/decisions/${d.id}`)
      return
    }

    let resolved = resolvePrimaryHandoff(d, null)
    if (!resolved && !isMock) {
      const res = await fetch(
        `/api/decisions/${d.id}/handoff?option=${encodeURIComponent(rawPrimary)}`,
        { credentials: 'include' },
      )
      const data = await res.json().catch(() => null)
      resolved = data?.handoff ?? null
    }

    if (resolved) {
      setHandoff(resolved)
      return
    }
    router.push(`/decisions/${d.id}`)
  }

  return (
    <div>
      <div
        className="dec-card"
        role="link"
        tabIndex={0}
        aria-label={`${displayTitle} — Details öffnen`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a, button, .dec-card-menu')) return
          router.push(`/decisions/${d.id}`)
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          router.push(`/decisions/${d.id}`)
        }}
      >
        <div className="dec-card-left">
          <div className="dec-card-title-block">
            <p className="dec-card-title">{displayTitle}</p>
            <p className="dec-card-project">{proj?.title || '—'}</p>
          </div>
          <div
            className="dec-card-type-pill"
            style={{ ['--dec-dot-color' as string]: typeMeta.color }}
          >
            <span className="dec-card-dot" aria-hidden />
            {d.decision_type ? typeMeta.label : listStatusLabel(d)}
          </div>
        </div>

        <div className="dec-card-mid">
          <div className="dec-card-section">
            <p className="dec-card-label">Tagro empfiehlt</p>
            <ClampedTip text={tagroText} lines={2} />
          </div>
          <div className="dec-card-section">
            <p className="dec-card-label">Auswirkung</p>
            <ClampedTip text={impactText} lines={2} />
          </div>
        </div>

        <div className="dec-card-meta">
          <div className="dec-card-section">
            <p className="dec-card-label">Benötigte Zeit</p>
            <p className="dec-card-muted">{timeNeeded}</p>
          </div>
          <div className="dec-card-section">
            <p className="dec-card-label">Priorität</p>
            <span
              className="dec-card-prio-pill"
              style={{ ['--dec-dot-color' as string]: urgencyDotColor(d.urgency) }}
            >
              {showPrioWarn ? (
                <WarningCircle size={12} weight="fill" className="dec-card-prio-warn" />
              ) : (
                <span className="dec-card-dot dec-card-dot--prio" aria-hidden />
              )}
              {URGENCY_LABEL[d.urgency] || 'Normal'}
            </span>
          </div>
        </div>

        <div className="dec-card-actions" ref={menuWrapRef}>
          <button className="dec-card-dots" type="button" onClick={toggleMenu} aria-label="Weitere Aktionen" aria-expanded={menuOpen}>
            <svg width="3" height="14" viewBox="0 0 3 14" fill="none" aria-hidden>
              <circle cx="1.5" cy="2" r="1.5" fill="currentColor" />
              <circle cx="1.5" cy="7" r="1.5" fill="currentColor" />
              <circle cx="1.5" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </button>

          {menuOpen && (
            <div className="dec-card-menu" role="menu" aria-label="Entscheidungsaktionen">
              {menuActions.map(action => (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  className={`dec-card-menu-item${action.tone === 'danger' ? ' is-danger' : ''}`}
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    void runAction(action.onClick)
                  }}
                >
                  <span className="dec-card-menu-icon">{action.icon}</span>
                  <span className="dec-card-menu-label">{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {isOpen && !isAnswered && (
            <FestagPillButton
              block
              variant="primary"
              onClick={handlePrimaryClick}
            >
              {primaryLabel}
            </FestagPillButton>
          )}
          {isOpen && !isAnswered && (
            <FestagPillButton
              block
              onClick={toggleMenu}
              aria-expanded={menuOpen}
            >
              {secondaryLabel}
            </FestagPillButton>
          )}
          <Link
            className="fui-pill-btn fui-pill-btn--block"
            href={`/decisions/${d.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            Details
          </Link>
        </div>
      </div>
      {handoff && (
        <DecisionExternalHandoffModal
          handoff={handoff}
          decisionTitle={displayTitle}
          projectTitle={proj?.title}
          onClose={() => setHandoff(null)}
          onConfirm={() => confirmHandoffChoice(handoff)}
        />
      )}
      {!isLast && <div className="dec-divider-gradient" />}
    </div>
  )
}
