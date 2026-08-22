'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MagnifyingGlass,
  SidebarSimple,
  CaretDown,
  Plus,
  GearSix,
  Bell,
  Question,
  Check,
  UserCircleGear,
  ArrowUpRight,
  SignOut,
} from '@phosphor-icons/react'
import {
  appShellRoleLabel,
  APP_SHELL_PRIMARY_NAV,
  APP_SHELL_SECONDARY_NAV,
  isAppShellNavActive,
} from '@/components/app-shell/app-shell-nav'
import FestagHelpPanel from '@/components/portal/FestagHelpPanel'
import AppShellFlyout from '@/components/app-shell/AppShellFlyout'
import { getDisplayName, getFullDisplayName, getInitials, type UserProfile } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import { getRememberedWorkspaceName, rememberWorkspaceName } from '@/lib/pending-workspace'
import { openWorkspaceCreateWizard, openWorkspaceManage, openWorkspaceRename, WORKSPACE_CREATED_EVENT, WORKSPACE_DELETED_EVENT, WORKSPACE_RENAMED_EVENT, WORKSPACE_UPDATED_EVENT } from '@/lib/workspace-create-open'
import {
  emitWorkspaceSwitched,
  getActiveWorkspaceId,
  rememberActiveWorkspace,
  clearActiveWorkspaceId,
  WORKSPACE_SWITCHED_EVENT,
} from '@/lib/active-workspace'
import { listWorkspacesForUser, type WorkspaceListItem } from '@/lib/workspace/resolve'
import { openAccountPanel } from '@/lib/account-panel-open'
import { useNotifications } from '@/hooks/useNotifications'

type Props = {
  user: UserProfile | null
  /** User locked the panel open — the page reflows around it. */
  pinned: boolean
  onTogglePin: () => void
  /** Hover/focus expansion — floats over the canvas, page must not reflow. */
  onPeekChange: (peek: boolean) => void
}

type RecentItem = {
  id: string
  label: string
  href: string
  age: string
}

const RECENT_EXPAND_KEY = 'festag-os-recent-expanded'

/* Short in, longer out: opening should feel instant, closing should forgive the
   diagonal slide toward a nav label. */
const PEEK_IN_MS = 55
const PEEK_OUT_MS = 190

/** Hover-to-expand is a pointer affordance — a touch rail must not flicker. */
function hasFinePointer(): boolean {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch {
    return false
  }
}

