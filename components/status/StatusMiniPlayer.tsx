'use client'

import { createPortal } from 'react-dom'
import { Pause, Play } from '@phosphor-icons/react'
import type { MouseEvent } from 'react'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useStatusPlayer } from '@/components/status/StatusPlayerContext'
import { STATUS_MINI_PLAYER_CSS } from '@/components/status/status-mini-player-styles'

/** Desktop floating card. Mobile uses StatusMobilePlayButton instead. */
export default function StatusMiniPlayer() {
  const isMobile = useFestagMobile()
  const {
    projectLabel,
    durationLabel,
    busy,
    expanded,
    sentences,
    expand,
    refreshReport,
    playback,
  } = useStatusPlayer()

  const {
    playing,
    paused,
    speaking,
    progress,
    supported,
    toggle,
  } = playback

  if (isMobile || expanded) return null

  const hasText = sentences.length > 0
  const live = speaking

  async function onPlayClick(e: MouseEvent) {
    e.stopPropagation()
    if (!hasText) {
      await refreshReport()
      window.setTimeout(() => playback.play(), 80)
      return
    }
    if (!supported) return
    toggle()
  }

  function onCardClick() {
    expand()
  }

  const meta = [
    live ? (playing && !paused ? 'Spielt' : 'Pausiert') : 'Statusbericht',
    durationLabel,
  ].filter(Boolean).join(', ')

  const node = (
    <>
      <style>{STATUS_MINI_PLAYER_CSS}</style>
      <div
        className="smp-mini"
        role="button"
        tabIndex={0}
        aria-label="Statusbericht Player öffnen"
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onCardClick()
          }
        }}
      >
        <button
          type="button"
          className={`smp-mini-play${playing && !paused ? ' smp-mini-play--pause' : ''}`}
          onClick={onPlayClick}
          disabled={busy && !hasText}
          aria-label={playing && !paused ? 'Pausieren' : hasText ? 'Abspielen' : 'Statusbericht laden'}
        >
          {playing && !paused
            ? <Pause size={18} weight="fill" />
            : <Play size={18} weight="fill" />}
        </button>

        <div className="smp-mini-copy">
          <p className="smp-mini-title">{projectLabel || 'Statusbericht'}</p>
          <p className="smp-mini-meta">{meta}</p>
        </div>

        {live ? (
          <div className="smp-mini-progress" aria-hidden>
            <div
              className="smp-mini-progress-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    </>
  )

  if (typeof document === 'undefined') return null
  return createPortal(node, document.body)
}
