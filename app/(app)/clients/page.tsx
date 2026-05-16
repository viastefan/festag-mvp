'use client'

/**
 * Kunden — Agency Workspace.
 *
 * Sichtbar nur in agency-mode Workspaces. Listet Kunden, gruppiert nach
 * Status, mit den verlinkten Projekten. Click → Kunde-Detail (kommt
 * später) oder direkt zum primären Projekt.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, ArrowRight, UsersThree } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type WorkspaceMode = 'delivery' | 'team' | 'agency'

type ClientRow = {
  id: string
  name: string
  slug: string | null
  industry: string | null
  status: string
  primary_contact_name: string | null
  primary_contact_email: string | null
  brand_color: string | null
  logo_url: string | null
  created_at: string
}

type ProjectStub = {
  id: string
  title: string
  status: string
  client_id: string | null
  project_type: string | null
}

export default function ClientsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [wsMode, setWsMode] = useState<WorkspaceMode>('delivery')
  const [wsId, setWsId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [projects, setProjects] = useState<ProjectStub[]>([])
  const [composerOpen, setComposerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const uid = session.user.id

      const { data: ws } = await supabase
        .from('workspaces').select('id,mode')
        .eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle()
      if (cancelled) return
      const mode = ((ws as any)?.mode as WorkspaceMode) ?? 'delivery'
      setWsMode(mode)
      setWsId((ws as any)?.id ?? null)

      if (mode === 'agency' && (ws as any)?.id) {
        const [{ data: cs }, { data: ps }] = await Promise.all([
          supabase.from('agency_clients').select('id,name,slug,industry,status,primary_contact_name,primary_contact_email,brand_color,logo_url,created_at')
            .eq('workspace_id', (ws as any).id).order('created_at', { ascending: false }),
          supabase.from('projects').select('id,title,status,client_id,project_type')
            .eq('workspace_id', (ws as any).id),
        ])
        if (cancelled) return
        setClients((cs as ClientRow[] | null) ?? [])
        setProjects((ps as ProjectStub[] | null) ?? [])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  const projectsByClient = useMemo(() => {
    const map: Record<string, ProjectStub[]> = {}
    for (const p of projects) {
      if (p.client_id) (map[p.client_id] ||= []).push(p)
    }
    return map
  }, [projects])

  const unassignedProjects = useMemo(() => projects.filter(p => !p.client_id), [projects])

  if (loading) {
    return <div className="clients-page"><style>{CLIENTS_CSS}</style><div className="cl-loading">Lade Kunden…</div></div>
  }

  if (wsMode !== 'agency') {
    return (
      <div className="clients-page">
        <style>{CLIENTS_CSS}</style>
        <header className="cl-head">
          <div>
            <p className="cl-kicker">Workspace · Kunden</p>
            <h1 className="cl-title">Kunden</h1>
            <p className="cl-sub">
              Kundenverwaltung ist für Agency-Workspaces gedacht. Wechsle in den Workspace-Settings
              auf „Agency / White Label Workspace", wenn du externe Kundenprojekte über Festag steuern willst.
            </p>
          </div>
          <Link href="/settings/workspace" className="cl-btn">Workspace-Einstellungen</Link>
        </header>
      </div>
    )
  }

  return (
    <div className="clients-page">
      <style>{CLIENTS_CSS}</style>

      <header className="cl-head">
        <div>
          <p className="cl-kicker">Agency · Kunden</p>
          <h1 className="cl-title">Kunden</h1>
          <p className="cl-sub">
            Bündle Kundenprojekte unter einer eigenen Kunden-Identität — eigenes Branding optional via White-Label.
          </p>
        </div>
        <button type="button" className="cl-btn cl-btn-primary" onClick={() => setComposerOpen(true)}>
          <Plus size={14} /> Kunde anlegen
        </button>
      </header>

      {clients.length === 0 ? (
        <div className="cl-empty">
          <UsersThree size={26} weight="regular" />
          <p className="cl-empty-title">Noch keine Kunden im Workspace</p>
          <p className="cl-empty-sub">
            Leg deinen ersten Kunden an. Du kannst danach bestehende Projekte zuordnen oder
            ein neues Projekt direkt unter diesem Kunden starten.
          </p>
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setComposerOpen(true)}>
            <Plus size={13} /> Ersten Kunden anlegen
          </button>
        </div>
      ) : (
        <section className="cl-list">
          {clients.map(client => {
            const cp = projectsByClient[client.id] ?? []
            const active = cp.filter(p => p.status === 'active' || p.status === 'testing' || p.status === 'planning').length
            return (
              <article key={client.id} className="cl-card">
                <Link href={`/clients/${client.id}`} className="cl-card-head" style={{ textDecoration:'none', color:'inherit' }}>
                  <div className="cl-card-avatar" style={{ background: client.brand_color || 'var(--surface-2)' }}>
                    {client.logo_url ? (
                      <img src={client.logo_url} alt="" />
                    ) : (
                      <span>{(client.name || '?').slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="cl-card-meta">
                    <p className="cl-card-name">{client.name}</p>
                    <p className="cl-card-sub">
                      {[client.industry, client.primary_contact_name, client.primary_contact_email]
                        .filter(Boolean).join(' · ') || 'Noch keine Kontaktdetails'}
                    </p>
                  </div>
                  <div className="cl-card-stats">
                    <span>{cp.length} Projekte</span>
                    <span className="cl-card-active">{active} aktiv</span>
                  </div>
                </Link>
                {cp.length > 0 && (
                  <div className="cl-projects">
                    {cp.slice(0, 5).map(p => (
                      <Link key={p.id} href={`/project/${p.id}`} className="cl-project-row">
                        <span className="cl-project-dot" />
                        <span className="cl-project-name">{p.title}</span>
                        <span className="cl-project-status">{p.status}</span>
                        <ArrowRight size={12} />
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}

      {unassignedProjects.length > 0 && (
        <section className="cl-unassigned">
          <p className="cl-kicker">Noch keinem Kunden zugeordnet</p>
          <p className="cl-sub">
            Diese Projekte gehören zum Agency-Workspace, sind aber noch nicht unter einem Kunden gebündelt.
            Du kannst sie beim Kunden-Detail später zuweisen.
          </p>
          <div className="cl-projects">
            {unassignedProjects.slice(0, 10).map(p => (
              <Link key={p.id} href={`/project/${p.id}`} className="cl-project-row">
                <span className="cl-project-dot" />
                <span className="cl-project-name">{p.title}</span>
                <span className="cl-project-status">{p.status}</span>
                <ArrowRight size={12} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {composerOpen && wsId && (
        <ClientComposer workspaceId={wsId} onClose={() => setComposerOpen(false)} onCreated={c => { setClients(prev => [c, ...prev]); setComposerOpen(false) }} />
      )}
    </div>
  )
}

function ClientComposer({ workspaceId, onClose, onCreated }: { workspaceId: string; onClose: () => void; onCreated: (c: ClientRow) => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!name.trim()) { setError('Name fehlt.'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || null
      const { data, error: insErr } = await supabase.from('agency_clients').insert({
        workspace_id: workspaceId,
        name: name.trim(),
        slug,
        industry: industry.trim() || null,
        primary_contact_name: contactName.trim() || null,
        primary_contact_email: contactEmail.trim() || null,
        brand_color: brandColor.trim() || null,
        created_by: user?.id ?? null,
      }).select('id,name,slug,industry,status,primary_contact_name,primary_contact_email,brand_color,logo_url,created_at').single()
      if (insErr) throw insErr
      onCreated(data as ClientRow)
    } catch (e: any) {
      setError(e?.message || 'Konnte Kunden nicht anlegen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cl-modal-backdrop" onMouseDown={onClose}>
      <div className="cl-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <p className="cl-kicker">Neuer Kunde</p>
        <h3 className="cl-modal-title">Kunde anlegen</h3>

        <label className="cl-field"><span>Name</span><input className="cl-input" value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Müller GmbH" /></label>
        <label className="cl-field"><span>Branche</span><input className="cl-input" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="z. B. Immobilien" /></label>
        <div className="cl-grid">
          <label className="cl-field"><span>Hauptkontakt</span><input className="cl-input" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Name" /></label>
          <label className="cl-field"><span>Kontakt-E-Mail</span><input className="cl-input" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="name@firma.com" /></label>
        </div>
        <label className="cl-field"><span>Brand-Farbe (Hex)</span><input className="cl-input" value={brandColor} onChange={e => setBrandColor(e.target.value)} placeholder="#0E0F0F (optional)" /></label>

        {error && <p className="cl-error">{error}</p>}

        <div className="cl-modal-actions">
          <button type="button" className="cl-btn" onClick={onClose}>Abbrechen</button>
          <button type="button" className="cl-btn cl-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Speichere…' : 'Kunden anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

const CLIENTS_CSS = `
  .clients-page {
    max-width: 980px;
    margin: 0 auto;
    padding: 48px clamp(20px, 4vw, 48px) 80px;
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .cl-loading { padding: 80px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
  .cl-head {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; margin-bottom: 28px;
  }
  .cl-kicker { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .04em; color: var(--text-muted); text-transform: uppercase; }
  .cl-title { margin: 6px 0 4px; font-size: 22px; font-weight: 500; letter-spacing: -.01em; color: var(--text); }
  .cl-sub { margin: 0; max-width: 540px; font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
  .cl-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-family: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: background .12s, border-color .12s;
  }
  .cl-btn:hover { background: var(--surface-2); }
  .cl-btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
  .cl-btn-primary:hover { opacity: 0.92; background: var(--text); }
  .cl-btn:disabled { opacity: .55; cursor: not-allowed; }

  .cl-empty {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 64px 24px;
    border: 1px dashed var(--border);
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface) 35%, transparent);
    color: var(--text-muted);
  }
  .cl-empty-title { margin: 12px 0 6px; font-size: 14px; font-weight: 600; color: var(--text-secondary); }
  .cl-empty-sub { margin: 0 0 18px; max-width: 420px; font-size: 12.5px; line-height: 1.55; color: var(--text-muted); }

  .cl-list { display: flex; flex-direction: column; gap: 10px; }
  .cl-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    overflow: hidden;
  }
  .cl-card-head {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
  }
  .cl-card-avatar {
    width: 44px; height: 44px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: var(--text); font-weight: 600; font-size: 15px;
    overflow: hidden;
  }
  .cl-card-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .cl-card-meta { min-width: 0; }
  .cl-card-name { margin: 0; font-size: 14px; font-weight: 600; color: var(--text); }
  .cl-card-sub { margin: 2px 0 0; font-size: 12px; color: var(--text-muted); line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cl-card-stats {
    display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
    font-size: 11.5px; color: var(--text-muted);
  }
  .cl-card-active { color: var(--text-secondary); font-weight: 500; }

  .cl-projects {
    display: flex; flex-direction: column;
    border-top: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface-2) 40%, transparent);
  }
  .cl-project-row {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto 14px;
    gap: 10px; align-items: center;
    padding: 9px 16px;
    text-decoration: none;
    color: var(--text);
    font-size: 12.5px;
    border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    transition: background .1s;
  }
  .cl-project-row:first-child { border-top: none; }
  .cl-project-row:hover { background: var(--surface-2); }
  .cl-project-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }
  .cl-project-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .cl-project-status { color: var(--text-muted); font-size: 11.5px; }

  .cl-unassigned {
    margin-top: 28px;
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
  }
  .cl-unassigned .cl-projects { background: transparent; border: none; }

  /* Modal */
  .cl-modal-backdrop {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(8,10,12,.56);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .cl-modal {
    width: min(440px, 100%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 24px 60px rgba(0,0,0,.28);
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
  }
  .cl-modal-title { margin: 6px 0 14px; font-size: 17px; font-weight: 600; letter-spacing: -.005em; }
  .cl-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .cl-field > span { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); }
  .cl-input {
    width: 100%;
    padding: 9px 11px;
    border-radius: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    transition: border-color .12s, box-shadow .12s;
  }
  .cl-input:focus { outline: none; border-color: color-mix(in srgb, var(--text) 35%, var(--border)); }
  .cl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cl-error {
    margin: 0 0 10px;
    padding: 8px 11px;
    border-radius: 8px;
    background: rgba(192,54,46,.08);
    color: #c0362e;
    font-size: 12px;
  }
  .cl-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; flex-wrap: wrap; }

  @media (max-width: 720px) {
    .clients-page { padding: 28px 18px 100px; }
    .cl-card-head { grid-template-columns: 40px minmax(0, 1fr); }
    .cl-card-stats { grid-column: 1 / -1; flex-direction: row; gap: 10px; }
    .cl-grid { grid-template-columns: 1fr; }
    .cl-modal-actions .cl-btn { flex: 1; justify-content: center; min-height: 38px; }
  }
`
