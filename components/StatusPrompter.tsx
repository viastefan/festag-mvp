'use client'

/**
 * StatusPrompter — Statusabfrage desktop view.
 * Read mode: normal flowing copy (portal scale).
 * Play mode: Spotify-style line highlight + soft scroll mask.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CaretDown, Check, Funnel, Pause, PencilSimple, Play, Plus,
} from '@phosphor-icons/react'
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

  function toggle() {
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
      <style>{STATUSABFRAGE_CSS}</style>
      <div className="st-shell">
        <div className="st-static-top">
          <header className="st-head">
            <div className="st-head-copy">
              <h1 className="st-title">{headline}</h1>
              <p className="st-lead">{leadLine}</p>
            </div>
            <div className="st-head-actions">
              <div className="st-pop-wrap">
                <button
                  type="button"
                  className="st-scope"
                  onClick={() => { setScopeOpen(v => !v); setPeriodOpen(false) }}
                  aria-expanded={scopeOpen}
                >
                  {scopeLabel}
                  <CaretDown size={12} weight="bold" />
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
              <div className="st-pop-wrap">
                <button
                  type="button"
                  className="st-filter"
                  title={periodLabel}
                  onClick={() => { setPeriodOpen(v => !v); setScopeOpen(false) }}
                  aria-expanded={periodOpen}
                >
                  <Funnel size={15} weight="fill" />
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
            </div>
          </header>
        </div>

        <div
          className={`st-scroll${isPlaying ? ' is-playing' : ''}`}
          ref={bodyRef}
        >
          {hasText ? (
            <div
              className={`st-flow${isPlaying ? ' is-playing' : ' is-reading'}`}
              ref={flowRef}
            >
              {sentences.map((s, i) => {
                const dist = active < 0 ? 99 : Math.abs(i - active)
                const cls = i === active ? ' on' : dist === 1 ? ' near' : ''
                return (
                  <span key={i} data-i={i} className={`st-line${cls}`}>
                    {s}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="st-empty">
              {busy ? 'Tagro schreibt den Statusbericht …' : 'Noch kein Statusbericht — unten neu schreiben.'}
            </p>
          )}
        </div>

        <footer className="st-player">
          <button type="button" className="st-btn" onClick={onRewrite} disabled={busy}>
            <span className="st-btn-ico"><Plus size={14} weight="bold" /></span>
            Neu schreiben
          </button>
          <button type="button" className="st-btn st-btn--primary" onClick={onTagro}>
            <span className="st-btn-ico"><PencilSimple size={14} weight="fill" /></span>
            Mit Tagro
          </button>
          <div className="st-wave-wrap" aria-hidden>
            <div className="st-wave">
              {Array.from({ length: 28 }).map((_, i) => <span key={i} />)}
            </div>
            <span className="st-dur">{durationLabel}</span>
          </div>
          <button
            type="button"
            className="st-play"
            onClick={toggle}
            disabled={!hasText || !supported}
            aria-label={playing ? 'Pausieren' : 'Bericht anhören'}
          >
            {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          </button>
        </footer>
      </div>
    </>
  )
}
