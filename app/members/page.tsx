'use client'

/**
 * Festag — Members / Team management.
 *
 * A self-contained, full-viewport graphite dark screen in the spirit of
 * Linear / Vercel / Apple system UI, but with Festag's own identity:
 * operational visibility, accountability, structured execution, and a
 * Tagro intelligence layer inside each member profile.
 *
 * The premium graphite tokens are scoped under `.ms` so they never leak
 * into the rest of the app's theme. The "Einladen" action reuses the real
 * link-first invite model.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import {
  Tray, ListChecks, Stack, SquaresFour, UsersThree, GitBranch, FileText,
  Sparkle, Plugs, Question, Gear, MagnifyingGlass, Plus, CaretUpDown,
  UserPlus, CaretRight, ShieldCheck, Warning, ArrowsClockwise,
  List, X, DotOutline,
} from '@phosphor-icons/react'
import InviteLinkModal from '@/components/InviteLinkModal'

type Role = 'Owner' | 'Manager' | 'Executor' | 'Reviewer' | 'Finance' | 'Viewer'
type Status = 'online' | 'active' | 'available' | 'pending' | 'offline'
type SignalKind = 'synced' | 'pending' | 'clear' | 'stale' | 'readonly'

type Member = {
  id: string
  name: string
  email: string
  initials: string
  avatar: string // hex tint
  role: Role
  status: Status
  joined: string
  team: string
  lastActivity: string
  signal: { kind: SignalKind; label: string }
  projects: string[]
  openTasks: number
  tagro: { synced: string; insight: string; blockers: string; reliability: string; next: string }
  connectors: { name: string; state: string }[]
  risk: 'none' | 'low' | 'watch'
  permissions: string[]
}

const MEMBERS: Member[] = [
  {
    id: 'stefan', name: 'Stefan Dirnberger', email: 'stefan@festag.app', initials: 'SD', avatar: '#8b8dff',
    role: 'Owner', status: 'online', joined: 'Jan 2026', team: 'Festag Core', lastActivity: 'vor 2 Min',
    signal: { kind: 'synced', label: 'Synced' },
    projects: ['Prozessdigitalisierung', 'Landingpage Vergleich', 'Festag Core'],
    openTasks: 4,
    tagro: {
      synced: 'vor 2 Min · 3 Aufgaben',
      insight: 'Tagro erkennt stetige Aktivität über 3 Projekte. Kein kritischer Blocker. Ein Statusbericht ist zur Freigabe bereit.',
      blockers: 'Keine offenen Blocker',
      reliability: 'Hoch · konsistente Updates',
      next: 'Statusbericht „Prozessdigitalisierung" freigeben',
    },
    connectors: [{ name: 'GitHub', state: 'aktiv' }, { name: 'Linear', state: 'aktiv' }],
    risk: 'none',
    permissions: ['Workspace verwalten', 'Mitglieder & Rollen', 'Abrechnung', 'Alle Projekte'],
  },
  {
    id: 'dev', name: 'Developer Partner', email: 'dev@webdelivery.io', initials: 'DP', avatar: '#4aa8ff',
    role: 'Executor', status: 'active', joined: 'Feb 2026', team: 'Web Delivery', lastActivity: 'Heute',
    signal: { kind: 'pending', label: 'Bericht offen' },
    projects: ['Prozessdigitalisierung', 'Landingpage Vergleich'],
    openTasks: 7,
    tagro: {
      synced: 'vor 38 Min · 5 Commits',
      insight: 'Aktive Umsetzung an 2 Aufgaben. Ein Status-Update steht aus — Tagro bereitet eine geprüfte Zusammenfassung vor.',
      blockers: '1 Aufgabe wartet auf Freigabe',
      reliability: 'Stabil · liefert regelmäßig',
      next: 'Update zu „Anwenderschulung" anfordern',
    },
    connectors: [{ name: 'GitHub', state: 'aktiv' }],
    risk: 'low',
    permissions: ['Zugewiesene Projekte', 'Execution Panel', 'Eigene Aufgaben'],
  },
  {
    id: 'owner', name: 'Project Owner', email: 'owner@clientops.com', initials: 'PO', avatar: '#2fc66d',
    role: 'Manager', status: 'available', joined: 'Feb 2026', team: 'Client Operations', lastActivity: 'vor 1 Std',
    signal: { kind: 'clear', label: 'Clear' },
    projects: ['Landingpage Vergleich'],
    openTasks: 2,
    tagro: {
      synced: 'vor 1 Std · Freigabe erteilt',
      insight: 'Steuert das Kundenprojekt ruhig. Keine offenen Entscheidungen, Fortschritt im Plan.',
      blockers: 'Keine',
      reliability: 'Hoch · klare Kommunikation',
      next: 'Nächsten Meilenstein bestätigen',
    },
    connectors: [{ name: 'Slack', state: 'aktiv' }],
    risk: 'none',
    permissions: ['Projekt steuern', 'Freigaben', 'Berichte einsehen'],
  },
  {
    id: 'lena', name: 'Lena Hofmann', email: 'lena@festag.app', initials: 'LH', avatar: '#d8a84f',
    role: 'Reviewer', status: 'online', joined: 'Mär 2026', team: 'Festag Core', lastActivity: 'vor 14 Min',
    signal: { kind: 'clear', label: 'Clear' },
    projects: ['Festag Core', 'Prozessdigitalisierung'],
    openTasks: 3,
    tagro: {
      synced: 'vor 14 Min · 2 Reviews',
      insight: 'Prüft Ergebnisse zuverlässig. Zwei Reviews abgeschlossen, kein Risiko erkennbar.',
      blockers: 'Keine',
      reliability: 'Hoch',
      next: 'Offene Review zu „Tech-Stack" abschließen',
    },
    connectors: [{ name: 'GitHub', state: 'aktiv' }],
    risk: 'none',
    permissions: ['Ergebnisse prüfen', 'Kommentieren', 'Berichte einsehen'],
  },
  {
    id: 'marco', name: 'Marco Reuter', email: 'marco@webdelivery.io', initials: 'MR', avatar: '#a1a3a8',
    role: 'Executor', status: 'offline', joined: 'Mär 2026', team: 'Web Delivery', lastActivity: 'Gestern',
    signal: { kind: 'stale', label: 'Kein Signal' },
    projects: ['Landingpage Vergleich'],
    openTasks: 1,
    tagro: {
      synced: 'vor 1 Tag',
      insight: 'Seit gestern keine neue Aktivität. Tagro empfiehlt ein kurzes Check-in, um den Stand zu klären.',
      blockers: 'Aktivität unklar — Update fehlt',
      reliability: 'Beobachten · unregelmäßig',
      next: 'Check-in zu offener Aufgabe anstoßen',
    },
    connectors: [{ name: 'GitHub', state: 'inaktiv' }],
    risk: 'watch',
    permissions: ['Zugewiesene Projekte', 'Eigene Aufgaben'],
  },
  {
    id: 'sofia', name: 'Sofia Brandt', email: 'sofia@clientops.com', initials: 'SB', avatar: '#8b8dff',
    role: 'Finance', status: 'available', joined: 'Apr 2026', team: 'Client Operations', lastActivity: 'vor 3 Std',
    signal: { kind: 'clear', label: 'Clear' },
    projects: ['Landingpage Vergleich'],
    openTasks: 0,
    tagro: {
      synced: 'vor 3 Std',
      insight: 'Verfolgt Meilensteine und Zahlungen. Keine offenen Posten, alles im Rahmen.',
      blockers: 'Keine',
      reliability: 'Hoch',
      next: 'Nächste Rechnung vorbereiten',
    },
    connectors: [{ name: 'Stripe', state: 'aktiv' }],
    risk: 'none',
    permissions: ['Rechnungen', 'Zahlungen', 'Meilensteine'],
  },
  {
    id: 'auditor', name: 'External Auditor', email: 'audit@investor.fund', initials: 'EA', avatar: '#74777d',
    role: 'Viewer', status: 'offline', joined: 'Apr 2026', team: 'Investor Relations', lastActivity: 'vor 2 Tagen',
    signal: { kind: 'readonly', label: 'Read-only' },
    projects: ['Portfolio-Übersicht'],
    openTasks: 0,
    tagro: {
      synced: 'vor 2 Tagen',
      insight: 'Reiner Lesezugriff. Sieht ausschließlich geprüfte, freigegebene Statusberichte.',
      blockers: 'Keine',
      reliability: '—',
      next: 'Keine Aktion nötig',
    },
    connectors: [],
    risk: 'none',
    permissions: ['Nur Lesezugriff', 'Freigegebene Berichte'],
  },
]

const ROLE_VIOLET = new Set<Role>(['Owner'])

const STATUS_LABEL: Record<Status, string> = {
  online: 'Online', active: 'Aktiv', available: 'Verfügbar', pending: 'Ausstehend', offline: 'Offline',
}

const NAV_PRIMARY = [
  { id: 'inbox', label: 'Inbox', Icon: Tray, href: '/dashboard' },
  { id: 'issues', label: 'Meine Aufgaben', Icon: ListChecks, href: '/tasks' },
  { id: 'projects', label: 'Projekte', Icon: Stack, href: '/projects' },
  { id: 'views', label: 'Ansichten', Icon: SquaresFour, href: '/projects' },
  { id: 'members', label: 'Mitglieder', Icon: UsersThree, href: '/members', active: true },
  { id: 'decisions', label: 'Entscheidungen', Icon: GitBranch, href: '/decisions' },
  { id: 'reports', label: 'Statusberichte', Icon: FileText, href: '/reports' },
  { id: 'tagro', label: 'Tagro AI', Icon: Sparkle, href: '/dashboard' },
  { id: 'connectors', label: 'Connectors', Icon: Plugs, href: '/connectors' },
]

export default function MembersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(MEMBERS[0].id)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const selected = useMemo(() => MEMBERS.find((m) => m.id === selectedId) ?? null, [selectedId])

  // Force the graphite surface behind any overscroll, independent of the
  // app's stored theme. Other routes set their own background on mount.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const prev = document.documentElement.style.backgroundColor
    document.documentElement.style.backgroundColor = '#080909'
    return () => { document.documentElement.style.backgroundColor = prev }
  }, [])

  function pick(id: string) {
    setSelectedId(id)
    setOverlayOpen(true)
  }
  function closeDetails() {
    if (typeof window !== 'undefined' && window.innerWidth > 1280) setSelectedId(null)
    else setOverlayOpen(false)
  }

  return (
    <div className="ms">
      <style>{CSS}</style>

      {/* ── Sidebar ── */}
      <aside className={`ms-sb${navOpen ? ' is-open' : ''}`}>
        <button type="button" className="ms-ws">
          <span className="ms-ws-mark">C</span>
          <span className="ms-ws-name">Cfdtradesd</span>
          <CaretUpDown size={13} className="ms-ws-caret" />
        </button>

        <div className="ms-sb-tools">
          <button type="button" className="ms-tool"><MagnifyingGlass size={15} /> <span>Suchen</span><kbd>⌘K</kbd></button>
          <button type="button" className="ms-tool ms-tool-new" onClick={() => setInviteOpen(true)}><Plus size={15} weight="bold" /></button>
        </div>

        <nav className="ms-nav">
          {NAV_PRIMARY.map(({ id, label, Icon, href, active }) => (
            <Link key={id} href={href} className={`ms-nav-item${active ? ' on' : ''}`} onClick={() => setNavOpen(false)}>
              <Icon size={16} weight={active ? 'fill' : 'regular'} />
              <span>{label}</span>
            </Link>
          ))}

          <div className="ms-nav-group">Festag Core</div>
          <a className="ms-nav-item ms-nav-sub" href="/tasks"><ListChecks size={15} /><span>Aufgaben</span></a>
          <a className="ms-nav-item ms-nav-sub" href="/projects"><Stack size={15} /><span>Projekte</span></a>
          <a className="ms-nav-item ms-nav-sub" href="/projects"><SquaresFour size={15} /><span>Ansichten</span></a>
        </nav>

        <div className="ms-sb-foot">
          <a className="ms-nav-item" href="/dashboard"><Question size={16} /><span>Hilfe</span></a>
          <a className="ms-nav-item" href="/settings"><Gear size={16} /><span>Einstellungen</span></a>
        </div>
      </aside>
      {navOpen && <div className="ms-scrim" onClick={() => setNavOpen(false)} />}

      {/* ── Main ── */}
      <main className="ms-main">
        <header className="ms-head">
          <div className="ms-head-left">
            <button type="button" className="ms-burger" onClick={() => setNavOpen(true)} aria-label="Menü"><List size={18} /></button>
            <h1>Mitglieder</h1>
            <span className="ms-count">{MEMBERS.length}</span>
          </div>
          <div className="ms-head-right">
            <button type="button" className="ms-btn ms-btn-ghost" onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} /> Einladen
            </button>
            <button type="button" className="ms-btn ms-btn-primary" onClick={() => setInviteOpen(true)} aria-label="Mitglied hinzufügen">
              <Plus size={14} weight="bold" />
            </button>
          </div>
        </header>

        <div className={`ms-content${selected ? ' has-details' : ''}`}>
          <section className="ms-table-wrap" aria-label="Mitglieder">
            <div className="ms-thead">
              <span>Name</span>
              <span>Rolle</span>
              <span>Status</span>
              <span className="ms-col-joined">Beigetreten</span>
              <span className="ms-col-team">Team</span>
              <span className="ms-col-activity">Letzte Aktivität</span>
              <span>Trust Layer</span>
            </div>

            <div className="ms-tbody">
              {MEMBERS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`ms-row${m.id === selectedId ? ' is-selected' : ''}`}
                  onClick={() => pick(m.id)}
                >
                  <span className="ms-cell ms-cell-name">
                    <span className="ms-avatar" style={{ '--a': m.avatar } as CSSProperties}>{m.initials}</span>
                    <span className="ms-name-block">
                      <span className="ms-name">{m.name}</span>
                      <span className="ms-email">{m.email}</span>
                    </span>
                  </span>

                  <span className="ms-cell">
                    <span className={`ms-role${ROLE_VIOLET.has(m.role) ? ' is-owner' : ''}`}>{m.role}</span>
                  </span>

                  <span className="ms-cell">
                    <span className="ms-status">
                      <span className={`ms-status-dot s-${m.status}`} />
                      {STATUS_LABEL[m.status]}
                    </span>
                  </span>

                  <span className="ms-cell ms-col-joined ms-dim">{m.joined}</span>
                  <span className="ms-cell ms-col-team"><span className="ms-team">{m.team}</span></span>
                  <span className="ms-cell ms-col-activity ms-dim">{m.lastActivity}</span>

                  <span className="ms-cell">
                    <span className={`ms-signal k-${m.signal.kind}`}>
                      <span className="ms-signal-dot" />
                      {m.signal.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Details panel ── */}
          {selected && (
          <aside className={`ms-details${overlayOpen ? ' is-open' : ''}`} key={selected.id} aria-label="Mitgliedsdetails">
            <div className="ms-det-top">
              <button type="button" className="ms-det-close" onClick={closeDetails} aria-label="Schließen"><X size={15} /></button>
            </div>

            <div className="ms-det-head">
              <span className="ms-avatar lg" style={{ '--a': selected.avatar } as CSSProperties}>{selected.initials}</span>
              <div>
                <p className="ms-det-name">{selected.name}</p>
                <p className="ms-det-sub">{selected.email}</p>
              </div>
            </div>

            <div className="ms-det-chips">
              <span className={`ms-role${ROLE_VIOLET.has(selected.role) ? ' is-owner' : ''}`}>{selected.role}</span>
              <span className="ms-status"><span className={`ms-status-dot s-${selected.status}`} />{STATUS_LABEL[selected.status]}</span>
              <span className="ms-team">{selected.team}</span>
            </div>

            <div className="ms-det-scroll">
              <div className="ms-det-stats">
                <div className="ms-stat">
                  <span className="ms-stat-num">{selected.projects.length}</span>
                  <span className="ms-stat-key">Projekte</span>
                </div>
                <div className="ms-stat">
                  <span className="ms-stat-num">{selected.openTasks}</span>
                  <span className="ms-stat-key">Offene Aufgaben</span>
                </div>
                <div className="ms-stat">
                  <span className={`ms-stat-num risk-${selected.risk}`}>{selected.risk === 'none' ? 'Keins' : selected.risk === 'low' ? 'Gering' : 'Beobachten'}</span>
                  <span className="ms-stat-key">Risiko</span>
                </div>
              </div>

              {/* Tagro visibility — intelligence layer, not a chatbot */}
              <section className="ms-tagro">
                <div className="ms-tagro-head">
                  <Sparkle size={13} weight="fill" />
                  <span>Tagro Visibility</span>
                  <span className="ms-tagro-sync"><ArrowsClockwise size={11} /> {selected.tagro.synced}</span>
                </div>
                <p className="ms-tagro-insight">{selected.tagro.insight}</p>
                <div className="ms-tagro-rows">
                  <div><span className="ms-k"><Warning size={12} /> Blocker</span><span className="ms-v">{selected.tagro.blockers}</span></div>
                  <div><span className="ms-k"><ShieldCheck size={12} /> Verlässlichkeit</span><span className="ms-v">{selected.tagro.reliability}</span></div>
                  <div><span className="ms-k"><CaretRight size={12} /> Nächster Schritt</span><span className="ms-v">{selected.tagro.next}</span></div>
                </div>
              </section>

              <section className="ms-det-sec">
                <p className="ms-det-label">Zugewiesene Projekte</p>
                <div className="ms-det-list">
                  {selected.projects.map((p) => (
                    <span key={p} className="ms-det-list-row"><DotOutline size={16} weight="fill" /> {p}</span>
                  ))}
                </div>
              </section>

              <section className="ms-det-sec">
                <p className="ms-det-label">Connector-Aktivität</p>
                {selected.connectors.length ? (
                  <div className="ms-det-list">
                    {selected.connectors.map((c) => (
                      <span key={c.name} className="ms-det-list-row ms-conn">
                        <Plugs size={13} /> {c.name}
                        <span className={`ms-conn-state${c.state === 'aktiv' ? ' on' : ''}`}>{c.state}</span>
                      </span>
                    ))}
                  </div>
                ) : <p className="ms-det-empty">Keine Connectors verbunden.</p>}
              </section>

              <section className="ms-det-sec">
                <p className="ms-det-label">Berechtigungen</p>
                <div className="ms-perm-row">
                  {selected.permissions.map((p) => <span key={p} className="ms-perm">{p}</span>)}
                </div>
              </section>
            </div>

            <div className="ms-det-actions">
              <button type="button" className="ms-btn ms-btn-ghost full">Rolle ändern</button>
              <button type="button" className="ms-btn ms-btn-primary full" onClick={() => setInviteOpen(true)}>Einladen</button>
              <button type="button" className="ms-btn ms-btn-danger full">Entfernen</button>
            </div>
          </aside>
          )}
        </div>
      </main>

      <InviteLinkModal open={inviteOpen} onClose={() => setInviteOpen(false)} defaultKind="contributor" />
    </div>
  )
}

