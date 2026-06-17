'use client'

/**
 * ProjectUrlChip (exported as default, file keeps its historical name) —
 * the project's preview URL as a SMALL chip in the properties row, next
 * to Zieldatum. No banner, no sentence block. Click → popover underneath
 * with the URL(s), open/copy, and (dev only) inline edit.
 *
 * Reuses the project page's global chip/popover classes (pv-chip,
 * pv-pop-wrap, pv-menu) so it looks native in the row.
 *
 * States:
 *   - URL set      → chip "Link" (slate dot) → popover: Staging/Live rows
 *   - no URL · dev → chip "URL" → popover: edit fields
 *   - no URL · client → muted chip "URL folgt", popover with one short line
 */

import { useEffect, useState } from 'react'
import { ArrowSquareOut, Check, Copy, LinkSimple, PencilSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  projectId: string
  stagingUrl: string | null
  liveUrl: string | null
  canEdit: boolean
  onSaved?: (next: { staging_url: string | null; live_url: string | null }) => void
}

export default function ProjectUrlChip({
  projectId, stagingUrl, liveUrl, canEdit, onSaved,
}: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [s, setS] = useState(stagingUrl || '')
  const [l, setL] = useState(liveUrl || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { setS(stagingUrl || ''); setL(liveUrl || '') }, [stagingUrl, liveUrl])

  const hasUrl = !!stagingUrl

  function normalize(v: string): string | null {
    const t = v.trim()
    if (!t) return null
    return /^https?:\/\//i.test(t) ? t : `https://${t}`
  }

  async function save() {
    setBusy(true); setErr('')
    try {
      const supabase = createClient() as any
      const patch = { staging_url: normalize(s), live_url: normalize(l) }
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

  function shortUrl(u: string) {
    return u.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }

  return (
    <div className="pv-pop-wrap">
      <button
        type="button"
        className={`pv-chip pv-chip-btn${!hasUrl && !canEdit ? ' puc-muted' : ''}`}
        onClick={() => setOpen(v => !v)}
        title={hasUrl ? stagingUrl! : canEdit ? 'Vorschau-URL hinterlegen' : 'URL folgt'}
      >
        <LinkSimple size={11} />
        {hasUrl ? 'Link' : canEdit ? 'URL' : 'URL folgt'}
      </button>

      {open && (
        <>
          <div className="pv-pop-backdrop" onClick={() => { setOpen(false); setEditing(false) }} />
          <div className="pv-menu pv-menu-pad puc-menu" role="menu">
            {editing && canEdit ? (
              <>
                <label className="puc-field">
                  <span>Staging</span>
                  <input className="puc-input" placeholder="staging.projekt.de" value={s} onChange={e => setS(e.target.value)} autoFocus />
                </label>
                <label className="puc-field">
                  <span>Live</span>
                  <input className="puc-input" placeholder="projekt.de" value={l} onChange={e => setL(e.target.value)} />
                </label>
                {err && <p className="puc-err">{err}</p>}
                <div className="puc-actions">
                  <button type="button" className="puc-ghost" onClick={() => setEditing(false)}>Abbrechen</button>
                  <button type="button" className="puc-save" onClick={save} disabled={busy}>
                    {busy ? '…' : 'Speichern'}
                  </button>
                </div>
              </>
            ) : hasUrl ? (
              <>
                <div className="puc-row">
                  <span className="puc-tag">Staging</span>
                  <a className="puc-link" href={stagingUrl!} target="_blank" rel="noreferrer">
                    {shortUrl(stagingUrl!)} <ArrowSquareOut size={11} />
                  </a>
                  <button type="button" className="puc-ico" onClick={() => copy(stagingUrl!)} title="Kopieren">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                {liveUrl && (
                  <div className="puc-row">
                    <span className="puc-tag puc-tag-mute">Live</span>
                    <a className="puc-link" href={liveUrl} target="_blank" rel="noreferrer">
                      {shortUrl(liveUrl)} <ArrowSquareOut size={11} />
                    </a>
                  </div>
                )}
                {canEdit && (
                  <button type="button" className="puc-edit" onClick={() => setEditing(true)}>
                    <PencilSimple size={11} /> Bearbeiten
                  </button>
                )}
              </>
            ) : canEdit ? (
              <button type="button" className="puc-edit" onClick={() => setEditing(true)}>
                <PencilSimple size={11} /> Vorschau-URL hinterlegen
              </button>
            ) : (
              <p className="puc-empty">URL folgt, sobald die Vorschau bereit ist.</p>
            )}
          </div>
        </>
      )}

      <style>{`
        .puc-muted { opacity: .55; }
        .puc-menu { min-width: 260px; }
        .puc-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .puc-tag {
          flex-shrink: 0;
          padding: 1px 6px; border-radius: 999px;
          background: #5B647D; color: #fff;
          font-size: 9.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
        }
        .puc-tag-mute { background: color-mix(in srgb, var(--text) 14%, transparent); color: var(--text-secondary); }
        .puc-link {
          flex: 1 1 auto; min-width: 0;
          display: inline-flex; align-items: center; gap: 4px;
          color: var(--text); text-decoration: none;
          font-size: 12.5px; font-weight: 500;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .puc-link:hover { text-decoration: underline; }
        .puc-ico {
          flex-shrink: 0;
          width: 24px; height: 24px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; color: var(--text-secondary);
          border: 0; border-radius: 6px; cursor: pointer;
        }
        .puc-ico:hover { background: var(--surface-2); color: var(--text); }
        .puc-edit {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; color: var(--text-secondary);
          border: 0; border-radius: 6px;
          padding: 6px 4px; cursor: pointer;
          font: inherit; font-size: 12px; font-weight: 500;
          text-align: left;
        }
        .puc-edit:hover { color: var(--text); }
        .puc-empty { margin: 0; padding: 2px 2px; font-size: 12px; color: var(--text-muted); }
        .puc-field { display: flex; flex-direction: column; gap: 3px; }
        .puc-field > span { font-size: 10.5px; font-weight: 600; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; }
        .puc-input {
          height: 30px; padding: 0 9px;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text); font: inherit; font-size: 12.5px;
          outline: 0;
        }
        .puc-input:focus { border-color: color-mix(in srgb, var(--text) 25%, transparent); }
        .puc-err { margin: 0; font-size: 11.5px; color: #d9534f; }
        .puc-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .puc-ghost {
          height: 26px; padding: 0 10px;
          background: transparent; color: var(--text-secondary);
          border: 1px solid var(--border); border-radius: 999px;
          font: inherit; font-size: 11.5px; cursor: pointer;
        }
        .puc-save {
          height: 26px; padding: 0 12px;
          background: #5B647D; color: #fff;
          border: 0; border-radius: 999px;
          font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer;
        }
        .puc-save:hover { background: #4d566c; }
        .puc-save:disabled { opacity: .55; }
      `}</style>
    </div>
  )
}
