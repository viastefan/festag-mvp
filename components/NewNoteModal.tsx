'use client'

/**
 * NewNoteModal — proper create-flow for /notes.
 *
 * Replaces the old "click Neue Notiz → immediately POST → open drawer
 * with placeholder title" flow with a real composer that asks the user
 * for context up-front. Same modal DNA as NewProjectModal: dim + blur
 * backdrop, animated 20px-radius card, no black buttons in light mode.
 *
 * Three submit paths reflect Festag's note value-loop:
 *
 *   1. "Anlegen"             — saves a plain note, opens the drawer.
 *   2. "Mit Tagro analysieren" — saves AND immediately runs
 *      /api/notes/[id]/suggest so the drawer opens with themes,
 *      possible tasks, follow-ups and risks pre-loaded.
 *   3. "An Tagro übergeben"  — saves AND routes to /ai with the
 *      note prefilled as the first message context.
 *
 * Note types shape Tagro's behaviour: brief = spawn tasks aggressively,
 * journal = mostly themes, meeting = follow-ups, research = risks.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowSquareOut, Books, Cards, CheckCircle, FolderSimple, Microphone,
  Notepad, Sparkle, Tag, X,
} from '@phosphor-icons/react'

type NoteType = 'journal' | 'brief' | 'meeting' | 'research'

const NOTE_TYPES: { id: NoteType; label: string; icon: any; hint: string }[] = [
  { id: 'journal',  label: 'Journal',  icon: Notepad,    hint: 'Lose Gedanken — Tagro sammelt Themen' },
  { id: 'brief',    label: 'Brief',    icon: Cards,      hint: 'Auftrag oder Spec — Tagro spawnt Tasks' },
  { id: 'meeting',  label: 'Meeting',  icon: Microphone, hint: 'Protokoll — Tagro zieht Folgepunkte' },
  { id: 'research', label: 'Research', icon: Books,      hint: 'Recherche — Tagro destilliert Risiken' },
]

type ProjectLite = { id: string; title: string; color?: string | null }

type Props = {
  projects: ProjectLite[]
  defaultProjectId?: string | null
  onCreated: (noteId: string) => void          // landed on the page → open drawer
  onClose: () => void
}

type SubmitMode = 'plain' | 'tagro' | 'handoff'

export default function NewNoteModal({ projects, defaultProjectId, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '')
  const [noteType, setNoteType] = useState<NoteType>('journal')
  const [tagsInput, setTagsInput] = useState('')
  const [submitting, setSubmitting] = useState<SubmitMode | null>(null)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)

  // Focus the title on open.
  useEffect(() => { titleRef.current?.focus() }, [])

  // Esc to close (unless submitting).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) { e.preventDefault(); onClose() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !submitting) {
        e.preventDefault()
        submit('plain')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting])

  const tags = useMemo(() => (
    tagsInput.split(',').map(t => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean)
  ), [tagsInput])

  const currentType = NOTE_TYPES.find(t => t.id === noteType) || NOTE_TYPES[0]

  async function submit(mode: SubmitMode) {
    if (submitting) return
    if (!title.trim()) { setError('Titel fehlt.'); titleRef.current?.focus(); return }
    setSubmitting(mode); setError('')

    try {
      // 1. Create the note
      const res = await fetch('/api/notes', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim().slice(0, 200),
          body: body.trim() || null,
          project_id: projectId || null,
          tags: tags.slice(0, 20),
        }),
      })
      if (!res.ok) { setError('Konnte Notiz nicht anlegen.'); setSubmitting(null); return }
      const { note } = await res.json()
      if (!note?.id) { setError('Antwort vom Server ohne Notiz.'); setSubmitting(null); return }

      // 2. Apply the selected note_type via PATCH (POST defaults to 'journal')
      if (noteType !== 'journal') {
        await fetch(`/api/notes/${note.id}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note_type: noteType }),
        })
      }

      // 3. Per-mode follow-up
      if (mode === 'tagro') {
        // Trigger Tagro analysis in the background — the drawer opens
        // and re-fetches with the new tagro_suggestions populated.
        await fetch(`/api/notes/${note.id}/suggest`, { method: 'POST', credentials: 'include' })
        onCreated(note.id)
      } else if (mode === 'handoff') {
        // Hand to /ai with the note as context. We still open in /notes
        // first via onCreated so the row exists in the list, then route.
        onCreated(note.id)
        const prefill = `Ich habe diese Notiz festgehalten:\n\n${title.trim()}\n\n${body.trim()}`
        window.location.href = `/ai?prefill=${encodeURIComponent(prefill)}`
      } else {
        onCreated(note.id)
      }
    } catch {
      setError('Netzwerkproblem — bitte nochmal.')
      setSubmitting(null)
    }
  }

  return (
    <div className="nnm-overlay" role="dialog" aria-modal="true" aria-label="Neue Notiz">
      <style>{CSS}</style>
      <div className="nnm-backdrop" onClick={() => !submitting && onClose()} />

      <div className="nnm-card" ref={dialogRef} onMouseDown={e => e.stopPropagation()}>
        <header className="nnm-head">
          <div>
            <p className="nnm-eyebrow">Neue Notiz</p>
            <h2>Worum geht's?</h2>
          </div>
          <button type="button" className="nnm-icon-btn" onClick={onClose} disabled={!!submitting} aria-label="Schließen">
            <X size={14} />
          </button>
        </header>

        <div className="nnm-body">
          <section className="nnm-section">
            <input
              ref={titleRef}
              className="nnm-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titel — was ist der Kern der Notiz?"
              maxLength={200}
              disabled={!!submitting}
            />
            <textarea
              className="nnm-body-area"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Inhalt — schreib so viel oder wenig du willst.&#10;&#10;Tipp: [[Notiz-Titel]] verlinkt auf eine andere Notiz."
              rows={6}
              disabled={!!submitting}
            />
          </section>

          <section className="nnm-section">
            <p className="nnm-label">Typ — bestimmt, wie Tagro liest</p>
            <div className="nnm-type-grid">
              {NOTE_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`nnm-type${noteType === t.id ? ' on' : ''}`}
                    onClick={() => setNoteType(t.id)}
                    disabled={!!submitting}
                  >
                    <Icon size={14} weight="regular" />
                    <span>
                      <strong>{t.label}</strong>
                      <small>{t.hint}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="nnm-section two-up">
            <div>
              <p className="nnm-label"><FolderSimple size={11} /> Projekt</p>
              <select
                className="nnm-select"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                disabled={!!submitting}
              >
                <option value="">— Kein Projekt —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <p className="nnm-label"><Tag size={11} /> Tags (Komma-separiert)</p>
              <input
                className="nnm-tags-input"
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="z. B. onboarding, ux, idee"
                disabled={!!submitting}
              />
              {tags.length > 0 && (
                <div className="nnm-tag-preview">
                  {tags.slice(0, 8).map(t => <span key={t} className="nnm-tag-chip">#{t}</span>)}
                  {tags.length > 8 && <span className="nnm-tag-more">+{tags.length - 8}</span>}
                </div>
              )}
            </div>
          </section>

          {error && (
            <p className="nnm-error" role="alert">{error}</p>
          )}
        </div>

        <footer className="nnm-foot">
          <div className="nnm-foot-meta">
            <span><kbd>⌘</kbd> <kbd>↵</kbd> · Anlegen</span>
            <span><kbd>Esc</kbd> · Schließen</span>
          </div>
          <div className="nnm-foot-actions">
            <button
              type="button"
              className="nnm-btn ghost"
              onClick={() => submit('handoff')}
              disabled={!!submitting || !title.trim()}
              title="Speichert die Notiz und übergibt sie als Kontext an Tagro Chat"
            >
              <ArrowSquareOut size={12} />
              {submitting === 'handoff' ? 'Übergibt…' : 'An Tagro übergeben'}
            </button>
            <button
              type="button"
              className="nnm-btn ghost"
              onClick={() => submit('tagro')}
              disabled={!!submitting || !title.trim()}
              title="Speichert die Notiz und lässt Tagro Themen, Tasks und Risiken vorschlagen"
            >
              <Sparkle size={12} weight="fill" />
              {submitting === 'tagro' ? 'Tagro liest…' : 'Mit Tagro analysieren'}
            </button>
            <button
              type="button"
              className="nnm-btn primary"
              onClick={() => submit('plain')}
              disabled={!!submitting || !title.trim()}
            >
              {submitting === 'plain' ? 'Lege an…' : <><CheckCircle size={12} weight="bold" /> Anlegen</>}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

const CSS = `
  .nnm-overlay {
    position: fixed; inset: 0; z-index: 12500;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    letter-spacing: .017em;
    animation: nnmFade .18s ease both;
  }
  .nnm-overlay, .nnm-overlay * { font-weight: 500; letter-spacing: .017em; }
  .nnm-backdrop {
    position: absolute; inset: 0;
    background: rgba(8,10,14,.42);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
  }
  @keyframes nnmFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes nnmPop  { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }

  .nnm-card {
    position: relative; z-index: 1;
    width: min(720px, calc(100vw - 32px));
    max-height: calc(100dvh - 64px);
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 20px;
    box-shadow:
      0 1px 2px rgba(15,23,42,.06),
      0 32px 80px -28px rgba(15,23,42,.35);
    display: flex; flex-direction: column; overflow: hidden;
    animation: nnmPop .26s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .nnm-card,
  [data-theme="classic-dark"] .nnm-card {
    background: color-mix(in srgb, var(--card) 96%, #fff 4%);
    box-shadow: 0 1px 2px rgba(0,0,0,.5), 0 36px 90px -30px rgba(0,0,0,.7);
  }

  .nnm-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 20px 22px 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .nnm-head h2 { margin: 4px 0 0; font-size: 19px; font-weight: 500; letter-spacing: -.01em; color: var(--text); }
  .nnm-eyebrow { margin: 0; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
  .nnm-icon-btn {
    width: 28px; height: 28px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .nnm-icon-btn:hover { background: var(--surface-2); color: var(--text); }
  .nnm-icon-btn:disabled { opacity: .5; cursor: not-allowed; }

  .nnm-body {
    flex: 1; min-height: 0; overflow-y: auto;
    padding: 18px 22px 8px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .nnm-section { display: flex; flex-direction: column; gap: 8px; }
  .nnm-section.two-up {
    display: grid; gap: 16px;
    grid-template-columns: 1fr 1.4fr;
  }
  @media (max-width: 640px) { .nnm-section.two-up { grid-template-columns: 1fr; } }

  .nnm-label {
    margin: 0; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase;
    color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;
  }
  .nnm-label svg { color: var(--text-muted); }

  .nnm-title {
    width: 100%; padding: 4px 0;
    background: transparent; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    color: var(--text); font: inherit; font-size: 19px; font-weight: 500; letter-spacing: -.008em;
    outline: 0; transition: border-color .14s;
  }
  .nnm-title:focus { border-color: var(--text); }
  .nnm-title::placeholder { color: var(--text-muted); }

  /* Notepad style — the note body is a writing surface, not a boxed field. */
  .nnm-body-area {
    width: 100%; min-height: 130px; resize: vertical;
    padding: 8px 0;
    background: transparent; border: 0; border-radius: 0;
    color: var(--text); font: inherit; font-size: 14px; line-height: 1.65; letter-spacing: .017em;
    outline: 0;
  }
  .nnm-body-area::placeholder { color: var(--text-muted); white-space: pre-line; }

  .nnm-type-grid {
    display: grid; gap: 6px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .nnm-type {
    display: flex; align-items: flex-start; gap: 9px;
    padding: 11px 12px;
    border: 1px solid var(--border); border-radius: 12px;
    background: transparent; color: var(--text);
    font: inherit; font-size: 12.5px; text-align: left; cursor: pointer;
    transition: border-color .12s, background .12s;
  }
  .nnm-type:hover:not(.on) { border-color: color-mix(in srgb, var(--text) 25%, var(--border)); }
  .nnm-type.on {
    border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
    background: color-mix(in srgb, var(--accent) 5%, transparent);
  }
  .nnm-type svg { color: var(--text-muted); flex-shrink: 0; margin-top: 1px; }
  .nnm-type.on svg { color: var(--accent); }
  .nnm-type > span { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .nnm-type strong { font-size: 13px; font-weight: 500; color: var(--text); }
  .nnm-type small { font-size: 11px; color: var(--text-muted); line-height: 1.4; }

  .nnm-select, .nnm-tags-input {
    width: 100%; height: 34px; padding: 0 11px;
    background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px;
    color: var(--text); font: inherit; font-size: 12.5px; outline: 0;
    transition: border-color .14s;
  }
  .nnm-select:focus, .nnm-tags-input:focus { border-color: color-mix(in srgb, var(--text) 30%, var(--border)); }

  .nnm-tag-preview { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .nnm-tag-chip {
    display: inline-flex; align-items: center;
    height: 20px; padding: 0 9px; border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 75%, transparent);
    color: var(--text); font-size: 11px;
  }
  .nnm-tag-more { font-size: 11px; color: var(--text-muted); align-self: center; }

  .nnm-error {
    margin: 0; padding: 8px 11px; border-radius: 8px;
    background: color-mix(in srgb, #ef4444 12%, transparent);
    color: #ef4444; font-size: 12px;
  }

  .nnm-foot {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 14px 22px 18px;
    border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    background: color-mix(in srgb, var(--surface) 70%, transparent);
  }
  @media (max-width: 720px) {
    .nnm-foot { flex-direction: column; align-items: stretch; }
    .nnm-foot-meta { order: 2; justify-content: center; }
  }
  .nnm-foot-meta {
    display: flex; align-items: center; gap: 14px;
    color: var(--text-muted); font-size: 11px;
  }
  .nnm-foot-meta kbd {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 4px;
    border: 1px solid var(--border); border-radius: 5px;
    background: var(--card); color: var(--text);
    font: inherit; font-size: 10.5px; font-weight: 500; margin-right: 2px;
  }
  .nnm-foot-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

  .nnm-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 34px; padding: 0 14px;
    border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .017em;
    cursor: pointer; border: 0;
    transition: transform .12s, box-shadow .14s, opacity .12s, background .12s, color .12s;
  }
  .nnm-btn.ghost {
    background: transparent; color: var(--text-muted);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }
  .nnm-btn.ghost:hover:not(:disabled) { color: var(--text); background: var(--surface-2); border-color: var(--border); }
  .nnm-btn.primary {
    background: #fff; color: var(--text);
    box-shadow: 0 1px 2px rgba(15,23,42,.08), 0 6px 18px rgba(15,23,42,.08);
  }
  .nnm-btn.primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 1px 2px rgba(15,23,42,.1), 0 10px 24px rgba(15,23,42,.10);
  }
  .nnm-btn.primary:active:not(:disabled) { transform: translateY(0); }
  [data-theme="dark"] .nnm-btn.primary,
  [data-theme="classic-dark"] .nnm-btn.primary {
    background: color-mix(in srgb, var(--surface) 92%, #fff 8%);
    box-shadow: 0 1px 2px rgba(0,0,0,.32), 0 6px 18px rgba(0,0,0,.22);
  }
  .nnm-btn:disabled { opacity: .55; cursor: not-allowed; }
`
