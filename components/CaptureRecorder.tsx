'use client'

/**
 * CaptureRecorder — the client-side recorder for the capture loop.
 *
 * Opens as a focused modal anchored to a project. The client:
 *   1. (Optional) sets the URL of the page they're commenting on.
 *   2. Speaks or types their feedback.
 *   3. Hits "Tagro vorbereiten" → POST /api/captures with process:true.
 *      Tagro structures the transcript into change scripts.
 *   4. Reviews the structured output and either approves (sends to dev)
 *      or keeps editing (saves as draft).
 *
 * Public API:
 *   <CaptureRecorder open onClose projectId projectTitle defaultUrl? />
 *
 * Or via the global event:
 *   window.dispatchEvent(new CustomEvent('festag:open-capture', {
 *     detail: { projectId, projectTitle, defaultUrl }
 *   }))
 *
 * The Recorder also lives mounted once in ClientAppShell so any page can
 * pop it open without per-page wiring.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowsClockwise, CheckCircle, Globe, Microphone, MicrophoneSlash,
  PaperPlaneTilt, Sparkle, X,
} from '@phosphor-icons/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

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

type RecorderContext = {
  projectId: string
  projectTitle?: string
  defaultUrl?: string
}

export function openCapture(detail: RecorderContext) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<RecorderContext>('festag:open-capture', { detail }))
}

export default function CaptureRecorder() {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState<RecorderContext | null>(null)
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [busy, setBusy] = useState(false)
  const [capture, setCapture] = useState<CaptureRow | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Open event bridge
  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<RecorderContext>).detail
      if (!d?.projectId) return
      setCtx(d)
      setPageUrl(d.defaultUrl || '')
      setPageTitle('')
      setTranscript('')
      setCapture(null)
      setError('')
      setOpen(true)
    }
    window.addEventListener('festag:open-capture', onOpen as EventListener)
    return () => window.removeEventListener('festag:open-capture', onOpen as EventListener)
  }, [])

  // Esc + body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
    }
  }, [open])

  // Speech input
  const dictBase = useRef('')
  const [rec, setRec] = useState(false)
  const { supported: micOk, listening: micOn, start: micStart, stop: micStop } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (text, isFinal) => {
      const combined = (dictBase.current ? dictBase.current + ' ' : '') + text
      setTranscript(combined); if (isFinal) dictBase.current = combined
    },
    onError: () => setRec(false),
  })
  useEffect(() => { if (!micOn) setRec(false) }, [micOn])
  function toggleMic() {
    if (!micOk) return
    if (rec || micOn) { micStop(); setRec(false); return }
    dictBase.current = transcript.trim(); setRec(true); micStart()
  }

  function close() {
    setOpen(false); setCtx(null); setCapture(null); setError('')
    setTranscript(''); setPageUrl(''); setPageTitle('')
  }

  async function structureCapture() {
    if (!ctx?.projectId) return
    const t = transcript.trim()
    if (!t) { setError('Sag oder schreib kurz, was Tagro übersetzen soll.'); return }
    setError(''); setBusy(true)
    try {
      const r = await fetch('/api/captures', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: ctx.projectId,
          pageUrl: pageUrl.trim() || null,
          pageTitle: pageTitle.trim() || null,
          transcript: t,
          source: 'in_app',
          process: true,
        }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) {
        setError(d?.error ? `Fehler: ${d.error}` : 'Tagro konnte den Eintrag nicht anlegen.')
        return
      }
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
      // Quick confirmation flash, then close
      window.setTimeout(close, 700)
      setCapture(prev => prev ? { ...prev, status: 'approved' } : prev)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const node = (
    <div className="cr" role="dialog" aria-modal="true" aria-label="Feedback aufnehmen">
      <div className="cr-backdrop" onClick={close} aria-hidden />
      <div className="cr-shell" onClick={e => e.stopPropagation()}>
        <header className="cr-top">
          <span className="cr-top-ctx">
            <Sparkle size={13} weight="fill" />
            Feedback aufnehmen
            {ctx?.projectTitle ? <> · <strong>{ctx.projectTitle}</strong></> : null}
          </span>
          <button type="button" className="cr-iconbtn" onClick={close} aria-label="Schließen"><X size={16} /></button>
        </header>

        {!capture ? (
          /* ── recorder state ───────────────────────────────────────── */
          <div className="cr-body">
            <div className="cr-meta">
              <label className="cr-field">
                <span><Globe size={13} /> Seite</span>
                <input
                  type="url"
                  className="cr-input"
                  placeholder="https://staging.example.com/…"
                  value={pageUrl}
                  onChange={e => setPageUrl(e.target.value)}
                />
              </label>
              <label className="cr-field">
                <span>Bereich (optional)</span>
                <input
                  type="text"
                  className="cr-input"
                  placeholder="z.B. Startseite · Hero"
                  value={pageTitle}
                  onChange={e => setPageTitle(e.target.value)}
                />
              </label>
            </div>

            <div className="cr-record">
              <textarea
                ref={inputRef}
                className="cr-textarea"
                placeholder="Was soll geändert werden? Sprich oder schreib einfach drauflos — Tagro macht daraus saubere Change-Scripts für deinen Developer."
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={6}
              />
              <div className="cr-record-actions">
                {micOk && (
                  <button type="button" className={`cr-mic${rec ? ' is-rec' : ''}`} onClick={toggleMic}>
                    {rec ? <MicrophoneSlash size={16} weight="fill" /> : <Microphone size={16} />}
                    {rec ? 'Aufnahme stoppen' : 'Per Sprache aufnehmen'}
                  </button>
                )}
                <button type="button" className="cr-primary" onClick={structureCapture} disabled={busy || !transcript.trim()}>
                  {busy ? <><ArrowsClockwise size={14} className="cr-spin" /> Tagro strukturiert …</> : <><Sparkle size={14} weight="fill" /> Tagro vorbereiten</>}
                </button>
              </div>
              {error && <p className="cr-err">{error}</p>}
            </div>
          </div>
        ) : (
          /* ── review state ─────────────────────────────────────────── */
          <div className="cr-body">
            {capture.tagro_summary && (
              <p className="cr-summary">{capture.tagro_summary}</p>
            )}
            <div className="cr-changes">
              {(capture.structured_changes || []).length === 0 ? (
                <p className="cr-empty">Tagro konnte aus dem Transcript keine konkreten Änderungen ableiten. Du kannst den Text editieren und es nochmal versuchen.</p>
              ) : (
                (capture.structured_changes || []).map((ch, i) => (
                  <article key={i} className="cr-change">
                    <header>
                      <strong>{ch.title || `Änderung ${i + 1}`}</strong>
                      {ch.affected && <span className="cr-change-where">{ch.affected}</span>}
                    </header>
                    {ch.description && <p>{ch.description}</p>}
                    {ch.suggested && <p className="cr-change-sug"><em>Vorschlag:</em> {ch.suggested}</p>}
                  </article>
                ))
              )}
            </div>
            {(capture.warnings || []).length > 0 && (
              <div className="cr-warns">
                {(capture.warnings || []).map((w, i) => <p key={i} className="cr-warn">{w}</p>)}
              </div>
            )}
            <div className="cr-review-actions">
              <button type="button" className="cr-ghost" onClick={() => setCapture(null)}>Nochmal aufnehmen</button>
              <button type="button" className="cr-primary" onClick={approveAndSend} disabled={busy || capture.status === 'approved'}>
                {capture.status === 'approved'
                  ? <><CheckCircle size={14} weight="fill" /> An Dev geschickt</>
                  : <><PaperPlaneTilt size={14} /> An Dev senden</>}
              </button>
            </div>
            {error && <p className="cr-err">{error}</p>}
          </div>
        )}
      </div>

      <style jsx>{`
        .cr {
          position: fixed; inset: 0; z-index: 16100;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          color: var(--text);
          animation: crFade .18s ease both;
        }
        @keyframes crFade { from { opacity: 0; } to { opacity: 1; } }
        .cr-backdrop {
          position: absolute; inset: 0;
          background: rgba(8,10,14,0.55);
          backdrop-filter: blur(8px) saturate(150%);
          -webkit-backdrop-filter: blur(8px) saturate(150%);
        }
        .cr-shell {
          position: relative;
          width: min(640px, 100%);
          max-height: min(92vh, 800px);
          display: grid;
          grid-template-rows: auto 1fr;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 22px;
          box-shadow: 0 26px 80px -20px rgba(15,23,42,0.45);
          overflow: hidden;
          animation: crUp .26s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes crUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .cr { padding: 0; align-items: stretch; }
          .cr-shell { width: 100%; max-height: 100dvh; border-radius: 0; border: 0; }
        }

        .cr-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 16px 18px;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
        }
        .cr-top-ctx {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13px; color: var(--text-secondary);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cr-top-ctx strong { color: var(--text); font-weight: 500; }
        .cr-iconbtn {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; color: var(--text-secondary);
          border: 0; border-radius: 999px; cursor: pointer;
          transition: background .14s, color .14s;
        }
        .cr-iconbtn:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }

        .cr-body {
          overflow-y: auto;
          padding: 18px;
          display: flex; flex-direction: column; gap: 18px;
        }

        /* meta fields */
        .cr-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 540px) { .cr-meta { grid-template-columns: 1fr; } }
        .cr-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .cr-field > span {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 500; color: var(--text-secondary);
        }
        .cr-input {
          height: 38px; padding: 0 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text); font: inherit; font-size: 13.5px;
          outline: 0; transition: border-color .14s, background .14s;
        }
        .cr-input:focus { border-color: color-mix(in srgb, var(--text) 25%, transparent); background: var(--surface); }

        .cr-record { display: flex; flex-direction: column; gap: 10px; }
        .cr-textarea {
          width: 100%;
          padding: 14px 16px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 16px;
          color: var(--text); font: inherit;
          font-size: 15px; line-height: 1.55;
          resize: vertical;
          min-height: 130px;
          outline: 0;
          transition: border-color .14s, background .14s;
        }
        .cr-textarea:focus { border-color: color-mix(in srgb, var(--text) 25%, transparent); background: var(--surface); }
        .cr-record-actions {
          display: flex; gap: 8px; justify-content: space-between; flex-wrap: wrap;
        }
        .cr-mic {
          display: inline-flex; align-items: center; gap: 7px;
          height: 40px; padding: 0 14px;
          background: transparent; color: var(--text);
          border: 1px solid var(--border); border-radius: 999px;
          font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
          transition: background .14s, border-color .14s;
        }
        .cr-mic:hover { background: var(--surface-2); }
        .cr-mic.is-rec {
          background: color-mix(in srgb, var(--text) 9%, transparent);
          animation: crPulse 1.4s ease-in-out infinite;
        }
        @keyframes crPulse { 0%,100%{ opacity:1; } 50%{ opacity:.72; } }

        .cr-primary {
          display: inline-flex; align-items: center; gap: 8px;
          height: 40px; padding: 0 18px;
          background: #5B647D; color: #fff; border: 0; border-radius: 999px;
          font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer;
          box-shadow: 0 12px 28px -14px rgba(91,100,125,0.6);
          transition: background .14s, transform .14s;
        }
        .cr-primary:hover:not(:disabled) { background: #4d566c; }
        .cr-primary:active:not(:disabled) { transform: scale(.985); }
        .cr-primary:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
        .cr-spin { animation: crSpin 1s linear infinite; }
        @keyframes crSpin { to { transform: rotate(360deg); } }

        .cr-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          height: 40px; padding: 0 16px;
          background: transparent; color: var(--text-secondary);
          border: 1px solid var(--border); border-radius: 999px;
          font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .cr-ghost:hover { background: var(--surface-2); color: var(--text); }

        .cr-err {
          margin: 0;
          padding: 10px 12px;
          background: color-mix(in srgb, #d9534f 12%, transparent);
          color: var(--text);
          border-radius: 10px;
          font-size: 13px;
        }

        /* review state */
        .cr-summary { margin: 0; font-size: 15px; line-height: 1.55; color: var(--text); }
        .cr-changes { display: flex; flex-direction: column; gap: 10px; }
        .cr-empty {
          margin: 0; padding: 18px;
          background: var(--surface-2); border-radius: 12px;
          font-size: 13.5px; color: var(--text-muted); text-align: center;
        }
        .cr-change {
          padding: 14px 16px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 14px;
        }
        .cr-change header {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 10px; margin-bottom: 6px;
        }
        .cr-change header strong { font-size: 14.5px; font-weight: 600; color: var(--text); }
        .cr-change-where { font-size: 11.5px; color: var(--text-muted); }
        .cr-change p { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }
        .cr-change-sug em { color: var(--text-muted); font-style: normal; }
        .cr-warns { display: flex; flex-direction: column; gap: 6px; }
        .cr-warn {
          margin: 0; padding: 10px 12px;
          background: color-mix(in srgb, #d4882b 10%, transparent);
          border-radius: 8px;
          font-size: 12.5px; color: var(--text);
        }
        .cr-review-actions {
          display: flex; gap: 8px; justify-content: space-between; flex-wrap: wrap;
        }
      `}</style>
    </div>
  )

  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}
