'use client'

/**
 * DashboardMobileStart — mobile Statusabfrage, Figma 252:59.
 * Light Gesamtbericht screen: Aeonik header, teleprompter, bottom sheet
 * with decisions/blockers + dock (Statusbericht erstellen · Play).
 */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CaretUp, Pause, Play, Plus } from '@phosphor-icons/react'
import { getVoicePreferences } from '@/lib/voice'
import { openTagro } from '@/components/TagroOverlay'
import TagroDiamondDots from '@/components/dashboard/TagroDiamondDots'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { DASHBOARD_MOBILE_CSS } from '@/components/dashboard/dashboard-mobile-styles'

type Props = {
  sentences: string[]
  busy?: boolean
  openDecisionsCount: number
  blockersCount: number
  scopeLabel: string
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
  blockersCount,
  scopeLabel,
  onCreateReport,
}: Props) {
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const hasText = sentences.length > 0
  const speaking = playing || !!busy
  const displayActive = (playing || paused) && active >= 0 ? active : -1

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const ui = (
    <div className="dms" role="main" aria-label="Statusabfrage">
      <style>{DASHBOARD_MOBILE_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dms-top">
        <header className="dms-head">
          <h1 className="dms-title">{scopeLabel}</h1>
          <div className="dms-head-actions">
            <CodexMobileActionPill
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              onMenu={() => setNavOpen(true)}
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
            <p className="dms-row-title">{decisionsTitle}</p>
            <Link href="/decisions" className="dms-row-link">Entscheidungen ansehen &gt;</Link>
          </div>
          <div className="dms-row">
            <p className="dms-row-title">{blockersTitle}</p>
            <Link href="/decisions?tone=risk" className="dms-row-link">Entscheidungen ansehen &gt;</Link>
          </div>
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

  if (!mounted) return null
  return createPortal(ui, document.body)
}