const CSS = `
.ms {
  --bg-app:#07090b; --bg-sidebar:#07090b; --bg-panel:#10141a; --bg-panel-soft:#131922;
  --bg-row:#10141a; --bg-row-hover:#171e28; --bg-active:#1c2430;
  --border-subtle:rgba(210,225,255,.07); --border-soft:rgba(210,225,255,.11); --border-medium:rgba(210,225,255,.16);
  --text-primary:#e8ebf1; --text-secondary:#a8b0bc; --text-muted:#7f8997; --text-faint:#606a77;
  --accent-primary:#8e96ff; --accent-primary-soft:rgba(142,150,255,.16);
  --accent-blue:#5ba8ff; --accent-green:#35c878; --accent-warning:#d5a655;
  --r-sm:8px; --r-md:12px; --r-lg:16px;
  --ease:cubic-bezier(.16,1,.3,1);
  --fast:140ms var(--ease); --base:220ms var(--ease);

  position:fixed; inset:0;
  display:grid; grid-template-columns:248px 1fr;
  height:100dvh; width:100%;
  background:var(--bg-app); color:var(--text-primary);
  font-family:var(--font-aeonik,'Aeonik',Inter,-apple-system,sans-serif);
  font-weight:500; letter-spacing:.012em;
  -webkit-font-smoothing:antialiased;
  overflow:hidden;
}
.ms * { box-sizing:border-box; }
.ms ::-webkit-scrollbar { width:9px; height:9px; }
.ms ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); border-radius:999px; border:2px solid transparent; background-clip:padding-box; }
.ms ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.14); background-clip:padding-box; }

/* ── Sidebar ── */
.ms-sb {
  background:var(--bg-sidebar); border-right:1px solid var(--border-subtle);
  display:flex; flex-direction:column; padding:12px 10px; gap:4px; min-height:0;
}
.ms-ws {
  display:flex; align-items:center; gap:9px; width:100%; height:38px; padding:0 8px;
  background:transparent; border:0; border-radius:var(--r-sm); cursor:pointer; color:var(--text-primary);
  font:inherit; font-size:13px; transition:background var(--fast);
}
.ms-ws:hover { background:var(--bg-row-hover); }
.ms-ws-mark {
  width:22px; height:22px; border-radius:6px; flex-shrink:0;
  background:var(--accent-green); color:#04130a; font-size:11px; font-weight:600;
  display:inline-flex; align-items:center; justify-content:center;
}
.ms-ws-name { flex:1; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ms-ws-caret { color:var(--text-muted); flex-shrink:0; }

.ms-sb-tools { display:flex; gap:6px; margin:6px 0 10px; }
.ms-tool {
  flex:1; height:32px; display:inline-flex; align-items:center; gap:8px; padding:0 9px;
  background:var(--bg-panel-soft); border:1px solid var(--border-subtle); border-radius:var(--r-sm);
  color:var(--text-secondary); font:inherit; font-size:12.5px; cursor:pointer; transition:background var(--fast), color var(--fast), border-color var(--fast);
}
.ms-tool:hover { background:var(--bg-row-hover); color:var(--text-primary); border-color:var(--border-soft); }
.ms-tool kbd { margin-left:auto; font:inherit; font-size:10.5px; color:var(--text-faint); }
.ms-tool-new { flex:0 0 36px; justify-content:center; padding:0; color:var(--text-primary); }

.ms-nav { display:flex; flex-direction:column; gap:1px; overflow-y:auto; min-height:0; flex:1; }
.ms-nav-item {
  display:flex; align-items:center; gap:10px; height:32px; padding:0 9px;
  border-radius:var(--r-sm); color:var(--text-secondary); text-decoration:none;
  font-size:13px; cursor:pointer; transition:background var(--fast), color var(--fast);
}
.ms-nav-item svg { color:var(--text-muted); transition:color var(--fast); flex-shrink:0; }
.ms-nav-item:hover { background:var(--bg-row-hover); color:var(--text-primary); }
.ms-nav-item:hover svg { color:var(--text-secondary); }
.ms-nav-item.on { background:var(--bg-active); color:var(--text-primary); }
.ms-nav-item.on svg { color:var(--accent-primary); }
.ms-nav-group {
  margin:16px 0 4px; padding:0 9px; font-size:11px; font-weight:500;
  letter-spacing:.06em; text-transform:uppercase; color:var(--text-faint);
}
.ms-nav-sub { height:30px; font-size:12.5px; }
.ms-sb-foot { display:flex; flex-direction:column; gap:1px; padding-top:8px; border-top:1px solid var(--border-subtle); }

/* ── Main ── */
.ms-main { display:flex; flex-direction:column; min-width:0; min-height:0; background:var(--bg-app); }
.ms-head {
  height:56px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between;
  padding:0 22px; border-bottom:1px solid var(--border-subtle);
}
.ms-head-left { display:flex; align-items:center; gap:11px; min-width:0; }
.ms-head-left h1 { margin:0; font-size:15px; font-weight:500; color:var(--text-primary); letter-spacing:.01em; }
.ms-count {
  display:inline-flex; align-items:center; justify-content:center; min-width:20px; height:19px; padding:0 6px;
  border-radius:999px; background:var(--bg-panel-soft); border:1px solid var(--border-subtle);
  font-size:11px; color:var(--text-muted);
}
.ms-burger { display:none; }
.ms-head-right { display:flex; align-items:center; gap:8px; }

.ms-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:7px;
  height:32px; padding:0 13px; border-radius:var(--r-sm); font:inherit; font-size:12.5px; font-weight:500;
  cursor:pointer; transition:background var(--fast), border-color var(--fast), box-shadow var(--fast), transform var(--fast);
}
.ms-btn-ghost { background:transparent; border:1px solid var(--border-soft); color:var(--text-secondary); }
.ms-btn-ghost:hover { background:var(--bg-row-hover); color:var(--text-primary); border-color:var(--border-medium); }
.ms-btn-primary {
  background:var(--bg-active); border:1px solid var(--border-medium); color:var(--text-primary); padding:0 12px;
}
.ms-btn-primary:hover { background:#212227; box-shadow:0 0 0 1px var(--accent-primary-soft), 0 6px 20px -10px rgba(139,141,255,.5); transform:translateY(-1px); }
.ms-btn-danger { background:transparent; border:1px solid var(--border-soft); color:#d98a8a; }
.ms-btn-danger:hover { background:rgba(217,138,138,.08); border-color:rgba(217,138,138,.3); }
.ms-btn.full { width:100%; }

/* ── Content ── */
.ms-content { flex:1; display:flex; min-height:0; }
.ms-table-wrap { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }

.ms-thead, .ms-row {
  display:grid;
  grid-template-columns:minmax(200px,1.7fr) 108px 116px 96px 150px 132px 132px;
  align-items:center; gap:12px;
}
.ms-thead {
  padding:11px 22px; flex-shrink:0;
  border-bottom:1px solid var(--border-subtle);
  font-size:11px; font-weight:500; letter-spacing:.05em; text-transform:uppercase; color:var(--text-faint);
}
.ms-tbody { flex:1; overflow-y:auto; padding:6px 12px 16px; min-height:0; }
.ms-row {
  width:100%; text-align:left; padding:9px 10px; margin:1px 0;
  background:transparent; border:0; border-radius:var(--r-md); cursor:pointer;
  color:var(--text-secondary); font:inherit;
  transition:background 160ms var(--ease);
}
.ms-row:hover { background:var(--bg-row-hover); }
.ms-row.is-selected { background:var(--bg-active); }
.ms-cell { min-width:0; display:flex; align-items:center; font-size:13px; }
.ms-dim { color:var(--text-muted); font-size:12.5px; }

.ms-cell-name { gap:11px; }
.ms-avatar {
  width:30px; height:30px; border-radius:50%; flex-shrink:0;
  display:inline-flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:600; letter-spacing:0;
  color:color-mix(in srgb, var(--a,#8b8dff) 78%, #fff 22%);
  background:color-mix(in srgb, var(--a,#8b8dff) 18%, transparent);
  border:1px solid color-mix(in srgb, var(--a,#8b8dff) 30%, transparent);
}
.ms-avatar.lg { width:46px; height:46px; font-size:15px; }
.ms-name-block { min-width:0; display:flex; flex-direction:column; gap:1px; }
.ms-name { color:var(--text-primary); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ms-email { color:var(--text-faint); font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.ms-role {
  display:inline-flex; align-items:center; height:21px; padding:0 9px; border-radius:6px;
  font-size:11.5px; color:var(--text-secondary);
  background:var(--bg-panel-soft); border:1px solid var(--border-subtle);
}
.ms-role.is-owner { color:#b7b8ff; background:var(--accent-primary-soft); border-color:rgba(139,141,255,.22); }

.ms-status { display:inline-flex; align-items:center; gap:7px; color:var(--text-secondary); font-size:12.5px; }
.ms-status-dot { width:7px; height:7px; border-radius:50%; background:var(--text-muted); flex-shrink:0; }
.ms-status-dot.s-online { background:var(--accent-green); box-shadow:0 0 0 3px rgba(47,198,109,.14); }
.ms-status-dot.s-active { background:var(--accent-blue); box-shadow:0 0 0 3px rgba(74,168,255,.14); }
.ms-status-dot.s-available { background:#5bc7a0; }
.ms-status-dot.s-pending { background:var(--accent-warning); }
.ms-status-dot.s-offline { background:var(--text-faint); }

.ms-team { color:var(--text-secondary); font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.ms-signal {
  display:inline-flex; align-items:center; gap:7px; height:23px; padding:0 9px 0 8px; border-radius:999px;
  font-size:11.5px; color:var(--text-secondary);
  background:var(--bg-panel-soft); border:1px solid var(--border-subtle);
}
.ms-signal-dot { width:6px; height:6px; border-radius:50%; background:var(--text-muted); }
.ms-signal.k-synced { color:#a9d9bd; background:rgba(47,198,109,.1); border-color:rgba(47,198,109,.2); }
.ms-signal.k-synced .ms-signal-dot { background:var(--accent-green); }
.ms-signal.k-clear .ms-signal-dot { background:var(--accent-green); }
.ms-signal.k-pending { color:#e3c587; background:rgba(216,168,79,.1); border-color:rgba(216,168,79,.2); }
.ms-signal.k-pending .ms-signal-dot { background:var(--accent-warning); }
.ms-signal.k-stale .ms-signal-dot { background:var(--text-faint); }
.ms-signal.k-readonly { color:var(--text-muted); }

/* ── Details panel — overlay by default (small screens), docks inline on wide desktop. ── */
.ms-details {
  position:fixed; top:0; right:0; bottom:0; z-index:40;
  width:380px; max-width:90vw; min-height:0;
  background:var(--bg-panel); border-left:1px solid var(--border-subtle);
  display:flex; flex-direction:column;
  transform:translateX(102%); transition:transform var(--base);
  box-shadow:-30px 0 80px rgba(0,0,0,.5);
}
.ms-details.is-open { transform:translateX(0); }
@keyframes msPanel { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
.ms-det-top { display:flex; justify-content:flex-end; padding:14px 14px 0; }
.ms-det-close { width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; background:var(--bg-panel-soft); border:1px solid var(--border-subtle); border-radius:var(--r-sm); color:var(--text-muted); cursor:pointer; transition:background var(--fast), color var(--fast); }
.ms-det-close:hover { background:var(--bg-row-hover); color:var(--text-primary); }
.ms-det-head { display:flex; align-items:center; gap:13px; padding:20px 20px 0; }
.ms-det-name { margin:0; font-size:16px; font-weight:500; color:var(--text-primary); }
.ms-det-sub { margin:2px 0 0; font-size:12px; color:var(--text-muted); }
.ms-det-chips { display:flex; flex-wrap:wrap; align-items:center; gap:7px; padding:14px 20px 16px; border-bottom:1px solid var(--border-subtle); }

.ms-det-scroll { flex:1; overflow-y:auto; padding:16px 20px; min-height:0; display:flex; flex-direction:column; gap:18px; }

.ms-det-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.ms-stat { padding:11px 12px; border-radius:var(--r-md); background:var(--bg-panel-soft); border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:3px; }
.ms-stat-num { font-size:17px; font-weight:500; color:var(--text-primary); }
.ms-stat-num.risk-low { color:var(--accent-warning); }
.ms-stat-num.risk-watch { color:#e0a0a0; }
.ms-stat-key { font-size:11px; color:var(--text-muted); }

/* Tagro visibility */
.ms-tagro { padding:14px; border-radius:var(--r-md); background:linear-gradient(180deg, rgba(139,141,255,.06), rgba(139,141,255,.015)); border:1px solid rgba(139,141,255,.16); }
.ms-tagro-head { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-primary); }
.ms-tagro-head > svg { color:var(--accent-primary); }
.ms-tagro-sync { margin-left:auto; display:inline-flex; align-items:center; gap:4px; font-size:10.5px; color:var(--text-muted); }
.ms-tagro-insight { margin:11px 0 13px; font-size:12.5px; line-height:1.6; color:var(--text-secondary); }
.ms-tagro-rows { display:flex; flex-direction:column; gap:9px; }
.ms-tagro-rows > div { display:grid; grid-template-columns:130px 1fr; gap:10px; align-items:start; }
.ms-k { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; color:var(--text-muted); }
.ms-k svg { color:var(--text-faint); }
.ms-v { font-size:12px; color:var(--text-secondary); line-height:1.45; }

.ms-det-sec { display:flex; flex-direction:column; gap:8px; }
.ms-det-label { margin:0; font-size:11px; font-weight:500; letter-spacing:.05em; text-transform:uppercase; color:var(--text-faint); }
.ms-det-list { display:flex; flex-direction:column; gap:2px; }
.ms-det-list-row { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--text-secondary); padding:5px 0; }
.ms-det-list-row svg { color:var(--text-muted); flex-shrink:0; }
.ms-conn { gap:8px; }
.ms-conn-state { margin-left:auto; font-size:10.5px; color:var(--text-faint); padding:1px 7px; border-radius:999px; background:var(--bg-panel-soft); border:1px solid var(--border-subtle); }
.ms-conn-state.on { color:#a9d9bd; background:rgba(47,198,109,.1); border-color:rgba(47,198,109,.2); }
.ms-det-empty { margin:0; font-size:12px; color:var(--text-faint); }
.ms-perm-row { display:flex; flex-wrap:wrap; gap:6px; }
.ms-perm { font-size:11.5px; color:var(--text-secondary); padding:4px 9px; border-radius:6px; background:var(--bg-panel-soft); border:1px solid var(--border-subtle); }

.ms-det-actions { display:flex; flex-direction:column; gap:7px; padding:14px 20px 18px; border-top:1px solid var(--border-subtle); }

.ms-scrim { display:none; }

/* ── Wide desktop: details docks inline beside the table ── */
@media (min-width:1281px) {
  .ms-details {
    position:relative; transform:none; box-shadow:none; z-index:auto;
    width:340px; max-width:none; flex-shrink:0;
    animation:msPanel var(--base) both;
  }
  .ms-det-top { display:none; }
  /* a member is open → drop the two heaviest columns so the table breathes */
  .ms-content.has-details .ms-thead,
  .ms-content.has-details .ms-row { grid-template-columns:minmax(0,1.6fr) 108px 116px 124px 124px; }
  .ms-content.has-details .ms-col-team { display:none; }
  /* no member open → full table incl. Joined */
  .ms-content:not(.has-details) .ms-thead,
  .ms-content:not(.has-details) .ms-row { grid-template-columns:minmax(0,1.6fr) 108px 116px 96px 130px 122px 124px; }
  .ms-content:not(.has-details) .ms-col-joined { display:flex; }
}

/* ── Tablet ── */
@media (max-width:1040px) {
  .ms-thead, .ms-row { grid-template-columns:minmax(0,1.6fr) 108px 116px 122px 124px; } /* name role status activity trust */
  .ms-col-team { display:none; }
}
@media (max-width:980px) {
  .ms { grid-template-columns:64px 1fr; }
  .ms-ws-name, .ms-ws-caret, .ms-tool span, .ms-tool kbd, .ms-nav-item span, .ms-nav-group, .ms-nav-sub { display:none; }
  .ms-sb { padding:12px 8px; align-items:center; }
  .ms-ws { justify-content:center; padding:0; }
  .ms-sb-tools { flex-direction:column; }
  .ms-tool, .ms-tool-new { flex:0 0 36px; justify-content:center; padding:0; }
  .ms-nav-item { justify-content:center; padding:0; width:40px; height:36px; }
}
@media (max-width:860px) {
  .ms-thead, .ms-row { grid-template-columns:minmax(0,1.6fr) 108px 116px 124px; } /* name role status trust */
  .ms-col-activity { display:none; }
}

/* ── Mobile: sidebar drawer + stacked member cards ── */
@media (max-width:760px) {
  .ms { grid-template-columns:1fr; }
  .ms-sb {
    position:fixed; top:0; bottom:0; left:0; width:248px; z-index:60; padding:12px 10px; align-items:stretch;
    transform:translateX(-104%); transition:transform var(--base);
  }
  .ms-sb.is-open { transform:translateX(0); }
  .ms-sb .ms-ws-name, .ms-sb .ms-ws-caret, .ms-sb .ms-tool span, .ms-sb .ms-tool kbd,
  .ms-sb .ms-nav-item span, .ms-sb .ms-nav-group, .ms-sb .ms-nav-sub { display:revert; }
  .ms-sb .ms-ws { justify-content:flex-start; padding:0 8px; }
  .ms-sb .ms-sb-tools { flex-direction:row; }
  .ms-sb .ms-tool { flex:1; justify-content:flex-start; padding:0 9px; }
  .ms-sb .ms-tool-new { flex:0 0 36px; justify-content:center; }
  .ms-sb .ms-nav-item { justify-content:flex-start; padding:0 9px; width:auto; height:32px; }
  .ms-scrim { display:block; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:55; }
  .ms-burger { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; margin-right:2px; background:transparent; border:0; color:var(--text-secondary); cursor:pointer; }

  .ms-thead { display:none; }
  .ms-tbody { padding:10px; }
  .ms-row {
    grid-template-columns:1fr auto; grid-auto-rows:min-content; gap:10px;
    padding:13px; margin:0 0 8px; background:var(--bg-panel); border:1px solid var(--border-subtle);
  }
  .ms-cell-name { grid-column:1; grid-row:1; }
  .ms-row > .ms-cell:nth-child(2) { grid-column:2; grid-row:1; justify-self:end; align-self:center; }
  .ms-row > .ms-cell:nth-child(3) { grid-column:1; grid-row:2; }
  .ms-row > .ms-cell:last-child { grid-column:2; grid-row:2; justify-self:end; }
  .ms-col-team, .ms-col-activity, .ms-col-joined { display:none; }
  .ms-details { width:100%; max-width:100%; }
}
`
