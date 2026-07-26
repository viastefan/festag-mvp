'use client'

/**
 * CaptureRecorder — Live-Session Recorder (Claude / Atlas style).
 *
 * The client opens a full-screen session, hits record, and walks through
 * their website (in another tab) while talking. Tagro transcribes live,
 * the client can hit "Neue Seite" each time they navigate, and at stop
 * Tagro structures EVERYTHING into change-scripts grouped per section.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  ● 02:14 / 10:00         Projektname · Live-Feedback     [×] │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │                                                              │
 *   │   ▣ Aktuelle Seite                                           │
 *   │   https://staging.example.com/start                          │
 *   │                                                              │
 *   │   "Das Headline ist zu lang, kürz es um die hälfte."         │
 *   │   "Tausch das Foto gegen etwas mit Menschen."                │
 *   │                                                              │
 *   │   ─── Neue Seite ───                                         │
 *   │                                                              │
 *   │   ▣ /preise                                                  │
 *   │   "Die zweite Karte braucht einen klareren Button-Text."     │
 *   │                                                              │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │           [ + Neue Seite ]   [ ● Pause ]   [ ■ Stop ]        │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Hard cap: 10 minutes. The timer counts down and auto-stops at 0.
 * After stop, the session is POSTed to /api/captures with process:true
 * and Tagro groups changes by section.
 *
 * Public API:
 *   openCapture({ projectId, projectTitle?, defaultUrl? })
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  ArrowsClockwise, ArrowSquareOut, CheckCircle, Globe, Microphone,
  MicrophoneSlash, PaperPlaneTilt, Pause, Play, Plus, Stop, X,
} from '@phosphor-icons/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

const MAX_SECONDS = 10 * 60   // hard cap

type RecorderContext = {
  projectId: string
  projectTitle?: string
  defaultUrl?: string
}

type Section = {
  id: string
  url: string
  /** Each transcript chunk appended live. */
  bullets: string[]
  /** Live interim text (not yet committed). */
  draft: string
  startedAtMs: number
}

export type CaptureChange = {
  title?: string
  description?: string
  affected?: string
  suggested?: string
}

export type CaptureRow = {
  id: string
  project_id: string
  page_url: string | null
  page_title: string | null
  transcript: string
  tagro_summary: string | null
  structured_changes: CaptureChange[] | null
  warnings: string[] | null
  status: string
}

export function openCapture(detail: RecorderContext) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<RecorderContext>('festag:open-capture', { detail }))
}

