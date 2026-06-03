'use client'

/**
 * TagroContextSheet — the object-aware composer that opens from the floating
 * bar's "Mit Tagro bearbeiten" button.
 *
 * Calm, notebook-style sheet (full-screen on mobile, centred modal on desktop).
 * Shows the attached object as one quiet context line; one writing surface;
 * three object-specific suggestion chips. On submit calls
 * /api/tagro/context/preview and renders the three structured blocks:
 *
 *   Ich verstehe dich so: …
 *   Meine Einschätzung: …
 *   Vorschau: …
 *
 * Plus a calm warnings list. Footer: "Bearbeiten" returns to the composer with
 * the preview prefilled (override flow); "Übernehmen" copies the preview to
 * the clipboard so the user can paste it where it needs to go (real execution
 * — sending the handoff, creating the task/decision — is the next slice).
 *
 * People/Sources picker and Fullscreen workspace are intentionally queued for
 * later slices; the spec for them is captured in memory.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowsClockwise, Check, PaperPlaneTilt } from '@phosphor-icons/react'

export type TagroContextSheetProps = {
  open: boolean
  onClose: () => void
  context: { type: string; id: string; title?: string }
}

type Preview = {
  understanding: string
  opinion: string
  preview: string
  suggestedAction: string
  warnings: string[]
  fellBack?: boolean
}

// Object-aware suggestion chips — short prompts the user can tap to skip the
// blank composer. Per the spec: max 4 visible, no long descriptions.
function suggestionsFor(type: string, title?: string): string[] {
  const t = title ? `„${title}"` : 'das aktuelle Objekt'
  switch (type) {
    case 'task': return [
      `@Person bitten, ${t} zu prüfen`,
      'Status-Update an das Team formulieren',
      'Folgeaufgabe vorschlagen',
      'Blocker klar formulieren',
    ]
    case 'decision': return [
      `Entscheidung ${t} kundensicher formulieren`,
      'Optionen mit Pros/Cons strukturieren',
      'Impact und Frist erklären',
      '@Owner um Einschätzung bitten',
    ]
    case 'project': return [
      `Statusbericht für ${t} entwerfen`,
      'Offene Entscheidungen identifizieren',
      'Nächste sinnvolle Aufgabe vorschlagen',
      'Kundenupdate formulieren',
    ]
    case 'report':
    case 'status_report': return [
      'An den Kunden formulieren',
      'Offene Entscheidungen daraus ableiten',
      'Risiken hervorheben',
      'Kürzer und klarer machen',
    ]
    case 'document':
    case 'pdf': return [
      `${t} zusammenfassen`,
      'Für den Kunden umformulieren',
      'Als Folgeaufgabe ableiten',
      'Schwächen und Lücken nennen',
    ]
    case 'client': return [
      'Status-Update an diesen Kunden',
      'Nächste sinnvolle Frage formulieren',
      'Offene Punkte zusammenfassen',
    ]
    default: return [
      'Zusammenfassen',
      'An das Team weiterleiten',
      'Folgeaufgabe vorschlagen',
    ]
  }
}

const TYPE_LABEL: Record<string, string> = {
  task: 'Aufgabe',
  decision: 'Entscheidung',
  project: 'Projekt',
  report: 'Bericht',
  status_report: 'Statusbericht',
  document: 'Dokument',
  pdf: 'PDF',
  client: 'Kunde',
  note: 'Notiz',
  proofgrid: 'Beleg',
  nexora: 'Risiko',
}

export default function TagroContextSheet({ open, onClose, context }: TagroContextSheetProps) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [copied, setCopied] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const chips = useMemo(() => suggestionsFor(context.type, context.title), [context.type, context.title])
  const typeLabel = TYPE_LABEL[context.type] || context.type

  // Reset when closed; focus when opened.
  useEffect(() => {
    if (!open) {
      setInput(''); setPreview(null); setError(''); setBusy(false); setCopied(false)
      return
    }
    const t = window.setTimeout(() => composerRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [open])

  // Body scroll lock + Esc + focus signal for the bottom nav / floating bar.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('chat-composer-focused')
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.classList.remove('chat-composer-focused')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  async function submit(textOverride?: string) {
    const value = (textOverride ?? input).trim()
    if (!value || busy) return
    setBusy(true); setError(''); setPreview(null)
    try {
      const res = await fetch('/api/tagro/context/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...context, input: value }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Tagro konnte keine Vorschau erzeugen.')
      setPreview(data as Preview)
    } catch (e: any) {
      setError(e?.message || 'Etwas ist schiefgegangen.')
    } finally {
      setBusy(false)
    }
  }

  function copyPreview() {
    if (!preview?.preview) return
    try {
      navigator.clipboard.writeText(preview.preview)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {/* clipboard blocked — user can select manually */}
  }

  function backToCompose() {
    if (!preview) return
    setInput(preview.preview)
    setPreview(null)
    window.setTimeout(() => composerRef.current?.focus(), 50)
  }

  if (!open) return null

  const node = (
    <div className="tcs" role="dialog" aria-modal="true" aria-label="Mit Tagro bearbeiten">
      <div className="tcs-backdrop" onClick={onClose} aria-hidden />
      <div className="tcs-sheet" onClick={e => e.stopPropagation()}>
        <header className="tcs-head">
          <div className="tcs-context">
            <span className="tcs-context-type">{typeLabel}</span>
            {context.title && <>
              <span className="tcs-context-sep">·</span>
              <span className="tcs-context-title">{context.title}</span>
            </>}
          </div>
          <button type="button" className="tcs-close" onClick={onClose} aria-label="Schließen"><X size={16} /></button>
        </header>

        {!preview ? (
          <>
            <div className="tcs-body">
              <p className="tcs-prompt">Was soll Tagro damit machen?</p>
              <textarea
                ref={composerRef}
                className="tcs-composer"
                placeholder="Schreib kurz, was passieren soll. Du kannst rohen Text geben — Tagro übersetzt."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit() }
                }}
                rows={3}
              />
              <div className="tcs-chips">
                {chips.map(c => (
                  <button key={c} type="button" className="tcs-chip" disabled={busy} onClick={() => submit(c)}>{c}</button>
                ))}
              </div>
              {error && <p className="tcs-error">{error}</p>}
            </div>
            <footer className="tcs-foot">
              <button type="button" className="tcs-secondary" onClick={onClose}>Abbrechen</button>
              <button type="button" className="tcs-primary" onClick={() => submit()} disabled={!input.trim() || busy}>
                {busy ? <ArrowsClockwise size={14} className="tcs-spin" /> : <PaperPlaneTilt size={14} weight="fill" />}
                <span>{busy ? 'Tagro denkt …' : 'Vorschau erzeugen'}</span>
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="tcs-body">
              {preview.fellBack && (
                <p className="tcs-note">Tagro ist gerade nicht voll verbunden — Vorschau basiert auf deiner Eingabe.</p>
              )}
              <section className="tcs-block">
                <span className="tcs-block-label">Ich verstehe dich so</span>
                <p className="tcs-block-text">{preview.understanding}</p>
              </section>
              {preview.opinion && (
                <section className="tcs-block">
                  <span className="tcs-block-label">Meine Einschätzung</span>
                  <p className="tcs-block-text">{preview.opinion}</p>
                </section>
              )}
              <section className="tcs-block">
                <span className="tcs-block-label">Vorschau</span>
                <p className="tcs-block-preview">{preview.preview}</p>
              </section>
              {preview.warnings.length > 0 && (
                <section className="tcs-warnings">
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="tcs-warning">{w}</p>
                  ))}
                </section>
              )}
            </div>
            <footer className="tcs-foot">
              <button type="button" className="tcs-secondary" onClick={backToCompose}>Bearbeiten</button>
              <button type="button" className="tcs-primary" onClick={copyPreview}>
                {copied ? <Check size={14} weight="bold" /> : <PaperPlaneTilt size={14} weight="fill" />}
                <span>{copied ? 'Kopiert' : 'Übernehmen'}</span>
              </button>
            </footer>
          </>
        )}
      </div>

      <style jsx>{`
        .tcs {
          position: fixed; inset: 0; z-index: 14000;
          display: flex; align-items: flex-end; justify-content: center;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          animation: tcsIn .22s ease both;
        }
        @media (min-width: 769px) {
          .tcs { align-items: center; padding: 32px; }
        }
        .tcs-backdrop {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px) saturate(140%);
          -webkit-backdrop-filter: blur(8px) saturate(140%);
        }
        .tcs-sheet {
          position: relative;
          width: 100%; max-width: 640px;
          max-height: 92dvh;
          display: flex; flex-direction: column;
          background: var(--card);
          color: var(--text);
          border-top-left-radius: 22px;
          border-top-right-radius: 22px;
          box-shadow: 0 -24px 60px -20px rgba(0,0,0,0.55);
          animation: tcsUp .32s cubic-bezier(.16,1,.3,1) both;
          overflow: hidden;
        }
        @media (min-width: 769px) {
          .tcs-sheet { border-radius: 18px; max-height: 80vh; box-shadow: 0 32px 80px -24px rgba(0,0,0,0.6); }
        }
        [data-theme="light"] .tcs-sheet, [data-theme="read"] .tcs-sheet {
          background: #FFFFFF; color: #111;
        }
        .tcs-head {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 28%, transparent);
        }
        .tcs-context {
          flex: 1; min-width: 0;
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
          color: var(--text-secondary);
        }
        .tcs-context-type { color: var(--text); }
        .tcs-context-sep { color: var(--text-muted); }
        .tcs-context-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tcs-close {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; background: transparent; color: var(--text-muted);
          border-radius: 8px; cursor: pointer; transition: background .12s, color .12s;
        }
        .tcs-close:hover { background: color-mix(in srgb, var(--surface-2) 50%, transparent); color: var(--text); }
        .tcs-body {
          flex: 1; min-height: 0; overflow-y: auto;
          padding: 18px 20px 6px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .tcs-prompt {
          margin: 0;
          font-size: 16px; font-weight: 500; letter-spacing: -.003em; color: var(--text);
        }
        /* Notepad composer — no box, no underline. */
        .tcs-composer {
          width: 100%;
          min-height: 88px;
          background: transparent; border: 0; outline: 0;
          color: var(--text); font: inherit; font-size: 15px; line-height: 1.55;
          padding: 0; resize: vertical;
        }
        .tcs-composer::placeholder { color: var(--text-muted); opacity: .6; }
        .tcs-chips {
          display: flex; flex-wrap: wrap; gap: 7px;
        }
        .tcs-chip {
          display: inline-flex; align-items: center;
          height: 28px; padding: 0 11px;
          border: 0; border-radius: 999px;
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: 500;
          cursor: pointer; transition: background .12s, color .12s;
        }
        .tcs-chip:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface-2) 80%, transparent);
          color: var(--text);
        }
        .tcs-chip:disabled { opacity: .42; cursor: default; }
        .tcs-error { margin: 0; color: #d44b4b; font-size: 12.5px; font-weight: 500; }
        .tcs-note { margin: 0; color: var(--text-muted); font-size: 12px; }
        .tcs-block { display: flex; flex-direction: column; gap: 4px; }
        .tcs-block-label {
          font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-muted);
        }
        .tcs-block-text {
          margin: 0; font-size: 14px; line-height: 1.55; color: var(--text); font-weight: 500;
        }
        .tcs-block-preview {
          margin: 0; padding: 12px 14px; border-radius: 12px;
          background: color-mix(in srgb, var(--surface-2) 36%, transparent);
          font-size: 14px; line-height: 1.6; color: var(--text); font-weight: 500;
          white-space: pre-wrap;
        }
        .tcs-warnings { display: flex; flex-direction: column; gap: 6px; }
        .tcs-warning {
          margin: 0; padding: 10px 12px;
          background: color-mix(in srgb, #f59e0b 8%, transparent);
          box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 55%, transparent);
          border-radius: 8px;
          font-size: 12.5px; line-height: 1.5; color: var(--text); font-weight: 500;
        }
        .tcs-foot {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 12px 18px max(14px, env(safe-area-inset-bottom, 0px));
          border-top: 1px solid color-mix(in srgb, var(--border) 28%, transparent);
        }
        .tcs-primary, .tcs-secondary {
          display: inline-flex; align-items: center; gap: 7px;
          height: 40px; padding: 0 18px;
          border-radius: 32px;
          font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer;
          transition: opacity .14s, transform .14s, background .14s;
        }
        .tcs-primary {
          border: 0; background: #5B647D; color: #FFFFFF;
        }
        .tcs-primary:hover:not(:disabled) { opacity: .94; }
        .tcs-primary:active:not(:disabled) { transform: scale(.97); background: #4B5369; }
        .tcs-primary:disabled { opacity: .5; cursor: not-allowed; }
        .tcs-secondary {
          border: 0; background: rgba(255,255,255,0.06); color: var(--text);
        }
        [data-theme="light"] .tcs-secondary, [data-theme="read"] .tcs-secondary {
          background: rgba(0,0,0,0.05); color: #111;
        }
        .tcs-secondary:hover { background: rgba(255,255,255,0.10); }
        [data-theme="light"] .tcs-secondary:hover,
        [data-theme="read"] .tcs-secondary:hover { background: rgba(0,0,0,0.08); }
        .tcs-spin { animation: tcsSpin 1s linear infinite; }
        @keyframes tcsIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tcsUp  { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tcsSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .tcs, .tcs-sheet, .tcs-spin { animation: none !important; }
        }
      `}</style>
    </div>
  )

  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}
