'use client'

/**
 * ProjectUrlBar — the prominent staging-URL block under the project topbar.
 *
 * Two roles:
 *   - Dev/admin: can edit staging_url + live_url inline. Saves to
 *     projects.staging_url / projects.live_url.
 *   - Client: sees the URL as a calm pill they can open + copy. When no
 *     URL is set, sees a soft "Dein Developer richtet gerade die Vorschau
 *     ein" hint so they never bounce.
 *
 * The Capture Loop recorder reads project.staging_url as its required
 * source URL — there is no free-form URL field anymore. If the field is
 * empty the recorder button on the topbar is locked and this bar is the
 * one place the dev can fix that.
 */

import { useEffect, useState } from 'react'
import { ArrowSquareOut, Check, Copy, Globe, Lock, PencilSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  projectId: string
  stagingUrl: string | null
  liveUrl: string | null
  canEdit: boolean
  onSaved?: (next: { staging_url: string | null; live_url: string | null }) => void
}

export default function ProjectUrlBar({
  projectId, stagingUrl, liveUrl, canEdit, onSaved,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [s, setS] = useState(stagingUrl || '')
  const [l, setL] = useState(liveUrl || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { setS(stagingUrl || ''); setL(liveUrl || '') }, [stagingUrl, liveUrl])

  function normalize(v: string): string | null {
    const t = v.trim()
    if (!t) return null
    if (/^https?:\/\//i.test(t)) return t
    return `https://${t}`
  }

  async function save() {
    setBusy(true); setErr('')
    try {
      const supabase = createClient() as any
      const patch = {
        staging_url: normalize(s),
        live_url: normalize(l),
      }
      const { error } = await supabase.from('projects').update(patch).eq('id', projectId)
      if (error) { setErr(error.message); return }
      onSaved?.(patch)
      setEditing(false)
    } finally { setBusy(false) }
  }

  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 1100) },
      () => undefined,
    )
  }

  const hasStaging = !!stagingUrl

  if (editing && canEdit) {
    return (
      <section className="pub pub-edit" aria-label="Projekt-URLs bearbeiten">
        <div className="pub-row">
          <label className="pub-field">
            <span><Globe size={12} /> Staging-URL <em>·</em> hier reviewt der Kunde</span>
            <input
              className="pub-input"
              placeholder="https://staging.deinprojekt.de"
              value={s}
              onChange={e => setS(e.target.value)}
              autoFocus
            />
          </label>
          <label className="pub-field">
            <span>Live-URL <em>·</em> optional</span>
            <input
              className="pub-input"
              placeholder="https://deinprojekt.de"
              value={l}
              onChange={e => setL(e.target.value)}
            />
          </label>
        </div>
        {err && <p className="pub-err">{err}</p>}
        <div className="pub-actions">
          <button type="button" className="pub-ghost" onClick={() => { setEditing(false); setS(stagingUrl || ''); setL(liveUrl || '') }}>
            Abbrechen
          </button>
          <button type="button" className="pub-primary" onClick={save} disabled={busy}>
            {busy ? 'Speichere…' : 'Speichern'}
          </button>
        </div>
        <Styles />
      </section>
    )
  }

  if (!hasStaging) {
    return (
      <section className="pub pub-empty" aria-label="Vorschau-URL fehlt">
        <div className="pub-empty-main">
          <span className="pub-empty-ico" aria-hidden><Lock size={16} /></span>
          <div>
            <strong>Noch keine Vorschau-URL hinterlegt</strong>
            {canEdit ? (
              <p>Hinterleg eine Staging-URL, sobald die Vorschau bereit ist. Erst dann kann der Kunde Live-Feedback aufnehmen.</p>
            ) : (
              <p>Dein Developer richtet gerade die Vorschau ein. Sobald die URL hier erscheint, kannst du das Live-Feedback starten.</p>
            )}
          </div>
        </div>
        {canEdit && (
          <button type="button" className="pub-primary" onClick={() => setEditing(true)}>
            <PencilSimple size={12} /> URL hinterlegen
          </button>
        )}
        <Styles />
      </section>
    )
  }

  return (
    <section className="pub" aria-label="Projekt-URLs">
      <div className="pub-stack">
        <a className="pub-url pub-url--primary" href={stagingUrl || '#'} target="_blank" rel="noreferrer">
          <span className="pub-tag">Staging</span>
          <span className="pub-link">{stagingUrl}</span>
          <ArrowSquareOut size={12} />
        </a>
        {liveUrl && (
          <a className="pub-url" href={liveUrl} target="_blank" rel="noreferrer">
            <span className="pub-tag pub-tag--muted">Live</span>
            <span className="pub-link">{liveUrl}</span>
            <ArrowSquareOut size={12} />
          </a>
        )}
      </div>
      <div className="pub-actions">
        <button type="button" className="pub-ghost" onClick={() => stagingUrl && copy(stagingUrl)} title="Staging-URL kopieren">
          {copied ? <><Check size={12} /> Kopiert</> : <><Copy size={12} /> Kopieren</>}
        </button>
        {canEdit && (
          <button type="button" className="pub-ghost" onClick={() => setEditing(true)} title="URLs bearbeiten">
            <PencilSimple size={12} /> Bearbeiten
          </button>
        )}
      </div>
      <Styles />
    </section>
  )
}

