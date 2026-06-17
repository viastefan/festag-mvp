'use client'

/**
 * TagroIconRail — the real Festag sidebar collapsed into a 56px icon-only
 * rail. NOT a separate placeholder nav. Items, routes, labels and icons
 * all mirror the real sidebars 1:1 so clicks behave identically.
 *
 * Panel-aware:
 *   - pathname starts with /dev/ → mirrors DevSidebar (Overview, Projects,
 *     My Tasks, Tagro Review, Daily Plan, Zeiterfassung, Job Board,
 *     GitHub, Updates, Team, Messages, Settings).
 *   - otherwise → mirrors the main Festag sidebar nav (Statusabfrage,
 *     Inbox, Kunden, Projekte, Tasks, Entscheidungen, Statusberichte,
 *     Dokumente, Notizen, Tagro, Mehr, Settings).
 *
 * Click behavior:
 *   - shell variant (fixed in ClientAppShell): plain Link navigation.
 *   - inline variant (mounted inside the TagroOverlay): the overlay
 *     passes onNavigate to close itself before route change so the user
 *     lands on the real page with the full sidebar restored.
 *
 * Mobile (<=768px): hidden — mobile keeps the 2-button object bar.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Article,
  Briefcase,
  ChatCircle,
  ChatsCircle,
  CheckSquare,
  Clock,
  Compass,
  DotsThreeOutline,
  FileText,
  FolderOpen,
  FolderSimple,
  GearSix,
  GithubLogo,
  House,
  Kanban,
  Microphone,
  NotePencil,
  Robot,
  Scales,
  Sparkle,
  Tray,
  UsersThree,
} from '@phosphor-icons/react'
import type { MouseEvent } from 'react'

type RailItem = {
  id: string
  label: string
  // Phosphor icons have a complex generic signature; React.ElementType
  // sidesteps it without losing the size/weight props at the call site.
  icon: React.ElementType
  href: string
  /** Used to set active style. */
  match: (path: string) => boolean
}

/**
 * Main app rail — matches the order of the full Festag sidebar so the
 * user's spatial muscle memory carries over verbatim.
 */
const APP_ITEMS: RailItem[] = [
  { id: 'statusabfrage', label: 'Statusabfrage', icon: House,        href: '/dashboard',  match: (p) => p === '/dashboard' || p === '/' },
  { id: 'inbox',         label: 'Inbox',         icon: Tray,         href: '/inbox',      match: (p) => p.startsWith('/inbox') || p.startsWith('/messages') },
  { id: 'clients',       label: 'Kunden',        icon: UsersThree,   href: '/clients',    match: (p) => p.startsWith('/clients') },
  { id: 'projects',      label: 'Projekte',      icon: FolderSimple, href: '/projects',   match: (p) => p === '/projects' || p.startsWith('/project/') },
  { id: 'tasks',         label: 'Tasks',         icon: CheckSquare,  href: '/tasks',      match: (p) => p.startsWith('/tasks') },
  { id: 'decisions',     label: 'Entscheidungen',icon: Scales,       href: '/decisions',  match: (p) => p.startsWith('/decisions') },
  { id: 'reports',       label: 'Statusberichte',icon: FileText,     href: '/reports',    match: (p) => p.startsWith('/reports') },
  { id: 'documents',     label: 'Dokumente',     icon: FolderOpen,   href: '/documents',  match: (p) => p.startsWith('/documents') },
  { id: 'notes',         label: 'Notizen',       icon: NotePencil,   href: '/notes',      match: (p) => p.startsWith('/notes') },
  { id: 'tagro',         label: 'Tagro',         icon: ChatCircle,   href: '/ai',         match: (p) => p.startsWith('/ai') },
  { id: 'more',          label: 'Mehr',          icon: DotsThreeOutline, href: '/more',   match: (p) => p.startsWith('/more') },
]

