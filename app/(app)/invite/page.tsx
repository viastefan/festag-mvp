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
import { isDevOrAdmin } from '@/lib/role'
import InviteLinkModal from '@/components/InviteLinkModal'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'

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
  const [navOpen, setNavOpen] = useState(false)
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

  const pageLead = wsMode === 'agency'
    ? 'Lade Kunden, Team-Mitglieder oder externe Mitarbeiter ein. Jede Rolle bekommt eine eigene Sicht.'
    : wsMode === 'team'
      ? 'Bring Co-Founder, Mitarbeiter oder externe Spezialisten ins Team. Rollen steuern, was sichtbar ist.'
      : 'Lade interne Stakeholder ein — Approver, Finance oder Lesezugriff.'

  if (loading) {
    return (
      <div className="dec-os inv-os">
        <style>{DECISION_CSS}</style>
        <style>{INVITE_CSS}</style>
        <div className="dec-m-shell">
          <div className="inv-loading">Workspace wird geladen…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dec-os inv-os">
      <style>{DECISION_CSS}</style>
      <style>{INVITE_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Einladung"
            lead={pageLead}
            onMenu={() => setNavOpen(true)}
          />
        </div>

        <div className="dec-scroll-body">
          <div className="inv-inner">
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
                    <li>Tagro lernt die neue Rolle und passt Briefings sowie Sichtbarkeit automatisch an.</li>
                  </ol>
                </aside>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const INVITE_CSS = `
  .inv-os {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    --inv-text: var(--dec-dark, var(--portal-text, #0f0f10));
    --inv-muted: var(--dec-muted, var(--portal-muted, #71717a));
    --inv-soft: var(--dec-soft, var(--portal-muted, #8f93a4));
    --inv-surface: var(--dec-card-bg, var(--portal-card, #fff));
    --inv-raised: color-mix(in srgb, var(--inv-text) 4%, var(--inv-surface));
    --inv-border: color-mix(in srgb, var(--inv-text) 8%, transparent);
    --inv-cta-bg: var(--dec-cta-bg, var(--portal-btn-primary, #2d2e2c));
    --inv-cta-text: var(--dec-cta-text, var(--portal-btn-primary-text, #fafafa));
    letter-spacing: 0;
  }
  [data-theme="dark"] .inv-os,
  [data-theme="classic-dark"] .inv-os {
    --inv-raised: color-mix(in srgb, #fff 5%, var(--inv-surface));
    --inv-border: color-mix(in srgb, #fff 10%, transparent);
  }

  .inv-inner {
    max-width: min(720px, 100%);
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    color: var(--inv-text);
  }
  .inv-loading {
    padding: 80px var(--festag-content-pad-x, 56px);
    text-align: center;
    color: var(--inv-soft);
    font-size: 13px;
    letter-spacing: 0.03em;
  }

  .inv-linkcta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    flex-wrap: wrap;
    margin-bottom: 22px;
    padding: 16px 18px;
    border: 1px solid var(--inv-border);
    border-radius: 14px;
    background: var(--inv-raised);
  }
  .inv-linkcta-text { min-width: 0; flex: 1; }
  .inv-linkcta-title {
    margin: 0 0 3px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--inv-text);
  }
  .inv-linkcta-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--inv-soft);
    max-width: 460px;
  }
  .inv-linkcta .inv-btn-primary {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .inv-card {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 32px;
    padding: 24px;
    border: 1px solid var(--inv-border);
    border-radius: 16px;
    background: var(--inv-surface);
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
    font-weight: 500;
    letter-spacing: 0.03em;
    color: var(--inv-muted);
  }
  .inv-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--inv-raised);
    border: 1px solid var(--inv-border);
    color: var(--inv-text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.01em;
    transition: border-color .15s, box-shadow .15s;
  }
  .inv-input:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--inv-text) 28%, var(--inv-border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--inv-text) 6%, transparent);
  }
  .inv-hint {
    font-size: 12px;
    color: var(--inv-soft);
    line-height: 1.45;
  }
  .inv-toggle {
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--inv-border);
    border-radius: 12px;
    background: var(--inv-raised);
    cursor: pointer;
  }
  .inv-toggle input { margin-top: 4px; accent-color: var(--inv-cta-bg); }
  .inv-toggle-title {
    display: block;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--inv-text);
    margin-bottom: 2px;
  }
  .inv-toggle-sub {
    display: block;
    font-size: 12px;
    color: var(--inv-soft);
    line-height: 1.45;
  }
  .inv-error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, #c0362e 10%, transparent);
    color: #c0362e;
    font-size: 12.5px;
    font-weight: 500;
  }
  [data-theme="dark"] .inv-error,
  [data-theme="classic-dark"] .inv-error {
    color: #f87171;
    background: color-mix(in srgb, #f87171 12%, transparent);
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
    border-radius: 999px;
    border: 0;
    background: var(--inv-cta-bg);
    color: var(--inv-cta-text);
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: opacity .15s, transform .15s;
  }
  .inv-btn-primary:hover:not(:disabled) { opacity: 0.92; }
  .inv-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .inv-btn-ghost {
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid var(--inv-border);
    background: transparent;
    color: var(--inv-text);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background .15s;
  }
  .inv-btn-ghost:hover {
    background: color-mix(in srgb, var(--inv-text) 5%, transparent);
  }

  .inv-meta {
    border-left: 1px solid var(--inv-border);
    padding-left: 24px;
    min-width: 0;
  }
  .inv-meta-label {
    margin: 0 0 10px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--inv-soft);
  }
  .inv-meta-list {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12.5px;
    color: var(--inv-muted);
    line-height: 1.5;
  }

  .inv-sent {
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: flex-start;
    gap: 16px;
  }
  .inv-sent-mark {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, #15803d 14%, transparent);
    color: #15803d;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  [data-theme="dark"] .inv-sent-mark,
  [data-theme="classic-dark"] .inv-sent-mark {
    color: #4ade80;
    background: color-mix(in srgb, #4ade80 14%, transparent);
  }
  .inv-sent-title {
    margin: 0 0 4px;
    font-size: 14.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--inv-text);
  }
  .inv-sent-sub {
    margin: 0;
    font-size: 13px;
    color: var(--inv-muted);
    line-height: 1.5;
  }
  .inv-sent-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
    grid-column: 1 / -1;
  }

  @media (max-width: 768px) {
    .inv-inner { max-width: 100%; }
    .inv-card { grid-template-columns: 1fr; gap: 22px; padding: 20px; }
    .inv-meta {
      border-left: none;
      border-top: 1px solid var(--inv-border);
      padding-left: 0;
      padding-top: 22px;
    }
    .inv-sent { grid-template-columns: 28px minmax(0, 1fr); }
    .inv-actions .inv-btn-primary,
    .inv-actions .inv-btn-ghost {
      flex: 1 1 calc(50% - 4px);
      justify-content: center;
      text-align: center;
      min-height: 38px;
    }
  }
`
