'use client'

/**
 * DashboardMobileStart — mobile Statusabfrage.
 * Shared Statusbericht playback (word lyrics) + slim dock: Filter · Play · Volume.
 */

import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  FunnelSimple,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from '@phosphor-icons/react'
import BriefingLyricsFlow from '@/components/briefing/BriefingLyricsFlow'
import { openTagro } from '@/components/TagroOverlay'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { DASHBOARD_MOBILE_CSS } from '@/components/dashboard/dashboard-mobile-styles'
import { useStatusPlayerOptional } from '@/components/status/StatusPlayerContext'
import { useStatusReportPlayback } from '@/hooks/useStatusReportPlayback'
import { useStatusSentenceActions } from '@/hooks/useStatusSentenceActions'
import { briefingDurationLabel } from '@/lib/client/status-briefing'

export type MobileScopeOption = { id: string; label: string; color?: string | null }

type Props = {
  sentences: string[]
  busy?: boolean
  scopeLabel: string
  scopeOptions: MobileScopeOption[]
  activeScopeId: string
  onScopeChange: (id: string) => void
  periodLabel: string
  periodOptions: string[]
  onPeriodChange: (p: string) => void
  onCreateReport: () => void
}

export default function DashboardMobileStart({
  sentences,
  busy,
  scopeLabel,
  scopeOptions,
  activeScopeId,
  onScopeChange,
  periodLabel,
  periodOptions,
  onPeriodChange,
  onCreateReport,
}: Props) {
  const [navOpen, setNavOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const shared = useStatusPlayerOptional()
  const localPlayback = useStatusReportPlayback({
    sentences,
    enabled: !shared,
  })
  const playback = shared?.playback ?? localPlayback

  useEffect(() => {
    if (!shared) return
    shared.setSource({
      sentences,
      projectLabel: scopeLabel,
      durationLabel: briefingDurationLabel(sentences.join(' ')),
      busy: !!busy,
    })
  }, [busy, scopeLabel, sentences, shared?.setSource]) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    supported,
    playing,
    paused,
    speaking,
    displayActiveIndex,
    activeWordIndex,
    muted,
    volume,
    autoScroll,
    toggle,
    setMuted,
    setVolume,
    takeScrollControl,
  } = playback

  const hasText = sentences.length > 0
  const waveLive = speaking || !!busy
  const effectiveVolume = muted ? 0 : volume
  const { sentenceActions, dismissAction } = useStatusSentenceActions(sentences, hasText)

  useEffect(() => { setMounted(true) }, [])

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

  function togglePlay() {
    if (!hasText) {
      onCreateReport()
      return
    }
    if (!supported) return
    toggle()
  }

  function openTagroSheet() {
    openTagro({ contextType: 'status_report', id: 'dashboard', title: 'Statusabfrage, Heute' })
  }

  function onVolumeInput(next: number) {
    setVolume(next, false)
  }

  const ui = (
    <div className="dms" role="main" aria-label="Statusabfrage">
      <style>{DASHBOARD_MOBILE_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dms-top">
        <header className="dms-head">
          <div className="dms-nav-row">
            <span className="dms-nav-spacer" aria-hidden />
            <CodexMobileActionPill
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              onMenu={() => setNavOpen(true)}
            />
          </div>
          <h1 className="dms-title">{scopeLabel}</h1>
        </header>
      </div>

      <div className="dms-stage">
        <div className={`dms-wave${waveLive ? ' dms-wave--live' : ''}`} aria-hidden>
          <div className="dms-wave-bars">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        </div>

        <div className="dms-lyrics-host">
          {hasText ? (
            <BriefingLyricsFlow
              sentences={sentences}
              activeIndex={displayActiveIndex}
              activeWordIndex={activeWordIndex}
              autoScroll={autoScroll}
              animating={playing && !paused}
              sentenceActions={sentenceActions}
              onDismissAction={dismissAction}
              onDecidedAction={dismissAction}
              onUserScroll={takeScrollControl}
            />
          ) : (
            <button
              type="button"
              className="dms-empty-btn"
              onClick={onCreateReport}
              disabled={!!busy}
              aria-label="Statusbericht erstellen"
            >
              <p className="dms-empty">
                {busy
                  ? 'Tagro schreibt den Statusbericht …'
                  : 'Tippe hier, um den Statusbericht zu erzeugen — dann läuft er Wort für Wort.'}
              </p>
            </button>
          )}
        </div>
      </div>

      <div className="dms-sheet">
        <div
          className="dms-grip"
          role="separator"
          aria-label="Tagro öffnen"
          onTouchStart={(e) => {
            const startY = e.touches[0].clientY
            const onMove = (ev: TouchEvent) => {
              if (startY - ev.touches[0].clientY > 40) {
                openTagroSheet()
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
          }}
        />

        <div className="dms-controls" role="toolbar" aria-label="Statusbericht Steuerelemente">
          <button
            type="button"
            className={`dms-ctrl dms-ctrl--filter${filterOpen ? ' on' : ''}`}
            onClick={() => setFilterOpen(v => !v)}
            aria-label="Filter öffnen"
            aria-expanded={filterOpen}
          >
            <FunnelSimple size={18} weight="regular" />
          </button>

          <button
            type="button"
            className="dms-ctrl dms-ctrl--play"
            onClick={togglePlay}
            aria-label={playing && !paused ? 'Pausieren' : hasText ? 'Abspielen' : 'Statusbericht erstellen'}
            disabled={busy && !hasText}
          >
            {playing && !paused
              ? <Pause size={22} weight="fill" />
              : <Play size={22} weight="fill" />}
          </button>

          <div className="dms-volume">
            <button
              type="button"
              className="dms-ctrl dms-ctrl--mute"
              onClick={() => setMuted(!muted)}
              aria-label={muted || volume === 0 ? 'Ton an' : 'Stummschalten'}
            >
              {muted || volume === 0
                ? <SpeakerSlash size={16} weight="regular" />
                : <SpeakerHigh size={16} weight="regular" />}
            </button>
            <input
              type="range"
              className="dms-volume-slider"
              min={0}
              max={100}
              value={Math.round(effectiveVolume * 100)}
              onChange={(e) => onVolumeInput(Number(e.target.value) / 100)}
              aria-label="Lautstärke"
            />
          </div>
        </div>
      </div>

      {filterOpen && (
        <div className="dms-filter" role="dialog" aria-label="Filter">
          <button
            type="button"
            className="dms-filter-backdrop"
            aria-label="Filter schließen"
            onClick={() => setFilterOpen(false)}
          />
          <div className="dms-filter-sheet">
            <div className="dms-filter-head">
              <h2 className="dms-filter-title">Filter</h2>
              <button
                type="button"
                className="dms-filter-close"
                onClick={() => setFilterOpen(false)}
                aria-label="Schließen"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            <p className="dms-filter-label">Bereich</p>
            <ul className="dms-filter-list">
              {scopeOptions.map(opt => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className={`dms-filter-item${opt.id === activeScopeId ? ' on' : ''}`}
                    onClick={() => {
                      onScopeChange(opt.id)
                      setFilterOpen(false)
                    }}
                  >
                    <span className="dms-filter-item-label">{opt.label}</span>
                    {opt.id === activeScopeId && <Check size={14} weight="bold" />}
                  </button>
                </li>
              ))}
            </ul>

            <p className="dms-filter-label">Zeitraum</p>
            <ul className="dms-filter-list">
              {periodOptions.map(p => (
                <li key={p}>
                  <button
                    type="button"
                    className={`dms-filter-item${p === periodLabel ? ' on' : ''}`}
                    onClick={() => {
                      onPeriodChange(p)
                      setFilterOpen(false)
                    }}
                  >
                    <span className="dms-filter-item-label">{p}</span>
                    {p === periodLabel && <Check size={14} weight="bold" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )

  if (!mounted) return null
  return createPortal(ui, document.body)
}