/**
 * Dev Panel rail — verbatim from DevSidebar NAV_MAIN + NAV_INTEGRATIONS
 * + NAV_ORG. Same routes, same icons, same labels.
 */
const DEV_ITEMS: RailItem[] = [
  { id: 'dev-overview', label: 'Overview',      icon: Compass,     href: '/dev',          match: (p) => p === '/dev' },
  { id: 'dev-projects', label: 'Projects',      icon: FolderOpen,  href: '/dev/projects', match: (p) => p.startsWith('/dev/projects') },
  { id: 'dev-captures', label: 'Client Captures', icon: Microphone, href: '/dev/captures', match: (p) => p.startsWith('/dev/captures') },
  { id: 'dev-tasks',    label: 'My Tasks',      icon: CheckSquare, href: '/dev/tasks',    match: (p) => p.startsWith('/dev/tasks') },
  { id: 'dev-review',   label: 'Tagro Review',  icon: Robot,       href: '/dev/review',   match: (p) => p.startsWith('/dev/review') },
  { id: 'dev-plan',     label: 'Daily Plan',    icon: Kanban,      href: '/dev/plan',     match: (p) => p.startsWith('/dev/plan') },
  { id: 'dev-time',     label: 'Zeiterfassung', icon: Clock,       href: '/dev/time',     match: (p) => p.startsWith('/dev/time') },
  { id: 'dev-jobs',     label: 'Job Board',     icon: Briefcase,   href: '/dev/jobs',     match: (p) => p.startsWith('/dev/jobs') },
  { id: 'dev-github',   label: 'GitHub',        icon: GithubLogo,  href: '/dev/github',   match: (p) => p.startsWith('/dev/github') },
  { id: 'dev-updates',  label: 'Updates',       icon: Article,     href: '/dev/updates',  match: (p) => p.startsWith('/dev/updates') },
  { id: 'dev-team',     label: 'Team',          icon: UsersThree,  href: '/dev/team',     match: (p) => p.startsWith('/dev/team') },
  { id: 'dev-messages', label: 'Messages',      icon: ChatsCircle, href: '/dev/messages', match: (p) => p.startsWith('/dev/messages') },
]

export type TagroIconRailProps = {
  /** Layout: 'shell' is fixed positioned for the app shell, 'inline' is
   *  static for use inside the TagroOverlay portal. */
  variant?: 'shell' | 'inline'
  /** Called BEFORE navigation — used by the overlay to close itself so the
   *  user lands on the destination page with the full sidebar restored. */
  onNavigate?: (href: string) => void
}

