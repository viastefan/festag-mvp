'use client'

/**
 * DashboardMobileStart — mobile Statusabfrage, Figma 252:59.
 * Light Gesamtbericht screen: Aeonik header, teleprompter, bottom sheet
 * with decisions/blockers + dock (Statusbericht erstellen · Play).
 */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CaretUp, Check, Pause, Play, Plus } from '@phosphor-icons/react'
import { getVoicePreferences } from '@/lib/voice'
import { openTagro } from '@/components/TagroOverlay'
import TagroDiamondDots from '@/components/dashboard/TagroDiamondDots'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { DASHBOARD_MOBILE_CSS } from '@/components/dashboard/dashboard-mobile-styles'
import type { PendingApproval } from '@/lib/client/pending-approvals'
import type { ClientActivityItem } from '@/lib/client/client-activity'
import type { ClientDeliverable } from '@/lib/client/deliverables'

type ScopeOption = { id: string; label: string; color?: string | null }

type Props = {
  sentences: string[]
  busy?: boolean
  openDecisionsCount: number
  pendingApprovalCount?: number
  pendingApprovals?: PendingApproval[]
  clientActivity?: ClientActivityItem[]
  clientDeliverables?: ClientDeliverable[]
  blockersCount: number
  scopeLabel: string
  scopeOptions?: ScopeOption[]
  activeScopeId?: string
  onScopeChange?: (id: string) => void
  periodLabel?: string
  periodOptions?: string[]
  onPeriodChange?: (p: string) => void
  onCreateReport: () => void
}

function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  const prefs = getVoicePreferences()
  if (prefs.voiceId) {
    const exact = voices.find(v => `${v.name}__${v.lang}` === prefs.voiceId)
    if (exact) return exact
  }
  return [...voices]
    .filter(v => v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => Number(b.localService) - Number(a.localService))[0] ?? null
}

function bindDragUp(onDragUp: () => void) {
  return (e: React.TouchEvent) => {
    const startY = e.touches[0].clientY
    const onMove = (ev: TouchEvent) => {
      if (startY - ev.touches[0].clientY > 40) {
        onDragUp()
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchend', onEnd)
      }
    }
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { once: true })
  }
}