function uid() { return Math.random().toString(36).slice(2, 9) }
function fmtClock(s: number) {
  const m = Math.floor(s / 60); const r = Math.max(0, s % 60)
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

export default function CaptureRecorder() {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState<RecorderContext | null>(null)

  // session state
  const [phase, setPhase] = useState<'setup' | 'recording' | 'paused' | 'review'>('setup')
  const [secondsLeft, setSecondsLeft] = useState(MAX_SECONDS)
  const [sections, setSections] = useState<Section[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [capture, setCapture] = useState<CaptureRow | null>(null)

  // setup form
  const [pageUrl, setPageUrl] = useState('')

  const tickRef = useRef<number | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  // ─── Open / close bridge ────────────────────────────────────────────────
  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<RecorderContext>).detail
      if (!d?.projectId) return
      setCtx(d)
      setPageUrl(d.defaultUrl || '')
      setSections([])
      setPhase('setup')
      setSecondsLeft(MAX_SECONDS)
      setCapture(null); setError('')
      setOpen(true)
    }
    window.addEventListener('festag:open-capture', onOpen as EventListener)
    return () => window.removeEventListener('festag:open-capture', onOpen as EventListener)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Esc never throws away a recording silently — only closes setup/review.
        if (phase === 'setup' || phase === 'review') close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, phase])

  // ─── Speech recognition (live) ──────────────────────────────────────────
  const { supported: micOk, listening: micOn, start: micStart, stop: micStop } =
    useSpeechRecognition({
      lang: 'de-DE',
      onResult: (text, isFinal) => {
        // Commit final chunks as new bullets in the current section.
        setSections(prev => {
          if (prev.length === 0) return prev
          const last = prev[prev.length - 1]
          const updated: Section = isFinal
            ? { ...last, draft: '', bullets: text.trim() ? [...last.bullets, text.trim()] : last.bullets }
            : { ...last, draft: text }
          return [...prev.slice(0, -1), updated]
        })
      },
      onError: () => setError('Sprachaufnahme unterbrochen.'),
    })

  // ─── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recording') {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
      return
    }
    tickRef.current = window.setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          // hard stop
          window.setTimeout(() => stopRecording(true), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Auto-scroll the bullet body when new lines land.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [sections])

  // ─── Actions ────────────────────────────────────────────────────────────
  function close() {
    setOpen(false); setCtx(null)
    setSections([]); setPhase('setup'); setCapture(null); setError('')
    if (micOn) micStop()
  }

  function beginSession() {
    if (!micOk) {
      setError('Dein Browser unterstützt die On-Device-Sprachaufnahme nicht. Probier Chrome oder Edge.')
      return
    }
    // First section uses the URL the client entered in setup.
    setSections([{ id: uid(), url: pageUrl.trim(), bullets: [], draft: '', startedAtMs: Date.now() }])
    setPhase('recording')
    setError('')
    try { micStart() } catch { setError('Sprachaufnahme konnte nicht starten.') }
  }

  function newSection() {
    const newUrl = window.prompt('URL der neuen Seite (optional):', '') ?? ''
    setSections(prev => [...prev, { id: uid(), url: newUrl.trim(), bullets: [], draft: '', startedAtMs: Date.now() }])
  }

  function pauseRecording() {
    setPhase('paused')
    if (micOn) micStop()
  }
  function resumeRecording() {
    setPhase('recording')
    try { micStart() } catch {/* ignore */}
  }

  async function stopRecording(autoFromCap = false) {
    if (micOn) micStop()
    setPhase('review')
    if (!ctx) return
    // Build a single transcript composed of sections so backend can split.
    const t = sections
      .filter(s => s.bullets.length > 0 || s.draft.trim())
      .map(s => {
        const header = s.url ? `[Seite: ${s.url}]` : '[Seite: ohne URL]'
        const lines = [...s.bullets, s.draft].filter(Boolean).map(b => `- ${b.trim()}`).join('\n')
        return `${header}\n${lines}`
      })
      .join('\n\n')
    if (!t.trim()) {
      if (autoFromCap) setError('Aufnahme beendet — kein gesprochener Inhalt erkannt.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/captures', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: ctx.projectId,
          pageUrl: sections[0]?.url || null,
          pageTitle: ctx.projectTitle || null,
          transcript: t,
          source: 'in_app',
          process: true,
        }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) { setError(d?.error || 'Tagro konnte den Eintrag nicht anlegen.'); return }
      setCapture(d?.capture as CaptureRow)
    } catch (e: any) {
      setError(e?.message || 'Netzwerkfehler.')
    } finally {
      setBusy(false)
    }
  }

  async function approveAndSend() {
    if (!capture) return
    setBusy(true)
    try {
      const r = await fetch(`/api/captures/${capture.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) { setError(d?.error || 'Senden fehlgeschlagen.'); return }
      setCapture(prev => prev ? { ...prev, status: 'approved' } : prev)
      window.setTimeout(close, 800)
    } finally { setBusy(false) }
  }

  const totalBullets = useMemo(
    () => sections.reduce((n, s) => n + s.bullets.length + (s.draft.trim() ? 1 : 0), 0),
    [sections],
  )

  if (!open) return null

  const node = (
    <div className="capx" role="dialog" aria-modal="true" aria-label="Live-Feedback">
      <div className="capx-shell" onClick={e => e.stopPropagation()}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="capx-top">
          <div className="capx-top-left">
            {phase === 'recording' || phase === 'paused' ? (
              <span className={`capx-rec-dot${phase === 'recording' ? ' on' : ''}`} aria-hidden />
            ) : null}
            <span className="capx-clock">
              {phase === 'setup' ? '10:00' : fmtClock(secondsLeft)}
              <small> / 10:00</small>
            </span>
            <span className="capx-ctx">
              {ctx?.projectTitle ? <strong>{ctx.projectTitle}</strong> : 'Projekt'}
              <span> · Live-Feedback</span>
            </span>
          </div>
          <button type="button" className="capx-iconbtn" onClick={close} aria-label="Schließen">
            <X size={16} />
          </button>
        </header>

        {/* ── Body ───────────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="capx-setup">
            <h2>Live-Feedback aufnehmen</h2>
            <p>Geh durch deine Vorschau und sprich frei — Tagro macht daraus Change-Scripts.</p>

            {/* The URL is bound to the project — no free input. */}
            <div className="capx-source">
              <span className="capx-source-tag">Vorschau</span>
              <span className="capx-source-url">{pageUrl || '— nicht hinterlegt —'}</span>
              {pageUrl && (
                <a className="capx-source-open" href={pageUrl} target="_blank" rel="noreferrer">
                  <ArrowSquareOut size={13} /> Im neuen Tab öffnen
                </a>
              )}
            </div>

            {!pageUrl && (
              <p className="capx-err">
                Dein Developer hat noch keine Vorschau-URL hinterlegt. Sobald sie eingetragen
                ist, kannst du das Live-Feedback hier starten.
              </p>
            )}

            {/* Extension teaser — points to the deeper experience. */}
            <aside className="capx-ext">
              <div className="capx-ext-mark" aria-hidden>
                <span /><span /><span />
              </div>
              <div className="capx-ext-text">
                <strong>Tagro Chrome-Erweiterung</strong>
                <p>Aufnehmen direkt auf der Website, mit Element-Markieren.</p>
                <Link className="capx-ext-cta" href="/download#chrome-extension">
                  Erweiterung laden
                </Link>
              </div>
            </aside>

            <p className="capx-hint">Vorschau im zweiten Tab öffnen · max. 10 Minuten.</p>
            {error && <p className="capx-err">{error}</p>}
            <div className="capx-setup-actions">
              <button type="button" className="capx-ghost" onClick={close}>Abbrechen</button>
              <button
                type="button"
                className="capx-primary"
                onClick={beginSession}
                disabled={!pageUrl}
              >
                <Play size={14} weight="fill" /> Aufnahme starten
              </button>
            </div>
          </div>
        )}

        {(phase === 'recording' || phase === 'paused') && (
          <div className="capx-live" ref={bodyRef}>
            {sections.length === 0 ? (
              <p className="capx-empty">Sprich los — Tagro hört zu.</p>
            ) : sections.map((s, i) => (
              <section key={s.id} className="capx-section">
                {i > 0 && <div className="capx-divider"><span>Neue Seite</span></div>}
                <header className="capx-section-head">
                  <Globe size={12} />
                  <strong>{s.url || `Abschnitt ${i + 1}`}</strong>
                </header>
                {s.bullets.length === 0 && !s.draft && (
                  <p className="capx-section-empty">Noch keine Sätze für diesen Abschnitt.</p>
                )}
                <ul className="capx-bullets">
                  {s.bullets.map((b, k) => <li key={k}>{b}</li>)}
                  {s.draft && <li className="capx-draft">{s.draft}<span className="capx-caret" /></li>}
                </ul>
              </section>
            ))}
          </div>
        )}

        {phase === 'review' && (
          <div className="capx-review">
            {busy && !capture ? (
              <div className="capx-processing">
                <ArrowsClockwise size={28} className="capx-spin" />
                <p>Tagro strukturiert deine Aufnahme …</p>
              </div>
            ) : capture ? (
              <>
                <h2>{capture.tagro_summary || 'Aufnahme strukturiert'}</h2>
                <div className="capx-changes">
                  {(capture.structured_changes || []).length === 0 ? (
                    <p className="capx-empty">Tagro hat keine konkreten Änderungen erkannt. Probier eine neue Aufnahme mit mehr Detail.</p>
                  ) : (
                    (capture.structured_changes || []).map((ch, i) => (
                      <article key={i} className="capx-change">
                        <header>
                          <strong>{ch.title || `Änderung ${i + 1}`}</strong>
                          {ch.affected && <span>{ch.affected}</span>}
                        </header>
                        {ch.description && <p>{ch.description}</p>}
                        {ch.suggested && <p className="capx-change-sug"><em>Vorschlag:</em> {ch.suggested}</p>}
                      </article>
                    ))
                  )}
                </div>
                {(capture.warnings || []).length > 0 && (
                  <div className="capx-warns">
                    {(capture.warnings || []).map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                )}
                <div className="capx-review-actions">
                  <button type="button" className="capx-ghost" onClick={() => { setCapture(null); setSections([]); setPhase('setup'); setSecondsLeft(MAX_SECONDS) }}>
                    Neue Aufnahme
                  </button>
                  <button type="button" className="capx-primary" onClick={approveAndSend} disabled={busy || capture.status === 'approved'}>
                    {capture.status === 'approved'
                      ? <><CheckCircle size={14} weight="fill" /> An Dev geschickt</>
                      : <><PaperPlaneTilt size={14} /> An Dev senden</>}
                  </button>
                </div>
              </>
            ) : (
              <p className="capx-empty">{error || 'Keine Aufnahme.'}</p>
            )}
          </div>
        )}

        {/* ── Action bar (only while recording) ─────────────────────── */}
        {(phase === 'recording' || phase === 'paused') && (
          <footer className="capx-actions">
            <button type="button" className="capx-action capx-action-ghost" onClick={newSection}>
              <Plus size={14} /> Neue Seite
            </button>
            {phase === 'recording' ? (
              <button type="button" className="capx-action capx-action-ghost" onClick={pauseRecording}>
                <Pause size={14} weight="fill" /> Pause
              </button>
            ) : (
              <button type="button" className="capx-action capx-action-ghost" onClick={resumeRecording}>
                <Play size={14} weight="fill" /> Weiter
              </button>
            )}
            <button type="button" className="capx-action capx-action-stop" onClick={() => stopRecording(false)}>
              <Stop size={14} weight="fill" /> Aufnahme beenden
            </button>
            <span className="capx-action-meta">{totalBullets} Sätze · {sections.length} Abschnitt{sections.length === 1 ? '' : 'e'}</span>
          </footer>
        )}
      </div>

      <style jsx>{`
        .capx {
          position: fixed; inset: 0; z-index: 16200;
          background: var(--modal-backdrop, rgba(245, 245, 247, 0.72));
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          display: flex; align-items: stretch; justify-content: center;
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          color: var(--text);
        }
        .capx-shell {
          width: min(760px, 100%);
          max-height: 100dvh;
          background: var(--surface);
          border-left: 1px solid var(--border);
          border-right: 1px solid var(--border);
          display: grid;
          grid-template-rows: auto 1fr auto;
          overflow: hidden;
        }
        @media (min-width: 769px) {
          .capx { padding: 18px; }
          .capx-shell {
            border-radius: 22px;
            border: 1px solid var(--border);
            max-height: min(92vh, 880px);
            box-shadow: 0 30px 80px -20px rgba(0,0,0,.55);
          }
        }

        /* ── Header ────────────────────────────────────────────────── */
        .capx-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px;
          padding: 14px 18px;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
        }
        .capx-top-left { display: inline-flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
        .capx-rec-dot {
          width: 10px; height: 10px; border-radius: 999px;
          background: color-mix(in srgb, var(--text) 30%, transparent);
        }
        .capx-rec-dot.on {
          background: #E11D48;
          box-shadow: 0 0 0 0 rgba(225,29,72,.55);
          animation: capxPulse 1.1s ease-out infinite;
        }
        @keyframes capxPulse {
          0% { box-shadow: 0 0 0 0 rgba(225,29,72,.55); }
          70% { box-shadow: 0 0 0 8px rgba(225,29,72,0); }
          100% { box-shadow: 0 0 0 0 rgba(225,29,72,0); }
        }
        .capx-clock {
          display: inline-flex; align-items: baseline; gap: 4px;
          font-variant-numeric: tabular-nums;
          font-size: 18px; font-weight: 600; letter-spacing: -.01em;
        }
        .capx-clock small { color: var(--text-muted); font-size: 12.5px; font-weight: 500; }
        .capx-ctx {
          display: inline-flex; align-items: baseline; gap: 5px;
          color: var(--text-secondary); font-size: 13px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .capx-ctx strong { color: var(--text); font-weight: 500; }
        .capx-iconbtn {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; color: var(--text-secondary);
          border: 0; border-radius: 999px; cursor: pointer;
          transition: background .14s, color .14s;
        }
        .capx-iconbtn:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }

        /* ── Setup ─────────────────────────────────────────────────── */
        .capx-setup {
          padding: 24px 22px 22px;
          display: flex; flex-direction: column; gap: 14px;
          overflow-y: auto;
        }
        .capx-setup h2 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
        .capx-setup p { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.55; }
        .capx-field { display: flex; flex-direction: column; gap: 6px; }
        .capx-field > span {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12.5px; font-weight: 500; color: var(--text-secondary);
        }
        .capx-input {
          height: 42px; padding: 0 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text); font: inherit; font-size: 14.5px;
          outline: 0; transition: border-color .14s, background .14s;
        }
        .capx-input:focus {
          border-color: color-mix(in srgb, var(--text) 25%, transparent);
          background: var(--surface);
        }
        .capx-hint { color: var(--text-muted); font-size: 12.5px; line-height: 1.5; }
        .capx-tab-open {
          align-self: flex-start;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 999px;
          background: var(--surface-2); color: var(--text-secondary);
          font-size: 12.5px; text-decoration: none;
        }
        .capx-tab-open:hover { color: var(--text); }

        .capx-source {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 12px 14px;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 14px;
        }
        .capx-source-tag {
          display: inline-flex; align-items: center;
          padding: 2px 7px; border-radius: 999px;
          background: #5B647D; color: #fff;
          font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
        }
        .capx-source-url {
          flex: 1 1 auto; min-width: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          font-size: 13.5px; font-weight: 500; color: var(--text);
          font-variant-numeric: tabular-nums;
        }
        .capx-source-open {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--text-secondary); font-size: 12.5px; text-decoration: none;
        }
        .capx-source-open:hover { color: var(--text); }

        /* Extension teaser — points to the deeper Chrome experience. */
        .capx-ext {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 14px 14px;
          background: color-mix(in srgb, #5B647D 8%, transparent);
          border: 1px solid color-mix(in srgb, #5B647D 22%, transparent);
          border-radius: 14px;
        }
        .capx-ext-mark {
          position: relative;
          width: 44px; height: 44px;
          flex-shrink: 0;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #7682A0, #4d566c);
          display: inline-flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .capx-ext-mark span {
          width: 4px; height: 14px; margin: 0 2px;
          background: rgba(255,255,255,.85);
          border-radius: 999px;
          animation: capxOrb 1.4s ease-in-out infinite;
        }
        .capx-ext-mark span:nth-child(2) { animation-delay: .15s; height: 22px; }
        .capx-ext-mark span:nth-child(3) { animation-delay: .3s; }
        @keyframes capxOrb {
          0%, 100% { transform: scaleY(.6); opacity: .7; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .capx-ext-text { display: flex; flex-direction: column; gap: 3px; }
        .capx-ext-text strong { font-size: 14px; font-weight: 600; color: var(--text); }
        .capx-ext-text p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text-secondary); }
        .capx-ext-cta {
          font-size: 11.5px;
          color: #5B647D;
          font-weight: 500;
          text-decoration: none;
        }
        .capx-ext-cta:hover { color: var(--text); text-decoration: underline; }
        .capx-setup-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 6px; }

        /* ── Live transcript ───────────────────────────────────────── */
        .capx-live {
          padding: 18px 22px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 18px;
        }
        .capx-empty { color: var(--text-muted); font-size: 14px; }
        .capx-section { display: flex; flex-direction: column; gap: 8px; }
        .capx-section-head {
          display: inline-flex; align-items: center; gap: 7px;
          color: var(--text-secondary); font-size: 12.5px; font-weight: 500;
        }
        .capx-section-head strong { color: var(--text); font-weight: 600; font-size: 14px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60ch; }
        .capx-section-empty { margin: 0; color: var(--text-muted); font-size: 13px; font-style: italic; }
        .capx-bullets {
          margin: 0; padding-left: 0;
          list-style: none;
          display: flex; flex-direction: column; gap: 6px;
        }
        .capx-bullets li {
          position: relative;
          padding: 8px 12px 8px 28px;
          background: var(--surface-2);
          border-radius: 10px;
          font-size: 14.5px; line-height: 1.5; color: var(--text);
        }
        .capx-bullets li::before {
          content: '';
          position: absolute; left: 12px; top: 14px;
          width: 6px; height: 6px; border-radius: 999px;
          background: var(--text-muted);
        }
        .capx-draft { color: var(--text-muted) !important; font-style: italic; }
        .capx-draft .capx-caret {
          display: inline-block; width: 6px; height: 14px; vertical-align: -2px;
          background: var(--text); margin-left: 4px; animation: capxBlink 1s steps(2) infinite;
        }
        @keyframes capxBlink { 50% { opacity: 0; } }
        .capx-divider {
          display: flex; align-items: center; gap: 10px;
          color: var(--text-muted); font-size: 11px;
          letter-spacing: .08em; text-transform: uppercase;
        }
        .capx-divider::before, .capx-divider::after {
          content: ''; flex: 1; height: 1px;
          background: color-mix(in srgb, var(--border) 60%, transparent);
        }

        /* ── Action bar ────────────────────────────────────────────── */
        .capx-actions {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 12px 18px;
          border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: var(--surface);
        }
        .capx-action {
          display: inline-flex; align-items: center; gap: 7px;
          height: 38px; padding: 0 14px;
          background: transparent; color: var(--text);
          border: 1px solid var(--border); border-radius: 999px;
          font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer;
          transition: background .14s, color .14s;
        }
        .capx-action-ghost:hover { background: var(--surface-2); }
        .capx-action-stop {
          background: #E11D48; color: #fff; border-color: transparent;
          margin-left: auto;
          box-shadow: 0 10px 22px -10px rgba(225,29,72,.6);
        }
        .capx-action-stop:hover { background: #be1740; }
        .capx-action-meta { color: var(--text-muted); font-size: 12px; }

        /* ── Buttons (primary / ghost shared) ─────────────────────── */
        .capx-primary {
          display: inline-flex; align-items: center; gap: 7px;
          height: 40px; padding: 0 18px;
          background: #5B647D; color: #fff; border: 0; border-radius: 999px;
          font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer;
          box-shadow: 0 12px 28px -14px rgba(91,100,125,0.6);
          transition: background .14s, transform .14s;
        }
        .capx-primary:hover:not(:disabled) { background: #4d566c; }
        .capx-primary:active:not(:disabled) { transform: scale(.985); }
        .capx-primary:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
        .capx-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          height: 40px; padding: 0 16px;
          background: transparent; color: var(--text-secondary);
          border: 1px solid var(--border); border-radius: 999px;
          font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .capx-ghost:hover { background: var(--surface-2); color: var(--text); }

        /* ── Review ────────────────────────────────────────────────── */
        .capx-review { padding: 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        .capx-review h2 { margin: 0; font-size: 17px; font-weight: 500; line-height: 1.45; }
        .capx-processing {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 60px 0;
          color: var(--text-muted);
        }
        .capx-spin { animation: capxSpin 1s linear infinite; color: var(--text); }
        @keyframes capxSpin { to { transform: rotate(360deg); } }
        .capx-changes { display: flex; flex-direction: column; gap: 10px; }
        .capx-change { padding: 14px 16px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; }
        .capx-change header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
        .capx-change header strong { font-size: 14.5px; font-weight: 600; }
        .capx-change header span { font-size: 11.5px; color: var(--text-muted); }
        .capx-change p { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }
        .capx-change-sug em { color: var(--text-muted); font-style: normal; }
        .capx-warns { display: flex; flex-direction: column; gap: 6px; }
        .capx-warns p {
          margin: 0; padding: 10px 12px;
          background: color-mix(in srgb, #d4882b 12%, transparent);
          border-radius: 8px; font-size: 12.5px; color: var(--text);
        }
        .capx-review-actions { display: flex; gap: 8px; justify-content: space-between; flex-wrap: wrap; margin-top: 6px; }
        .capx-err {
          margin: 0; padding: 10px 12px;
          background: color-mix(in srgb, #d9534f 14%, transparent);
          border-radius: 10px; font-size: 13px; color: var(--text);
        }
      `}</style>
    </div>
  )

  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}
