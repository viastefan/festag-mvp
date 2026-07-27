'use client'

/**
 * StatusReportPlayer — Tagro Experience Engine V2 home surface.
 * Idle = play only. Playing = Spotify-style word lyrics + calm controls.
 * Playback is owned by StatusPlayerProvider so it survives route changes.
 */

import { useCallback, useEffect, useState, type PointerEvent } from 'react'
import { Check, Pause, Play, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import BriefingLyricsFlow from '@/components/briefing/BriefingLyricsFlow'
import { useStatusPlayerOptional } from '@/components/status/StatusPlayerContext'
import { useStatusReportPlayback } from '@/hooks/useStatusReportPlayback'
import { STATUS_REPORT_PLAYER_CSS } from '@/components/status/status-report-player-styles'

export type StatusReportScopeOption = {
  id: string
  label: string
  color?: string | null
}

type Props = {
  sentences: string[]
  durationLabel: string
  projectLabel: string
  busy?: boolean
  scopeOptions: StatusReportScopeOption[]
  activeScopeId: string
  onScopeChange: (id: string) => void
  period: string
  periodOptions: readonly string[]
  onPeriodChange: (period: string) => void
  onRefresh?: () => void
  onCreateReport?: () => void
}

export default function StatusReportPlayer({
  sentences,
  durationLabel,
  projectLabel,
  busy = false,
  scopeOptions,
  activeScopeId,
  onScopeChange,
  period,
  periodOptions,
  onPeriodChange,
  onRefresh,
  onCreateReport,
}: Props) {
  const [scopeOpen, setScopeOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)

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
      projectLabel,
      durationLabel,
      busy,
    })
  }, [busy, durationLabel, projectLabel, sentences, shared?.setSource]) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    supported,
    playing,
    paused,
    speaking,
    displayActiveIndex,
    activeWordIndex,
    muted,
    volume,
    progress,
    autoScroll,
    toggle,
    pause,
    setMuted,
    takeScrollControl,
    seekToRatio,
  } = playback

  const activeScope = scopeOptions.find((o) => o.id === activeScopeId)
  const hasText = sentences.length > 0
  const idle = !speaking

  const closeMenus = useCallback(() => {
    setScopeOpen(false)
    setPeriodOpen(false)
  }, [])

  const onPlayClick = useCallback(() => {
    if (!hasText) {
      onCreateReport?.()
      return
    }
    if (!supported) return
    toggle()
  }, [hasText, onCreateReport, supported, toggle])

  const onScrub = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    seekToRatio((event.clientX - rect.left) / rect.width)
  }, [seekToRatio])

  return (
    <div className="srp" role="main" aria-label="Statusbericht">
      <style>{STATUS_REPORT_PLAYER_CSS}</style>

      <header className="srp-top">
        <div className="srp-context">
          <button
            type="button"
            className={`srp-pill${scopeOpen ? ' on' : ''}`}
            aria-label="Scope"
            aria-expanded={scopeOpen}
            onClick={() => {
              setScopeOpen((o) => !o)
              setPeriodOpen(false)
            }}
          >
            <span
              className="srp-dot"
              style={{ background: activeScope?.color || '#F0F2F5' }}
            />
            <span>{activeScope?.label || projectLabel}</span>
          </button>
          <button
            type="button"
            className={`srp-pill${periodOpen ? ' on' : ''}`}
            aria-label="Zeitraum"
            aria-expanded={periodOpen}
            onClick={() => {
              setPeriodOpen((o) => !o)
              setScopeOpen(false)
            }}
          >
            {period}
          </button>

          {(scopeOpen || periodOpen) ? (
            <button type="button" className="srp-backdrop" aria-label="Schließen" onClick={closeMenus} />
          ) : null}

          {scopeOpen ? (
            <div className="srp-menu" role="listbox" aria-label="Scope">
              {scopeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === activeScopeId}
                  className={`srp-menu-item${option.id === activeScopeId ? ' on' : ''}`}
                  onClick={() => {
                    onScopeChange(option.id)
                    closeMenus()
                  }}
                >
                  <span className="srp-dot" style={{ background: option.color || '#F0F2F5' }} />
                  <span className="srp-menu-label">{option.label}</span>
                  {option.id === activeScopeId ? <Check size={12} weight="bold" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {periodOpen ? (
            <div className="srp-menu srp-menu--period" role="menu" aria-label="Zeitraum">
              {periodOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitem"
                  className={`srp-menu-item${option === period ? ' on' : ''}`}
                  onClick={() => {
                    onPeriodChange(option)
                    closeMenus()
                  }}
                >
                  <span className="srp-menu-label">{option}</span>
                  {option === period ? <Check size={12} weight="bold" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {onRefresh ? (
          <button
            type="button"
            className="srp-refresh"
            disabled={busy}
            onClick={onRefresh}
            aria-label="Status aktualisieren"
          >
            {busy ? 'Aktualisiert…' : 'Aktualisieren'}
          </button>
        ) : null}
      </header>

      <div className="srp-stage">
        {idle ? (
          <div className="srp-idle">
            <div className="srp-idle-meta">
              <p className="srp-idle-project">{projectLabel}</p>
              {hasText ? (
                <p className="srp-idle-duration">{durationLabel}</p>
              ) : null}
            </div>

            <button
              type="button"
              className="srp-play"
              onClick={onPlayClick}
              disabled={busy && !hasText}
              aria-label={hasText ? 'Statusbericht abspielen' : 'Statusbericht erstellen'}
            >
              <Play size={28} weight="fill" />
            </button>

            <p className="srp-idle-hint">
              {busy && !hasText
                ? 'Tagro schreibt den Statusbericht…'
                : hasText
                  ? 'Statusbericht'
                  : 'Tippe Play, um den Statusbericht zu erzeugen.'}
            </p>
          </div>
        ) : (
          <div className="srp-live">
            <div className="srp-lyrics">
              <BriefingLyricsFlow
                sentences={sentences}
                activeIndex={displayActiveIndex}
                activeWordIndex={activeWordIndex}
                autoScroll={autoScroll}
                animating={playing && !paused}
                onHoverPause={() => {
                  if (playing && !paused) pause()
                }}
                onUserScroll={takeScrollControl}
              />
            </div>

            <div
              className="srp-progress"
              role="slider"
              aria-label="Fortschritt"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              tabIndex={0}
              onPointerDown={onScrub}
            >
              <div
                className="srp-progress-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <div className="srp-controls" role="toolbar" aria-label="Wiedergabe">
              <button
                type="button"
                className="srp-ctrl srp-ctrl--ghost"
                onClick={() => setMuted(!muted)}
                aria-label={muted || volume === 0 ? 'Ton an' : 'Stummschalten'}
              >
                {muted || volume === 0
                  ? <SpeakerSlash size={16} weight="regular" />
                  : <SpeakerHigh size={16} weight="regular" />}
              </button>

              <button
                type="button"
                className="srp-ctrl srp-ctrl--play"
                onClick={toggle}
                aria-label={playing && !paused ? 'Pausieren' : 'Fortsetzen'}
              >
                {playing && !paused
                  ? <Pause size={22} weight="fill" />
                  : <Play size={22} weight="fill" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
