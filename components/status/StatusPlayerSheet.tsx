'use client'

/**
 * StatusPlayerSheet — rises from bottom without a dark scrim.
 * Mobile: sheet peek → drag up → fullscreen page (then normal scroll, no drag).
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react'
import BriefingLyricsFlow from '@/components/briefing/BriefingLyricsFlow'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useStatusPlayer } from '@/components/status/StatusPlayerContext'
import { useStatusSentenceActions } from '@/hooks/useStatusSentenceActions'
import { STATUS_MINI_PLAYER_CSS } from '@/components/status/status-mini-player-styles'

const SHEET_VH = 0.72
const FULL_UP_RATIO = 0.18
const DISMISS_RATIO = 0.22

export default function StatusPlayerSheet() {
  const isMobile = useFestagMobile()
  const {
    sentences,
    projectLabel,
    durationLabel,
    busy,
    expanded,
    fullscreen,
    collapse,
    expandFullscreen,
    refreshReport,
    playback,
  } = useStatusPlayer()

  const open = expanded
  const { mounted, visible } = useFestagPopupPresence(open)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

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
    play,
    setMuted,
    takeScrollControl,
    seekToRatio,
  } = playback

  const hasText = sentences.length > 0
  const { sentenceActions, dismissAction } = useStatusSentenceActions(sentences, open && hasText)

  // Reset live drag when presentation changes.
  useEffect(() => {
    setDragY(0)
    setDragging(false)
    dragStartY.current = null
  }, [fullscreen, expanded])

  const onPlay = useCallback(async () => {
    if (!hasText) {
      await refreshReport()
      window.setTimeout(() => play(), 80)
      return
    }
    if (!supported) return
    toggle()
  }, [hasText, play, refreshReport, supported, toggle])

  const onScrub = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    seekToRatio((event.clientX - rect.left) / rect.width)
  }, [seekToRatio])

  const endDrag = useCallback((clientY: number) => {
    if (dragStartY.current == null) return
    const delta = clientY - dragStartY.current
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    dragStartY.current = null
    setDragging(false)

    if (fullscreen) {
      // Fullscreen: no drag gestures — ignore.
      setDragY(0)
      return
    }

    // Drag up → fullscreen page handoff
    if (delta < -(vh * FULL_UP_RATIO)) {
      setDragY(0)
      expandFullscreen()
      return
    }

    // Drag down → dismiss
    if (delta > vh * DISMISS_RATIO) {
      setDragY(0)
      collapse()
      return
    }

    // Spring back to sheet rest
    setDragY(0)
  }, [collapse, expandFullscreen, fullscreen])

  const onGripPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return
    if (fullscreen) return // V2: no drag once full page
    dragStartY.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [fullscreen, isMobile])

  const onGripPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null || fullscreen) return
    const delta = e.clientY - dragStartY.current
    // Allow slight upward pull (negative) and downward dismiss
    const vh = window.innerHeight
    const maxUp = -(vh * (1 - SHEET_VH))
    const next = Math.min(vh * 0.55, Math.max(maxUp, delta))
    setDragY(next)
  }, [fullscreen])

  const onGripPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    endDrag(e.clientY)
  }, [endDrag])

  const sheetStyle = (() => {
    if (!isMobile) return undefined
    if (dragging || dragY !== 0) {
      return {
        transform: `translate3d(-50%, ${dragY}px, 0)`,
        transition: dragging ? 'none' : undefined,
      } as CSSProperties
    }
    return undefined
  })()

  if (!mounted) return null

  const modeClass = fullscreen
    ? 'smp-sheet--fullscreen'
    : 'smp-sheet--peek'
  const hostClass = [
    'smp-host',
    visible ? 'is-visible' : '',
    fullscreen ? 'smp-host--fullscreen' : '',
    isMobile ? 'smp-host--mobile' : '',
  ].filter(Boolean).join(' ')

  const node = (
    <div
      className={hostClass}
      role="dialog"
      aria-modal="false"
      aria-label="Statusbericht"
    >
      <style>{STATUS_MINI_PLAYER_CSS}</style>
      <div
        ref={sheetRef}
        className={`smp-sheet ${modeClass}${dragging ? ' smp-sheet--dragging' : ''}`}
        style={sheetStyle}
      >
        {isMobile && !fullscreen ? (
          <div
            className="smp-sheet-grip"
            aria-label="Nach oben ziehen für Vollbild, nach unten schließen"
            onPointerDown={onGripPointerDown}
            onPointerMove={onGripPointerMove}
            onPointerUp={onGripPointerUp}
            onPointerCancel={onGripPointerUp}
          />
        ) : (
          <div className={`smp-sheet-grip${fullscreen ? ' smp-sheet-grip--static' : ''}`} aria-hidden />
        )}

        <header className="smp-sheet-head">
          <div className="smp-sheet-head-copy">
            <p className="smp-sheet-duration">{durationLabel}</p>
            <h2 className="smp-sheet-title">{projectLabel || 'Statusbericht'}</h2>
          </div>
          <button
            type="button"
            className="smp-sheet-close"
            onClick={collapse}
            aria-label="Schließen"
          >
            <X size={18} weight="regular" />
          </button>
        </header>

        <div className={`smp-sheet-body${fullscreen ? ' smp-sheet-body--scroll' : ''}`}>
          {hasText ? (
            <div className="smp-sheet-lyrics">
              <BriefingLyricsFlow
                sentences={sentences}
                activeIndex={speaking ? displayActiveIndex : -1}
                activeWordIndex={activeWordIndex}
                autoScroll={fullscreen ? false : autoScroll}
                animating={playing && !paused}
                sentenceActions={sentenceActions}
                onDismissAction={dismissAction}
                onDecidedAction={dismissAction}
                onHoverPause={() => {
                  if (playing && !paused) pause()
                }}
                onUserScroll={takeScrollControl}
              />
            </div>
          ) : (
            <p className="smp-sheet-empty">
              {busy
                ? 'Tagro schreibt den Statusbericht…'
                : 'Noch kein Statusbericht. Tippe Play, um einen zu erzeugen.'}
            </p>
          )}

          {speaking ? (
            <div
              className="smp-sheet-progress"
              role="slider"
              aria-label="Fortschritt"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              tabIndex={0}
              onPointerDown={onScrub}
            >
              <div
                className="smp-sheet-progress-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          ) : null}

          <div className="smp-sheet-controls" role="toolbar" aria-label="Wiedergabe">
            <button
              type="button"
              className="smp-sheet-ctrl smp-sheet-ctrl--ghost"
              onClick={() => setMuted(!muted)}
              aria-label={muted || volume === 0 ? 'Ton an' : 'Stummschalten'}
            >
              {muted || volume === 0
                ? <SpeakerSlash size={16} weight="regular" />
                : <SpeakerHigh size={16} weight="regular" />}
            </button>

            <button
              type="button"
              className="smp-sheet-ctrl smp-sheet-ctrl--play"
              onClick={() => { void onPlay() }}
              disabled={busy && !hasText}
              aria-label={playing && !paused ? 'Pausieren' : hasText ? 'Abspielen' : 'Statusbericht erzeugen'}
            >
              {playing && !paused
                ? <Pause size={22} weight="fill" />
                : <Play size={22} weight="fill" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
