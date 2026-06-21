'use client'

/**
 * Members — workspace team management (live).
 *
 * Runs inside the app shell (real sidebar + graphite theme). Loads real
 * workspace members from workspace_members + profiles, includes the owner
 * and any pending invites, and lazily resolves each member's assigned
 * projects + open tasks for the detail panel. Tagro Visibility is derived
 * honestly from that activity — no fabricated presence/sync data.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  UserPlus, Plus, X, Sparkle, ShieldCheck, Warning, CaretRight,
  DotOutline, Briefcase, PencilSimple, ArrowsClockwise,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import InviteLinkModal from '@/components/InviteLinkModal'
import TagroContentFab from '@/components/TagroContentFab'
import MobilePageHeader from '@/components/MobilePageHeader'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import { FESTAG_SCROLL_FADE_CSS } from '@/components/mobile/mobile-codex-list-styles'
import { openTagro } from '@/components/TagroOverlay'

type Row = {
  id: string                 // user id, or `invite:<id>` for pending
  pending: boolean
  name: string
  email: string
  initials: string
  avatar: string             // hex tint
  avatarUrl: string | null
  role: string               // display label
  roleKey: string
  status: 'active' | 'pending' | 'inactive'
  joined: string
  team: string
  lastActivity: string
  signal: { kind: 'active' | 'invited' | 'idle'; label: string }
}

const AV_TINTS = ['#6a738c', '#5ba8ff', '#35c878', '#d5a655', '#a8b0bc']

function initialsOf(name: string, email: string) {
  const base = (name || email || '?').trim()
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

function roleLabel(key: string): string {
  switch ((key || '').toLowerCase()) {
    case 'owner': return 'Owner'
    case 'admin': return 'Admin'
    case 'project_manager': return 'Manager'
    case 'developer': case 'dev': return 'Executor'
    case 'reviewer': return 'Reviewer'
    case 'finance': return 'Finance'
    case 'viewer': case 'client_viewer': return 'Viewer'
    case 'member': return 'Mitglied'
    case 'contributor': return 'Mitwirkender'
    case 'client': return 'Kunde'
    default: return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Mitglied'
  }
}

function monthYear(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' }).format(new Date(value))
  } catch { return '—' }
}

function relTime(value?: string | null): string {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const d = Math.floor(diff / 86400000)
  if (d <= 0) {
    const h = Math.floor(diff / 3600000)
    if (h <= 0) return 'gerade eben'
    return `vor ${h} Std`
  }
  if (d === 1) return 'gestern'
  if (d < 30) return `vor ${d} Tagen`
  return monthYear(value)
}

const DONE = new Set(['done', 'completed', 'delivered', 'erledigt', 'verified', 'approved'])

function toMemberRow(id: string, roleKey: string, joinedAt: unknown, p: any, team: unknown, idx: number): Row {
  const name = (p?.full_name || '').trim() || (p?.email || '').split('@')[0] || 'Mitglied'
  const email = p?.email || ''
  const stale = p?.updated_at ? (Date.now() - new Date(p.updated_at).getTime()) > 30 * 86400000 : false
  return {
    id, pending: false,
    name, email,
    initials: initialsOf(name, email),
    avatar: AV_TINTS[idx % AV_TINTS.length],
    avatarUrl: p?.avatar_url ?? null,
    role: roleKey === 'owner' ? 'Owner' : roleLabel(p?.role || roleKey),
    roleKey,
    status: stale ? 'inactive' : 'active',
    joined: monthYear(String(joinedAt ?? '')),
    team: (String(team || '')).trim() || 'Workspace',
    lastActivity: relTime(p?.updated_at),
    signal: stale ? { kind: 'idle', label: 'Ruhig' } : { kind: 'active', label: 'Aktiv' },
  }
}

export default function MembersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [wsName, setWsName] = useState('Workspace')
  const [wsMode, setWsMode] = useState<'delivery' | 'team' | 'agency'>('team')
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Lazily-loaded detail for the selected member.
  const [detail, setDetail] = useState<{ id: string; projects: string[]; openTasks: number } | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const uid = user.id

    const { data: ws } = await supabase
      .from('workspaces').select('id,name,mode')
      .eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle()
    const wsId = (ws as any)?.id ?? null
    setWsName((ws as any)?.name?.trim() || 'Workspace')
    const mode = (ws as any)?.mode
    if (mode === 'team' || mode === 'agency' || mode === 'delivery') setWsMode(mode)

    const [{ data: members }, { data: invites }] = await Promise.all([
      wsId
        ? supabase.from('workspace_members').select('user_id,role,joined_at').eq('workspace_id', wsId)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from('team_invites').select('id,email,role,kind,created_at').eq('invited_by', uid).eq('status', 'pending'),
    ])

    const memberRows = (members as any[]) ?? []
    const ids = Array.from(new Set([uid, ...memberRows.map(m => m.user_id)].filter(Boolean)))
    const { data: profs } = await supabase
      .from('profiles').select('id,full_name,email,avatar_url,role,updated_at,created_at').in('id', ids)
    const profById = new Map<string, any>(((profs as any[]) ?? []).map(p => [p.id, p]))

    const built: Row[] = []
    const seen = new Set<string>()
    const wsLabel = (ws as any)?.name

    const ownerProf = profById.get(uid)
    built.push(toMemberRow(uid, 'owner', ownerProf?.joined_at ?? ownerProf?.created_at, ownerProf, wsLabel, 0))
    seen.add(uid)

    memberRows.forEach((m, i) => {
      if (seen.has(m.user_id)) return
      seen.add(m.user_id)
      const p = profById.get(m.user_id)
      built.push(toMemberRow(m.user_id, m.role || 'member', m.joined_at, p, wsLabel, i + 1))
    })

    ;((invites as any[]) ?? []).forEach((inv, i) => {
      built.push({
        id: `invite:${inv.id}`,
        pending: true,
        name: inv.email || 'Eingeladen',
        email: inv.email || '',
        initials: initialsOf('', inv.email || '?'),
        avatar: AV_TINTS[(built.length + i) % AV_TINTS.length],
        avatarUrl: null,
        role: roleLabel(inv.kind === 'client' ? 'client' : inv.role || 'contributor'),
        roleKey: inv.kind || inv.role || 'contributor',
        status: 'pending',
        joined: monthYear(inv.created_at),
        team: wsLabel?.trim() || 'Workspace',
        lastActivity: 'Einladung offen',
        signal: { kind: 'invited', label: 'Eingeladen' },
      })
    })

    setRows(built)
    setSelectedId(prev => (prev && built.some(r => r.id === prev) ? prev : built[0]?.id ?? null))

    if (wsId) {
      const { data: ps } = await supabase
        .from('projects').select('id,title').eq('workspace_id', wsId).is('deleted_at', null)
      if (ps) setProjects((ps as any[]).map(p => ({ id: p.id, title: p.title })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { void loadMembers() }, [loadMembers])

  const selected = useMemo(() => rows.find(r => r.id === selectedId) ?? null, [rows, selectedId])

  // Lazily resolve the selected member's projects + open tasks.
  useEffect(() => {
    if (!selected || selected.pending) { setDetail(null); return }
    let cancelled = false
    setDetailBusy(true)
    setDetail(null)
    ;(async () => {
      const [{ data: pm }, { data: tasks }] = await Promise.all([
        supabase.from('project_members').select('project_id').eq('user_id', selected.id),
        supabase.from('tasks').select('status').eq('assigned_to', selected.id),
      ])
      if (cancelled) return
      const projIds = ((pm as any[]) ?? []).map(r => r.project_id)
      let projTitles: string[] = []
      if (projIds.length) {
        const { data: pr } = await supabase.from('projects').select('id,title').in('id', projIds)
        projTitles = ((pr as any[]) ?? []).map(p => p.title)
      }
      const openTasks = ((tasks as any[]) ?? []).filter(t => !DONE.has((t.status || '').toLowerCase())).length
      if (!cancelled) {
        setDetail({ id: selected.id, projects: projTitles, openTasks })
        setDetailBusy(false)
      }
    })()
    return () => { cancelled = true }
  }, [selected, supabase])

  function pick(id: string) { setSelectedId(id); setOverlayOpen(true) }
  function closeDetails() { setOverlayOpen(false) }

  const tagroLine = (() => {
    if (!selected || selected.pending) return 'Sobald die Einladung angenommen wird, beginnt Tagro mit der Sichtbarkeit.'
    if (detailBusy || !detail) return 'Tagro liest die Aktivität…'
    const p = detail.projects.length, t = detail.openTasks
    if (p === 0 && t === 0) return 'Noch keine zugewiesenen Projekte oder offenen Aufgaben — keine Signale.'
    return `Tagro verfolgt ${t} ${t === 1 ? 'offene Aufgabe' : 'offene Aufgaben'} über ${p} ${p === 1 ? 'Projekt' : 'Projekte'}. Keine kritischen Blocker erkannt.`
  })()

  const tagroMembers = () => openTagro({
    contextType: 'client',
    id: 'members',
    title: 'Mitglieder · Übersicht',
    subtitle: `${rows.length} Mitglied${rows.length === 1 ? '' : 'er'}`,
  })

  const tagroContext = {
    contextType: 'client' as const,
    id: 'members',
    title: 'Mitglieder · Übersicht',
    subtitle: `${rows.length} Mitglied${rows.length === 1 ? '' : 'er'}`,
  }

  const pendingCount = rows.filter(r => r.pending).length
  const activeCount = rows.filter(r => !r.pending && r.status === 'active').length

  const leadLine1 = loading
    ? 'Mitglieder werden geladen…'
    : `${rows.length} Mitglied${rows.length === 1 ? '' : 'er'} in ${wsName}.`

  const leadLine2 = pendingCount > 0
    ? `${pendingCount} Einladung${pendingCount === 1 ? '' : 'en'} wartet${pendingCount === 1 ? '' : 'en'} auf Beitritt.`
    : activeCount > 0
      ? `${activeCount} ${activeCount === 1 ? 'Person ist' : 'Personen sind'} aktiv im Workspace.`
      : 'Tagro fasst Teamaktivität für den Workspace zusammen.'

  const openInvite = () => setInviteOpen(true)

  return (
    <>
    <MobileCodexListChrome
      className="mb"
      title="Mitglieder"
      subtitle={`${rows.length} Mitglied${rows.length === 1 ? '' : 'er'}`}
      legacyHeader={(
        <MobilePageHeader
          title="Mitglieder"
          primaryIcon={UserPlus}
          primaryLabel="Einladen"
          onPrimary={openInvite}
        />
      )}
      mobileActions={(
        <>
          <button type="button" className="mcl-add-btn" aria-label="Mitglied einladen" onClick={openInvite}>
            <Plus size={18} weight="bold" />
          </button>
        </>
      )}
      dock={{
        onDragUp: openInvite,
        primary: {
          id: 'invite',
          label: 'Mitglied einladen...',
          icon: <UserPlus size={14} weight="regular" />,
          onClick: openInvite,
          ariaLabel: 'Mitglied einladen',
        },
        secondary: {
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroMembers,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
      }}
      extraCss={CSS}
    >
      <div className="mb-shell">
        <div className="mb-static-top mb-dt">
          <header className="mb-page-head">
            <div className="mb-page-head-copy">
              <h1 className="mb-page-title">Mitglieder</h1>
              <div className="mb-page-lead">
                <p className="mb-page-lead-line">{leadLine1}</p>
                <p className="mb-page-lead-line">{leadLine2}</p>
              </div>
            </div>
            <div className="mb-page-actions">
              <button
                type="button"
                className="mb-head-tool"
                title="Aktualisieren"
                aria-label="Aktualisieren"
                onClick={() => void loadMembers()}
              >
                <ArrowsClockwise size={15} weight="regular" />
              </button>
              <button type="button" className="mb-head-new" onClick={openInvite}>
                <UserPlus size={14} weight="regular" />
                Einladen
              </button>
            </div>
          </header>
        </div>

        <div className="mb-scroll-body">
      <div className="mb-body">
        <section className="mb-table-wrap" aria-label="Mitglieder">
          <div className="mb-thead">
            <span>Name</span><span>Rolle</span><span>Status</span>
            <span className="mb-col-joined">Beigetreten</span>
            <span className="mb-col-team">Team</span>
            <span className="mb-col-activity">Letzte Aktivität</span>
            <span>Trust Layer</span>
          </div>

          <div className="mb-tbody">
            {loading ? (
              <div className="mb-loading">Mitglieder werden geladen…</div>
            ) : rows.map((m) => (
              <button key={m.id} type="button" className={`mb-row${m.id === selectedId ? ' is-selected' : ''}`} onClick={() => pick(m.id)}>
                <span className="mb-cell mb-cell-name">
                  {m.avatarUrl
                    ? <img className="mb-avatar" src={m.avatarUrl} alt="" />
                    : <span className="mb-avatar" style={{ '--a': m.avatar } as CSSProperties}>{m.initials}</span>}
                  <span className="mb-name-block">
                    <span className="mb-name">{m.name}</span>
                    <span className="mb-email">{m.email || '—'}</span>
                  </span>
                </span>
                <span className="mb-cell"><span className={`mb-role${m.roleKey === 'owner' ? ' is-owner' : ''}`}>{m.role}</span></span>
                <span className="mb-cell"><span className="mb-status"><span className={`mb-status-dot s-${m.status}`} />{m.status === 'pending' ? 'Ausstehend' : m.status === 'inactive' ? 'Ruhig' : 'Aktiv'}</span></span>
                <span className="mb-cell mb-col-joined mb-dim">{m.joined}</span>
                <span className="mb-cell mb-col-team"><span className="mb-team">{m.team}</span></span>
                <span className="mb-cell mb-col-activity mb-dim">{m.lastActivity}</span>
                <span className="mb-cell"><span className={`mb-signal k-${m.signal.kind}`}><span className="mb-signal-dot" />{m.signal.label}</span></span>
              </button>
            ))}
          </div>
        </section>

        {selected && (
          <aside className={`mb-details${overlayOpen ? ' is-open' : ''}`} key={selected.id} aria-label="Mitgliedsdetails">
            <div className="mb-det-top">
              <button type="button" className="mb-det-close" onClick={closeDetails} aria-label="Schließen"><X size={15} /></button>
            </div>
            <div className="mb-det-head">
              {selected.avatarUrl
                ? <img className="mb-avatar lg" src={selected.avatarUrl} alt="" />
                : <span className="mb-avatar lg" style={{ '--a': selected.avatar } as CSSProperties}>{selected.initials}</span>}
              <div>
                <p className="mb-det-name">{selected.name}</p>
                <p className="mb-det-sub">{selected.email || '—'}</p>
              </div>
            </div>
            <div className="mb-det-chips">
              <span className={`mb-role${selected.roleKey === 'owner' ? ' is-owner' : ''}`}>{selected.role}</span>
              <span className="mb-status"><span className={`mb-status-dot s-${selected.status}`} />{selected.status === 'pending' ? 'Ausstehend' : selected.status === 'inactive' ? 'Ruhig' : 'Aktiv'}</span>
              <span className="mb-team">{selected.team}</span>
            </div>

            <div className="mb-det-scroll">
              <div className="mb-det-stats">
                <div className="mb-stat"><span className="mb-stat-num">{selected.pending ? '—' : (detail?.projects.length ?? '·')}</span><span className="mb-stat-key">Projekte</span></div>
                <div className="mb-stat"><span className="mb-stat-num">{selected.pending ? '—' : (detail?.openTasks ?? '·')}</span><span className="mb-stat-key">Offene Aufgaben</span></div>
                <div className="mb-stat"><span className="mb-stat-num">{roleLabel(selected.roleKey)}</span><span className="mb-stat-key">Rolle</span></div>
              </div>

              <section className="mb-tagro">
                <div className="mb-tagro-head"><Sparkle size={13} weight="fill" /><span>Tagro Visibility</span></div>
                <p className="mb-tagro-insight">{tagroLine}</p>
                <div className="mb-tagro-rows">
                  <div><span className="mb-k"><Warning size={12} /> Blocker</span><span className="mb-v">{selected.pending ? '—' : 'Keine kritischen Blocker'}</span></div>
                  <div><span className="mb-k"><ShieldCheck size={12} /> Status</span><span className="mb-v">{selected.status === 'pending' ? 'Einladung ausstehend' : selected.status === 'inactive' ? 'Längere Zeit ruhig' : 'Aktiv im Workspace'}</span></div>
                  <div><span className="mb-k"><CaretRight size={12} /> Nächster Schritt</span><span className="mb-v">{selected.pending ? 'Auf Beitritt warten' : 'Aktivität verfolgen'}</span></div>
                </div>
              </section>

              {!selected.pending && (
                <section className="mb-det-sec">
                  <p className="mb-det-label">Zugewiesene Projekte</p>
                  {detail && detail.projects.length ? (
                    <div className="mb-det-list">
                      {detail.projects.map((p) => <span key={p} className="mb-det-list-row"><DotOutline size={16} weight="fill" /> {p}</span>)}
                    </div>
                  ) : <p className="mb-det-empty">{detailBusy ? 'Wird geladen…' : 'Keine Projekte zugewiesen.'}</p>}
                </section>
              )}

              <section className="mb-det-sec">
                <p className="mb-det-label">Berechtigungen</p>
                <div className="mb-perm-row">
                  {(selected.roleKey === 'owner'
                    ? ['Workspace verwalten', 'Mitglieder & Rollen', 'Alle Projekte']
                    : selected.roleKey === 'client'
                      ? ['Geprüfte Berichte', 'Entscheidungen']
                      : ['Zugewiesene Projekte', 'Eigene Aufgaben']
                  ).map(p => <span key={p} className="mb-perm">{p}</span>)}
                </div>
              </section>
            </div>

            <div className="mb-det-actions">
              <button type="button" className="mb-action" onClick={() => setInviteOpen(true)}><Briefcase size={14} /> Zu Projekt einladen</button>
            </div>
          </aside>
        )}
      </div>
      </div>
      </div>
    </MobileCodexListChrome>

      <div className="mb-fab-desktop">
        <TagroContentFab position="fixed" context={tagroContext} />
      </div>

      <InviteLinkModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        allowClient={wsMode === 'agency'}
        defaultKind="contributor"
        projects={projects}
      />
    </>
  )
}

const CSS = `
${FESTAG_SCROLL_FADE_CSS}
  @media (min-width: 769px) {
    .mb.mcl-page {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      height: 100%;
    }
    .mb .mcl-shell,
    .mb .mcl-body,
    .mb-shell {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  }

  .mb {
    --mb-soft: var(--portal-muted, #8f93a4);
    --mb-dark: var(--portal-text, #0f0f10);
    --mb-card-bg: var(--portal-card, #fff);
    position: relative;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    color: var(--mb-dark);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    letter-spacing: 0;
    overflow: hidden;
  }
  [data-theme="dark"] .mb,
  [data-theme="classic-dark"] .mb {
    --mb-soft: var(--portal-muted, #9aa0ac);
    --mb-card-bg: var(--portal-card, #141416);
  }

  .mb-shell {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }
  .mb-static-top,
  .mb-scroll-body { position: relative; z-index: 1; }

  .mb-static-top {
    flex: 0 0 auto;
    position: sticky;
    top: 0;
    z-index: 8;
    background: var(--mb-card-bg);
    width: 100%;
    max-width: var(--festag-content-max, 1080px);
    margin: 0 auto;
    padding: clamp(64px, 7vh, 88px) var(--festag-content-pad-x, 56px) 0;
    box-sizing: border-box;
  }

  .mb-scroll-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    width: 100%;
    max-width: var(--festag-content-max, 1080px);
    margin: 0 auto;
    padding: 20px var(--festag-content-pad-x, 56px) var(--festag-content-pad-bottom, 88px);
    box-sizing: border-box;
  }

  .mb-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 28px;
  }
  .mb-page-head-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .mb-page-title {
    margin: 0;
    font-size: 32px;
    font-weight: 400;
    color: var(--mb-dark);
    letter-spacing: var(--ls-header, 0.012em);
    line-height: 1.15;
  }
  .mb-page-lead {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 680px;
  }
  .mb-page-lead-line {
    margin: 0;
    font-size: 17px;
    font-weight: 400;
    color: var(--mb-soft);
    line-height: 1.5;
  }
  .mb-page-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 6px;
  }
  .mb-head-tool {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(15,23,42,.05);
    color: #6e717e;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.55);
    transition: background .12s, color .12s, transform .1s;
  }
  .mb-head-tool svg { width: 15px; height: 15px; flex-shrink: 0; }
  .mb-head-tool:hover { color: #2a3032; background: rgba(15,23,42,.08); }
  .mb-head-tool:active { transform: translateY(1px); }
  [data-theme="dark"] .mb-head-tool,
  [data-theme="classic-dark"] .mb-head-tool {
    background: rgba(255,255,255,.06);
    color: #9aa0ac;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
  }
  [data-theme="dark"] .mb-head-tool:hover,
  [data-theme="classic-dark"] .mb-head-tool:hover {
    background: rgba(255,255,255,.09);
    color: #f4f4f4;
  }
  .mb-head-new {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px;
    border: none;
    border-radius: 999px;
    background: var(--portal-btn-primary, #5b647d);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.12);
    transition: background .12s, transform .1s;
  }
  .mb-head-new:hover {
    background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 90%, #000);
  }
  [data-theme="dark"] .mb-head-new,
  [data-theme="classic-dark"] .mb-head-new {
    background: #fff;
    color: #121214;
  }
  .mb-fab-desktop { display: block; }

  .mb-body { flex: 1; min-height: 0; display: flex; overflow: hidden; position: relative; height: 100%; }
  .mb-table-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
  .mb-thead, .mb-row {
    display: grid; grid-template-columns: minmax(0,1.7fr) 110px 116px 96px 140px 130px 120px;
    align-items: center; gap: 12px;
  }
  .mb-thead { padding: 11px 8px; flex-shrink: 0; border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent); font-size: 11px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
  .mb-tbody { flex: 1; overflow-y: auto; padding: 6px 0 18px; min-height: 0; }
  .mb-loading { padding: 60px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
  .mb-row { width: 100%; text-align: left; padding: 9px 8px; margin: 1px 0; background: transparent; border: 0; border-radius: 10px; cursor: pointer; color: var(--text-secondary); font: inherit; transition: background 160ms var(--ease-premium, cubic-bezier(.16,1,.3,1)); }
  .mb-row:hover { background: var(--state-hover, var(--surface-2)); }
  .mb-row.is-selected { background: var(--state-active, var(--surface-2)); }
  .mb-cell { min-width: 0; display: flex; align-items: center; font-size: 13px; }
  .mb-dim { color: var(--text-muted); font-size: 12.5px; }
  .mb-cell-name { gap: 11px; }
  .mb-avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; object-fit: cover; font-size: 11px; font-weight: 600; color: color-mix(in srgb, var(--a,#6a738c) 80%, #fff 20%); background: color-mix(in srgb, var(--a,#6a738c) 18%, transparent); border: 1px solid color-mix(in srgb, var(--a,#6a738c) 30%, transparent); }
  .mb-avatar.lg { width: 46px; height: 46px; font-size: 15px; }
  .mb-name-block { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .mb-name { color: var(--text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mb-email { color: var(--text-muted); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mb-role { display: inline-flex; align-items: center; height: 21px; padding: 0 9px; border-radius: 6px; font-size: 11.5px; color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--border); }
  .mb-role.is-owner { color: #b7b8ff; background: var(--accent-primary-soft, rgba(106,115,140,.14)); border-color: var(--accent-primary-border, rgba(106,115,140,.28)); }
  .mb-status { display: inline-flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 12.5px; }
  .mb-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; }
  .mb-status-dot.s-active { background: var(--accent-green, #35c878); box-shadow: 0 0 0 3px rgba(53,200,120,.14); }
  .mb-status-dot.s-pending { background: var(--accent-amber, #d5a655); }
  .mb-status-dot.s-inactive { background: var(--text-muted); }
  .mb-team { color: var(--text-secondary); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mb-signal { display: inline-flex; align-items: center; gap: 7px; height: 23px; padding: 0 9px 0 8px; border-radius: 999px; font-size: 11.5px; color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--border); }
  .mb-signal-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }
  .mb-signal.k-active { color: #a9e7c1; background: rgba(53,200,120,.1); border-color: rgba(53,200,120,.2); }
  .mb-signal.k-active .mb-signal-dot { background: var(--accent-green, #35c878); }
  .mb-signal.k-invited { color: #ead3a6; background: rgba(213,166,85,.1); border-color: rgba(213,166,85,.2); }
  .mb-signal.k-invited .mb-signal-dot { background: var(--accent-amber, #d5a655); }
  .mb-signal.k-idle .mb-signal-dot { background: var(--text-muted); }

  /* Details — slide-over within the content area */
  .mb-details {
    position: absolute; top: 0; right: 0; bottom: 0; z-index: 20;
    width: 360px; max-width: 92%;
    background: var(--surface-1, var(--surface)); border-left: 1px solid var(--border);
    display: flex; flex-direction: column;
    transform: translateX(102%); transition: transform var(--motion-base, 220ms cubic-bezier(.16,1,.3,1));
    box-shadow: -30px 0 80px rgba(0,0,0,.45);
  }
  .mb-details.is-open { transform: translateX(0); }
  .mb-det-top { display: flex; justify-content: flex-end; padding: 12px 12px 0; }
  .mb-det-close { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; color: var(--text-muted); cursor: pointer; transition: background .14s, color .14s; }
  .mb-det-close:hover { background: var(--state-hover, var(--surface-2)); color: var(--text); }
  .mb-det-head { display: flex; align-items: center; gap: 13px; padding: 16px 20px 0; }
  .mb-det-name { margin: 0; font-size: 16px; font-weight: 500; color: var(--text); }
  .mb-det-sub { margin: 2px 0 0; font-size: 12px; color: var(--text-muted); }
  .mb-det-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding: 14px 20px 16px; border-bottom: 1px solid var(--border); }
  .mb-det-scroll { flex: 1; overflow-y: auto; padding: 16px 20px; min-height: 0; display: flex; flex-direction: column; gap: 18px; }
  .mb-det-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
  .mb-stat { padding: 11px 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 3px; }
  .mb-stat-num { font-size: 15px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mb-stat-key { font-size: 11px; color: var(--text-muted); }
  .mb-tagro { padding: 14px; border-radius: 10px; background: linear-gradient(180deg, rgba(106,115,140,.06), rgba(106,115,140,.015)); border: 1px solid rgba(106,115,140,.16); }
  .mb-tagro-head { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text); }
  .mb-tagro-head > svg { color: var(--accent-primary, #6a738c); }
  .mb-tagro-insight { margin: 11px 0 13px; font-size: 12.5px; line-height: 1.6; color: var(--text-secondary); }
  .mb-tagro-rows { display: flex; flex-direction: column; gap: 9px; }
  .mb-tagro-rows > div { display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: start; }
  .mb-k { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-muted); }
  .mb-k svg { color: var(--text-muted); }
  .mb-v { font-size: 12px; color: var(--text-secondary); line-height: 1.45; }
  .mb-det-sec { display: flex; flex-direction: column; gap: 8px; }
  .mb-det-label { margin: 0; font-size: 11px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
  .mb-det-list { display: flex; flex-direction: column; gap: 2px; }
  .mb-det-list-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-secondary); padding: 5px 0; }
  .mb-det-list-row svg { color: var(--text-muted); flex-shrink: 0; }
  .mb-det-empty { margin: 0; font-size: 12px; color: var(--text-muted); }
  .mb-perm-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .mb-perm { font-size: 11.5px; color: var(--text-secondary); padding: 4px 9px; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border); }
  .mb-det-actions { padding: 14px 20px 18px; border-top: 1px solid var(--border); }
  .mb-action { width: 100%; height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text); font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; transition: background .14s, border-color .14s; }
  .mb-action:hover { background: var(--surface-2); border-color: var(--border-strong); }

  @media (max-width: 1400px) {
    .mb-static-top { padding-top: clamp(56px, 6.5vh, 72px); }
    .mb-scroll-body { padding-bottom: 72px; }
  }
  @media (max-width: 1100px) {
    .mb-static-top { padding-top: clamp(52px, 6vh, 64px); }
    .mb-page-title { font-size: 28px; }
    .mb-page-lead-line { font-size: 15px; }
    .mb-col-joined { display: none; }
    .mb-thead, .mb-row { grid-template-columns: minmax(0,1.7fr) 110px 116px 140px 130px 120px; }
  }
  @media (max-width: 900px)  { .mb-col-team { display: none; } .mb-thead, .mb-row { grid-template-columns: minmax(0,1.7fr) 110px 116px 130px 120px; } }
  @media (max-width: 768px) {
    .mb-dt { display: none !important; }
    .mb-fab-desktop { display: none !important; }
    .mb-static-top {
      position: relative !important;
      padding: 0 !important;
      background: transparent !important;
      max-width: none !important;
      margin: 0 !important;
    }
    .mb-shell {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .mb-scroll-body {
      flex: 0 0 auto !important;
      overflow: visible !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .mb-body { min-height: 0; }
    .mb-thead { display: none; }
    .mb-tbody { padding: 0; }
    .mb-row {
      grid-template-columns: 1fr auto;
      grid-auto-rows: min-content;
      gap: 8px 10px;
      padding: 16px 14px;
      margin: 0 0 12px;
      border: 1px solid rgba(0, 0, 0, 0.07);
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 rgba(0,0,0,0.04), 0 4px 10px rgba(144,149,159,0.16);
    }
    [data-theme="dark"] .mb-row,
    [data-theme="classic-dark"] .mb-row {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.14);
    }
    .mb-name { font-size: 17px; font-weight: 500; letter-spacing: -0.02em; }
    .mb-email { font-size: 14px; }
    .mb-cell-name { grid-column: 1; grid-row: 1; }
    .mb-row > .mb-cell:nth-child(2) { grid-column: 2; grid-row: 1; justify-self: end; align-self: center; }
    .mb-row > .mb-cell:nth-child(3) { grid-column: 1; grid-row: 2; }
    .mb-row > .mb-cell:last-child { grid-column: 2; grid-row: 2; justify-self: end; }
    .mb-col-joined, .mb-col-team, .mb-col-activity { display: none; }
    .mb-details { width: 100%; max-width: 100%; }
  }
`
