'use client'

/**
 * DashboardMobileStart — mobile Statusabfrage.
 * Spotify-style lyrics teleprompter + slim dock: Filter · Play · Volume.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
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
import { getVoicePreferences } from '@/lib/voice'
import { openTagro } from '@/components/TagroOverlay'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { DASHBOARD_MOBILE_CSS } from '@/components/dashboard/dashboard-mobile-styles'

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
  scopeLabel,
  scopeOptions,
  activeScopeId,
  onScopeChange,
  periodLabel,
  periodOptions,
  onPeriodChange,
  onCreateReport,
}: Props) {
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)
  const volumeRef = useRef(1)
  const mutedRef = useRef(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const hasText = sentences.length > 0
  const speaking = playing || !!busy
  const displayActive = (playing || paused) && active >= 0 ? active : -1
  const focusIdx = displayActive >= 0 ? displayActive : 0
  const effectiveVolume = muted ? 0 : volume

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { mutedRef.current = muted }, [muted])

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
      u.volume = mutedRef.current ? 0 : volumeRef.current
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
    if (!supported) return
    if (!hasText) {
      onCreateReport()
      return
    }
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

  function onVolumeInput(next: number) {
    const clamped = Math.max(0, Math.min(1, next))
    volumeRef.current = clamped
    setVolume(clamped)
    if (clamped > 0 && muted) {
      mutedRef.current = false
      setMuted(false)
    }
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
                  {busy
                    ? 'Tagro schreibt den Statusbericht …'
                    : 'Tippe hier, um den Statusbericht zu erzeugen — dann läuft er Zeile für Zeile.'}
                </p>
              )}
            </div>
            <div className="dms-prompter-fade dms-prompter-fade--bottom" aria-hidden />
          </div>
        </button>
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
            aria-label={playing ? 'Pausieren' : hasText ? 'Abspielen' : 'Statusbericht erstellen'}
            disabled={busy && !hasText}
          >
            {playing
              ? <Pause size={22} weight="fill" />
              : <Play size={22} weight="fill" />}
          </button>

          <div className="dms-volume">
            <button
              type="button"
              className="dms-ctrl dms-ctrl--mute"
              onClick={() => {
                const next = !muted
                mutedRef.current = next
                setMuted(next)
              }}
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