function Styles() {
  return (
    <style jsx>{`
      .pub {
        display: flex; align-items: center; justify-content: space-between;
        gap: 14px; flex-wrap: wrap;
        margin: 0 18px 12px;
        padding: 12px 14px;
        background: color-mix(in srgb, var(--surface-2) 60%, transparent);
        border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
        border-radius: 14px;
      }
      .pub-stack { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .pub-url {
        display: inline-flex; align-items: center; gap: 8px;
        max-width: 100%;
        color: var(--text); text-decoration: none;
        font: inherit; font-size: 13.5px;
      }
      .pub-url:hover { color: var(--text); }
      .pub-url:hover .pub-link { text-decoration: underline; }
      .pub-tag {
        display: inline-flex; align-items: center;
        padding: 2px 7px; border-radius: 999px;
        background: #5B647D; color: #fff;
        font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
      }
      .pub-tag--muted { background: color-mix(in srgb, var(--text) 14%, transparent); color: var(--text-secondary); }
      .pub-link {
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 64ch;
        font-variant-numeric: tabular-nums; font-weight: 500;
      }
      .pub-actions { display: inline-flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
      .pub-ghost {
        display: inline-flex; align-items: center; gap: 5px;
        height: 28px; padding: 0 11px;
        background: transparent; color: var(--text-secondary);
        border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
        border-radius: 999px;
        font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
        transition: background .14s, color .14s, border-color .14s;
      }
      .pub-ghost:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }
      .pub-primary {
        display: inline-flex; align-items: center; gap: 6px;
        height: 30px; padding: 0 13px;
        background: #5B647D; color: #fff; border: 0; border-radius: 999px;
        font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
        box-shadow: 0 10px 20px -12px rgba(91,100,125,.6);
      }
      .pub-primary:hover { background: #4d566c; }
      .pub-primary:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }

      .pub-empty { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
      .pub-empty-main {
        display: inline-flex; align-items: center; gap: 12px; min-width: 0;
      }
      .pub-empty-ico {
        width: 32px; height: 32px;
        display: inline-flex; align-items: center; justify-content: center;
        background: color-mix(in srgb, var(--text) 8%, transparent);
        border-radius: 999px;
        color: var(--text-secondary);
        flex-shrink: 0;
      }
      .pub-empty-main strong { display: block; font-size: 13.5px; font-weight: 600; color: var(--text); }
      .pub-empty-main p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; max-width: 60ch; }

      .pub-edit { flex-direction: column; align-items: stretch; }
      .pub-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (max-width: 640px) { .pub-row { grid-template-columns: 1fr; } }
      .pub-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .pub-field > span {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11.5px; font-weight: 500; color: var(--text-secondary);
      }
      .pub-field > span em { font-style: normal; color: var(--text-muted); }
      .pub-input {
        height: 36px; padding: 0 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        color: var(--text); font: inherit; font-size: 13px;
        outline: 0; transition: border-color .14s;
      }
      .pub-input:focus { border-color: color-mix(in srgb, var(--text) 25%, transparent); }
      .pub-err {
        margin: 0; padding: 6px 10px;
        background: color-mix(in srgb, #d9534f 12%, transparent);
        border-radius: 8px; font-size: 12px; color: var(--text);
      }
    `}</style>
  )
}
