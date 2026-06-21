'use client'

/**
 * StatusPrompter — the dashboard's status container, 1:1 to the Figma:
 *
 *   Keine Entscheidungen, kein Stress…        [Gesamtbericht ▾] [▽]
 *
 *        …vorheriger satz verblasst nach oben…          ← light gray
 *        Der Satz, der gerade vorgelesen wird.          ← near-black
 *        …nächster satz kommt von unten, verblasst…     ← light gray
 *
 *   [+ Statusbericht neu schreiben] [✏ Mit Tagro bearbeiten]
 *                       ||||||||||||||||  00:30 min  (🎙̸) (▶)
 *
 * Teleprompter mechanics: the report is rendered as ONE flowing block of
 * sentence-spans with generous line-height. Playback speaks sentence by
 * sentence (own SpeechSynthesis queue — perfect sync in every browser);
 * the active sentence turns dark and the block scrolls so it stays
 * vertically centered. Top/bottom fade via CSS mask.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CaretDown, Check, Funnel, MicrophoneSlash, Pause, PencilSimple,
  Play, Plus,
} from '@phosphor-icons/react'
import { getVoicePreferences } from '@/lib/voice'

export type PrompterScopeOption = { id: string; label: string; color?: string | null }

type Props = {
  headline: string
  /** Short, punchy sentences — already split by the caller. */
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
  headline, sentences, durationLabel,
  scopeLabel, scopeOptions, activeScopeId, onScopeChange,
  periodLabel, periodOptions, onPeriodChange,
  busy, onRewrite, onTagro,
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

  // ── Centering: keep the active sentence in the vertical middle. ─────────
  useEffect(() => {
    const body = bodyRef.current
    const flow = flowRef.current
    if (!body || !flow) return
    const span = flow.querySelector<HTMLElement>(`[data-i="${active}"]`)
    if (!span) return
    const target = span.offsetTop + span.offsetHeight / 2 - body.clientHeight / 2
    body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [active])

  const stopAll = useCallback(() => {
    cancelledRef.current = true
    try { window.speechSynthesis.cancel() } catch {}
    setPlaying(false); setPaused(false)
  }, [])

  useEffect(() => () => { stopAll() }, [stopAll])
  // New report → reset position.
  useEffect(() => { stopAll(); setActive(-1) }, [sentences.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sentence-by-sentence playback. ───────────────────────────────────────
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
    setPlaying(true); setPaused(false)
    setActive(startIdx)
    queue(startIdx)
  }, [sentences, supported])

  function toggle() {
    if (!supported) return
    if (playing) {
      window.speechSynthesis.pause()
      setPlaying(false); setPaused(true)
      return
    }
    if (paused) {
      window.speechSynthesis.resume()
      setPlaying(true); setPaused(false)
      return
    }
    speakFrom(Math.max(0, active === -1 ? 0 : active))
  }

  const hasText = sentences.length > 0

  return (
    <div className="spx">
      {/* ── Head row ── */}
      <header className="spx-head">
        <h1 className="spx-title">{headline}</h1>
        <div className="spx-head-right">
          <div className="spx-pop-wrap">
            <button type="button" className="spx-scope" onClick={() => { setScopeOpen(v => !v); setPeriodOpen(false) }} aria-expanded={scopeOpen}>
              {scopeLabel}
              <CaretDown size={13} weight="bold" />
            </button>
            {scopeOpen && (
              <>
                <button type="button" className="spx-backdrop" aria-label="Schließen" onClick={() => setScopeOpen(false)} />
                <div className="spx-menu" role="listbox">
                  {scopeOptions.map(o => (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      aria-selected={o.id === activeScopeId}
                      className={`spx-menu-item${o.id === activeScopeId ? ' on' : ''}`}
                      onClick={() => { onScopeChange(o.id); setScopeOpen(false) }}
                    >
                      <span className="spx-dot" style={{ background: o.color || '#5B647D' }} />
                      <span className="spx-menu-label">{o.label}</span>
                      {o.id === activeScopeId && <Check size={12} weight="bold" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="spx-pop-wrap">
            <button type="button" className="spx-filter" title={periodLabel} onClick={() => { setPeriodOpen(v => !v); setScopeOpen(false) }} aria-expanded={periodOpen}>
              <Funnel size={16} weight="fill" />
            </button>
            {periodOpen && (
              <>
                <button type="button" className="spx-backdrop" aria-label="Schließen" onClick={() => setPeriodOpen(false)} />
                <div className="spx-menu spx-menu-right" role="listbox">
                  {periodOptions.map(p => (
                    <button
                      key={p}
                      type="button"
                      role="option"
                      aria-selected={p === periodLabel}
                      className={`spx-menu-item${p === periodLabel ? ' on' : ''}`}
                      onClick={() => { onPeriodChange(p); setPeriodOpen(false) }}
                    >
                      <span className="spx-menu-label">{p}</span>
                      {p === periodLabel && <Check size={12} weight="bold" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Teleprompter — Spotify-style flowing lines, portal scale ── */}
      <div className="spx-body" ref={bodyRef}>
        {hasText ? (
          <div className="spx-flow" ref={flowRef}>
            {sentences.map((s, i) => {
              const dist = active < 0 ? 99 : Math.abs(i - active)
              const cls = i === active ? ' on' : dist === 1 ? ' near' : ''
              return (
                <span key={i} data-i={i} className={`spx-line${cls}`}>
                  {s}
                </span>
              )
            })}
          </div>
        ) : (
          <p className="spx-empty">
            {busy ? 'Tagro schreibt den Statusbericht …' : 'Noch kein Statusbericht — unten neu schreiben.'}
          </p>
        )}
      </div>

      {/* ── Bottom bar (Figma 166:521/475/472) ── */}
      <footer className="spx-bar">
        <button type="button" className="spx-ghost" onClick={onRewrite} disabled={busy}>
          <span className="spx-btn-ico"><Plus size={16} weight="bold" /></span>
          <span className="spx-btn-label">Statusbericht neu schreiben</span>
        </button>
        <button type="button" className="spx-tagro" onClick={onTagro}>
          <span className="spx-btn-ico"><PencilSimple size={16} weight="fill" /></span>
          <span className="spx-btn-label">Mit Tagro bearbeiten</span>
        </button>

        <div className="spx-wave-wrap" aria-hidden>
          <div className="spx-wave">
            {Array.from({ length: 32 }).map((_, i) => <span key={i} />)}
          </div>
          <span className="spx-dur">{durationLabel}</span>
        </div>

        <div className="spx-playzone">
          <span className="spx-mic" aria-hidden><MicrophoneSlash size={16} /></span>
          <button
            type="button"
            className="spx-play"
            onClick={toggle}
            disabled={!hasText || !supported}
            aria-label={playing ? 'Pausieren' : 'Bericht anhören'}
          >
            {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          </button>
        </div>
      </footer>

      <style>{`
        .spx {
          height: 100%;
          flex: 1 1 auto;
          min-height: 0;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 20px 0 18px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }

        /* ── Head — portal title scale, not hero billboard ─────────── */
        .spx-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 18px;
          padding: 0 var(--festag-content-pad-x, 56px);
          max-width: var(--festag-content-max, 1080px);
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .spx-title {
          margin: 0;
          font-size: 29px;
          font-weight: 400 !important;
          letter-spacing: -0.03em;
          line-height: 1.12;
          color: var(--text, #151617);
          max-width: 520px;
        }
        .spx-head-right { display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .spx-scope {
          display: inline-flex; align-items: center; gap: 8px;
          height: 36px; padding: 0 14px;
          background: var(--dec-pill-surface, rgba(255,255,255,.06));
          color: var(--dec-soft, #90959f);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 999px;
          box-shadow: none;
          font: inherit; font-size: 13px; font-weight: 500 !important; letter-spacing: 0;
          cursor: pointer;
          transition: background .14s, border-color .14s;
        }
        .spx-scope:hover {
          background: color-mix(in srgb, var(--surface-2) 65%, transparent);
          border-color: color-mix(in srgb, var(--border) 92%, transparent);
        }
        .spx-filter {
          width: 36px; height: 36px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--dec-pill-surface, rgba(255,255,255,.06));
          color: var(--text);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 999px;
          box-shadow: none;
          cursor: pointer;
          transition: background .14s, border-color .14s;
        }
        .spx-filter:hover {
          background: color-mix(in srgb, var(--surface-2) 65%, transparent);
        }
        [data-theme="dark"] .spx-scope, [data-theme="classic-dark"] .spx-scope,
        [data-theme="dark"] .spx-filter, [data-theme="classic-dark"] .spx-filter {
          box-shadow: none;
        }
        .spx-pop-wrap { position: relative; }
        .spx-backdrop { position: fixed; inset: 0; z-index: 40; background: transparent; border: 0; cursor: default; }
        .spx-menu {
          position: absolute; top: calc(100% + 8px); left: 0; z-index: 41;
          min-width: 220px; padding: 5px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 18px 44px -18px rgba(15,23,42,.3);
          display: flex; flex-direction: column; gap: 1px;
        }
        .spx-menu-right { left: auto; right: 0; }
        .spx-menu-item {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 11px; border: 0; border-radius: 9px;
          background: transparent; color: var(--text);
          font: inherit; font-size: 14px; font-weight: 400;
          text-align: left; cursor: pointer;
        }
        .spx-menu-item:hover, .spx-menu-item.on { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
        .spx-menu-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .spx-dot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }

        /* ── Teleprompter — Spotify lyrics rhythm, portal type scale ── */
        .spx-body {
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: none;
          padding: 0 var(--festag-content-pad-x, 56px);
          max-width: var(--festag-content-max, 1080px);
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 62%, transparent 92%);
          mask-image: linear-gradient(to bottom, transparent 0, #000 18%, #000 62%, transparent 92%);
        }
        .spx-body::-webkit-scrollbar { display: none; }
        .spx-flow {
          max-width: 620px;
          margin: 0 auto;
          padding: min(30vh, 200px) 0 min(26vh, 160px);
          display: flex;
          flex-direction: column;
          gap: 0.2em;
        }
        .spx-line {
          display: block;
          font-size: 17px;
          font-weight: 400 !important;
          line-height: 1.52;
          letter-spacing: -0.01em;
          color: color-mix(in srgb, var(--text) 20%, transparent);
          transition: color .32s ease, font-size .28s ease;
        }
        .spx-line.near {
          font-size: 18px;
          color: color-mix(in srgb, var(--text) 46%, transparent);
        }
        .spx-line.on {
          font-size: 22px;
          font-weight: 500 !important;
          line-height: 1.38;
          letter-spacing: -0.02em;
          color: var(--text, #16171c);
        }
        [data-theme="dark"] .spx-line,
        [data-theme="classic-dark"] .spx-line {
          color: color-mix(in srgb, var(--text) 24%, transparent);
        }
        [data-theme="dark"] .spx-line.near,
        [data-theme="classic-dark"] .spx-line.near {
          color: color-mix(in srgb, var(--text) 50%, transparent);
        }
        .spx-empty {
          height: 100%;
          display: flex; align-items: center; justify-content: center;
          margin: 0;
          color: var(--text-muted);
          font-size: 15px;
          font-weight: 400 !important;
          line-height: 1.55;
          max-width: 420px;
          text-align: center;
        }

        /* ── Bottom player bar — compact, not billboard CTAs ─────── */
        .spx-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 0 var(--festag-content-pad-x, 56px);
          max-width: var(--festag-content-max, 1080px);
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .spx-btn-ico {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
        }
        .spx-btn-label { width: 100%; text-align: center; padding: 0 20px 0 28px; white-space: nowrap; }
        .spx-ghost {
          position: relative;
          height: 40px; min-width: 0;
          padding: 0 16px 0 36px;
          background: transparent;
          color: var(--dec-soft, #90959f);
          border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
          border-radius: 999px;
          box-shadow: none;
          font: inherit; font-size: 13px; font-weight: 500 !important; letter-spacing: 0;
          cursor: pointer;
          transition: background .14s, color .14s, border-color .14s;
        }
        .spx-ghost .spx-btn-ico { color: var(--text); left: 10px; }
        .spx-ghost:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface-2) 55%, transparent);
          color: var(--text);
        }
        .spx-ghost:disabled { opacity: .55; cursor: not-allowed; }
        .spx-tagro {
          position: relative;
          height: 40px; min-width: 0;
          padding: 0 16px 0 34px;
          background: var(--dec-cta-bg, #5b647d); color: #fff;
          border: 0; border-radius: 999px;
          box-shadow: none;
          font: inherit; font-size: 13px; font-weight: 500 !important; letter-spacing: 0;
          cursor: pointer;
          transition: background .14s;
        }
        .spx-tagro .spx-btn-ico { left: 11px; color: #fff; }
        .spx-tagro:hover { background: var(--dec-cta-hover, #4d566c); }

        /* Waveform — 2px bars, 30px, #cacfd4, edges fade out. */
        .spx-wave-wrap {
          flex: 1 1 auto; min-width: 0;
          display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
          padding: 0 10px;
        }
        .spx-wave {
          width: 100%; max-width: 396px;
          height: 30px;
          display: flex; align-items: center; justify-content: space-between;
          -webkit-mask-image: linear-gradient(to right, transparent 0, #000 18%, #000 82%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0, #000 18%, #000 82%, transparent 100%);
        }
        .spx-wave span {
          width: 2px; height: 30px;
          border-radius: 12px;
          background: #cacfd4;
        }
        [data-theme="dark"] .spx-wave span,
        [data-theme="classic-dark"] .spx-wave span { background: rgba(255,255,255,.22); }
        .spx-dur {
          font-size: 12px;
          color: var(--dec-soft, #979a9f);
          letter-spacing: 0;
          font-variant-numeric: tabular-nums;
          padding-right: 4px;
        }

        .spx-playzone { position: relative; flex-shrink: 0; align-self: center; }
        .spx-mic {
          position: absolute; top: -42px; right: -4px;
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--surface, #fff);
          color: var(--text);
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          box-shadow: none;
        }
        .spx-play {
          width: 52px; height: 52px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--text, #16171c); color: var(--surface, #fff);
          border: 0; border-radius: 999px;
          cursor: pointer;
          box-shadow: none;
          transition: transform .14s, opacity .14s;
        }
        .spx-play:hover:not(:disabled) { opacity: .92; }
        .spx-play:active:not(:disabled) { transform: scale(.96); }
        .spx-play:disabled { opacity: .4; cursor: not-allowed; }
        [data-theme="dark"] .spx-play,
        [data-theme="classic-dark"] .spx-play { background: #f0f0f0; color: #111; }

        @media (max-width: 1280px) {
          .spx-head, .spx-body, .spx-bar { padding-left: 40px; padding-right: 40px; }
        }
        @media (max-width: 1024px) {
          .spx-wave-wrap { display: none; }
          .spx-line.on { font-size: 21px; }
        }
        @media (max-width: 768px) {
          .spx { padding: 12px 0 88px; display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .spx-line { transition: none; }
        }
      `}</style>
    </div>
  )
}
