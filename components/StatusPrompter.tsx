'use client'

/**
 * StatusPrompter — Statusabfrage desktop view.
 * Header: Entscheidungen/Freigaben pattern · Body: Spotify-style read-along · Footer: wave + play + Tagro.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowsClockwise, CaretDown, Check, FunnelSimple, Pause, Play, Plus, Sparkle,
} from '@phosphor-icons/react'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { getVoicePreferences } from '@/lib/voice'
import { STATUSABFRAGE_CSS } from '@/components/dashboard/statusabfrage-styles'

export type PrompterScopeOption = { id: string; label: string; color?: string | null }

type Props = {
  headline: string
  lead?: string
  sentences: string[]
  durationLabel: string
  scopeLabel: string
  scopeOptions: PrompterScopeOption[]
  activeScopeId: string
  onScopeChange: (id: string) => void
  periodLabel: string
  periodOptions: string[]
  onPeriodChange: (p: string) => void
  busy?: boolean
  onRewrite: () => void
  onTagro: () => void
}

const WAVE_BARS = 36

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

function VoiceWaveform({ active }: { active: boolean }) {
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: WAVE_BARS }, () => 0.14))
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) {
      setLevels(Array.from({ length: WAVE_BARS }, () => 0.12))
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      setLevels(Array.from({ length: WAVE_BARS }, (_, i) => {
        const phase = t * 3.2 + i * 0.38
        const voice = 0.22 + Math.abs(Math.sin(phase)) * 0.38 + Math.abs(Math.sin(phase * 2.7 + 0.4)) * 0.18
        const jitter = (Math.sin(phase * 5.1 + i) + 1) * 0.06
        return Math.min(1, Math.max(0.1, voice + jitter))
      }))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  return (
    <div className="st-wave" aria-hidden>
      {levels.map((level, i) => (
        <span key={i} className={active ? ' is-live' : ''} style={{ '--st-bar': level } as React.CSSProperties} />
      ))}
    </div>
  )
}

export default function StatusPrompter({
  headline,
  lead,
  sentences,
  durationLabel,
  scopeLabel,
  scopeOptions,
  activeScopeId,
  onScopeChange,
  periodLabel,
  periodOptions,
  onPeriodChange,
  busy,
  onRewrite,
  onTagro,
}: Props) {
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const isPlaying = playing || paused
  const leadLine = lead ?? `${scopeLabel} · ${periodLabel}`

  useEffect(() => {
    const body = bodyRef.current
    const flow = flowRef.current
    if (!body || !flow || !isPlaying || active < 0) return
    const line = flow.querySelector<HTMLElement>(`[data-i="${active}"]`)
    if (!line) return
    const target = line.offsetTop + line.offsetHeight / 2 - body.clientHeight / 2
    body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [active, isPlaying])

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
        if (!cancelledRef.current) {
          setPlaying(false)
          setPaused(false)
          setActive(-1)
        }
        return
      }
      const u = new SpeechSynthesisUtterance(sentences[i])
      u.lang = 'de-DE'
      u.rate = prefs.rate ?? 1
      u.pitch = prefs.pitch ?? 1
      if (voice) u.voice = voice
      u.onstart = () => setActive(i)
      u.onend = () => queue(i + 1)
      u.onerror = () => { setPlaying(false); setPaused(false); setActive(-1) }
      window.speechSynthesis.speak(u)
    }
    setPlaying(true)
    setPaused(false)
    setActive(startIdx)
    queue(startIdx)
  }, [sentences, supported])

  function togglePlay() {
    if (!supported) return
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

  const hasText = sentences.length > 0

  return (
    <>
      <style>{DECISION_CSS}</style>
      <style>{STATUSABFRAGE_CSS}</style>
      <div className="st-shell">
        <div className="dec-static-top st-static-top">
          <header className="dec-page-head st-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title festag-page-title">
                <span className="dec-dt">{headline}</span>
                <span className="dec-m-t">{headline}</span>
              </h1>
              <div className="dec-page-lead dec-dt">
                <p className="dec-page-lead-line festag-page-lead-line">{leadLine}</p>
              </div>
            </div>
            <div className="dec-page-actions dec-dt st-head-actions">
              <div className="st-scope-wrap">
                <button
                  type="button"
                  className={`st-scope-pill${scopeOpen ? ' on' : ''}`}
                  onClick={() => { setScopeOpen(v => !v); setPeriodOpen(false) }}
                  aria-expanded={scopeOpen}
                >
                  {scopeLabel}
                  <CaretDown size={11} weight="bold" />
                </button>
                {scopeOpen && (
                  <>
                    <button type="button" className="st-backdrop" aria-label="Schließen" onClick={() => setScopeOpen(false)} />
                    <div className="st-menu st-menu-left" role="listbox">
                      {scopeOptions.map(o => (
                        <button
                          key={o.id}
                          type="button"
                          role="option"
                          aria-selected={o.id === activeScopeId}
                          className={`st-menu-item${o.id === activeScopeId ? ' on' : ''}`}
                          onClick={() => { onScopeChange(o.id); setScopeOpen(false) }}
                        >
                          <span className="st-dot" style={{ background: o.color || '#5B647D' }} />
                          <span className="st-menu-label">{o.label}</span>
                          {o.id === activeScopeId && <Check size={12} weight="bold" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="st-period-wrap">
                <button
                  type="button"
                  className={`dec-head-tool${periodOpen ? ' on' : ''}`}
                  title={periodLabel}
                  aria-label="Zeitraum"
                  aria-expanded={periodOpen}
                  onClick={() => { setPeriodOpen(v => !v); setScopeOpen(false) }}
                >
                  <FunnelSimple size={15} weight="regular" />
                </button>
                {periodOpen && (
                  <>
                    <button type="button" className="st-backdrop" aria-label="Schließen" onClick={() => setPeriodOpen(false)} />
                    <div className="st-menu" role="listbox">
                      {periodOptions.map(p => (
                        <button
                          key={p}
                          type="button"
                          role="option"
                          aria-selected={p === periodLabel}
                          className={`st-menu-item${p === periodLabel ? ' on' : ''}`}
                          onClick={() => { onPeriodChange(p); setPeriodOpen(false) }}
                        >
                          <span className="st-menu-label">{p}</span>
                          {p === periodLabel && <Check size={12} weight="bold" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                className="dec-head-tool"
                title="Neu schreiben"
                aria-label="Neu schreiben"
                onClick={onRewrite}
                disabled={busy}
              >
                <Plus size={15} weight="bold" />
              </button>
              <button
                type="button"
                className="dec-head-tool"
                title="Aktualisieren"
                aria-label="Aktualisieren"
                onClick={onRewrite}
                disabled={busy}
              >
                <ArrowsClockwise size={15} weight="regular" />
              </button>
            </div>
          </header>
        </div>

        <div className={`st-stage${isPlaying ? ' is-playing' : ''}${hasText ? ' has-text' : ''}`}>
          <div
            className={`st-scroll${isPlaying ? ' is-playing' : ''}`}
            ref={bodyRef}
          >
            {hasText ? (
              <div
                className={`st-flow${isPlaying ? ' is-playing' : ' is-idle'}`}
                ref={flowRef}
              >
                {sentences.map((s, i) => {
                  const dist = active < 0 ? 99 : Math.abs(i - active)
                  const cls = i === active ? ' on' : dist === 1 ? ' near' : dist === 2 ? ' far' : ''
                  return (
                    <p key={i} data-i={i} className={`st-line${cls}`}>
                      {s}
                    </p>
                  )
                })}
              </div>
            ) : (
              <p className="st-empty">
                {busy ? 'Tagro schreibt den Statusbericht …' : 'Noch kein Bericht — oben neu schreiben oder Tagro öffnen.'}
              </p>
            )}
          </div>
        </div>

        <footer className="st-footer">
          <div className="st-footer-wave">
            <VoiceWaveform active={playing} />
            <span className="st-dur">{durationLabel}</span>
          </div>
          <div className="st-footer-controls">
            <button
              type="button"
              className="st-play"
              onClick={togglePlay}
              disabled={!hasText || !supported}
              aria-label={playing ? 'Pausieren' : paused ? 'Fortsetzen' : 'Bericht anhören'}
            >
              {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
            </button>
            <button type="button" className="st-tagro-btn" onClick={onTagro}>
              <Sparkle size={14} weight="fill" />
              Tagro bearbeiten
            </button>
          </div>
        </footer>
      </div>
    </>
  )
}
