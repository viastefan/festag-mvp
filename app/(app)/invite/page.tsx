'use client'

/**
 * Einladung — calm, single-purpose page.
 *
 * Brings a person into the user's workspace with a role. No emojis, no
 * loud accent buttons, no competing flows on the same screen. Closed
 * by default — the host stays in control of which projects the invitee
 * sees.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LinkSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { effectiveRole, isDevOrAdmin } from '@/lib/role'
import InviteLinkModal from '@/components/InviteLinkModal'

type WorkspaceMode = 'delivery' | 'team' | 'agency' | null

type RoleOption = {
  id: string
  label: string
  description: string
}

const ROLE_OPTIONS_BY_MODE: Record<Exclude<WorkspaceMode, null>, RoleOption[]> = {
  delivery: [
    { id: 'approver', label: 'Approver',  description: 'Kann Entscheidungen und Meilensteine freigeben.' },
    { id: 'finance',  label: 'Finance',   description: 'Sieht Rechnungen, Zahlungen und Meilensteine.' },
    { id: 'member',   label: 'Mitglied',  description: 'Liest Briefings, kommentiert, lädt Dateien hoch.' },
    { id: 'viewer',   label: 'Viewer',    description: 'Reiner Lesezugriff.' },
  ],
  team: [
    { id: 'admin',           label: 'Admin',           description: 'Verwaltet Projekte, Rollen und Workspace-Einstellungen.' },
    { id: 'project_manager', label: 'Project Manager', description: 'Steuert Projekte, Tasks und Briefings.' },
    { id: 'developer',       label: 'Developer',       description: 'Bearbeitet zugewiesene technische Tasks.' },
    { id: 'reviewer',        label: 'Reviewer',        description: 'Prüft Ergebnisse, gibt strukturiertes Feedback.' },
    { id: 'viewer',          label: 'Viewer',          description: 'Reiner Lesezugriff.' },
  ],
  agency: [
    { id: 'agency_admin',         label: 'Agency Admin',    description: 'Verwaltet Kundenprojekte, Team und Rollen.' },
    { id: 'project_manager',      label: 'Project Manager', description: 'Steuert Kundenprojekte und Briefings.' },
    { id: 'developer',            label: 'Developer',       description: 'Bearbeitet zugewiesene technische Tasks.' },
    { id: 'client_owner',         label: 'Client Owner',    description: 'Hauptansprechpartner im Kundenportal.' },
    { id: 'client_approver',      label: 'Client Approver', description: 'Kann Entscheidungen und Freigaben erteilen.' },
    { id: 'client_viewer',        label: 'Client Viewer',   description: 'Liest Briefings und Status auf Kundenseite.' },
    { id: 'finance',              label: 'Finance',         description: 'Sieht Rechnungen, Zahlungen und Meilensteine.' },
    { id: 'white_label_manager',  label: 'White Label',     description: 'Verwaltet Branding, Domain, Briefing-Vorlagen.' },
  ],
}

const DELIVERY_DEFAULT_ROLE = 'member'
const TEAM_DEFAULT_ROLE = 'project_manager'
const AGENCY_DEFAULT_ROLE = 'project_manager'

export default function InvitePage() {
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [wsMode, setWsMode] = useState<WorkspaceMode>('delivery')
  const [userRole, setUserRole] = useState<string>('client')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<string>(DELIVERY_DEFAULT_ROLE)
  const [closed, setClosed] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string; title: string; color?: string | null }>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const uid = session.user.id

      // Profile role (legacy) + workspace primary mode (modular)
      const [{ data: profile }, { data: ws }] = await Promise.all([
        sb.from('profiles').select('role').eq('id', uid).maybeSingle(),
        sb.from('workspaces').select('id,mode').eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle(),
      ])
      if (cancelled) return
      const r = (profile as any)?.role ?? 'client'
      setUserRole(r)
      const mode = ((ws as any)?.mode as WorkspaceMode) ?? 'delivery'
      setWsMode(mode)

      // Projects this person can assign an invite to (own + workspace).
      const wsId = (ws as any)?.id ?? null
      const projQuery = wsId
        ? sb.from('projects').select('id,title,color').eq('workspace_id', wsId).is('deleted_at', null)
        : sb.from('projects').select('id,title,color').eq('user_id', uid).is('deleted_at', null)
      const { data: ps } = await projQuery
      if (!cancelled && ps) setProjects(ps as any)
      setRole(
        mode === 'team'   ? TEAM_DEFAULT_ROLE
        : mode === 'agency' ? AGENCY_DEFAULT_ROLE
        : DELIVERY_DEFAULT_ROLE
      )
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const effRole = effectiveRole(userRole)
  const isStaff = isDevOrAdmin(userRole)
  const roleOptions = ROLE_OPTIONS_BY_MODE[wsMode || 'delivery']

  async function submit() {
    setError('')
    if (!email.includes('@')) { setError('Bitte eine gültige E-Mail eingeben.'); return }
    setSending(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      const res = await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          // legacy role bucket — staff invites devs as 'dev', everyone else invites clients/team members
          role: isStaff ? 'dev' : 'client',
          invitedName: name.trim() || null,
          workspaceRole: role,
          accessMode: closed ? 'closed' : 'open',
          fromUserId: user?.id,
          fromUserEmail: user?.email,
        }),
      })
      const data = await res.json()
      if (data?.error) throw new Error(data.error)
      try {
        await sb.from('support_messages').insert({
          user_id: user?.id, email: user?.email, page: '/invite',
          message: `Workspace-Einladung an ${email} (Rolle: ${role}, Mode: ${closed ? 'closed' : 'open'}).`,
        })
      } catch {}
      setSent(true)
    } catch (e: any) {
      setError(e?.message || 'Einladung konnte nicht versendet werden.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="inv-page">
        <style>{INVITE_CSS}</style>
        <div className="inv-loading">Workspace wird geladen…</div>
      </div>
    )
  }

  return (
    <div className="inv-page">
      <style>{INVITE_CSS}</style>

      <header className="inv-head">
        <div className="inv-kicker">Workspace · Einladung</div>
        <h1 className="inv-title">Jemand zum Workspace einladen</h1>
        <p className="inv-sub">
          {wsMode === 'agency'
            ? 'Lade Kunden, Team-Mitglieder oder externe Mitarbeiter ein. Jede Rolle bekommt eine eigene Sicht.'
            : wsMode === 'team'
              ? 'Bring Co-Founder, Mitarbeiter oder externe Spezialisten ins Team. Rollen steuern, was sichtbar ist.'
              : 'Lade interne Stakeholder ein — Approver, Finance oder Lesezugriff. Festag liefert wie gewohnt.'}
        </p>
      </header>

      <div className="inv-linkcta">
        <div className="inv-linkcta-text">
          <p className="inv-linkcta-title">Schneller: per Link einladen</p>
          <p className="inv-linkcta-sub">
            Erstelle einen Beitritts-Link und teile ihn selbst — kein PIN, keine Pflicht-Mail.
            Die Person erstellt ihr eigenes Konto und das gewählte Projekt ist sofort sichtbar.
          </p>
        </div>
        <button type="button" className="inv-btn-primary" onClick={() => setLinkOpen(true)}>
          <LinkSimple size={14} /> Einladungslink erstellen
        </button>
      </div>

      <InviteLinkModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        allowClient={wsMode === 'agency'}
        defaultKind={isStaff ? 'contributor' : (wsMode === 'agency' ? 'client' : 'contributor')}
        projects={projects}
      />

      {sent ? (
        <section className="inv-card inv-sent">
          <div className="inv-sent-mark" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="inv-sent-title">Einladung verschickt</p>
            <p className="inv-sent-sub">
              <strong>{email}</strong> bekommt gleich eine ruhige E-Mail mit Zugangslink und initialem PIN.
            </p>
          </div>
          <div className="inv-sent-actions">
            <button type="button" className="inv-btn-ghost" onClick={() => { setSent(false); setEmail(''); setName('') }}>Weitere Person einladen</button>
            <Link href="/settings/workspace" className="inv-btn-ghost">Mitgliederliste öffnen</Link>
          </div>
        </section>
      ) : (
        <section className="inv-card">
          <div className="inv-grid">
            <label className="inv-field">
              <span className="inv-label">Name</span>
              <input
                className="inv-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Optional — wird in der Mail-Anrede genutzt"
              />
            </label>

            <label className="inv-field">
              <span className="inv-label">E-Mail</span>
              <input
                className="inv-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
                placeholder="name@firma.com"
              />
            </label>

            <label className="inv-field">
              <span className="inv-label">Rolle</span>
              <select className="inv-input" value={role} onChange={e => setRole(e.target.value)}>
                {roleOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <span className="inv-hint">{roleOptions.find(o => o.id === role)?.description}</span>
            </label>

            <label className="inv-field inv-toggle">
              <input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} />
              <span>
                <span className="inv-toggle-title">Geschlossener Zugriff</span>
                <span className="inv-toggle-sub">
                  Empfohlen. Die eingeladene Person sieht nur diesen Workspace und nichts anderes auf Festag. Lass den Haken weg, wenn die Person bereits Festag-Account-übergreifend arbeitet.
                </span>
              </span>
            </label>

            {error && <p className="inv-error">{error}</p>}

            <div className="inv-actions">
              <button
                type="button"
                className="inv-btn-primary"
                onClick={submit}
                disabled={!email || sending}
              >
                {sending ? 'Wird versendet…' : 'Einladung senden'}
              </button>
              <Link href="/settings/workspace" className="inv-btn-ghost">
                Workspace-Einstellungen
              </Link>
            </div>
          </div>

          <aside className="inv-meta">
            <p className="inv-meta-label">So läuft das</p>
            <ol className="inv-meta-list">
              <li>Festag prüft die Einladung intern auf Plausibilität.</li>
              <li>Empfänger erhält eine ruhige Mail mit Link und initialem PIN.</li>
              <li>Beim ersten Login wird der PIN geändert, das Profil eingerichtet.</li>
              <li>Veyra lernt die neue Rolle und passt Briefings sowie Sichtbarkeit automatisch an.</li>
            </ol>
          </aside>
        </section>
      )}
    </div>
  )
}

const INVITE_CSS = `
  .inv-page {
    max-width: 760px;
    margin: 0 auto;
    padding: 48px clamp(20px, 4vw, 48px) 80px;
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .inv-loading {
    padding: 80px 0;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
  .inv-head { margin-bottom: 28px; }
  .inv-kicker {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .inv-title {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .inv-sub {
    margin: 0;
    max-width: 540px;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .inv-linkcta {
    display: flex; align-items: center; justify-content: space-between;
    gap: 18px; flex-wrap: wrap;
    margin-bottom: 22px;
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
  }
  .inv-linkcta-text { min-width: 0; flex: 1; }
  .inv-linkcta-title { margin: 0 0 3px; font-size: 13.5px; font-weight: 600; color: var(--text); }
  .inv-linkcta-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--text-muted); max-width: 460px; }
  .inv-linkcta .inv-btn-primary { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; }

  .inv-card {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 32px;
    padding: 24px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
  }
  .inv-grid {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }
  .inv-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .inv-label {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--text-secondary);
  }
  .inv-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    transition: border-color .15s, box-shadow .15s;
  }
  .inv-input:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--text) 35%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--text) 8%, transparent);
  }
  .inv-hint {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .inv-toggle {
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    cursor: pointer;
  }
  .inv-toggle input { margin-top: 4px; }
  .inv-toggle-title { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
  .inv-toggle-sub { display: block; font-size: 12px; color: var(--text-muted); line-height: 1.5; }
  .inv-error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(192,54,46,0.08);
    color: #c0362e;
    font-size: 12.5px;
    font-weight: 500;
  }
  .inv-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    flex-wrap: wrap;
  }
  .inv-btn-primary {
    padding: 10px 18px;
    border-radius: 8px;
    border: 1px solid var(--text);
    background: var(--text);
    color: var(--bg);
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.005em;
    cursor: pointer;
    transition: opacity .15s, transform .15s;
  }
  .inv-btn-primary:hover:not(:disabled) { opacity: 0.92; }
  .inv-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .inv-btn-ghost {
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: background .15s;
  }
  .inv-btn-ghost:hover { background: var(--surface-2); }

  .inv-meta {
    border-left: 1px solid var(--border);
    padding-left: 24px;
    min-width: 0;
  }
  .inv-meta-label {
    margin: 0 0 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .inv-meta-list {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12.5px;
    color: var(--text-secondary);
    line-height: 1.55;
  }

  .inv-sent {
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: flex-start;
    gap: 16px;
  }
  .inv-sent-mark {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: rgba(21, 128, 61, 0.12);
    color: #15803D;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .inv-sent-title { margin: 0 0 4px; font-size: 14.5px; font-weight: 600; color: var(--text); }
  .inv-sent-sub { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.55; }
  .inv-sent-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; grid-column: 1 / -1; }

  @media (max-width: 760px) {
    .inv-page { padding: 28px 18px 100px; }
    .inv-card { grid-template-columns: 1fr; gap: 22px; padding: 20px; }
    .inv-meta { border-left: none; border-top: 1px solid var(--border); padding-left: 0; padding-top: 22px; }
    .inv-sent { grid-template-columns: 28px minmax(0, 1fr); }
    .inv-actions .inv-btn-primary,
    .inv-actions .inv-btn-ghost { flex: 1 1 calc(50% - 4px); justify-content: center; text-align: center; min-height: 38px; }
  }
`
