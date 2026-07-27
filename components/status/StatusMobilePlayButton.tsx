'use client'

/**
 * Mobile center Play — single reduced entry into the Statusbericht player.
 * Tap → sheet rises (no dark scrim). Further drag-up → fullscreen page.
 */

import { createPortal } from 'react-dom'
import { Play } from '@phosphor-icons/react'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useStatusPlayer } from '@/components/status/StatusPlayerContext'
import { STATUS_MINI_PLAYER_CSS } from '@/components/status/status-mini-player-styles'

export default function StatusMobilePlayButton() {
  const isMobile = useFestagMobile()
  const {
    busy,
    expanded,
    sentences,
    expand,
    refreshReport,
    playback,
  } = useStatusPlayer()

  if (!isMobile || expanded) return null

  const hasText = sentences.length > 0

  async function onTap() {
    expand()
    if (!hasText) {
      await refreshReport()
      window.setTimeout(() => playback.play(), 100)
      return
    }
    if (!playback.supported) return
    if (!playback.speaking) playback.play()
    else if (playback.paused) playback.resume()
  }

  const node = (
    <>
      <style>{STATUS_MINI_PLAYER_CSS}</style>
      <button
        type="button"
        className="smp-fab"
        onClick={() => { void onTap() }}
        disabled={busy && !hasText}
        aria-label={hasText ? 'Statusbericht öffnen' : 'Statusbericht erzeugen'}
      >
        <Play size={26} weight="fill" />
      </button>
    </>
  )

  if (typeof document === 'undefined') return null
  return createPortal(node, document.body)
}