export default function DashboardMobileStart({
  sentences,
  busy,
  openDecisionsCount,
  pendingApprovalCount = 0,
  pendingApprovals = [],
  clientActivity = [],
  clientDeliverables = [],
  blockersCount,
  scopeLabel,
  scopeOptions = [],
  activeScopeId,
  onScopeChange,
  periodLabel,
  periodOptions = [],
  onPeriodChange,
  onCreateReport,
}: Props) {
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const hasText = sentences.length > 0
  const speaking = playing || !!busy
  const displayActive = (playing || paused) && active >= 0 ? active : -1

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => {
      document.body.classList.toggle('festag-dashboard-mobile', mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      document.body.classList.remove('festag-dashboard-mobile')
    }
  }, [])

  useEffect(() => {
    const body = bodyRef.current
    const flow = flowRef.current
    if (!body || !flow) return
    const line = flow.querySelector<HTMLElement>(`[data-i="${displayActive}"]`)
    if (!line) return
    const target = line.offsetTop + line.offsetHeight / 2 - body.clientHeight / 2
    body.scrollTo({ top: Math.max(0, target), behavior: playing ? 'smooth' : 'auto' })
  }, [displayActive, playing])

  const stopAll = useCallback(() => {
    cancelledRef.current = true
    try { window.speechSynthesis.cancel() } catch {}
    setPlaying(false)
    setPaused(false)
    setActive(-1)
  }, [])

  useEffect(() => () => { stopAll() }, [stopAll])
  useEffect(() => { stopAll() }, [sentences.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps

  const speakFrom = useCallback((startIdx: number) => {
    if (!supported || sentences.length === 0) return
    cancelledRef.current = false
    try { window.speechSynthesis.cancel() } catch {}
    const prefs = getVoicePreferences()
    const voice = pickGermanVoice()

    const queue = (i: number) => {
      if (cancelledRef.current || i >= sentences.length) {
        if (!cancelledRef.current) { setPlaying(false); setPaused(false); setActive(-1) }
        return
      }
      const u = new SpeechSynthesisUtterance(sentences[i])
      u.lang = 'de-DE'
      u.rate = prefs.rate ?? 1
      u.pitch = prefs.pitch ?? 1
      if (voice) u.voice = voice
      u.onstart = () => setActive(i)
      u.onend = () => queue(i + 1)
      u.onerror = () => { setPlaying(false); setPaused(false) }
      window.speechSynthesis.speak(u)
    }
    setPlaying(true)
    setPaused(false)
    setActive(startIdx)
    queue(startIdx)
  }, [sentences, supported])

  function togglePlay() {
    if (!supported || !hasText) return
    if (playing) {
      window.speechSynthesis.pause()
      setPlaying(false)
      setPaused(true)
      return
    }
    if (paused) {
      window.speechSynthesis.resume()
      setPlaying(true)
      setPaused(false)
      return
    }
    speakFrom(0)
  }

  function openTagroSheet() {
    openTagro({ contextType: 'status_report', id: 'dashboard', title: 'Statusabfrage · Heute' })
  }

  const approvalsTitle = pendingApprovalCount === 0
    ? 'Keine offenen Freigaben'
    : pendingApprovalCount === 1
      ? '1 offene Freigabe'
      : `${pendingApprovalCount} offene Freigaben`

  const decisionsTitle = openDecisionsCount === 0
    ? 'Keine offenen Entscheidungen'
    : openDecisionsCount === 1
      ? '1 offene Entscheidung'
      : `${openDecisionsCount} offene Entscheidungen`

  const blockersTitle = blockersCount === 0
    ? 'Keine aktiven Blocker'
    : blockersCount === 1
      ? '1 aktiver Blocker'
      : `${blockersCount} aktive Blocker`

  return (
    <div className="dms" role="main" aria-label="Statusabfrage">
      <style>{DASHBOARD_MOBILE_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      {menuOpen && (
        <>
          <button type="button" className="dms-menu-backdrop" aria-label="Schließen" onClick={() => setMenuOpen(false)} />
          <div className="dms-menu" role="menu">
            <p className="dms-menu-head">Bericht</p>
            {scopeOptions.map(o => (
              <button
                key={o.id}
                type="button"
                role="menuitem"
                className={`dms-menu-item${o.id === activeScopeId ? ' on' : ''}`}
                onClick={() => { onScopeChange?.(o.id); setMenuOpen(false) }}
              >
                <span>{o.label}</span>
                {o.id === activeScopeId ? <Check size={14} weight="bold" /> : null}
              </button>
            ))}
            {periodOptions.length > 0 && (
              <>
                <p className="dms-menu-head">Zeitraum</p>
                {periodOptions.map(p => (
                  <button
                    key={p}
                    type="button"
                    role="menuitem"
                    className={`dms-menu-item${p === periodLabel ? ' on' : ''}`}
                    onClick={() => { onPeriodChange?.(p); setMenuOpen(false) }}
                  >
                    <span>{p}</span>
                    {p === periodLabel ? <Check size={14} weight="bold" /> : null}
                  </button>
                ))}
              </>
            )}
            <p className="dms-menu-head">Mehr</p>
            <button
              type="button"
              role="menuitem"
              className="dms-menu-item"
              onClick={() => { setMenuOpen(false); setNavOpen(true) }}
            >
              <span>Navigation</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="dms-menu-item"
              onClick={() => {
                setMenuOpen(false)
                window.dispatchEvent(new CustomEvent('open-command-palette'))
              }}
            >
              <span>Suchen</span>
            </button>
          </div>
        </>
      )}

      <div className="dms-top">
        <header className="dms-head">
          <h1 className="dms-title">{scopeLabel}</h1>
          <div className="dms-head-actions">
            <CodexMobileActionPill
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              onMenu={() => setMenuOpen(v => !v)}
            />
          </div>
        </header>
      </div>

      <div className="dms-stage">
        <TagroDiamondDots active={speaking} size={52} />

        <button
          type="button"
          className="dms-lyrics-btn"
          onClick={hasText ? togglePlay : onCreateReport}
          disabled={busy && !hasText}
          aria-label={hasText ? (playing ? 'Pausieren' : 'Bericht anhören') : 'Statusbericht erstellen'}
        >
          <div className="dms-lyrics-mask">
            <div className="dms-lyrics" ref={bodyRef}>
              {hasText ? (
                <div className="dms-flow" ref={flowRef}>
                  {sentences.map((s, i) => (
                    <p
                      key={i}
                      data-i={i}
                      className={`dms-line${
                        i === displayActive ? ' on'
                        : i === displayActive - 1 || i === displayActive + 1 ? ' near'
                        : ''
                      }`}
                    >
                      {s}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="dms-empty">
                  {busy ? 'Tagro schreibt den Statusbericht …' : 'Tippe auf „Statusbericht erstellen", um den Bericht zu generieren.'}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="dms-sheet">
        <div
          className="mpd-grip"
          role="separator"
          aria-label="Nach oben ziehen"
          onTouchStart={bindDragUp(openTagroSheet)}
        />

        <div className="dms-rows">
          <div className="dms-row">
            <p className="dms-row-title">{approvalsTitle}</p>
            {pendingApprovals.length > 0 ? (
              <div className="dms-row-items">
                {pendingApprovals.slice(0, 3).map(item => (
                  <Link key={`${item.kind}-${item.id}`} href={item.href} className="dms-row-item">
                    <span className="dms-row-item-title">{item.title}</span>
                    {item.project_title ? <span className="dms-row-item-meta">{item.project_title}</span> : null}
                  </Link>
                ))}
              </div>
            ) : null}
            <Link href="/captures" className="dms-row-link">Freigaben ansehen &gt;</Link>
          </div>
          <div className="dms-row">
            <p className="dms-row-title">{decisionsTitle}</p>
            <Link href="/decisions" className="dms-row-link">Entscheidungen ansehen &gt;</Link>
          </div>
          <div className="dms-row">
            <p className="dms-row-title">{blockersTitle}</p>
            <Link href="/decisions?tone=risk" className="dms-row-link">Risiken ansehen &gt;</Link>
          </div>
          {clientDeliverables.filter(d => d.approval_status === 'awaiting_review').length > 0 && (
            <div className="dms-row">
              <p className="dms-row-title">
                {clientDeliverables.filter(d => d.approval_status === 'awaiting_review').length === 1
                  ? '1 Lieferung wartet auf Freigabe'
                  : `${clientDeliverables.filter(d => d.approval_status === 'awaiting_review').length} Lieferungen warten auf Freigabe`}
              </p>
              <div className="dms-row-items">
                {clientDeliverables.filter(d => d.approval_status === 'awaiting_review').slice(0, 2).map(item => (
                  <p key={item.id} className="dms-activity-line">
                    {item.project_title ? `${item.project_title}: ` : ''}{item.title}
                    {item.summary ? ` — ${item.summary.slice(0, 80)}${item.summary.length > 80 ? '…' : ''}` : ''}
                  </p>
                ))}
              </div>
              <Link href="/deliverables" className="dms-row-link">Lieferungen prüfen &gt;</Link>
            </div>
          )}
          {clientActivity.length > 0 && (
            <div className="dms-row">
              <p className="dms-row-title">Aktuelle Updates</p>
              <div className="dms-row-items">
                {clientActivity.slice(0, 2).map(item => (
                  <p key={`${item.kind}-${item.id}`} className="dms-activity-line">
                    {item.project_title ? `${item.project_title}: ` : ''}{item.body.slice(0, 120)}{item.body.length > 120 ? '…' : ''}
                  </p>
                ))}
              </div>
              <Link href="/activity" className="dms-row-link">Alle Updates &gt;</Link>
            </div>
          )}
        </div>

        <div className="dms-dock-wrap">
          <button
            type="button"
            className="dms-drag-hint"
            aria-label="Mit Tagro öffnen"
            onClick={openTagroSheet}
          >
            <CaretUp size={14} weight="bold" />
          </button>
          <div className="mpd-row">
            <button
              type="button"
              className="mpd-ghost"
              onClick={onCreateReport}
              disabled={busy}
              aria-label="Statusbericht erstellen"
            >
              <span className="mpd-ghost-icon" aria-hidden><Plus size={14} weight="regular" /></span>
              <span className="mpd-ghost-label">Statusbericht erstellen</span>
            </button>
            <button
              type="button"
              className="mpd-primary"
              onClick={togglePlay}
              disabled={!hasText || (busy && !hasText)}
              aria-label={playing ? 'Pausieren' : 'Bericht anhören'}
            >
              {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