function truncateLabel(text: string, max = 34) {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max - 2).trimEnd()}..`
}

function fmtRecentAge(iso?: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'jetzt'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function workspaceInitial(name: string): string {
  const clean = name.replace(/^Kein Workspace$/i, '').replace(/^No workspace$/i, '').trim()
  if (!clean) return 'F'
  return clean.charAt(0).toUpperCase()
}

function readExpanded(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch { /* noop */ }
  return fallback
}

function writeExpanded(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch { /* noop */ }
}

export default function AppShellSidebar({
  user,
  pinned,
  onTogglePin,
  onPeekChange,
}: Props) {
  const pathname = usePathname() || '/overview'
  const resolvedName = getFullDisplayName(user) || getDisplayName(user) || ''
  const nameIsPlaceholder = !user || resolvedName === 'Gast' || resolvedName === 'You'
  const displayName = nameIsPlaceholder ? '' : resolvedName
  const rawInitials = getInitials(user)
  const initials = rawInitials && rawInitials !== '??' ? rawInitials : ''
  /* Server-safe seeds — the remembered workspace is restored after mount,
     the way this file already restores the Recent section. */
  const [workspaceLabel, setWorkspaceLabel] = useState('Kein Workspace')
  /* Die Workspace-Marke stand auf getInitials(user) — also auf dem Konto.
     Dadurch trug „Amazonenbusiness" die Initialen von Kerstin, und dieselben
     zwei Buchstaben standen oben und unten in der Leiste. Es sah aus wie ein
     doppeltes Konto, weil es eins war: die Marke zeigte den falschen
     Gegenstand. Ein Workspace traegt seinen eigenen Anfangsbuchstaben. */
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const workspaceInitials = workspaceMark(workspaceLabel)
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([])
  const hasWorkspace =
    Boolean(workspaceId) ||
    (workspaceLabel !== 'Kein Workspace' && workspaceLabel !== 'No workspace')
  const settingsActive =
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    isAppShellNavActive(pathname, '/overview/settings')

  const [wsOpen, setWsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [recentExpanded, setRecentExpanded] = useState(true)
  const [deferredReady, setDeferredReady] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notifTriggerRef = useRef<HTMLButtonElement>(null)
  const { items: notifications, unread, loading: notifLoading, markRead, markAllRead } = useNotifications({
    limit: 14,
    enabled: deferredReady || notifOpen,
  })

  /* Unread first, then the rest — the panel answers "what is new" before it
     answers "what happened". */
  const freshNotifications = notifications.filter((n) => !n.read)
  const earlierNotifications = notifications.filter((n) => n.read)

  useEffect(() => {
    setRecentExpanded(readExpanded(RECENT_EXPAND_KEY, true))
  }, [])

  /* localStorage is invisible to the server. Reading it during render painted
     the remembered name where the SSR markup said "Kein Workspace", which is
     the ordinary case for anyone who has opened Festag before:
       Text content did not match. Server: "Kein Workspace" Client: "Workspace aa"
     Restoring after mount still beats the workspace fetch, so nothing waits. */
  useEffect(() => {
    const name = getRememberedWorkspaceName()
    if (name) setWorkspaceLabel(name)
    const id = getActiveWorkspaceId()
    if (id) setWorkspaceId(id)
  }, [])

  /* An open popover keeps the panel wide even once the pointer has left it —
     otherwise the rail snaps shut under the menu the user is reading. */
  const menuOpen = wsOpen || notifOpen || helpOpen
  const expanded = pinned || peeking || menuOpen

  const schedulePeek = useCallback((next: boolean) => {
    if (peekTimer.current !== null) {
      globalThis.clearTimeout(peekTimer.current)
      peekTimer.current = null
    }
    if (next && !hasFinePointer()) return
    peekTimer.current = globalThis.setTimeout(() => {
      peekTimer.current = null
      setPeeking(next)
    }, next ? PEEK_IN_MS : PEEK_OUT_MS)
  }, [])

  useEffect(() => () => {
    if (peekTimer.current !== null) globalThis.clearTimeout(peekTimer.current)
  }, [])

  /* Report only the *unpinned* expansion: pinned width is the shell's own class. */
  useEffect(() => {
    onPeekChange(!pinned && expanded)
  }, [onPeekChange, pinned, expanded])

  /* Pinning wins over a stale peek flag left behind by the pointer. */
  useEffect(() => {
    if (pinned) setPeeking(false)
  }, [pinned])

  useEffect(() => {
    const run = () => setDeferredReady(true)
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(run, { timeout: 1800 })
      return () => w.cancelIdleCallback?.(id)
    }
    const id = globalThis.setTimeout(run, 400)
    return () => globalThis.clearTimeout(id)
  }, [])

  const loadWorkspaces = useCallback(async () => {
    try {
      const supabase = createClient()
      const authUserId = user?.id
      let userId = authUserId || null
      if (!userId) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        userId = authUser?.id || null
      }
      if (!userId) {
        setWorkspaces([])
        setWorkspaceLabel('Kein Workspace')
        setWorkspaceId(null)
        return
      }

      const list = await listWorkspacesForUser(supabase as any, userId)
      setWorkspaces(list)

      const preferred = getActiveWorkspaceId()
      const active =
        (preferred && list.find((w) => w.id === preferred)) ||
        list[0] ||
        null

      if (active) {
        setWorkspaceId(active.id)
        setWorkspaceLabel(active.name)
        rememberActiveWorkspace(active.id, active.name)
        rememberWorkspaceName(active.name)
      } else {
        setWorkspaceId(null)
        setWorkspaceLabel('Kein Workspace')
        clearActiveWorkspaceId()
      }
    } catch { /* best-effort */ }
  }, [user?.id])

  useEffect(() => {
    void loadWorkspaces()
  }, [loadWorkspaces])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/recent-executed', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      const rows = Array.isArray(data?.items) ? data.items : []
      setRecent(
        rows.map((c: { id: string; label: string; href: string; at?: string }) => ({
          id: c.id,
          label: truncateLabel(c.label),
          href: c.href,
          age: fmtRecentAge(c.at),
        })),
      )
    } catch {
      /* keep previous */
    }
  }, [])

  useEffect(() => {
    if (!deferredReady) return
    void loadRecent()
  }, [deferredReady, loadRecent, user?.id])

  useEffect(() => {
    function onCreated(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; id?: string }>).detail
      if (typeof detail?.id === 'string' && detail.id) {
        rememberActiveWorkspace(detail.id, detail.name)
        setWorkspaceId(detail.id)
      }
      if (typeof detail?.name === 'string' && detail.name.trim()) {
        setWorkspaceLabel(detail.name.trim())
        rememberWorkspaceName(detail.name.trim())
      }
      void loadWorkspaces()
    }
    function onRenamed(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; id?: string }>).detail
      if (typeof detail?.name === 'string' && detail.name.trim()) {
        setWorkspaceLabel(detail.name.trim())
        rememberWorkspaceName(detail.name.trim())
        if (detail.id) rememberActiveWorkspace(detail.id, detail.name.trim())
      }
      void loadWorkspaces()
    }
    function onDeleted() {
      clearActiveWorkspaceId()
      setWorkspaceId(null)
      setWorkspaceLabel('Kein Workspace')
      void loadWorkspaces()
    }
    function onUpdated() {
      void loadWorkspaces()
    }
    function onSwitched(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; id?: string }>).detail
      if (detail?.id) setWorkspaceId(detail.id)
      if (detail?.name) setWorkspaceLabel(detail.name)
    }
    window.addEventListener(WORKSPACE_CREATED_EVENT, onCreated)
    window.addEventListener(WORKSPACE_RENAMED_EVENT, onRenamed)
    window.addEventListener(WORKSPACE_DELETED_EVENT, onDeleted)
    window.addEventListener(WORKSPACE_UPDATED_EVENT, onUpdated)
    window.addEventListener(WORKSPACE_SWITCHED_EVENT, onSwitched)
    return () => {
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onCreated)
      window.removeEventListener(WORKSPACE_RENAMED_EVENT, onRenamed)
      window.removeEventListener(WORKSPACE_DELETED_EVENT, onDeleted)
      window.removeEventListener(WORKSPACE_UPDATED_EVENT, onUpdated)
      window.removeEventListener(WORKSPACE_SWITCHED_EVENT, onSwitched)
    }
  }, [loadWorkspaces, workspaceId])

  useEffect(() => {
    if (!wsOpen && !notifOpen) return
    function onDown(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setWsOpen(false)
        setNotifOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setWsOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [wsOpen, notifOpen])

  /* Signing out sat behind the account panel. The workspace menu is already
     open on the way past, so it belongs here too — one click instead of three. */
  async function signOutFast() {
    setWsOpen(false)
    prepareAuthRouteTransition('/login')
    await createClient().auth.signOut()
    window.location.assign('/login')
  }

  function goCreateWorkspace() {
    setWsOpen(false)
    openWorkspaceCreateWizard()
  }

  function goRenameWorkspace() {
    setWsOpen(false)
    openWorkspaceRename({
      workspaceId: workspaceId || undefined,
      name: hasWorkspace ? workspaceLabel : undefined,
    })
  }

  function goManageWorkspace(section?: 'name' | 'icon' | 'template' | 'delete') {
    setWsOpen(false)
    openWorkspaceManage({
      workspaceId: workspaceId || undefined,
      name: hasWorkspace ? workspaceLabel : undefined,
      section,
    })
  }

  function switchWorkspace(ws: WorkspaceListItem) {
    setWsOpen(false)
    if (ws.id === workspaceId) return
    emitWorkspaceSwitched({ id: ws.id, name: ws.name })
    setWorkspaceId(ws.id)
    setWorkspaceLabel(ws.name)
  }

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  const activeRecentId = recent.find((r) => pathname === r.href || pathname.startsWith(`${r.href.split('?')[0]}/`))?.id

  return (
    <aside
      ref={asideRef}
      className={
        `fas-sidebar${expanded ? ' is-expanded' : ' is-collapsed'}` +
        `${expanded && !pinned ? ' is-peek' : ''}` +
        `${menuOpen ? ' has-popover' : ''}`
      }
      aria-label="Festag navigation"
      data-collapsed={expanded ? '0' : '1'}
      /* Aufgeklappt bleibt aufgeklappt. Vorher fiel die Leiste zu, sobald der
         Zeiger sie verliess — man konnte sie also nicht lesen und gleichzeitig
         woandershin zielen, und jede Mausbewegung war eine Zustandsaenderung.
         Geoeffnet wird jetzt durch Naehe, geschlossen nur durch Absicht: den
         Schalter oben rechts. */
      onMouseEnter={() => schedulePeek(true)}
      onFocusCapture={() => setPeeking(true)}
    >
      <div className="fas-sidebar-top" ref={headerRef}>
        <div className="fas-sidebar-header">
          <button
            type="button"
            className={`fas-ws-trigger${wsOpen ? ' is-open' : ''}`}
            title={workspaceLabel}
            aria-label="Workspace-Menü"
            aria-haspopup="menu"
            aria-expanded={wsOpen}
            onClick={() => {
              setNotifOpen(false)
              setWsOpen((v) => !v)
            }}
          >
            <span className={`fas-ws-mark${!workspaceInitials ? ' is-empty' : ''}`} aria-hidden="true">
              {workspaceInitials}
            </span>
            <span className="fas-ws-copy">
              <span className="fas-ws-text">
                <span className="fas-ws-label">Workspace</span>
                <span className="fas-ws-value">{workspaceLabel}</span>
              </span>
              <CaretDown size={6} weight="bold" className="fas-ws-caret" aria-hidden />
            </span>
          </button>

          {/* Suche und Glocke stehen in der Topbar — und nur dort.
              Vorher trugen beide Flächen dasselbe Paar: im Rail zeigte es die
              Topbar, aufgeklappt zeigten es beide gleichzeitig. Ein globales
              Bedienelement darf nicht erscheinen und verschwinden, je nachdem
              ob jemand ein Panel angeheftet hat — die Topbar ist die einzige
              Fläche, die in jedem Zustand da ist, also gehört es ihr.

              Der Einklapp-Schalter bleibt hier: er bedient die Sidebar selbst,
              nicht das Produkt. */}
          {expanded ? (
            <div className="fas-sidebar-utils">
              <button
                type="button"
                className="fas-sidebar-icon fas-sidebar-collapse"
                aria-label={pinned ? 'Sidebar einklappen' : 'Sidebar offen halten'}
                title={pinned ? 'Einklappen' : 'Offen halten'}
                aria-pressed={pinned}
                onClick={(e) => {
                  e.stopPropagation()
                  setWsOpen(false)
                  setNotifOpen(false)
                  /* Der Schalter ist die einzige Art, die Leiste zu schliessen —
                     also muss er auch das Aufklappen durch Naehe beenden. */
                  setPeeking(false)
                  onTogglePin()
                }}
              >
                <SidebarSimple size={16} weight="light" />
              </button>
            </div>
          ) : null}
        </div>

        {wsOpen ? (
          <div className="fas-popover fas-popover-left fas-ws-popover" role="menu">
            {workspaces.length > 0 ? (
              <div className="fas-ws-list" role="group" aria-label="Workspaces">
                {workspaces.map((ws) => {
                  const active = ws.id === workspaceId
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={`fas-popover-item fas-ws-switch-item${active ? ' is-active' : ''}`}
                      onClick={() => switchWorkspace(ws)}
                    >
                      <span className="fas-ws-switch-mark" aria-hidden="true">
                        {workspaceInitial(ws.name)}
                      </span>
                      <span className="fas-ws-switch-name">{ws.name}</span>
                      {active ? <Check size={14} weight="bold" className="fas-ws-switch-check" aria-hidden /> : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="fas-popover-title">Du hast noch keinen Workspace.</div>
            )}
            {hasWorkspace ? (
              <>
                <button type="button" className="fas-popover-item" onClick={() => goManageWorkspace()}>
                  Workspace verwalten
                </button>
                <button type="button" className="fas-popover-item" onClick={goRenameWorkspace}>
                  Workspace umbenennen
                </button>
              </>
            ) : null}
            <button type="button" className="fas-popover-item" onClick={goCreateWorkspace}>
              <Plus size={14} weight="bold" />
              Workspace erstellen
            </button>
            <div className="fas-popover-sep" role="separator" />
            <button
              type="button"
              className="fas-popover-item fas-popover-item--quiet"
              onClick={() => { void signOutFast() }}
            >
              <SignOut size={14} weight="regular" />
              Abmelden
            </button>
          </div>
        ) : null}

      </div>

      <nav className="fas-nav" aria-label="Workspace">
        {/* Zwei Ueberschriften, mehr braucht die Leiste nicht: das Taegliche
            und das Nachschlagbare. Sie stehen nur in der offenen Leiste — im
            Rail waeren sie Text ohne Platz. */}
        {expanded ? <p className="fas-nav-caption">Arbeit</p> : null}
        <div className="fas-nav-group">
          {APP_SHELL_PRIMARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isAppShellNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`fas-nav-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={expanded ? undefined : item.label}
              >
                <Icon size={16} weight="light" />
                <span className="fas-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {expanded ? <p className="fas-nav-caption">Ablage</p> : null}
        <div className="fas-nav-group fas-nav-after-group">
          {APP_SHELL_SECONDARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isAppShellNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`fas-nav-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={expanded ? undefined : item.label}
              >
                <Icon size={16} weight="light" />
                <span className="fas-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {expanded ? (
        <div className="fas-recent">
          <button
            type="button"
            className="fas-recent-head"
            aria-expanded={recentExpanded}
            onClick={() => {
              setRecentExpanded((v) => {
                const next = !v
                writeExpanded(RECENT_EXPAND_KEY, next)
                return next
              })
            }}
          >
            <span>Zuletzt ausgeführt</span>
            <CaretDown
              size={10}
              weight="bold"
              className={`fas-recent-caret${recentExpanded ? ' is-open' : ''}`}
              aria-hidden
            />
          </button>
          <div className={`fas-recent-body${recentExpanded ? ' is-open' : ''}`}>
            <div className="fas-recent-list" role="list">
              {recent.length === 0 ? (
                <p className="fas-recent-empty">Tagro-Chats und Entscheidungen erscheinen hier.</p>
              ) : (
                recent.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="listitem"
                    className={`fas-recent-item${activeRecentId === item.id ? ' is-active' : ''}`}
                    title={item.label}
                  >
                    <span className="fas-recent-text">{item.label}</span>
                    {item.age ? <span className="fas-recent-age">{item.age}</span> : null}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="fas-sidebar-footer">
        {/* Der einzige Eingang zum Account-Panel — dort liegen Profil,
            Erscheinung und Abmelden. Ohne diese Zeile war das Panel im
            Shell montiert, aber von nirgends erreichbar. */}
        <button
          type="button"
          className="fas-account-row"
          onClick={openAccountPanel}
          aria-haspopup="dialog"
          aria-label={displayName ? `Account: ${displayName}` : 'Account'}
          title={expanded || !displayName ? undefined : displayName}
        >
          {/* Nur noch ein echtes Bild, keine zweite Initialen-Marke. Oben steht
              die Workspace-Marke; dieselben zwei Buchstaben ein zweites Mal
              darunter sahen aus wie ein doppeltes Konto. Wer ein Foto
              hinterlegt hat, sieht es — sonst traegt der Name allein. */}
          {user?.avatar_url ? (
            <span className="fas-account-mark" aria-hidden="true">
              <img src={user.avatar_url} alt="" />
            </span>
          ) : (
            <span className="fas-account-mark is-glyph" aria-hidden="true">
              <UserCircleGear size={17} weight="light" />
            </span>
          )}
          {/* Kein Name, keine Rolle. Oben in der Leiste steht bereits eine
              Marke; darunter noch einmal „Kerstin · Member" war dieselbe
              Auskunft ein zweites Mal, an der unwichtigsten Stelle der Seite.
              Der Eingang bleibt, weil das Konto-Panel — Profil, Erscheinung,
              Abmelden — sonst von nirgends erreichbar waere. */}
          <span className="fas-account-copy">
            <span className="fas-account-row-name">Konto</span>
          </span>
        </button>

        {/* Einstellungen trägt das Icon, Hilfe nur das Wort — eine Zeile,
            zwei Gewichte. Eingeklappt kehrt das Fragezeichen zurück, sonst
            wäre die Hilfe in der Leiste unsichtbar. */}
        <div className="fas-footer-row">
          <Link
            href="/settings"
            className={`fas-settings-link${settingsActive ? ' is-active' : ''}`}
            aria-current={settingsActive ? 'page' : undefined}
            title="Einstellungen"
          >
            <GearSix size={16} weight="light" />
            <span className="fas-nav-label">Einstellungen</span>
          </Link>
          <FestagHelpPanel
            open={helpOpen}
            onOpenChange={setHelpOpen}
            anchorRef={helpTriggerRef}
            userName={displayName}
            railCollapsed={!expanded}
            trigger={(
              <button
                ref={helpTriggerRef}
                type="button"
                className="fas-help-btn"
                aria-label="Festag Help"
                title={expanded ? undefined : 'Festag Help'}
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((v) => !v)}
              >
                <Question size={16} weight="light" />
                <span className="fas-nav-label">Hilfe</span>
              </button>
            )}
          />
        </div>
      </div>

      <AppShellFlyout
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        hostRef={asideRef}
        anchorRef={notifTriggerRef}
        title="Benachrichtigungen"
        note={unread > 0
          ? `${unread} ungelesen`
          : 'Entscheidungen, Freigaben und Projekt-Updates landen hier.'}
        action={unread > 0 ? (
          <button type="button" className="fas-flyout-action" onClick={() => void markAllRead()}>
            Alle gelesen
          </button>
        ) : null}
        footer={(
          <Link href="/benachrichtigungen" className="fas-flyout-foot-link" onClick={() => setNotifOpen(false)}>
            Alle Benachrichtigungen
            <ArrowUpRight size={12} weight="bold" />
          </Link>
        )}
      >
        {notifLoading && notifications.length === 0 ? (
          <>
            <div className="fas-flyout-skeleton" />
            <div className="fas-flyout-skeleton" />
            <div className="fas-flyout-skeleton" />
          </>
        ) : notifications.length === 0 ? (
          <div className="fas-flyout-empty">
            <strong>Nichts Neues</strong>
            <span>Sobald etwas deine Entscheidung braucht oder ein Projekt sich bewegt, erfährst du es hier zuerst.</span>
          </div>
        ) : (
          <>
            {freshNotifications.length > 0 ? (
              <>
                <p className="fas-nrow-group">Neu</p>
                {freshNotifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onOpen={() => {
                      void markRead(n.id)
                      setNotifOpen(false)
                      if (n.link) window.location.href = n.link
                    }}
                  />
                ))}
              </>
            ) : null}
            {earlierNotifications.length > 0 ? (
              <>
                <p className="fas-nrow-group">Früher</p>
                {earlierNotifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onOpen={() => {
                      setNotifOpen(false)
                      if (n.link) window.location.href = n.link
                    }}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </AppShellFlyout>
    </aside>
  )
}

/** One notification — title, one line of context, and how long ago. */
function NotificationRow({
  notification,
  onOpen,
}: {
  notification: { id: string; title: string; body: string | null; message?: string | null; read: boolean; created_at: string }
  onOpen: () => void
}) {
  const body = (notification.body || notification.message || '').trim()
  return (
    <button
      type="button"
      className={`fas-nrow${notification.read ? '' : ' is-unread'}`}
      onClick={onOpen}
    >
      <span className="fas-nrow-mark" aria-hidden="true" />
      <span className="fas-nrow-copy">
        <span className="fas-nrow-title">{notification.title}</span>
        {body ? <span className="fas-nrow-body">{body}</span> : null}
      </span>
      <span className="fas-nrow-age">{fmtRecentAge(notification.created_at)}</span>
    </button>
  )
}

/**
 * Zwei Buchstaben fuer einen Workspace.
 *
 * Aus zwei Woertern die beiden Anfangsbuchstaben, aus einem die ersten zwei.
 * Ein Platzhaltername („Kein Workspace") bekommt keine Marke — eine leere
 * Flaeche ist ehrlicher als Initialen fuer etwas, das es nicht gibt.
 */
function workspaceMark(label: string): string {
  const clean = (label || '').trim()
  if (!clean || clean === 'Kein Workspace') return ''
  const words = clean.split(/\s+/).filter(Boolean)
  const raw = words.length >= 2
    ? words[0][0] + words[words.length - 1][0]
    : clean.slice(0, 2)
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}
