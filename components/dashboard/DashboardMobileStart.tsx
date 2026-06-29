'use client'

/**
 * DashboardMobileStart — mobile Statusabfrage, Figma 252:59.
 * Centered teleprompter (active line only), Codex header pill, Festag page dock.
 */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Plus } from '@phosphor-icons/react'
import { getVoicePreferences } from '@/lib/voice'
import { openTagro } from '@/components/TagroOverlay'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import { DASHBOARD_MOBILE_CSS } from '@/components/dashboard/dashboard-mobile-styles'

type Props = {
  sentences: string[]
  busy?: boolean
  openDecisionsCount: number
  blockersCount: number
  scopeLabel: string
  onCreateReport: () => void
  /** When true, only the page dock is portaled — content lives in StatusExecutiveOverview. */
  hideTeleprompter?: boolean
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

function lineDistanceClass(i: number, focusIdx: number): string {
  const dist = Math.abs(i - focusIdx)
  if (dist === 0) return ' on'
  if (dist === 1) return ' near'
  if (dist === 2) return ' far'
  return ' out'
}

export default function DashboardMobileStart({
  sentences,
  busy,
  openDecisionsCount,
  blockersCount,
  scopeLabel,
  onCreateReport,
  hideTeleprompter = false,
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
  const focusIdx = displayActive >= 0 ? displayActive : 0

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
    if (!body || !flow || displayActive < 0) return
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
    openTagro({ contextType: 'status_report', id: 'dashboard', title: 'Statusabfrage, Heute' })
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

  const sheetRows = (
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
  )

  if (hideTeleprompter) {
    const dockOnly = (
      <>
        <style>{DASHBOARD_MOBILE_CSS}</style>
        <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="dms-sheet dms-sheet--dock-only">
          <MobilePageDock
            shellClassName="dms-dock-shell"
            onDragUp={openTagroSheet}
            inset={sheetRows}
            primary={{
              id: 'create',
              label: 'Briefing anhören',
              icon: <Play size={14} weight="fill" />,
              onClick: hasText ? togglePlay : onCreateReport,
              ariaLabel: 'Briefing anhören',
              disabled: busy && !hasText,
            }}
            secondary={{
              id: 'tagro',
              icon: <Plus size={20} weight="regular" />,
              onClick: openTagroSheet,
              ariaLabel: 'Tagro öffnen',
            }}
          />
        </div>
      </>
    )
    if (!mounted) return null
    return createPortal(dockOnly, document.body)
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
        <div className={`dms-wave${speaking ? ' dms-wave--live' : ''}`} aria-hidden>
          <div className="dms-wave-bars">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="dms-lyrics-btn"
          onClick={hasText ? togglePlay : onCreateReport}
          disabled={busy && !hasText}
          aria-label={hasText ? (playing ? 'Pausieren' : 'Bericht anhören') : 'Statusbericht erstellen'}
        >
          <div className="dms-prompter">
            <div className="dms-prompter-fade dms-prompter-fade--top" aria-hidden />
            <div className="dms-lyrics" ref={bodyRef}>
              {hasText ? (
                <div className="dms-flow" ref={flowRef}>
                  {sentences.map((s, i) => (
                    <p
                      key={i}
                      data-i={i}
                      className={`dms-line${lineDistanceClass(i, focusIdx)}`}
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
            <div className="dms-prompter-fade dms-prompter-fade--bottom" aria-hidden />
          </div>
        </button>
      </div>

      <div className="dms-sheet">
        <MobilePageDock
          shellClassName="dms-dock-shell"
          onDragUp={openTagroSheet}
          inset={sheetRows}
          primary={{
            id: 'create',
            label: 'Statusbericht erstellen',
            icon: <Plus size={14} weight="regular" />,
            onClick: onCreateReport,
            ariaLabel: 'Statusbericht erstellen',
            disabled: busy,
          }}
          secondary={{
            id: 'play',
            icon: playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />,
            onClick: togglePlay,
            ariaLabel: playing ? 'Pausieren' : 'Bericht anhören',
            disabled: !hasText || (busy && !hasText),
          }}
        />
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(ui, document.body)
}
