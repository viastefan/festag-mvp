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
import { Plus, ArrowRight, UsersThree, LinkSimple, Check } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import Modal, { ModalButton } from '@/components/Modal'
import InviteLinkModal from '@/components/InviteLinkModal'
import PageHeader from '@/components/ui/PageHeader'

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
  const [inviteOpen, setInviteOpen] = useState(false)

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
  const activeProjectsCount = useMemo(
    () => projects.filter(p => p.status === 'active' || p.status === 'testing' || p.status === 'planning').length,
    [projects],
  )
  const inviteProjects = useMemo(() => projects.map(p => ({ id: p.id, title: p.title })), [projects])

  if (loading) {
    return <div className="clients-page"><style>{CLIENTS_CSS}</style><div className="cl-loading">Lade Kunden…</div></div>
  }

  if (wsMode !== 'agency') {
    return (
      <div className="clients-page">
        <style>{CLIENTS_CSS}</style>
        <header className="cl-head">
          <div>
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

      <PageHeader
        title="Kunden"
        subtitle="Kundenprojekte unter einer Kunden-Identität bündeln — Branding optional via White-Label."
        actions={
          <>
            <button type="button" className="fui-action" onClick={() => setInviteOpen(true)}>
              <LinkSimple size={14} /> Kunde einladen
            </button>
            <button type="button" className="fui-action fui-action--primary" onClick={() => setComposerOpen(true)}>
              <Plus size={14} weight="bold" /> Kunde anlegen
            </button>
          </>
        }
      />

      <div className="cl-body">
      {clients.length > 0 && (
        <div className="cl-meta">
          <span><strong>{clients.length}</strong> {clients.length === 1 ? 'Kunde' : 'Kunden'}</span>
          <span className="cl-meta-dot" />
          <span><strong>{projects.length}</strong> {projects.length === 1 ? 'Projekt' : 'Projekte'}</span>
          <span className="cl-meta-dot" />
          <span><strong>{activeProjectsCount}</strong> aktiv</span>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="cl-empty">
          {/* Custom Kunden illustration — layered client cards with brand-colour
              avatar tiles. Calm, on-brand, slate-only (no accent fills). */}
          <div className="cle-art" aria-hidden>
            <span className="cle-card cle-card-3" />
            <span className="cle-card cle-card-2" />
            <span className="cle-card cle-card-1">
              <span className="cle-avatar"><UsersThree size={15} weight="regular" /></span>
              <span className="cle-lines">
                <span className="cle-line cle-line-primary" />
                <span className="cle-line cle-line-silver" />
                <span className="cle-line cle-line-primary cle-line-short" />
              </span>
            </span>
          </div>
          <p className="cl-kicker">Kunden</p>
          <p className="cl-empty-title">Noch keine Kunden im Workspace</p>
          <p className="cl-empty-sub">
            Leg deinen ersten Kunden an. Du kannst danach bestehende Projekte zuordnen
            oder ein neues Projekt direkt unter diesem Kunden starten.
          </p>
          <div className="cl-empty-actions">
            <button type="button" className="cl-btn cl-btn-primary" onClick={() => setComposerOpen(true)}>
              <Plus size={14} weight="bold" /> Ersten Kunden anlegen
            </button>
            <button type="button" className="cl-btn" onClick={() => setInviteOpen(true)}>
              <LinkSimple size={14} /> Per Link einladen
            </button>
          </div>
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
      </div>

      {composerOpen && wsId && (
        <ClientComposer workspaceId={wsId} onClose={() => setComposerOpen(false)} onCreated={c => { setClients(prev => [c, ...prev]); setComposerOpen(false) }} />
      )}

      <InviteLinkModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        allowClient
        defaultKind="client"
        projects={inviteProjects}
      />
    </div>
  )
}

// Curated brand-colour swatches — pick directly. Slate primary first.
const BRAND_SWATCHES = ['#6A738C', '#53616F', '#2F6F89', '#3F7D63', '#8A754D', '#994A55', '#455A64', '#8790A5']

function ClientComposer({ workspaceId, onClose, onCreated }: { workspaceId: string; onClose: () => void; onCreated: (c: ClientRow) => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [brandColor, setBrandColor] = useState('')
  const isCustomColor = !!brandColor && !BRAND_SWATCHES.some(c => c.toLowerCase() === brandColor.toLowerCase())
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
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Kunde anlegen"
      subtitle="Bündle Projekte unter einer Kunden-Identität."
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>Abbrechen</ModalButton>
          <ModalButton variant="primary" onClick={save} loading={saving} disabled={!name.trim()}>
            Kunde anlegen
          </ModalButton>
        </>
      }
    >
      <label className="cl-field"><span>Name</span><input className="cl-input" value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Müller GmbH" autoFocus /></label>
      <label className="cl-field"><span>Branche</span><input className="cl-input" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="z. B. Immobilien" /></label>
      <div className="cl-grid">
        <label className="cl-field"><span>Hauptkontakt</span><input className="cl-input" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Name" /></label>
        <label className="cl-field"><span>Kontakt-E-Mail</span><input className="cl-input" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="name@firma.com" /></label>
      </div>

      {/* Brand colour — pick directly, no hex typing (nobody knows their hex). */}
      <div className="cl-field">
        <span>Brand-Farbe</span>
        <div className="cl-swatches">
          {BRAND_SWATCHES.map(c => (
            <button
              key={c}
              type="button"
              className={`cl-swatch${brandColor.toLowerCase() === c.toLowerCase() ? ' on' : ''}`}
              style={{ background: c }}
              onClick={() => setBrandColor(c)}
              aria-label={`Farbe ${c}`}
            >
              {brandColor.toLowerCase() === c.toLowerCase() && <Check size={12} weight="bold" />}
            </button>
          ))}
          <label className="cl-swatch cl-swatch-custom" title="Eigene Farbe wählen">
            <span className="cl-swatch-custom-fill" style={{ background: isCustomColor ? brandColor : undefined }}>
              {isCustomColor ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" />}
            </span>
            <input
              type="color"
              value={brandColor || '#5B647D'}
              onChange={e => setBrandColor(e.target.value)}
              aria-label="Eigene Brand-Farbe"
            />
          </label>
        </div>
      </div>

      {error && <p className="cl-error">{error}</p>}
    </Modal>
  )
}

const CLIENTS_CSS = `
  /* Match the other workspace pages (tasks / projekte / entscheidungen /
     persönlicher Bereich): full-width inside the panel with the same calm side
     padding and top spacing — keeps the content's left/right "red line"
     consistent across the app. */
  /* Shared shell: PageHeader (.fui-top) owns the top bar + hairline; the body
     keeps the 18px red-line consistent with Tasks/Entscheidungen. */
  .clients-page {
    width: 100%;
    margin: 0;
    padding: 20px 0 80px;
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .cl-body { padding: 18px 18px 0; }
  .cl-loading { padding: 80px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
  .cl-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
  }
  .cl-head-text { min-width: 0; }
  .cl-head-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
  .cl-kicker { margin: 0; font-size: 11px; font-weight: 500; letter-spacing: .06em; color: var(--text-muted); text-transform: uppercase; }
  .cl-title { margin: 7px 0 5px; font-size: 22px; font-weight: 500; letter-spacing: var(--ls-header, .012em); color: var(--text); }
  .cl-sub { margin: 0; max-width: 560px; font-size: 13px; line-height: 1.6; color: var(--text-secondary); letter-spacing: var(--ls-body, .017em); }
  .cl-meta {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    margin-bottom: 22px; font-size: 12.5px; color: var(--text-muted);
    letter-spacing: var(--ls-body, .017em);
  }
  .cl-meta strong { color: var(--text-secondary); font-weight: 500; }
  .cl-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--border-strong); }
  .cl-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--surface);
    color: var(--text);
    font-family: inherit; font-size: 13px; font-weight: 500;
    letter-spacing: var(--ls-body, .017em);
    cursor: pointer;
    text-decoration: none;
    transition: background .14s, border-color .14s;
  }
  .cl-btn:hover { background: var(--surface-2); border-color: var(--border-strong); }
  /* Slate primary — never a coloured/accent button (theme-stable). */
  .cl-btn-primary { background: var(--btn-prim); color: var(--btn-prim-text); border-color: var(--btn-prim); }
  .cl-btn-primary:hover {
    background: color-mix(in srgb, var(--btn-prim) 88%, #000);
    border-color: color-mix(in srgb, var(--btn-prim) 88%, #000);
  }
  .cl-btn:disabled { opacity: .55; cursor: not-allowed; }

  .cl-empty {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 72px 24px;
    color: var(--text-muted);
    animation: clFade .4s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes clFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .cl-empty .cl-kicker { margin-bottom: 8px; }
  .cl-empty-title { margin: 0 0 8px; font-size: 16px; font-weight: 500; color: var(--text); letter-spacing: var(--ls-header, .012em); }
  .cl-empty-sub { margin: 0 0 22px; max-width: 440px; font-size: 13px; line-height: 1.62; color: var(--text-secondary); letter-spacing: var(--ls-body, .017em); }
  .cl-empty-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }

  /* Custom Kunden illustration — softly stacked client cards. */
  .cle-art {
    position: relative; width: 200px; height: 132px; margin-bottom: 26px;
    animation: cleFloat 7s ease-in-out infinite;
  }
  @keyframes cleFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .cle-card {
    position: absolute; left: 50%; border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: 0 12px 30px -20px rgba(15,23,42,.5);
  }
  .cle-card-3 {
    width: 150px; height: 64px; top: 0; margin-left: -75px;
    transform: rotate(-7deg); opacity: .45;
    background: color-mix(in srgb, var(--surface-2) 60%, var(--surface));
  }
  .cle-card-2 {
    width: 162px; height: 70px; top: 10px; margin-left: -81px;
    transform: rotate(4deg); opacity: .7;
    background: color-mix(in srgb, var(--surface-2) 40%, var(--surface));
  }
  .cle-card-1 {
    width: 176px; height: 78px; top: 30px; margin-left: -88px;
    display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: 12px;
    padding: 0 16px;
  }
  .cle-avatar {
    width: 38px; height: 38px; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--btn-prim) 16%, var(--surface-2));
    color: var(--btn-prim);
    border: 1px solid color-mix(in srgb, var(--btn-prim) 28%, var(--border));
  }
  /* Living lines on the front card — primary + silver, looping shimmer. */
  .cle-lines { display: flex; flex-direction: column; gap: 8px; }
  .cle-line {
    height: 6px; border-radius: 4px; transform-origin: left center;
    animation: cleLine 2.8s ease-in-out infinite;
  }
  .cle-line-primary { width: 80px; background: linear-gradient(90deg, #6a738c, color-mix(in srgb, #6a738c 35%, transparent)); }
  .cle-line-silver  { width: 60px; background: linear-gradient(90deg, #b9c0cc, color-mix(in srgb, #8f96a4 50%, transparent)); animation-delay: .45s; }
  .cle-line-short   { width: 42px; animation-delay: .9s; }
  @keyframes cleLine {
    0%, 100% { transform: scaleX(.66); opacity: .5; }
    50%      { transform: scaleX(1);   opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) { .cle-line { animation: none; opacity: .85; } }
  [data-theme="dark"] .cle-card { box-shadow: 0 18px 44px -24px rgba(0,0,0,.7); }

  .cl-list { display: flex; flex-direction: column; gap: 10px; }
  .cl-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    overflow: hidden;
    box-shadow: var(--content-shadow);
    transition: border-color .14s ease;
  }
  .cl-card:hover { border-color: var(--border-strong); }
  .cl-card-head { transition: background .14s ease; }
  .cl-card-head:hover { background: color-mix(in srgb, var(--surface-2) 45%, transparent); }
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
  .cl-card-name { margin: 0; font-size: 14px; font-weight: 500; color: var(--text); letter-spacing: var(--ls-body, .017em); }
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
  .cl-project-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid var(--text-muted);
    background: transparent;
    box-sizing: border-box;
  }
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

  /* Brand-colour swatch picker — select directly, no hex typing. */
  .cl-swatches { display: flex; flex-wrap: wrap; gap: 8px; }
  .cl-swatch {
    position: relative; width: 28px; height: 28px; border-radius: 8px;
    border: 1px solid color-mix(in srgb, #000 14%, transparent);
    cursor: pointer; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    color: #fff;
    box-shadow: 0 1px 2px rgba(15,23,42,.12);
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .cl-swatch:hover { transform: translateY(-1px); }
  .cl-swatch.on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px color-mix(in srgb, var(--text) 45%, var(--border)); }
  .cl-swatch-custom {
    background: var(--surface-2);
    border-style: dashed;
    border-color: var(--border-strong);
    color: var(--text-muted);
    overflow: hidden;
  }
  .cl-swatch-custom-fill {
    position: absolute; inset: 0; display: inline-flex; align-items: center; justify-content: center;
  }
  .cl-swatch-custom input[type="color"] {
    position: absolute; inset: 0; width: 100%; height: 100%;
    opacity: 0; cursor: pointer; border: 0; padding: 0;
  }
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
    .clients-page { padding: 16px 0 100px; }
    .cl-body { padding: 16px 14px 0; }
    .cl-card-head { grid-template-columns: 40px minmax(0, 1fr); }
    .cl-card-stats { grid-column: 1 / -1; flex-direction: row; gap: 10px; }
    .cl-grid { grid-template-columns: 1fr; }
    .cl-modal-actions .cl-btn { flex: 1; justify-content: center; min-height: 38px; }
  }
`
