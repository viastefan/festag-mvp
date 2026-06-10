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
  CaretDown, Check, FunnelSimple, MicrophoneSlash, Pause, PencilSimple,
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
  const flowRef = useRef<HTMLParagraphElement | null>(null)
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
              <FunnelSimple size={16} />
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

      {/* ── Teleprompter ── */}
      <div className="spx-body" ref={bodyRef}>
        {hasText ? (
          <p className="spx-flow" ref={flowRef}>
            {sentences.map((s, i) => (
              <span key={i} data-i={i} className={`spx-s${i === active ? ' on' : ''}`}>
                {s}{' '}
              </span>
            ))}
          </p>
        ) : (
          <p className="spx-empty">
            {busy ? 'Tagro schreibt den Statusbericht …' : 'Noch kein Statusbericht — unten neu schreiben.'}
          </p>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <footer className="spx-bar">
        <button type="button" className="spx-ghost" onClick={onRewrite} disabled={busy}>
          <Plus size={15} weight="regular" />
          Statusbericht neu schreiben
        </button>
        <button type="button" className="spx-tagro" onClick={onTagro}>
          <PencilSimple size={15} weight="fill" />
          Mit Tagro bearbeiten
        </button>

        <div className="spx-wave-wrap" aria-hidden>
          <div className="spx-wave">
            {Array.from({ length: 42 }).map((_, i) => <span key={i} />)}
          </div>
          <span className="spx-dur">{durationLabel}</span>
        </div>

        <div className="spx-playzone">
          <span className="spx-mic" aria-hidden><MicrophoneSlash size={14} /></span>
          <button
            type="button"
            className="spx-play"
            onClick={toggle}
            disabled={!hasText || !supported}
            aria-label={playing ? 'Pausieren' : 'Bericht anhören'}
          >
            {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
          </button>
        </div>
      </footer>

      <style>{`
        .spx {
          height: 100%;
          flex: 1 1 auto;       /* fills .dc-shell (flex column) reliably */
          min-height: 0;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 8px;
          padding: 26px 8px 18px;
        }

        /* Head */
        .spx-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 18px;
          padding: 0 26px;
        }
        .spx-title {
          margin: 0;
          font-size: clamp(26px, 2.6vw, 34px);
          font-weight: 600;
          letter-spacing: -.02em;
          line-height: 1.15;
          color: var(--text);
        }
        .spx-head-right { display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .spx-scope {
          display: inline-flex; align-items: center; gap: 7px;
          height: 38px; padding: 0 16px;
          background: transparent;
          color: var(--text-muted);
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius: 999px;
          font: inherit; font-size: 14px; font-weight: 500;
          cursor: pointer;
          transition: color .14s, border-color .14s, background .14s;
        }
        .spx-scope:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .spx-filter {
          width: 38px; height: 38px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent;
          color: var(--text-muted);
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius: 999px;
          cursor: pointer;
          transition: color .14s, background .14s;
        }
        .spx-filter:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .spx-pop-wrap { position: relative; }
        .spx-backdrop { position: fixed; inset: 0; z-index: 40; background: transparent; border: 0; cursor: default; }
        .spx-menu {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 41;
          min-width: 210px; padding: 5px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 18px 44px -18px rgba(15,23,42,.3);
          display: flex; flex-direction: column; gap: 1px;
        }
        .spx-menu-right { left: auto; right: 0; }
        .spx-menu-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border: 0; border-radius: 8px;
          background: transparent; color: var(--text);
          font: inherit; font-size: 13px; font-weight: 500;
          text-align: left; cursor: pointer;
        }
        .spx-menu-item:hover, .spx-menu-item.on { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
        .spx-menu-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .spx-dot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }

        /* Teleprompter body */
        .spx-body {
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: none;
          padding: 0 26px;
          /* fade above + below — exactly the Figma look */
          -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%);
        }
        .spx-body::-webkit-scrollbar { display: none; }
        .spx-flow {
          max-width: 880px;
          margin: 0 auto;
          /* breathing room so first/last sentence can reach the center */
          padding: 38vh 0 38vh;
          font-size: clamp(22px, 2.4vw, 31px);
          font-weight: 500;
          line-height: 2.45;
          letter-spacing: -.005em;
          color: color-mix(in srgb, var(--text) 16%, transparent);
          transition: color .2s;
        }
        [data-theme="dark"] .spx-flow,
        [data-theme="classic-dark"] .spx-flow {
          color: color-mix(in srgb, var(--text) 22%, transparent);
        }
        .spx-s { transition: color .35s ease; cursor: default; }
        .spx-s.on { color: var(--text); }
        .spx-empty {
          height: 100%;
          display: flex; align-items: center; justify-content: center;
          margin: 0;
          color: var(--text-muted);
          font-size: 15px;
        }

        /* Bottom bar */
        .spx-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 4px 26px 0;
        }
        .spx-ghost {
          display: inline-flex; align-items: center; gap: 9px;
          height: 52px; padding: 0 22px;
          background: var(--surface);
          color: var(--text-secondary);
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius: 999px;
          font: inherit; font-size: 14.5px; font-weight: 500;
          cursor: pointer;
          transition: color .14s, background .14s;
          white-space: nowrap;
        }
        .spx-ghost:hover:not(:disabled) { color: var(--text); background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .spx-ghost:disabled { opacity: .55; cursor: not-allowed; }
        .spx-tagro {
          display: inline-flex; align-items: center; gap: 9px;
          height: 52px; padding: 0 24px;
          background: #5B647D; color: #fff;
          border: 0; border-radius: 999px;
          font: inherit; font-size: 14.5px; font-weight: 500;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 14px 30px -14px rgba(91,100,125,.55);
          transition: background .14s, transform .14s;
        }
        .spx-tagro:hover { background: #4d566c; }
        .spx-tagro:active { transform: scale(.985); }

        .spx-wave-wrap {
          flex: 1 1 auto; min-width: 0;
          display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
          padding: 0 6px;
        }
        .spx-wave {
          width: 100%; max-width: 380px;
          height: 30px;
          display: flex; align-items: center; justify-content: space-between; gap: 3px;
        }
        .spx-wave span {
          flex: 1 1 auto;
          height: 100%;
          max-width: 3px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--text) 12%, transparent);
        }
        .spx-wave span:nth-child(3n)  { height: 60%; }
        .spx-wave span:nth-child(4n)  { height: 80%; }
        .spx-wave span:nth-child(5n)  { height: 45%; }
        .spx-dur { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }

        .spx-playzone { position: relative; flex-shrink: 0; }
        .spx-mic {
          position: absolute; top: -14px; right: 54px;
          width: 30px; height: 30px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--surface);
          color: var(--text-muted);
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius: 999px;
          box-shadow: 0 4px 12px -6px rgba(15,23,42,.18);
        }
        .spx-play {
          width: 58px; height: 58px;
          display: inline-flex; align-items: center; justify-content: center;
          background: #16181D; color: #fff;
          border: 0; border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 16px 34px -14px rgba(0,0,0,.55);
          transition: transform .14s, background .14s;
        }
        .spx-play:hover:not(:disabled) { background: #23262d; }
        .spx-play:active:not(:disabled) { transform: scale(.96); }
        .spx-play:disabled { opacity: .4; cursor: not-allowed; }
        [data-theme="dark"] .spx-play,
        [data-theme="classic-dark"] .spx-play { background: #F0F0F0; color: #111; }

        @media (max-width: 900px) {
          .spx-bar { flex-wrap: wrap; }
          .spx-wave-wrap { order: 4; flex-basis: 100%; align-items: center; }
        }
        @media (max-width: 768px) {
          .spx { padding: 14px 0 90px; }
          .spx-head { padding: 0 16px; }
          .spx-body { padding: 0 16px; }
          .spx-bar { padding: 0 16px; gap: 8px; }
          .spx-ghost, .spx-tagro { height: 46px; padding: 0 16px; font-size: 13.5px; }
          .spx-wave-wrap { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .spx-s { transition: none; }
        }
      `}</style>
    </div>
  )
}