export default function TagroIconRail({ variant = 'shell', onNavigate }: TagroIconRailProps) {
  const pathname = usePathname() || ''
  const router = useRouter()

  // Panel detection mirrors which sidebar would have been showing if Tagro
  // wasn't covering it. /dev/* → dev sidebar. Everything else → main app.
  const isDev = pathname.startsWith('/dev')
  const items = isDev ? DEV_ITEMS : APP_ITEMS

  // Bottom-pinned items: always Settings (panel-aware route).
  const bottom: RailItem = isDev
    ? { id: 'dev-settings', label: 'Einstellungen', icon: GearSix, href: '/dev/settings', match: (p) => p.startsWith('/dev/settings') }
    : { id: 'settings',     label: 'Einstellungen', icon: GearSix, href: '/settings',     match: (p) => p.startsWith('/settings') }

  function go(e: MouseEvent<HTMLAnchorElement>, href: string) {
    // When the rail sits inside the overlay portal we MUST close the
    // overlay first so it doesn't keep painting over the page we just
    // navigated to. Then we route programmatically — Link's default nav
    // would otherwise race with the close.
    if (onNavigate) {
      e.preventDefault()
      onNavigate(href)
      // Defer the route push so React commits the close before the new
      // page mounts (avoids a flash of the overlay on top of the new route).
      window.setTimeout(() => router.push(href), 0)
    }
  }

  function renderItem(it: RailItem) {
    const active = it.match(pathname)
    const Icon = it.icon
    return (
      <Link
        key={it.id}
        href={it.href}
        prefetch={false}
        className={`tir-btn${active ? ' is-active' : ''}`}
        aria-label={it.label}
        aria-current={active ? 'page' : undefined}
        title={it.label}
        onClick={(e) => go(e, it.href)}
      >
        <span className="tir-ico" aria-hidden><Icon size={18} weight="regular" /></span>
        <span className="tir-sr">{it.label}</span>
      </Link>
    )
  }

  return (
    <aside className={`tir-rail tir-rail-${variant}`} role="navigation" aria-label="Festag Navigation">
      <button
        type="button"
        className="tir-mark"
        aria-label="Festag"
        title="Festag"
        onClick={() => {
          const dest = isDev ? '/dev' : '/dashboard'
          if (onNavigate) { onNavigate(dest); window.setTimeout(() => router.push(dest), 0) }
          else router.push(dest)
        }}
      >
        <Sparkle size={16} weight="fill" />
      </button>

      <nav className="tir-list">
        {items.map(renderItem)}
      </nav>

      <div className="tir-bottom">
        {renderItem(bottom)}
      </div>

      <style>{`
        .tir-rail {
          width: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 0 12px;
          gap: 6px;
          background: var(--bg-app, var(--bg));
          border-right: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
        }
        .tir-rail-shell {
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 80;
        }
        .tir-rail-inline {
          position: relative;
          height: 100%;
          flex: 0 0 56px;
          background: transparent;
          border-right-color: rgba(255,255,255,.04);
        }
        [data-theme="dark"] .tir-rail-shell,
        [data-theme="classic-dark"] .tir-rail-shell {
          background: #080808;
          border-right-color: rgba(255,255,255,.06);
        }
        [data-theme="light"] .tir-rail-shell,
        [data-theme="read"] .tir-rail-shell {
          background: #F7F7F5;
          border-right-color: rgba(0,0,0,.06);
        }
        .tir-mark {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 8px; background: transparent;
          color: #5B647D; cursor: pointer;
          margin-bottom: 6px;
          transition: background .14s ease;
        }
        .tir-mark:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .tir-list {
          flex: 1; width: 100%;
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding-top: 4px;
          overflow-y: auto;
          /* Keep the rail clean — hide scrollbar but allow overflow scroll
             when the dev nav has lots of items on short viewports. */
          scrollbar-width: none;
        }
        .tir-list::-webkit-scrollbar { display: none; }
        .tir-bottom {
          width: 100%;
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding-top: 8px;
        }
        .tir-btn {
          width: 36px; height: 36px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 8px; background: transparent;
          color: #666; cursor: pointer; text-decoration: none;
          transition: background .14s ease, color .14s ease, transform .14s ease;
        }
        [data-theme="dark"] .tir-btn,
        [data-theme="classic-dark"] .tir-btn { color: #737373; }
        .tir-btn:hover { color: #111; background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        [data-theme="dark"] .tir-btn:hover,
        [data-theme="classic-dark"] .tir-btn:hover {
          color: #F4F4F4; background: rgba(255,255,255,.04);
        }
        .tir-btn.is-active {
          color: #111; background: color-mix(in srgb, var(--surface-2) 80%, transparent);
        }
        [data-theme="dark"] .tir-btn.is-active,
        [data-theme="classic-dark"] .tir-btn.is-active {
          color: #F4F4F4; background: rgba(255,255,255,.06);
        }
        .tir-btn:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--text) 50%, transparent);
          outline-offset: 2px;
        }
        .tir-btn:active { transform: scale(.96); }
        .tir-ico { display: inline-flex; }
        .tir-sr {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
        @media (max-width: 768px) {
          .tir-rail-shell, .tir-rail-inline { display: none; }
        }
      `}</style>
    </aside>
  )
}
