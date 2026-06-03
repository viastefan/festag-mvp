'use client'

/**
 * ProofGridSection — the project "Belege" feed.
 *
 * Proof-of-work for a project: what happened, how strongly it's proven
 * (Notiz → Bestätigt) and whether the client may see it. Reads/writes the
 * `evidence` table directly via the user client (RLS scopes it to project
 * members). Notepad-style inputs (no boxed title/description).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  EVIDENCE_TYPES, PROOF_ORDER, PROOF_STRENGTH, evidenceTypeLabel,
  type EvidenceRow, type ProofStrength,
} from '@/lib/trust/evidence'
import { Plus, Eye, EyeSlash, ShieldCheck, Trash, LinkSimple, X } from '@phosphor-icons/react'

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function ProofGridSection({ projectId, canEdit, onChange }: { projectId: string; canEdit: boolean; onChange?: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<EvidenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Add-form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceType, setEvidenceType] = useState('note')
  const [strength, setStrength] = useState<ProofStrength>('medium')
  const [clientVisible, setClientVisible] = useState(false)
  const [url, setUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await (supabase as any)
      .from('evidence')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (e) setError(e.message)
    setRows((data as EvidenceRow[]) ?? [])
    setLoading(false)
  }, [supabase, projectId])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setTitle(''); setDescription(''); setEvidenceType('note')
    setStrength('medium'); setClientVisible(false); setUrl('')
  }

  async function addEvidence() {
    if (busy) return
    if (!title.trim() && !description.trim()) { setError('Titel oder Beschreibung angeben.'); return }
    setBusy(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Bitte erneut anmelden.')
      const { error: e } = await (supabase as any).from('evidence').insert({
        project_id: projectId,
        evidence_type: evidenceType,
        title: title.trim() || null,
        description: description.trim() || null,
        proof_strength: strength,
        source: 'manual',
        url: url.trim() || null,
        client_visible: clientVisible,
        created_by: user.id,
      })
      if (e) throw new Error(e.message)
      resetForm(); setAdding(false)
      await load()
      onChange?.()
    } catch (err: any) {
      setError(err?.message || 'Konnte Beleg nicht speichern.')
    } finally {
      setBusy(false)
    }
  }

  async function patch(id: string, p: Partial<EvidenceRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...p } as EvidenceRow : r)) // optimistic
    const { error: e } = await (supabase as any).from('evidence').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id)
    if (e) { setError(e.message); await load() } else { onChange?.() }
  }

  async function remove(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    const { error: e } = await (supabase as any).from('evidence').delete().eq('id', id)
    if (e) { setError(e.message); await load() } else { onChange?.() }
  }

  const clientCount = rows.filter(r => r.client_visible).length

  return (
    <div className="pg">
      <style>{CSS}</style>

      <div className="pg-head">
        <div className="pg-head-meta">
          <span className="pg-title">Belege</span>
          <span className="pg-sub">
            {loading ? 'Lädt …' : rows.length === 0
              ? 'Belegte Arbeit — was wurde getan und wodurch ist es nachgewiesen.'
              : `${rows.length} Beleg${rows.length === 1 ? '' : 'e'} · ${clientCount} kundensichtbar`}
          </span>
        </div>
        {canEdit && !adding && (
          <button type="button" className="pg-add-btn" onClick={() => { setAdding(true); setError('') }}>
            <Plus size={14} /> Beleg hinzufügen
          </button>
        )}
      </div>

      {adding && (
        <div className="pg-form">
          <button type="button" className="pg-form-close" onClick={() => { setAdding(false); resetForm() }} aria-label="Schließen"><X size={14} /></button>
          <input
            className="pg-np-title"
            placeholder="Was wurde getan? (Titel)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            maxLength={160}
          />
          <textarea
            className="pg-np-desc"
            placeholder="Details, Kontext, Nachweis …"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            maxLength={1200}
          />
          <div className="pg-form-row">
            <label className="pg-field">
              <span>Art</span>
              <select className="pg-select" value={evidenceType} onChange={e => setEvidenceType(e.target.value)}>
                {EVIDENCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label className="pg-field">
              <span>Nachweisstärke</span>
              <select className="pg-select" value={strength} onChange={e => setStrength(e.target.value as ProofStrength)}>
                {PROOF_ORDER.map(s => <option key={s} value={s}>{PROOF_STRENGTH[s].label}</option>)}
              </select>
            </label>
          </div>
          <div className="pg-form-row">
            <div className="pg-linkbox">
              <LinkSimple size={14} />
              <input
                className="pg-linkinput"
                placeholder="Link (optional) — z. B. PR, Datei, Veröffentlichung"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
            <div className="pg-seg" role="group" aria-label="Kundensichtbar">
              <button type="button" className={`pg-seg-btn${clientVisible ? ' on' : ''}`} onClick={() => setClientVisible(true)}>Kundensichtbar</button>
              <button type="button" className={`pg-seg-btn${!clientVisible ? ' on' : ''}`} onClick={() => setClientVisible(false)}>Intern</button>
            </div>
          </div>
          {error && <p className="pg-error">{error}</p>}
          <div className="pg-form-actions">
            <button type="button" className="pg-ghost" onClick={() => { setAdding(false); resetForm() }}>Abbrechen</button>
            <button type="button" className="pg-primary" onClick={addEvidence} disabled={busy}>
              {busy ? 'Speichert …' : 'Beleg speichern'}
            </button>
          </div>
        </div>
      )}

      {!adding && error && <p className="pg-error standalone">{error}</p>}

      {!loading && rows.length === 0 && !adding && (
        <div className="pg-empty">
          <p>Noch keine Belege. Jeder Nachweis macht Fortschritt sichtbar und Berichte belegbar.</p>
        </div>
      )}

      <div className="pg-list">
        {rows.map(row => {
          const ps = PROOF_STRENGTH[row.proof_strength] ?? PROOF_STRENGTH.weak
          return (
            <article key={row.id} className="pg-item">
              <div className="pg-item-top">
                <span className="pg-type">{evidenceTypeLabel(row.evidence_type)}</span>
                <span className="pg-chip" title={ps.hint}>
                  <span className="pg-dot" style={{ background: ps.color }} />{ps.label}
                </span>
                {row.client_visible
                  ? <span className="pg-vis client" title="Kundensichtbar"><Eye size={12} /> Kunde</span>
                  : <span className="pg-vis" title="Nur intern"><EyeSlash size={12} /> Intern</span>}
                <span className="pg-time">{fmt(row.created_at)}</span>
              </div>
              {row.title && <p className="pg-item-title">{row.title}</p>}
              {row.description && <p className="pg-item-desc">{row.description}</p>}
              {row.url && (
                <a className="pg-item-link" href={row.url} target="_blank" rel="noreferrer">
                  <LinkSimple size={12} /> {row.url.replace(/^https?:\/\//, '').slice(0, 60)}
                </a>
              )}
              {canEdit && (
                <div className="pg-item-actions">
                  {row.proof_strength !== 'verified' && (
                    <button type="button" className="pg-mini" onClick={() => patch(row.id, { proof_strength: 'verified' })} title="Als bestätigt markieren">
                      <ShieldCheck size={13} /> Bestätigen
                    </button>
                  )}
                  <button type="button" className="pg-mini" onClick={() => patch(row.id, { client_visible: !row.client_visible })}>
                    {row.client_visible ? <><EyeSlash size={13} /> Intern stellen</> : <><Eye size={13} /> Für Kunde</>}
                  </button>
                  <button type="button" className="pg-mini danger" onClick={() => remove(row.id)} title="Löschen">
                    <Trash size={13} />
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

const CSS = `
  .pg { display:flex; flex-direction:column; gap:14px; max-width:760px; }
  .pg-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .pg-head-meta { display:flex; flex-direction:column; gap:3px; min-width:0; }
  .pg-title { font-size:15px; font-weight:500; color:var(--text); letter-spacing:.01em; }
  .pg-sub { font-size:12.5px; color:var(--text-muted); font-weight:500; letter-spacing:.012em; line-height:1.5; }
  .pg-add-btn {
    display:inline-flex; align-items:center; gap:6px; flex-shrink:0;
    height:32px; padding:0 13px; border-radius:8px;
    border:1px solid color-mix(in srgb, var(--border) 76%, transparent);
    background:transparent; color:var(--text); font:inherit; font-size:12.5px; font-weight:500;
    cursor:pointer; transition:background .12s, border-color .12s;
  }
  .pg-add-btn:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); border-color:var(--border-strong); }

  .pg-form {
    position:relative;
    display:flex; flex-direction:column; gap:12px;
    padding:16px; border-radius:14px;
    border:1px solid color-mix(in srgb, var(--border) 60%, transparent);
    background:color-mix(in srgb, var(--surface-2) 26%, transparent);
  }
  .pg-form-close {
    position:absolute; top:10px; right:10px; width:26px; height:26px;
    border:0; background:transparent; color:var(--text-muted); border-radius:8px; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
  }
  .pg-form-close:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); color:var(--text); }
  .pg-np-title, .pg-np-desc {
    width:100%; background:transparent; border:0;
    color:var(--text); font:inherit; outline:0; padding:6px 0; resize:none;
  }
  .pg-np-title { font-size:16px; font-weight:500; letter-spacing:-.005em; padding-right:30px; }
  .pg-np-desc { font-size:13.5px; line-height:1.55; }
  .pg-np-title::placeholder, .pg-np-desc::placeholder { color:var(--text-muted); opacity:.6; }

  .pg-form-row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; }
  .pg-field { display:flex; flex-direction:column; gap:5px; min-width:160px; flex:1; }
  .pg-field > span { font-size:11px; font-weight:500; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); }
  .pg-select {
    height:34px; padding:0 10px; border-radius:8px;
    border:1px solid color-mix(in srgb, var(--border) 72%, transparent);
    background:var(--card); color:var(--text); font:inherit; font-size:13px; outline:0; cursor:pointer;
  }
  .pg-linkbox {
    flex:1; min-width:200px; display:flex; align-items:center; gap:8px;
    height:34px; padding:0 10px; border-radius:8px;
    border:1px solid color-mix(in srgb, var(--border) 72%, transparent); background:var(--card); color:var(--text-muted);
  }
  .pg-linkinput { flex:1; border:0; background:transparent; color:var(--text); font:inherit; font-size:13px; outline:0; }
  .pg-linkinput::placeholder { color:var(--text-muted); opacity:.6; }

  .pg-seg { display:inline-flex; border:1px solid color-mix(in srgb, var(--border) 72%, transparent); border-radius:8px; overflow:hidden; height:34px; }
  .pg-seg-btn { border:0; background:transparent; color:var(--text-muted); font:inherit; font-size:12.5px; font-weight:500; padding:0 12px; cursor:pointer; }
  .pg-seg-btn.on { background:color-mix(in srgb, var(--btn-prim) 12%, var(--surface-2)); color:var(--text); }

  .pg-form-actions { display:flex; justify-content:flex-end; gap:9px; }
  .pg-primary, .pg-ghost {
    height:34px; padding:0 16px; border-radius:8px; font:inherit; font-size:13px; font-weight:500; cursor:pointer;
  }
  .pg-primary { border:0; background:var(--btn-prim); color:var(--btn-prim-text); }
  .pg-primary:disabled { opacity:.5; cursor:default; }
  .pg-ghost { border:1px solid color-mix(in srgb, var(--border) 70%, transparent); background:transparent; color:var(--text-secondary); }
  .pg-ghost:hover { color:var(--text); background:color-mix(in srgb, var(--surface-2) 50%, transparent); }

  .pg-error { margin:0; color:#d44b4b; font-size:12.5px; font-weight:500; }
  .pg-error.standalone { padding:2px 0; }

  .pg-empty { padding:22px 0; }
  .pg-empty p { margin:0; color:var(--text-muted); font-size:13px; line-height:1.55; max-width:46ch; }

  .pg-list { display:flex; flex-direction:column; gap:1px; }
  .pg-item {
    padding:13px 0; display:flex; flex-direction:column; gap:7px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 38%, transparent);
  }
  .pg-item-top { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .pg-type { font-size:12px; font-weight:500; color:var(--text-secondary); letter-spacing:.012em; }
  .pg-chip {
    display:inline-flex; align-items:center; gap:5px;
    font-size:11px; font-weight:500; color:var(--text-secondary);
    padding:2px 8px 2px 6px; border-radius:999px;
    background:color-mix(in srgb, var(--surface-2) 50%, transparent);
  }
  .pg-dot { width:7px; height:7px; border-radius:50%; }
  .pg-vis { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:500; color:var(--text-muted); }
  .pg-vis.client { color:#3FB984; }
  .pg-time { margin-left:auto; font-size:11px; color:var(--text-muted); }
  .pg-item-title { margin:0; font-size:14px; font-weight:500; color:var(--text); letter-spacing:-.003em; }
  .pg-item-desc { margin:0; font-size:13px; line-height:1.55; color:var(--text-secondary); white-space:pre-wrap; }
  .pg-item-link { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:var(--accent, #6a738c); text-decoration:none; width:fit-content; }
  .pg-item-link:hover { text-decoration:underline; }
  .pg-item-actions { display:flex; align-items:center; gap:6px; margin-top:2px; flex-wrap:wrap; }
  .pg-mini {
    display:inline-flex; align-items:center; gap:5px;
    height:28px; padding:0 9px; border-radius:7px;
    border:1px solid color-mix(in srgb, var(--border) 60%, transparent);
    background:transparent; color:var(--text-secondary); font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
    transition:background .12s, color .12s, border-color .12s;
  }
  .pg-mini:hover { color:var(--text); background:color-mix(in srgb, var(--surface-2) 55%, transparent); border-color:var(--border-strong); }
  .pg-mini.danger:hover { color:#d44b4b; border-color:color-mix(in srgb, #d44b4b 40%, transparent); }

  @media (max-width:540px) {
    .pg-form-row { flex-direction:column; align-items:stretch; }
    .pg-field { min-width:0; }
  }
`
