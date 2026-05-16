'use client'

/**
 * Kunden-Detail — Agency Workspace.
 *
 * Zeigt eine einzelne Kunden-Identität: Kontaktdaten, Branding-Vorschau,
 * Projekte des Kunden, und ein einfacher "Projekt zuordnen"-Picker für
 * unzugeordnete Workspace-Projekte. Branding-Bearbeitung läuft separat
 * über Settings → Workspace (White-Label). Hier nur Preview + Pflege
 * der Kunden-Stammdaten.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Plus, Check, PencilSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type ClientRow = {
  id: string
  workspace_id: string
  name: string
  slug: string | null
  description: string | null
  industry: string | null
  status: string
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  brand_color: string | null
  logo_url: string | null
  domain: string | null
  created_at: string
  updated_at: string
}

type ProjectStub = {
  id: string
  title: string
  status: string
  project_type: string | null
  client_id: string | null
}

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'Development', testing: 'Testing', done: 'Delivered',
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<ClientRow | null>(null)
  const [projects, setProjects] = useState<ProjectStub[]>([])
  const [allProjects, setAllProjects] = useState<ProjectStub[]>([])
  const [editing, setEditing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingField, setSavingField] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: c } = await supabase
        .from('agency_clients').select('*').eq('id', id).maybeSingle()
      if (cancelled) return
      if (!c) { setLoading(false); return }
      setClient(c as ClientRow)

      const { data: ps } = await supabase
        .from('projects').select('id,title,status,project_type,client_id')
        .eq('workspace_id', (c as ClientRow).workspace_id)
      if (cancelled) return
      const list = (ps as ProjectStub[] | null) ?? []
      setAllProjects(list)
      setProjects(list.filter(p => p.client_id === id))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, supabase])

  async function patchClient(patch: Partial<ClientRow>) {
    if (!client) return
    setSavingField(true)
    const { data, error } = await supabase.from('agency_clients').update(patch).eq('id', client.id).select('*').single()
    setSavingField(false)
    if (error) { alert(`Speichern fehlgeschlagen: ${error.message}`); return }
    if (data) setClient(data as ClientRow)
  }

  async function assignProject(projectId: string) {
    if (!client) return
    const { error } = await supabase.from('projects').update({ client_id: client.id }).eq('id', projectId)
    if (error) { alert(`Konnte Projekt nicht zuordnen: ${error.message}`); return }
    setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, client_id: client.id } : p))
    setProjects(prev => [...prev, allProjects.find(p => p.id === projectId)!].filter(Boolean))
    setPickerOpen(false)
  }

  async function unassignProject(projectId: string) {
    const { error } = await supabase.from('projects').update({ client_id: null }).eq('id', projectId)
    if (error) { alert(`Konnte Zuordnung nicht entfernen: ${error.message}`); return }
    setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, client_id: null } : p))
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  const unassignedProjects = useMemo(
    () => allProjects.filter(p => !p.client_id),
    [allProjects],
  )

  if (loading) {
    return <div className="cd-page"><style>{CSS}</style><div className="cd-loading">Lade Kunde…</div></div>
  }
  if (!client) {
    return (
      <div className="cd-page">
        <style>{CSS}</style>
        <Link href="/clients" className="cd-back"><ArrowLeft size={13} /> Zurück zu Kunden</Link>
        <p className="cd-empty">Kunde nicht gefunden oder kein Zugriff.</p>
      </div>
    )
  }

  const initials = (client.name || '?').slice(0, 1).toUpperCase()
  const active = projects.filter(p => ['active','testing','planning'].includes(p.status)).length

  return (
    <div className="cd-page">
      <style>{CSS}</style>

      <Link href="/clients" className="cd-back"><ArrowLeft size={13} /> Kunden</Link>

      {/* Header */}
      <header className="cd-head">
        <div className="cd-avatar" style={{ background: client.brand_color || 'var(--surface-2)' }}>
          {client.logo_url ? <img src={client.logo_url} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="cd-head-meta">
          <p className="cd-kicker">Agency · Kunde</p>
          <h1 className="cd-title">{client.name}</h1>
          <p className="cd-sub">
            {[client.industry, client.domain].filter(Boolean).join(' · ') || 'Keine Branche / Domain hinterlegt'}
          </p>
        </div>
        <div className="cd-head-actions">
          <button type="button" className="cd-btn" onClick={() => setEditing(v => !v)}>
            <PencilSimple size={13} /> {editing ? 'Fertig' : 'Bearbeiten'}
          </button>
        </div>
      </header>

      {/* Stats strip */}
      <div className="cd-stats">
        <div><span>{projects.length}</span><label>Projekte gesamt</label></div>
        <div><span>{active}</span><label>aktiv</label></div>
        <div><span>{client.status}</span><label>Kunden-Status</label></div>
      </div>

      <div className="cd-grid">
        {/* Left: Projekte */}
        <section className="cd-block">
          <div className="cd-block-head">
            <h3>Projekte</h3>
            <button type="button" className="cd-btn cd-btn-primary" onClick={() => setPickerOpen(v => !v)} disabled={unassignedProjects.length === 0}>
              <Plus size={12} /> Projekt zuordnen
            </button>
          </div>

          {pickerOpen && (
            <div className="cd-picker">
              {unassignedProjects.length === 0 ? (
                <p className="cd-picker-empty">Alle Workspace-Projekte sind bereits zugeordnet.</p>
              ) : (
                unassignedProjects.map(p => (
                  <button key={p.id} type="button" className="cd-picker-row" onClick={() => assignProject(p.id)}>
                    <span className="cd-dot" />
                    <span className="cd-picker-name">{p.title}</span>
                    <span className="cd-picker-status">{PHASE_LABEL[p.status] ?? p.status}</span>
                    <Check size={12} />
                  </button>
                ))
              )}
            </div>
          )}

          {projects.length === 0 ? (
            <p className="cd-empty-soft">Diesem Kunden ist noch kein Projekt zugeordnet.</p>
          ) : (
            <ul className="cd-projects">
              {projects.map(p => (
                <li key={p.id} className="cd-project-row">
                  <Link href={`/project/${p.id}`} className="cd-project-link">
                    <span className="cd-dot" />
                    <span className="cd-project-name">{p.title}</span>
                    {p.project_type && <span className="cd-project-type">{p.project_type}</span>}
                    <span className="cd-project-status">{PHASE_LABEL[p.status] ?? p.status}</span>
                    <ArrowRight size={12} />
                  </Link>
                  <button type="button" className="cd-project-unassign" onClick={() => unassignProject(p.id)} title="Vom Kunden lösen">
                    Lösen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right: Stammdaten + Branding-Preview */}
        <aside className="cd-side">
          <section className="cd-block">
            <h3>Kontakt</h3>
            {editing ? (
              <div className="cd-fields">
                <Field label="Name"     value={client.name}                       onSave={v => patchClient({ name: v })} />
                <Field label="Branche"  value={client.industry ?? ''}             onSave={v => patchClient({ industry: v || null })} />
                <Field label="Ansprechpartner" value={client.primary_contact_name ?? ''} onSave={v => patchClient({ primary_contact_name: v || null })} />
                <Field label="E-Mail"   value={client.primary_contact_email ?? ''} onSave={v => patchClient({ primary_contact_email: v || null })} />
                <Field label="Telefon"  value={client.primary_contact_phone ?? ''} onSave={v => patchClient({ primary_contact_phone: v || null })} />
                <Field label="Domain"   value={client.domain ?? ''}                onSave={v => patchClient({ domain: v || null })} />
              </div>
            ) : (
              <dl className="cd-dl">
                <dt>Branche</dt>     <dd>{client.industry || '—'}</dd>
                <dt>Ansprechpartner</dt><dd>{client.primary_contact_name || '—'}</dd>
                <dt>E-Mail</dt>      <dd>{client.primary_contact_email || '—'}</dd>
                <dt>Telefon</dt>     <dd>{client.primary_contact_phone || '—'}</dd>
                <dt>Domain</dt>      <dd>{client.domain || '—'}</dd>
              </dl>
            )}
            {savingField && <p className="cd-saving">Speichere…</p>}
          </section>

          <section className="cd-block">
            <h3>Branding-Vorschau</h3>
            <p className="cd-side-hint">
              Wird nur in Mails, PDFs und im Kundenportal sichtbar, wenn der Workspace im White-Label-Plan ist.
              <br />
              <Link href="/settings/workspace">→ Workspace-Branding bearbeiten</Link>
            </p>
            {client.slug && (
              <p className="cd-side-hint" style={{ marginTop: 10 }}>
                <Link href={`/c/${client.slug}`} target="_blank" rel="noreferrer">
                  → Kunden-Portal öffnen (/c/{client.slug})
                </Link>
              </p>
            )}
            <div className="cd-brand-preview" style={{ background: client.brand_color || 'var(--surface-2)' }}>
              <div className="cd-brand-logo">
                {client.logo_url ? <img src={client.logo_url} alt="" /> : <span>{initials}</span>}
              </div>
              <div className="cd-brand-name">{client.name}</div>
            </div>
            {editing && (
              <div className="cd-fields" style={{ marginTop: 12 }}>
                <Field label="Brand-Farbe (Hex)" value={client.brand_color ?? ''} placeholder="#0E0F0F" onSave={v => patchClient({ brand_color: v || null })} />
                <Field label="Logo-URL"          value={client.logo_url ?? ''}   placeholder="https://…"  onSave={v => patchClient({ logo_url: v || null })} />
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, value, placeholder, onSave }: { label: string; value: string; placeholder?: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  const dirty = v !== value
  return (
    <label className="cd-field">
      <span>{label}</span>
      <div className="cd-field-row">
        <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} />
        <button type="button" disabled={!dirty} onClick={() => onSave(v.trim())}>Speichern</button>
      </div>
    </label>
  )
}

const CSS = `
  .cd-page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 24px clamp(18px, 3vw, 40px) 72px;
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .cd-loading, .cd-empty { padding: 64px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
  .cd-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-muted); text-decoration: none;
    margin-bottom: 20px;
  }
  .cd-back:hover { color: var(--text); }

  .cd-head {
    display: flex; align-items: center; gap: 18px;
    padding-bottom: 22px; border-bottom: 1px solid var(--border); margin-bottom: 22px;
  }
  .cd-avatar {
    width: 56px; height: 56px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 600; font-size: 20px; overflow: hidden;
    flex-shrink: 0;
  }
  .cd-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .cd-head-meta { flex: 1; min-width: 0; }
  .cd-kicker { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .04em; color: var(--text-muted); text-transform: uppercase; }
  .cd-title { margin: 4px 0 4px; font-size: 22px; font-weight: 500; letter-spacing: -.01em; color: var(--text); }
  .cd-sub   { margin: 0; font-size: 13px; color: var(--text-secondary); }
  .cd-head-actions { display: flex; gap: 8px; flex-shrink: 0; }

  .cd-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text);
    font-family: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .cd-btn:hover { background: var(--surface-2); }
  .cd-btn:disabled { opacity: .5; cursor: not-allowed; }
  .cd-btn-primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
  .cd-btn-primary:hover { background: color-mix(in srgb, var(--accent) 88%, #000); }

  .cd-stats {
    display: flex; gap: 24px; padding: 14px 0;
    border-bottom: 1px solid var(--border); margin-bottom: 28px;
  }
  .cd-stats > div { display: flex; flex-direction: column; }
  .cd-stats span { font-size: 18px; font-weight: 600; color: var(--text); }
  .cd-stats label { font-size: 11px; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; }

  .cd-grid { display: grid; grid-template-columns: 1fr 340px; gap: 28px; }
  @media (max-width: 880px) { .cd-grid { grid-template-columns: 1fr; } }

  .cd-block {
    border: 1px solid var(--border); border-radius: 12px;
    padding: 18px; background: var(--surface);
    margin-bottom: 18px;
  }
  .cd-block h3 { margin: 0 0 12px; font-size: 13px; font-weight: 600; color: var(--text); }
  .cd-block-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .cd-block-head h3 { margin: 0; }

  .cd-empty-soft { margin: 0; font-size: 12.5px; color: var(--text-muted); padding: 8px 0; }
  .cd-saving { font-size: 11px; color: var(--text-muted); margin: 8px 0 0; }

  .cd-projects { list-style: none; padding: 0; margin: 0; }
  .cd-project-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 4px; border-bottom: 1px solid var(--border);
  }
  .cd-project-row:last-child { border-bottom: none; }
  .cd-project-link {
    flex: 1; display: flex; align-items: center; gap: 10px;
    text-decoration: none; color: inherit;
  }
  .cd-project-name { flex: 1; font-size: 13px; color: var(--text); }
  .cd-project-type {
    font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
    color: var(--text-muted); padding: 2px 6px; border: 1px solid var(--border); border-radius: 4px;
  }
  .cd-project-status { font-size: 11px; color: var(--text-muted); }
  .cd-project-unassign {
    font-size: 11px; color: var(--text-muted); background: transparent; border: 1px solid var(--border);
    border-radius: 6px; padding: 3px 8px; cursor: pointer; font-family: inherit;
  }
  .cd-project-unassign:hover { color: var(--text); }

  .cd-dot { width: 6px; height: 6px; border-radius: 50%; background: transparent; border: 1.5px solid var(--border-strong); flex-shrink: 0; box-sizing: border-box; }

  .cd-picker {
    border: 1px dashed var(--border); border-radius: 10px;
    padding: 8px; margin-bottom: 14px; background: color-mix(in srgb, var(--surface-2) 60%, transparent);
  }
  .cd-picker-empty { margin: 6px 4px; font-size: 12px; color: var(--text-muted); }
  .cd-picker-row {
    width: 100%; display: flex; align-items: center; gap: 10px;
    background: transparent; border: none; padding: 7px 6px; border-radius: 7px;
    font-family: inherit; cursor: pointer; color: var(--text); text-align: left;
  }
  .cd-picker-row:hover { background: var(--surface-2); }
  .cd-picker-name { flex: 1; font-size: 13px; }
  .cd-picker-status { font-size: 11px; color: var(--text-muted); }

  .cd-dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; font-size: 12.5px; }
  .cd-dl dt { color: var(--text-muted); }
  .cd-dl dd { margin: 0; color: var(--text); }

  .cd-side-hint { font-size: 11.5px; color: var(--text-muted); margin: -4px 0 12px; line-height: 1.55; }
  .cd-side-hint a { color: var(--text); text-decoration: underline; text-underline-offset: 2px; }

  .cd-brand-preview {
    border-radius: 10px; padding: 18px; min-height: 96px;
    display: flex; align-items: center; gap: 12px;
    color: #fff;
  }
  .cd-brand-logo {
    width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,.18);
    display: flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden;
  }
  .cd-brand-logo img { width: 100%; height: 100%; object-fit: cover; }
  .cd-brand-name { font-size: 15px; font-weight: 600; }

  .cd-fields { display: flex; flex-direction: column; gap: 10px; }
  .cd-field { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--text-muted); }
  .cd-field-row { display: flex; gap: 6px; }
  .cd-field-row input {
    flex: 1; background: transparent; border: 1px solid var(--border); border-radius: 7px;
    padding: 6px 10px; font-size: 13px; color: var(--text); font-family: inherit; outline: none;
  }
  .cd-field-row button {
    font-size: 11.5px; font-weight: 600; padding: 0 10px;
    border: 1px solid var(--border); background: var(--surface); color: var(--text);
    border-radius: 7px; cursor: pointer; font-family: inherit;
  }
  .cd-field-row button:disabled { opacity: .4; cursor: not-allowed; }
`
