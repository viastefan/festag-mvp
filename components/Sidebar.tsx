'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SidebarProfileFooter from '@/components/SidebarProfileFooter'
import SidebarExtensionPromo, { SidebarExtensionInstalledBadge } from '@/components/extension/SidebarExtensionPromo'
import SettingsSidebar from '@/components/SettingsSidebar'
import MobileActionSheet from '@/components/MobileActionSheet'
import ProjectCreationIntroAnimation from '@/components/ProjectCreationIntroAnimation'
import { mobileFabActions, mobileFabTitle } from '@/lib/mobile-actions'
import { useNotifications } from '@/hooks/useNotifications'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import {
  House, FolderSimple, Sparkle, ChatCircle, ChartLineUp,
  CreditCard, FileText, UserCircle, GearSix,
  SunHorizon, GridFour, Stack, LinkSimple,
  Plus, CaretRight, DotsThreeOutline, X,
  SignOut, UsersThree, IdentificationBadge, Bell, Briefcase,
  Clock, CheckSquare, Code, FileCode,
  Tray, MagnifyingGlass, SpeakerHigh, Pulse,
  Question, DownloadSimple, ChatTeardropDots,
  Scales, Keyboard, CheckCircle,
  ArrowSquareOut, Bug,
} from '@phosphor-icons/react'
import { autoAvatarColor, avatarInitials } from '@/lib/avatar'
import { applyWorkspaceAccent, WORKSPACE_COLOR_SYNC_EVENT } from '@/lib/workspace-accent'
import {
  broadcastProfileSync,
  getRememberedProfileAvatarColor,
  rememberProfileAvatarColor,
  subscribeProfileSync,
} from '@/lib/profile-sync'
import CustomizeSidebarModal from '@/components/CustomizeSidebarModal'
import {
  loadPrefs, onPrefsChange, shouldShowInSidebar,
  onWorkspaceDbModeChange,
  ITEM_LABELS,
  type SidebarItemId, type SidebarPrefs, type SidebarViewMode,
} from '@/lib/sidebar-prefs'

export function projectColor(_id: string, color?: string | null) { return color || 'var(--text-muted)' }
const PROJECT_COLOR_SYNC_EVENT = 'festag-project-color-change'

function TagroNavIcon({ size = 16 }: { size?: number; color?: string; weight?: string }) {
  return <TagroComposeIcon size={size} />
}

const ICONS: Record<string, React.ElementType> = {
  home: House, project: FolderSimple, sparkle: Sparkle, tagro: TagroNavIcon, chat: ChatCircle,
  activity: ChartLineUp, billing: CreditCard, card: CreditCard, doc: FileText,
  user: UserCircle, settings: GearSix, estimate: SunHorizon, grid: GridFour,
  layers: Stack, link: LinkSimple, plus: Plus, chevron: CaretRight,
  more: DotsThreeOutline, close: X, logout: SignOut, team: UsersThree,
  bell: Bell, briefcase: Briefcase, clock: Clock, check: CheckSquare,
  code: Code, task: FileCode, inbox: Tray, search: MagnifyingGlass,
  audio: SpeakerHigh, pulse: Pulse,
  scales: Scales,
  issue: Bug,
}

function Ico({ name, sz=16, c='currentColor', weight='regular' }: {
  name: string; sz?: number; c?: string;
  weight?: 'thin'|'light'|'regular'|'bold'|'fill'|'duotone'
}) {
  const Icon = ICONS[name]
  if (!Icon) return null
  return <Icon size={sz} color={c} weight={weight} />
}

type NavItem = { href: string; icon: string; label: string; badge?: number }
type MonitoringDockState = {
  loaded: boolean
  blockers: number
  decisions: number
  risks: number
  latestBriefingAt: string | null
  latestProjectUpdateAt: string | null
  hasNewBriefing: boolean
  audioReady: boolean
  deliveryAlert: boolean
}

const CLIENT_TOP: NavItem[] = [
  { href:'/dashboard', icon:'pulse', label:'Statusabfrage' },
  { href:'/executive', icon:'activity', label:'Executive' },
  { href:'/benachrichtigungen', icon:'inbox', label:'Benachrichtigungen' },
]

type HelpEntry = {
  kind: 'link' | 'action'
  href?: string
  action?: 'replay-tour' | 'support' | 'search'
  icon: React.ElementType
  title: string
  shortcut?: string
}
const HELP_ITEMS: HelpEntry[] = [
  { kind: 'action', action: 'search',      icon: MagnifyingGlass,   title: 'Hilfe suchen...',      shortcut: '⌘ K' },
  { kind: 'link',   href: '/docs',         icon: FileText,          title: 'Docs' },
  { kind: 'action', action: 'support',     icon: ChatTeardropDots,  title: 'Kontakt' },
  { kind: 'link',   href: '/docs/schnellstart-mit-festag', icon: Keyboard, title: 'Tastenkürzel', shortcut: '⌘ /' },
  { kind: 'link',   href: '/updates',      icon: CheckCircle,       title: 'Festag Status' },
  { kind: 'link',   href: '/download',     icon: DownloadSimple,    title: 'Apps und Erweiterung' },
  { kind: 'link',   href: '/settings',     icon: GearSix,           title: 'Einstellungen',       shortcut: 'G S' },
  { kind: 'action', action: 'replay-tour', icon: Sparkle,           title: 'Einführung starten' },
]

const HELP_NEWS_ITEMS = [
  { title: 'Projektbriefings', href: '/whats-new' },
  { title: 'Code Intelligence', href: '/whats-new' },
  { title: 'Vollständiger Changelog', href: '/whats-new' },
]
const CLIENT_CORE: NavItem[] = [
  { href:'/projects', icon:'project', label:'Projekte' },
  { href:'/tasks', icon:'task', label:'Tasks' },
  { href:'/issues', icon:'issue', label:'Issues' },
  { href:'/decisions', icon:'scales', label:'Entscheidungen' },
  { href:'/documents', icon:'doc', label:'Dokumente' },
  // Statusberichte live now under Statusabfrage (dashboard) → full history;
  // no separate sidebar entry. Mitwirkende moved into the "Mehr" popover.
]
const CLIENT_TEAMS: NavItem[] = [
  { href:'/teams/projects', icon:'project', label:'Projekte' },
  { href:'/teams/tasks', icon:'task', label:'Tasks' },
  { href:'/teams/reports', icon:'activity', label:'Statusberichte' },
]
const CLIENT_TAGRO: NavItem[] = [
  { href:'/ai',    icon:'chat', label:'Chat' },
  { href:'/notes', icon:'card', label:'Notizen' },
]
const CLIENT_TOOLS: NavItem[] = [
  { href:'/estimator',  icon:'estimate', label:'Preisschätzer' },
  { href:'/connectors', icon:'link',     label:'Connectors' },
  { href:'/addons',     icon:'grid',     label:'Add-ons' },
]

// ─── MODE-BASED NAV (Perspektivfilter) ───────────────────────────────────────
const MODE_DELIVERY = {
  label: 'Delivery',
  top: [
    { href: '/dashboard', icon: 'pulse', label: 'Statusabfrage' },
    { href: '/benachrichtigungen', icon: 'inbox', label: 'Benachrichtigungen' },
  ] as NavItem[],
  core: [
    { href: '/projects', icon: 'project', label: 'Projekte' },
    { href: '/tasks', icon: 'task', label: 'Tasks' },
    { href: '/decisions', icon: 'scales', label: 'Entscheidungen' },
    { href: '/issues', icon: 'issue', label: 'Issues' },
    { href: '/documents', icon: 'doc', label: 'Dokumente' },
    { href: '/reports', icon: 'activity', label: 'Statusberichte' },
  ] as NavItem[],
}

const MODE_AGENCY = {
  label: 'Agency',
  top: [
    { href: '/executive', icon: 'activity', label: 'Executive' },
    { href: '/benachrichtigungen', icon: 'inbox', label: 'Benachrichtigungen' },
  ] as NavItem[],
  core: [
    { href: '/projects', icon: 'project', label: 'Alle Projekte' },
    { href: '/tasks', icon: 'task', label: 'Alle Tasks' },
    { href: '/decisions', icon: 'scales', label: 'Entscheidungen' },
    { href: '/issues', icon: 'issue', label: 'Issues' },
    { href: '/documents', icon: 'doc', label: 'Dokumente' },
  ] as NavItem[],
}

const MODE_TEAM = {
  label: 'Team',
  top: [
    { href: '/dashboard', icon: 'pulse', label: 'Statusabfrage' },
    { href: '/benachrichtigungen', icon: 'inbox', label: 'Benachrichtigungen' },
  ] as NavItem[],
  core: [
    { href: '/teams/projects', icon: 'project', label: 'Projekte' },
    { href: '/teams/tasks', icon: 'task', label: 'Tasks' },
    { href: '/teams/reports', icon: 'activity', label: 'Statusberichte' },
    { href: '/decisions', icon: 'scales', label: 'Entscheidungen' },
    { href: '/members', icon: 'team', label: 'Mitwirkende' },
    { href: '/documents', icon: 'doc', label: 'Dokumente' },
  ] as NavItem[],
}

function getModeConfig(mode: SidebarViewMode) {
  if (mode === 'agency') return MODE_AGENCY
  if (mode === 'team') return MODE_TEAM
  return MODE_DELIVERY
}
// Mobile bottom-nav — five tabs + centre FAB layout.
// The FAB sits between the second and third nav item; the rest are
// rendered as four icon+label items split 2 / 2 around it.
const CLIENT_MOB_PRIMARY: NavItem[] = [
  { href:'/dashboard', icon:'home',    label:'Home' },
  { href:'/projects',  icon:'project', label:'Projekte' },
  // FAB sits here in the JSX
  { href:'/benachrichtigungen',     icon:'inbox',   label:'Benachrichtigungen' },
  { href:'/ai',        icon:'tagro', label:'Tagro' },
  { href:'/more',      icon:'more',    label:'Mehr' },
]
const CLIENT_MOB_QUICK = [
  { href:'/projects?new=1', icon:'plus', label:'Neues Projekt', primary: true },
  { href:'/tasks',       icon:'task',     label:'Tasks' },
  { href:'/issues',      icon:'issue',    label:'Issues' },
  { href:'/decisions',   icon:'scales',   label:'Entscheidungen' },
  { href:'/reports',     icon:'activity', label:'Statusberichte' },
  { href:'/notes',       icon:'card',     label:'Notizen' },
  { href:'/benachrichtigungen',    icon:'chat',     label:'Benachrichtigungen' },
  { href:'/documents',   icon:'doc',      label:'Dokumente' },
  { href:'/voice-reports', icon:'audio',  label:'Audio Briefing' },
  { href:'/estimator',   icon:'estimate', label:'Preisschätzer' },
  { href:'/addons',      icon:'grid',     label:'Add-ons' },
  { href:'/settings',    icon:'settings', label:'Einstellungen' },
]

const DEV_MAIN: NavItem[] = [
  { href:'/dev',      icon:'home',     label:'Dashboard' },
  { href:'/benachrichtigungen', icon:'chat',     label:'Benachrichtigungen' },
]
const DEV_WORK: NavItem[] = [
  { href:'/dev/jobs',     icon:'briefcase', label:'Job Board' },
  { href:'/dev/tasks',    icon:'task',      label:'Meine Tasks' },
  { href:'/dev/projects', icon:'project',   label:'Meine Projekte' },
  { href:'/dev/time',     icon:'clock',     label:'Zeiterfassung' },
]
const DEV_TOOLS: NavItem[] = [
  { href:'/connectors', icon:'link', label:'Connectors' },
  { href:'/addons',     icon:'grid', label:'Add-ons' },
]
const DEV_MOB_PRIMARY: NavItem[] = [
  { href:'/dev',       icon:'home',      label:'Home' },
  { href:'/dev/jobs',  icon:'briefcase', label:'Jobs' },
  { href:'/dev/tasks', icon:'task',      label:'Tasks' },
  { href:'/settings',  icon:'user',      label:'Profil' },
]
const DEV_MOB_QUICK = [
  { href:'/dev/jobs',     icon:'briefcase', label:'Job Board',    primary: true },
  { href:'/benachrichtigungen',     icon:'chat',      label:'Benachrichtigungen' },
  { href:'/dev/tasks',    icon:'task',      label:'Meine Tasks' },
  { href:'/dev/projects', icon:'project',   label:'Projekte' },
  { href:'/dev/time',     icon:'clock',     label:'Zeiterfassung' },
  { href:'/connectors',   icon:'link',      label:'Connectors' },
]

const ROLE_LABEL: Record<string,string> = { client:'Client', dev:'Developer', admin:'Admin' }

function formatRelativeBriefing(value?: string | null) {
  if (!value) return null
  const diffMs = Date.now() - new Date(value).getTime()
  const diffMin = Math.max(0, Math.round(diffMs / 60000))
  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `vor ${diffHours}h`
  const diffDays = Math.round(diffHours / 24)
  return `vor ${diffDays} Tg.`
}

function reportHasRisk(content?: string | null) {
  return /blocker|risiko|kritisch|verzöger|abhängig|eskal/i.test(String(content ?? ''))
}

function missingProfileColumn(error: unknown) {
  const message = String((error as any)?.message ?? '')
  const raw = (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "?([a-zA-Z0-9_.]+)"? does not exist/)?.[1] ||
    null
  )
  return raw?.split('.').pop() ?? null
}

async function readSidebarProfile(sb: any, userId: string) {
  let result = await sb
    .from('profiles')
    .select('first_name,full_name,avatar_url,avatar_color,role,plan')
    .eq('id', userId)
    .maybeSingle()

  if (result.error && missingProfileColumn(result.error)) {
    result = await sb
      .from('profiles')
      .select('first_name,full_name,avatar_url,role,plan')
      .eq('id', userId)
      .maybeSingle()
  }

  return result.data
}

export default function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  const pathname  = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [uid,      setUid]      = useState<string|null>(null)
  const [email,    setEmail]    = useState('')
  const [fn,       setFn]       = useState('')
  const [fullName, setFullName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [members, setMembers] = useState<{ id: string; name: string; color: string; avatarUrl: string | null }[]>([])
  const [avatar,   setAvatar]   = useState<string|null>(null)
  const [avatarColor, setAvatarColor] = useState<string|null>(null)
  const [role,     setRole]     = useState('client')
  const [plan,     setPlan]     = useState('free')
  const [projId,   setProjId]   = useState<string|null>(null)
  const [projects, setProjects] = useState<{id:string;title:string;status:string;color:string|null}[]>([])
  const [observedProjects, setObservedProjects] = useState<{id:string;title:string;color:string|null}[]>([])
  const [observedExp, setObservedExp] = useState(true)
  const [more, setMore] = useState(false)
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [workspaceExp, setWorkspaceExp] = useState(true)
  const [projectListExp, setProjectListExp] = useState(true)
  const [teamsExp, setTeamsExp] = useState(false)
  const [tagroExp, setTagroExp] = useState(true)
  const [reportsExp, setReportsExp] = useState(false)
  const reportsAutoSeededRef = useRef(false)
  const [toolsExp, setToolsExp] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [videoTeaserVisible, setVideoTeaserVisible] = useState(true)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  // Sidebar customisation: prefs control which items show, which hide
  // into the "Mehr" popover, and how badges render. Default behaviour
  // is unchanged until the user touches the modal.
  const [sidebarPrefs, setSidebarPrefs] = useState<SidebarPrefs>(() => loadPrefs())
  const [moreOpen, setMoreOpen] = useState(false)
  const [morePos, setMorePos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const moreTriggerRef = useRef<HTMLButtonElement>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  function openMore() {
    const r = moreTriggerRef.current?.getBoundingClientRect()
    if (r) {
      const width = 232
      const estHeight = 320
      const vw = window.innerWidth
      const vh = window.innerHeight
      // Clamp horizontally so the menu never runs off the right edge.
      const left = Math.max(12, Math.min(r.left, vw - width - 12))
      // Flip upward when there isn't room below the trigger.
      const top = r.bottom + 6 + estHeight > vh
        ? Math.max(12, r.top - estHeight - 6)
        : r.bottom + 6
      setMorePos({ left, top })
    }
    setMoreOpen((v) => !v)
  }

  useEffect(() => {
    if (!videoModalOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setVideoModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [videoModalOpen])
  const [colorPickId, setColorPickId] = useState<string|null>(null)
  const [monitoringDock, setMonitoringDock] = useState<MonitoringDockState>({
    loaded: false,
    blockers: 0,
    decisions: 0,
    risks: 0,
    latestBriefingAt: null,
    latestProjectUpdateAt: null,
    hasNewBriefing: false,
    audioReady: false,
    deliveryAlert: false,
  })
  const [wsMode, setWsMode] = useState<'delivery' | 'team' | 'agency'>('delivery')

  const isClient = true
  const isDev = false
  // ── Mode-aware nav composition (additive only) ─────────────────
  // Every workspace mode keeps the full default nav. Delivery clients
  // need Teams for Client-Teamrollen and Tasks for visibility, so we
  // never hide them. Agency mode layers a "Kunden" top item + White
  // Inbox unread count piggy-backs on the global notifications hook so
  // the badge updates in realtime without a second subscription.
  const { unread: inboxUnread } = useNotifications({ limit: 1 })

  // Decisions: open count for the current user — drives the sidebar
  // badge so the client sees how many decisions await them without
  // visiting /decisions. Realtime subscription keeps it live.
  const [decisionsOpen, setDecisionsOpen] = useState(0)
  useEffect(() => {
    let cancelled = false
    const sb = createClient()
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancelled) return
      const { count } = await (sb as any).from('decisions')
        .select('id', { count: 'exact', head: true })
        .eq('requested_for', user.id)
        .in('status', DECISION_OPEN_STATUS_LIST)
      if (!cancelled) setDecisionsOpen(count ?? 0)

      const ch = (sb as any)
        .channel(`sidebar-decisions-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, async () => {
          const { count: c2 } = await (sb as any).from('decisions')
            .select('id', { count: 'exact', head: true })
            .eq('requested_for', user.id)
            .in('status', DECISION_OPEN_STATUS_LIST)
          if (!cancelled) setDecisionsOpen(c2 ?? 0)
        })
        .subscribe()
      return () => { (sb as any).removeChannel(ch) }
    })()
    return () => { cancelled = true }
  }, [])
  // Map href → SidebarItemId so the prefs store can decide what to show
  // and what to push into the "Mehr" popover.
  const HREF_TO_ITEM_ID: Record<string, SidebarItemId> = {
    '/dashboard': 'statusabfrage',
    '/executive': 'executive',
    '/benachrichtigungen':  'inbox',
    '/projects':  'projects',
    '/reports':   'reports',
    '/tasks':     'tasks',
    '/issues':    'issues',
    '/decisions': 'decisions',
    '/observers': 'observers',
    '/ai':        'tagro-chat',
    '/notes':     'tagro-notes',
    '/estimator': 'estimator',
    '/connectors':'connectors',
    '/documents': 'documents',
    '/teams/projects': 'projects',
    '/teams/tasks': 'tasks',
    '/teams/reports': 'reports',
    '/members': 'members',
  }

  // Mode-based nav — Perspektivfilter über dieselben Daten.
  const modeConfig = getModeConfig(wsMode)
  const topNavBase: NavItem[] = wsMode === 'agency'
    ? [...modeConfig.top, { href: '/clients', icon: 'team', label: 'Kunden' }]
    : modeConfig.top
  const topNav: NavItem[] = topNavBase.map(item =>
    item.href === '/benachrichtigungen' && inboxUnread > 0 ? { ...item, badge: inboxUnread } : item,
  )

  // Filter a nav list through the sidebar prefs. Items set to 'never'
  // disappear entirely; items set to 'badged' only show if their badge
  // count is > 0.
  function applyPrefs(items: NavItem[]): NavItem[] {
    return items.filter((item) => {
      const id = HREF_TO_ITEM_ID[item.href]
      if (!id) return true // unknown href: stay visible (back-compat)
      const hasBadge = (item.badge ?? 0) > 0
      return shouldShowInSidebar(id, sidebarPrefs, hasBadge)
    })
  }

  const coreNavRaw: NavItem[] = modeConfig.core.map(item =>
    item.href === '/decisions' && decisionsOpen > 0 ? { ...item, badge: decisionsOpen } : item,
  )
  const coreNav = applyPrefs(coreNavRaw)
  const teamsNav: NavItem[] = applyPrefs(CLIENT_TEAMS)
  const tagroNav: NavItem[] = applyPrefs(CLIENT_TAGRO)
  const toolsNavBase: NavItem[] = wsMode === 'agency'
    ? [...CLIENT_TOOLS, { href: '/settings/workspace', icon: 'sparkle', label: 'White Label' }]
    : CLIENT_TOOLS
  const toolsNav: NavItem[] = applyPrefs(toolsNavBase)

  // Items hidden from the workspace section by current prefs — they
  // surface in the "Mehr" popover so nothing is unreachable.
  const moreItems: NavItem[] = coreNavRaw.filter((item) => {
    const id = HREF_TO_ITEM_ID[item.href]
    if (!id) return false
    const hasBadge = (item.badge ?? 0) > 0
    return !shouldShowInSidebar(id, sidebarPrefs, hasBadge)
  })

  // Listen for prefs changes from the modal so the sidebar reflects
  // immediately without a reload.
  useEffect(() => {
    const off = onPrefsChange(() => setSidebarPrefs(loadPrefs()))
    return off
  }, [])

  useEffect(() => {
    return onWorkspaceDbModeChange(m => setWsMode(m))
  }, [])

  const mobPrimary = CLIENT_MOB_PRIMARY
  const mobQuick = CLIENT_MOB_QUICK

  useEffect(() => {
    try {
      const storedTeams = window.localStorage.getItem('sidebar-teams-expanded')
      const storedWorkspace = window.localStorage.getItem('sidebar-workspace-expanded')
      const storedProjects = window.localStorage.getItem('sidebar-project-list-expanded')
      const storedTagro = window.localStorage.getItem('sidebar-tagro-expanded')
      const storedTools = window.localStorage.getItem('sidebar-tools-expanded')
      if (storedTeams !== null) setTeamsExp(storedTeams === 'true')
      if (storedWorkspace !== null) setWorkspaceExp(storedWorkspace === 'true')
      if (storedProjects !== null) setProjectListExp(storedProjects === 'true')
      if (storedTagro !== null) setTagroExp(storedTagro === 'true')
      if (storedTools !== null) setToolsExp(false)
    } catch {}
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-workspace-expanded', String(workspaceExp)) } catch {}
  }, [workspaceExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-project-list-expanded', String(projectListExp)) } catch {}
  }, [projectListExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-teams-expanded', String(teamsExp)) } catch {}
  }, [teamsExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-tagro-expanded', String(tagroExp)) } catch {}
  }, [tagroExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-tools-expanded', String(toolsExp)) } catch {}
  }, [toolsExp])

  // Close transient popovers on navigation — cheap + route-coupled.
  useEffect(() => {
    setMore(false)
    setWhatsNewOpen(false)
  }, [pathname])

  // Load sidebar data ONCE on mount, NOT on every navigation. Re-pulling
  // profile + workspace + projects + monitoring on each route change made
  // the whole sidebar flicker. Live updates arrive via the profile-sync
  // broadcast and the visibility/focus refetch below.
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUid(data.user.id)
      setEmail(data.user.email ?? '')
      const p = await readSidebarProfile(sb, data.user.id)
      if (p) {
        const rememberedColor = getRememberedProfileAvatarColor(data.user.id)
        setFn((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setFullName((p as any).full_name ?? '')
        setAvatar((p as any).avatar_url ?? null)
        setAvatarColor((p as any).avatar_color ?? rememberedColor ?? null)
        setRole((p as any).role ?? 'client')
        setPlan((p as any).plan ?? 'free')
      }
      // Workspace mode drives which nav items are visible; the workspace
      // NAME is what the top switcher shows (Linear-style: workspace on
      // the trigger, user identity in the dropdown).
      try {
        const { data: ws } = await sb
          .from('workspaces').select('id,mode,name,metadata')
          .eq('primary_owner_id', data.user.id)
          .eq('is_personal', true).maybeSingle()
        const m = (ws as any)?.mode
        if (m === 'team' || m === 'agency' || m === 'delivery') setWsMode(m)
        const wn = (ws as any)?.name
        if (wn && typeof wn === 'string') setWorkspaceName(wn.trim())
        // Apply the workspace brand colour app-wide (set in Settings → Workspace).
        applyWorkspaceAccent((ws as any)?.metadata?.settings?.workspace_color ?? null)
        // Team roster for the switcher — who else is in this workspace.
        // Owner first, then members; honest count, real avatar colours.
        const wsId = (ws as any)?.id
        if (wsId) {
          try {
            const { data: mem } = await sb
              .from('workspace_members').select('user_id,role').eq('workspace_id', wsId)
            const memRows = (mem as any[]) ?? []
            const ids = Array.from(new Set([data.user.id, ...memRows.map(r => r.user_id)].filter(Boolean)))
            const { data: profs } = await sb
              .from('profiles').select('id,full_name,first_name,email,avatar_url,avatar_color').in('id', ids)
            const pById = new Map<string, any>(((profs as any[]) ?? []).map(p => [p.id, p]))
            const toMember = (uidx: string) => {
              const pr = pById.get(uidx)
              const nm = (pr?.full_name || '').trim() || (pr?.first_name || '').trim() || (pr?.email || '').split('@')[0] || 'Mitglied'
              return { id: uidx, name: nm, color: pr?.avatar_color || autoAvatarColor(uidx || pr?.email), avatarUrl: pr?.avatar_url ?? null }
            }
            const ordered = [data.user.id, ...memRows.map(r => r.user_id).filter((x: string) => x !== data.user.id)]
            setMembers(Array.from(new Set(ordered)).map(toMember))
          } catch {}
        }
      } catch {}
      // ── Beobachtete Projekte: Projekte fremder Owner, für die ich joined-Observer bin
      try {
        const { data: obs } = await sb
          .from('workspace_observers')
          .select('project_ids, owner_user_id, status')
          .eq('user_id', data.user.id)
          .eq('status', 'joined')
        const rows = (obs as any[]) ?? []
        if (rows.length > 0) {
          // RLS lässt observed projects durch die select-policy für projects durch
          const { data: obsProj } = await sb
            .from('projects')
            .select('id,title,color,user_id')
            .neq('user_id', data.user.id)
            .order('created_at', { ascending: false })
            .limit(20)
          const filtered = ((obsProj as any[]) ?? []).filter(p => {
            return rows.some(r => r.owner_user_id === p.user_id && (r.project_ids === null || (Array.isArray(r.project_ids) && r.project_ids.includes(p.id))))
          })
          setObservedProjects(filtered.map(p => ({ id: p.id, title: p.title, color: p.color })))
        }
      } catch {}
    })
    createClient().from('projects').select('id,title,status,color').order('created_at',{ascending:false}).limit(12).then(async ({ data }) => {
      const list = (data as any[]) ?? []
      setProjects(list)
      if (list.length) {
        const prio: Record<string,number> = { active:0,testing:1,planning:2,intake:3,done:4 }
        setProjId([...list].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
        // Bottom monitoring dock — always show the most relevant current signal.
        try {
          const ids = list.map(p => p.id)
          const [taskRes, reportRes, updateRes, subscriptionRes] = await Promise.all([
            createClient().from('tasks').select('status,project_id').in('project_id', ids),
            createClient().from('ai_updates').select('project_id,content,created_at,type').eq('type', 'status_report').in('project_id', ids).order('created_at', { ascending: false }).limit(12),
            createClient().from('ai_updates').select('project_id,created_at,type').eq('type', 'dev_progress_update').in('project_id', ids).order('created_at', { ascending: false }).limit(12),
            createClient().from('briefing_subscriptions').select('format,last_sent_at,next_run_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
          ])
          const tasks = (taskRes.data as Array<{ status?: string | null; project_id: string }> | null) ?? []
          const reports = (reportRes.data as Array<{ project_id: string; content?: string | null; created_at: string; type?: string | null }> | null) ?? []
          const updates = (updateRes.data as Array<{ project_id: string; created_at: string; type?: string | null }> | null) ?? []
          const latestReport = reports[0] ?? null
          const latestProjectUpdate = updates[0] ?? null
          const decisions = tasks.filter(x => x.status === 'waiting').length
          const blockers = tasks.filter(x => x.status === 'blocked').length
          const risks = latestReport && reportHasRisk(latestReport.content) ? 1 : 0
          const latestBriefingAt = latestReport?.created_at ?? null
          const latestProjectUpdateAt = latestProjectUpdate?.created_at ?? null
          const reportAgeMs = latestBriefingAt ? Date.now() - new Date(latestBriefingAt).getTime() : Number.POSITIVE_INFINITY
          const updateAgeMs = latestProjectUpdateAt ? Date.now() - new Date(latestProjectUpdateAt).getTime() : Number.POSITIVE_INFINITY
          const hasNewBriefing = Boolean(latestBriefingAt && reportAgeMs <= 6 * 60 * 60 * 1000)
          const audioReady = Boolean(latestBriefingAt && reportAgeMs <= 24 * 60 * 60 * 1000)
          const deliveryAlert = Boolean((subscriptionRes.data as any)?.next_run_at || (subscriptionRes.data as any)?.last_sent_at)

          setMonitoringDock({
            loaded: true,
            blockers,
            decisions,
            risks,
            latestBriefingAt,
            latestProjectUpdateAt,
            hasNewBriefing,
            audioReady: audioReady && !hasNewBriefing,
            deliveryAlert,
          })
        } catch {
          setMonitoringDock((state) => ({ ...state, loaded: true }))
        }
      } else {
        setMonitoringDock({
          loaded: true,
          blockers: 0,
          decisions: 0,
          risks: 0,
          latestBriefingAt: null,
          latestProjectUpdateAt: null,
          hasNewBriefing: false,
          audioReady: false,
          deliveryAlert: false,
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return subscribeProfileSync((payload) => {
      if (payload.email !== undefined) setEmail(payload.email ?? '')
      if (payload.firstName !== undefined) setFn(payload.firstName ?? '')
      if (payload.fullName !== undefined) setFullName(payload.fullName ?? '')
      if (payload.avatarUrl !== undefined) setAvatar(payload.avatarUrl ?? null)
      if (payload.avatarColor !== undefined) setAvatarColor(payload.avatarColor ?? null)
      if (payload.plan !== undefined && payload.plan !== null) setPlan(payload.plan)
    })
  }, [])

  // Belt-and-suspenders: re-pull the profile when the tab regains
  // focus. If the broadcast somehow missed (rare race, cross-window
  // weirdness), this guarantees the chip reflects the latest DB state
  // the moment the user clicks back to the app.
  useEffect(() => {
    function refetch() {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
      const sb = createClient()
      sb.auth.getUser().then(async ({ data }) => {
        if (!data.user) return
        const p = await readSidebarProfile(sb, data.user.id)
        if (!p) return
        const rememberedColor = getRememberedProfileAvatarColor(data.user.id)
        setFn((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setFullName((p as any).full_name ?? '')
        setAvatar((p as any).avatar_url ?? null)
        setAvatarColor((p as any).avatar_color ?? rememberedColor ?? null)
        if ((p as any).plan) setPlan((p as any).plan)
      })
    }
    window.addEventListener('focus', refetch)
    document.addEventListener('visibilitychange', refetch)
    return () => {
      window.removeEventListener('focus', refetch)
      document.removeEventListener('visibilitychange', refetch)
    }
  }, [])

  useEffect(() => {
    const onProjectColor = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const projectId = event.detail?.projectId
      const color = event.detail?.color
      if (!projectId || !color) return
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, color } : p))
    }
    window.addEventListener(PROJECT_COLOR_SYNC_EVENT, onProjectColor)
    return () => window.removeEventListener(PROJECT_COLOR_SYNC_EVENT, onProjectColor)
  }, [])

  // Live workspace-accent updates from Settings → Workspace.
  useEffect(() => {
    const onWsColor = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      applyWorkspaceAccent(event.detail ?? null)
    }
    window.addEventListener(WORKSPACE_COLOR_SYNC_EVENT, onWsColor)
    return () => window.removeEventListener(WORKSPACE_COLOR_SYNC_EVENT, onWsColor)
  }, [])

  const PROJ_COLORS = ['#6a738c','#5b647d','#64748b','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#94a3b8']

  async function setProjectColor(id: string, color: string, closePicker = true) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, color } : p))
    if (closePicker) setColorPickId(null)
    window.dispatchEvent(new CustomEvent(PROJECT_COLOR_SYNC_EVENT, { detail: { projectId: id, color } }))
    await (createClient() as any).from('projects').update({ color }).eq('id', id)
  }

  const logout  = async () => { await createClient().auth.signOut(); window.location.href='/login' }
  const resolve = (h: string) => h==='/project/current'?(projId?`/project/${projId}`:'/projects'):h
  const isOn    = (h: string) => {
    const [cleanHref, query] = h.split('?')
    const targetParams = new URLSearchParams(query ?? '')
    const targetView = targetParams.get('view')
    const currentView = searchParams?.get('view') || (cleanHref === '/ai' ? 'chat' : null)

    if (targetView) {
      return pathname === cleanHref && currentView === targetView
    }
    if (cleanHref==='/dashboard') return pathname==='/dashboard'
    if (cleanHref==='/dev')       return pathname==='/dev'
    if (cleanHref==='/project/current') return pathname.startsWith('/project/')
    // A task opened from a project lives at /projects/<id>/tasks/<id>, but it
    // belongs to the Tasks section — never make "Projekte" jump active there.
    const nestedTask = /^\/projects\/[^/]+\/tasks\/[^/]+/.test(pathname || '')
    if (nestedTask) {
      if (cleanHref === '/projects') return false
      if (cleanHref === '/tasks')    return true
    }
    return pathname.startsWith(cleanHref)
  }
  // Display the account name the way the user typed it in Settings, then
  // fall back to first name and email. This keeps the sidebar profile chip
  // aligned with the browser tab title after autosave.
  const name = fullName.trim() || fn || email.split('@')[0] || 'Konto'
  const init = avatarInitials(fn, fullName, email)
  const avBg = avatarColor || autoAvatarColor(uid || email)
  // Top switcher shows the workspace name (Linear-style). Falls back to
  // the user name only if no workspace name was set during onboarding.
  const workspaceLabel = workspaceName.trim() || name

  function navShortcut(label: string, href?: string) {
    const key = `${href || ''}|${label}`.toLowerCase()
    if (key.includes('dashboard')) return 'G D'
    if (key.includes('inbox')) return 'G I'
    if (key.includes('statusberichte')) return 'G S'
    if (key.includes('tasks')) return 'G T'
    if (key.includes('mitwirkende')) return 'G M'
    if (key.includes('projekte')) return 'G P'
    if (key.includes('nachrichten')) return 'G N'
    if (key.includes('projektbriefings') || key.includes('reports')) return 'G B'
    if (key.includes('briefing aufnehmen') || key.includes('voice-reports')) return 'G A'
    if (key.includes('chat')) return 'G C'
    if (key.includes('notizen')) return 'G O'
    if (key.includes('preisschätzer')) return 'G R'
    if (key.includes('connectors')) return 'G L'
    if (key.includes('add-ons')) return 'G X'
    if (key.includes('kunden')) return 'G K'
    return `G ${label.trim().charAt(0).toUpperCase() || '·'}`
  }

  function projectShortcut(index: number) {
    return `G ${Math.min(index + 1, 9)}`
  }

  function tourTargetForItem(item: NavItem) {
    if (item.href === '/dashboard') return 'sidebar-status'
    if (item.href === '/benachrichtigungen') return 'sidebar-inbox'
    if (item.href === '/projects') return 'sidebar-projects'
    if (item.href === '/ai') return 'sidebar-tagro-chat'
    return undefined
  }

  async function changeAvatarColor(c: string) {
    setAvatarColor(c)
    rememberProfileAvatarColor(uid, c)
    broadcastProfileSync({ avatarColor: c })
    if (!uid) return
    try { await (createClient() as any).from('profiles').update({ avatar_color: c }).eq('id', uid) } catch {}
  }

  async function handleHelpItem(item: HelpEntry) {
    setWhatsNewOpen(false)
    if (item.kind === 'link' && item.href) {
      router.push(item.href)
      return
    }
    if (item.action === 'search') {
      window.dispatchEvent(new CustomEvent('open-command-palette'))
      return
    }
    if (item.action === 'replay-tour') {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          await sb.from('profiles').update({
            tour_completed_at: null, tour_step: 0,
          }).eq('id', user.id)
        }
      } catch {}
      try {
        window.localStorage.removeItem('festag_tour_completed')
        window.localStorage.setItem('festag_onboarding_status', 'not_started')
      } catch {}
      window.location.href = '/dashboard?tour=1'
      return
    }
    if (item.action === 'support') {
      window.location.href = 'mailto:hi@festag.io?subject=Festag%20Support'
    }
  }

  // ── NavItems list (no section header) ──
  function NavItems({ items }: { items: NavItem[] }) {
    return (
      <>
        {items.map(item => {
          const on = isOn(item.href)
          const tourTarget = tourTargetForItem(item)
          const k = `${item.href}-${item.label}`
          const link = (
            <Link
              href={resolve(item.href)}
              className={`ni ${on?'ni-on':'ni-off'}`}
              data-shortcut={navShortcut(item.label, item.href)}
              data-tour={tourTarget}
            >
              <Ico name={item.icon} sz={18} c={on?'var(--nav-on-text)':'var(--nav-off-text)'} weight="regular" />
              <span className="ni-label">{item.label}</span>
              {item.badge ? (
                <span className="ni-count">{item.badge > 99 ? '99+' : item.badge}</span>
              ) : null}
            </Link>
          )
          // Projekte: reveal a quiet "+" on hover so a new project can be
          // created without first reaching the projects list page.
          if (item.href === '/projects') {
            return (
              <div className="ni-wrap ni-wrap-add" key={k}>
                {link}
                <button
                  type="button"
                  className="ni-add"
                  title="Neues Projekt anlegen"
                  aria-label="Neues Projekt anlegen"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push('/projects?new=1') }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            )
          }
          return <div className="ni-wrap" key={k}>{link}</div>
        })}
      </>
    )
  }

  // ── Collapsible section ──
  function Section({ label, expanded, onToggle, children, action }: {
    label: string; expanded: boolean; onToggle: () => void;
    children: React.ReactNode; action?: React.ReactNode
  }) {
    return (
      <div className="sb-section">
        <div className="sb-section-head">
          <button className="sb-icon-btn" onClick={onToggle} style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'transparent', border:'none', cursor:'pointer',
            fontFamily:'inherit', padding:0, textAlign:'left',
            width:'auto', maxWidth:'100%',
          }}>
            <span style={{ fontSize:11, fontWeight:500, color:'#8E8E93', letterSpacing:'0.05em', textTransform:'uppercase', lineHeight:'16px' }}>{label}</span>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.4" strokeLinecap="round"
              style={{ flexShrink:0, opacity:.8, transform:expanded?'rotate(90deg)':'rotate(0deg)', transition:'transform .18s ease' }}>
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
          {action ? <div className="sb-section-action">{action}</div> : null}
        </div>
        <div style={{
          overflow:'hidden',
          display:'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition:'grid-template-rows .22s cubic-bezier(.16,1,.3,1)',
        }}>
          <div style={{ minHeight:0 }}>{children}</div>
        </div>
      </div>
    )
  }

  function ExpandableNavSection({
    href,
    icon,
    label,
    expanded,
    onToggle,
    action,
    actionTitle,
    activeOverride,
    children,
  }: {
    href: string
    icon: string
    label: string
    expanded: boolean
    onToggle: () => void
    action?: () => void
    actionTitle?: string
    activeOverride?: boolean
    children: React.ReactNode
  }) {
    const active = activeOverride ?? isOn(href)
    const go = () => router.push(resolve(href))
    return (
      <div style={{ marginBottom: 1 }}>
        <div
          className={`ni ni-has-toggle ${active ? 'ni-on' : 'ni-off'}`}
          data-shortcut={navShortcut(label, href)}
          role="link"
          tabIndex={0}
          onClick={go}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              go()
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingRight: 6,
          }}
        >
          <span
            style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, textDecoration: 'none', color: 'inherit', height: '100%' }}
          >
            <span style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Ico name={icon} sz={14} c={active ? 'var(--text)' : 'var(--text-muted)'} weight={active ? 'bold' : 'regular'} />
            </span>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </span>
          <button
            className="sb-icon-btn"
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
            aria-label={`${label} ein- oder ausklappen`}
            style={{ width: 22, height: 22, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 7, flexShrink: 0 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s cubic-bezier(.16,1,.3,1)' }}>
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
        <div style={{ overflow: 'hidden', display: 'grid', gridTemplateRows: expanded ? '1fr' : '0fr', transition: 'grid-template-rows .22s cubic-bezier(.16,1,.3,1)' }}>
          <div style={{ minHeight: 0, paddingTop: 1 }}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  // Settings-mode: replace the entire main sidebar with the settings nav
  // while the user is anywhere under /settings.
  // Placed AFTER all hook declarations to keep React's Rules of Hooks intact.
  if (pathname && pathname.startsWith('/settings')) {
    return <SettingsSidebar />
  }

  return (
    <>
      <style>{`
        :root {
          --sb-row-h: 36px;
          --sb-icon: 18px;
          --sb-font: 13px;
          --sb-x: 12px;
          --sb-sidebar-gray: #8E8E93;
        }
        .sidebar-inner {
          min-height:0;
          overflow:hidden;
        }
        /* ── Nav item ── */
        .ni {
          position:relative;
          display:flex; align-items:center; gap:12px;
          min-height: var(--sb-row-h);
          padding:0 var(--sb-x); border-radius:4px;
          font-size:var(--sb-font); font-weight:400;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          letter-spacing:0;
          cursor:pointer; text-decoration:none; color:inherit;
          transition:background .12s, color .12s;
          white-space:nowrap; overflow:hidden;
          width:100%;
          max-width:100%;
          min-width:0;
          box-sizing:border-box;
          margin:0;
        }
        .ni span,
        .ni button {
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight:400;
          letter-spacing:0;
        }
        .ni-label {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .ni-count {
          margin-left:auto;
          min-width:16px;
          padding-left:8px;
          text-align:right;
          color:var(--text-secondary);
          font-size:12px;
          line-height:1;
          font-variant-numeric:tabular-nums;
        }
        .ni-on .ni-count {
          color:var(--text);
        }
        /* Quiet hover "+" to create a new project from the Projekte row. */
        .ni-wrap { position:relative; margin-bottom:2px; }
        .ni-add {
          position:absolute; right:6px; top:50%; transform:translateY(-50%);
          width:22px; height:22px; display:inline-flex; align-items:center; justify-content:center;
          border:0; border-radius:6px; background:transparent; color:var(--text-muted);
          cursor:pointer; opacity:0; pointer-events:none;
          transition:opacity .12s ease, background .12s ease, color .12s ease;
        }
        .ni-wrap:hover .ni-add { opacity:1; pointer-events:auto; }
        .ni-add:hover { background:var(--surface-2); color:var(--text); }
        /* On the Projekte row the "+" replaces the shortcut chip on hover. */
        .ni-wrap-add:hover .ni[data-shortcut]::after { display:none; }
        .ni[data-shortcut]::after,
        .proj-row[data-shortcut]::after {
          display:none !important;
        }
        .ni-on  { background:var(--nav-on); font-weight:400; color:var(--nav-on-text); }
        [data-theme="dark"] .ni-on { background:var(--nav-on); color:var(--nav-on-text); }
        [data-theme="read"] .ni-on { background:var(--nav-on); color:var(--nav-on-text); }
        .ni-off { color:var(--nav-off-text); }
        [data-theme="light"] .ni-off,
        [data-theme="pure-light"] .ni-off { color:var(--nav-off-text); }
        [data-theme="light"] .sidebar-inner,
        [data-theme="pure-light"] .sidebar-inner { --sb-sidebar-gray:var(--nav-off-text); }
        .ni-off:hover { background:var(--glass-nav-hover, rgba(0,0,0,.035)); color:var(--text); }
        [data-theme="dark"] .ni-off:hover { background:var(--glass-nav-hover, rgba(255,255,255,.06)); }
        [data-theme="read"] .ni-off:hover { background:var(--glass-nav-hover, rgba(0,0,0,.035)); }
        .ni:focus { outline: none; }
        .ni:focus-visible {
          box-shadow: 0 0 0 2px var(--focus-ring, rgba(106, 115, 140, 0.35));
        }
        .sb-section {
          margin: 18px 0 10px;
        }
        .sb-section-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          min-height:20px;
          padding:0 var(--sb-x) 8px;
        }
        .sb-section-head span {
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight:500;
          letter-spacing:0.05em;
          text-transform:uppercase;
          font-size:11px;
          color:#8E8E93;
        }
        .sb-section-head button {
          min-height: 18px;
        }
        .sb-section-head button:active {
          transform: none;
        }
        .sb-section-action {
          opacity: 0;
          pointer-events: none;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .sb-section-head:hover .sb-section-action,
        .sb-section-head:focus-within .sb-section-action {
          opacity: 1;
          pointer-events: auto;
        }

        /* ── Project row ── */
        .sb-subnav {
          width:100%;
          max-width:100%;
          min-width:0;
          overflow:hidden;
          padding-top:2px;
        }
        .proj-row {
          position:relative;
          display:grid;
          grid-template-columns:16px minmax(0, 1fr);
          align-items:center;
          gap:12px;
          min-height:36px;
          padding:0 var(--sb-x);
          border-radius:4px;
          font-size:13px; font-weight:400;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          letter-spacing:0;
          cursor:pointer; text-decoration:none;
          color:var(--nav-off-text);
          transition:background .08s, color .08s;
          overflow:hidden;
          width:100%;
          max-width:100%;
          min-width:0;
          box-sizing:border-box;
          margin:0;
        }
        .proj-row .proj-label {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight:400;
          letter-spacing:0;
        }
        .proj-dot-button {
          width:11px;
          height:11px;
          border-radius:50%;
          background:transparent;
          flex-shrink:0;
          cursor:pointer;
          padding:0;
          outline:none;
          box-sizing:border-box;
        }
        .proj-row:hover { background:var(--glass-nav-hover, rgba(0,0,0,.035)); color:var(--text); }
        [data-theme="dark"] .proj-row:hover { background:var(--glass-nav-hover, rgba(255,255,255,.06)); }
        .proj-row.active { background:var(--nav-on); color:var(--nav-on-text); font-weight:400; }
        .proj-row.proj-new { opacity:.55; transition:opacity .12s; }
        .proj-row.proj-new:hover { opacity:1; background:rgba(0,0,0,0.035); }
        [data-theme="dark"] .proj-row.proj-new:hover { background:rgba(255,255,255,0.05); }
        .proj-row:focus { outline: none; }
        .proj-row:focus-visible {
          box-shadow: 0 0 0 2px var(--focus-ring, rgba(106, 115, 140, 0.35));
        }

        .sb-icon-btn:focus { outline: none; }
        .sb-icon-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--focus-ring, rgba(106, 115, 140, 0.35));
        }
        .sb-topbar {
          display:grid;
          grid-template-columns:minmax(0, 1fr) 28px 28px;
          align-items:center;
          gap:4px;
          padding:0 4px 12px;
          flex-shrink:0;
          min-width:0;
        }
        .sb-topbar .spf-trigger {
          min-height:32px;
        }
        .sb-topbar .spf-trigger svg {
          stroke:var(--sb-sidebar-gray);
          opacity:.72;
        }
        .sb-top-icon {
          width:28px;
          height:28px;
          border-radius:8px;
          display:flex;
          align-items:center;
          justify-content:center;
          color:var(--sb-sidebar-gray);
          background:transparent;
          border:1px solid transparent;
          flex-shrink:0;
        }
        .sb-collapse-icon {
          background:transparent;
          border-color:transparent;
          box-shadow:none;
          color:var(--sb-sidebar-gray);
        }
        [data-theme="dark"] .sb-collapse-icon {
          background:transparent;
          box-shadow:none;
        }
        .sb-top-icon:hover {
          color:var(--text);
          background:var(--glass-nav-hover, rgba(0,0,0,.035));
        }
        [data-theme="dark"] .sb-top-icon:hover { background:var(--glass-nav-hover, rgba(255,255,255,.06)); }
        .sb-bottom-actions {
          position:absolute;
          left:14px;
          right:14px;
          bottom:0;
          width:auto;
          max-width:none;
          padding:8px 0 calc(16px + env(safe-area-inset-bottom, 0px));
          z-index:170;
          display:flex;
          flex-direction:column;
          align-items:stretch;
          gap:10px;
          flex-shrink:0;
        }
        .sb-codex-footer {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          width:100%;
        }
        .sb-footer-settings {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 8px;
          border-radius:4px;
          font-size:13px;
          font-weight:400;
          color:var(--nav-off-text);
          text-decoration:none;
          transition:color .12s ease, background .12s ease;
        }
        .sb-footer-settings:hover {
          color:var(--nav-on-text);
          background:rgba(0,0,0,.035);
        }
        [data-theme="dark"] .sb-footer-settings:hover {
          background:rgba(255,255,255,.06);
        }
        .sb-footer-pill {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:6px 14px;
          border:0;
          border-radius:999px;
          background:rgba(0,0,0,.06);
          color:var(--nav-on-text);
          font:inherit;
          font-size:12.5px;
          font-weight:400;
          cursor:pointer;
          transition:background .12s ease;
        }
        .sb-footer-pill:hover {
          background:rgba(0,0,0,.09);
        }
        [data-theme="dark"] .sb-footer-pill {
          background:rgba(255,255,255,.08);
        }
        [data-theme="dark"] .sb-footer-pill:hover {
          background:rgba(255,255,255,.12);
        }
        .sb-bottom-backdrop {
          position:fixed;
          inset:0;
          /* Stay below the help-pop. The backdrop only catches outside
             clicks; if it sat above the popup (as it did before) every
             menu click hit the backdrop instead, closing the menu
             without firing the row action — and no hover ever landed. */
          z-index:0;
          background:transparent;
        }
        .sb-help-dock {
          display:flex; align-items:center; gap:8px;
          position:relative;
          width:32px;
          /* Lifts the dock + its absolutely-positioned popup above the
             backdrop's stacking neighbour. */
          z-index:2;
        }
        .sb-video-teaser-wrap {
          position:relative;
          width:100%;
          z-index:1;
          filter:none;
        }
        .sb-video-teaser {
          width:100%;
          overflow:hidden;
          display:flex;
          flex-direction:column !important;
          padding:0;
          border:1px solid color-mix(in srgb, var(--border) 42%, transparent);
          border-radius:18px !important;
          background:var(--card) !important;
          color:var(--text);
          text-align:left;
          cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.045);
          min-height:172px;
          transform-origin:left bottom;
          transition:border-color .12s ease, box-shadow .12s ease, background .12s ease;
        }
        .sb-video-teaser:hover {
          transform:none;
          border-color:color-mix(in srgb, var(--border-strong) 58%, transparent);
          box-shadow:0 2px 8px rgba(15,23,42,.07);
        }
        [data-theme="light"] .sb-video-teaser,
        [data-theme="pure-light"] .sb-video-teaser,
        [data-theme="read"] .sb-video-teaser {
          background:color-mix(in srgb, var(--card) 96%, #fff 4%) !important;
          border-color:color-mix(in srgb, var(--border) 74%, transparent);
        }
        .sb-video-thumb {
          position:relative;
          height:94px;
          flex:0 0 94px;
          display:block;
          overflow:hidden;
          background:color-mix(in srgb, var(--surface-2) 76%, #101821 24%);
        }
        .sb-video-thumb::before {
          display:none;
        }
        .sb-video-thumb img {
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          object-fit:cover;
          object-position:center center;
          opacity:1;
          filter:saturate(.92) contrast(1.04);
        }
        /* Crisp brand thumbnail — centered app icon, never stretched/blurred.
           The card's overflow:hidden + radius clips the top corners cleanly. */
        .sb-video-thumb-brand {
          display:flex; align-items:center; justify-content:center;
          background:
            radial-gradient(120% 120% at 30% 0%,
              color-mix(in srgb, #6a738c 18%, var(--card)),
              color-mix(in srgb, var(--surface-2) 82%, var(--card)));
        }
        .sb-video-thumb-brand .sb-video-thumb-mark {
          position:relative;
          inset:auto;
          width:46px; height:46px;
          object-fit:contain;
          border-radius:12px;
          filter:none;
          box-shadow:0 8px 20px -12px rgba(0,0,0,.55);
        }
        .sb-video-thumb::after {
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(180deg, transparent 52%, rgba(0,0,0,.34));
          pointer-events:none;
        }
        .sb-video-code-line {
          position:absolute;
          left:18px;
          height:5px;
          border-radius:999px;
          background:color-mix(in srgb, var(--text-muted) 62%, transparent);
          z-index:1;
        }
        .sb-video-code-line.one { top:24px; width:76px; }
        .sb-video-code-line.two { top:38px; width:52px; opacity:.78; }
        .sb-video-code-line.three { top:52px; width:92px; opacity:.5; }
        .sb-video-play {
          position:absolute;
          right:12px;
          bottom:10px;
          width:28px;
          height:28px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border-radius:999px;
          background:rgba(8,10,14,.82);
          color:#fff;
          box-shadow:0 1px 8px rgba(15,23,42,.14);
          backdrop-filter:blur(8px);
          z-index:2;
        }
        .sb-video-copy {
          min-height:78px;
          display:flex;
          flex-direction:column;
          justify-content:center;
          gap:5px;
          padding:12px 14px 14px;
          background:color-mix(in srgb, var(--card) 94%, var(--surface) 6%) !important;
        }
        .sb-video-copy strong {
          display:block;
          font-size:14px;
          line-height:1.16;
          font-weight:500;
          letter-spacing:0;
          color:var(--text);
          white-space:normal;
        }
        .sb-video-copy span {
          display:block;
          max-width:none;
          font-size:13px;
          line-height:1.18;
          font-weight:500;
          letter-spacing:0;
          color:var(--text-secondary);
          white-space:normal;
        }
        .sb-video-dismiss {
          position:absolute;
          right:8px;
          top:8px;
          width:24px;
          height:24px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:0;
          border-radius:999px;
          color:var(--text-muted);
          background:color-mix(in srgb, var(--card) 84%, transparent);
          cursor:pointer;
          z-index:3;
          opacity:.76;
          transition:background .12s ease, color .12s ease, opacity .12s ease;
        }
        .sb-video-teaser-wrap:hover .sb-video-dismiss,
        .sb-video-dismiss:focus-visible {
          opacity:1;
        }
        .sb-video-dismiss:hover {
          background:color-mix(in srgb, var(--surface-2) 82%, transparent);
          color:var(--text);
        }
        .sb-help-trigger {
          width: 32px; height: 32px; border-radius: 50% !important;
          aspect-ratio:1;
          overflow:hidden !important;
          clip-path:circle(50% at 50% 50%);
          display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid color-mix(in srgb, var(--border) 48%, transparent);
          background: color-mix(in srgb, var(--surface-2) 36%, transparent);
          color: var(--text-secondary);
          cursor: pointer;
          transition: color .12s, background .12s, border-color .12s;
          box-shadow:none !important;
          outline:none !important;
          transform:none !important;
        }
        .sb-help-trigger:hover {
          color: var(--text-secondary);
          background: color-mix(in srgb, var(--surface-2) 48%, transparent);
          border-color: color-mix(in srgb, var(--border) 48%, transparent);
          box-shadow:none !important;
          transform:none !important;
        }
        .sb-help-trigger:focus,
        .sb-help-trigger:focus-visible,
        .sb-help-trigger:active {
          outline:none !important;
          box-shadow:none !important;
          transform:none !important;
        }
        .sb-help-trigger[aria-expanded="true"] {
          color: var(--text);
          background: color-mix(in srgb, var(--surface-2) 56%, transparent);
          border-color: color-mix(in srgb, var(--border) 50%, transparent);
        }
        .sb-video-teaser-wrap .sb-video-teaser {
          width:100% !important;
          min-height:172px !important;
          display:flex !important;
          flex-direction:column !important;
          align-items:stretch !important;
          border-radius:18px !important;
          background:var(--card) !important;
          color:var(--text) !important;
        }
        .sb-video-teaser-wrap .sb-video-thumb {
          display:block !important;
          width:100% !important;
          height:94px !important;
          flex:0 0 94px !important;
        }
        .sb-video-teaser-wrap .sb-video-copy {
          width:100% !important;
          min-height:78px !important;
          background:color-mix(in srgb, var(--card) 94%, var(--surface) 6%) !important;
        }
        .sb-help-dock .sb-help-trigger {
          border-radius:50% !important;
          width:32px !important;
          height:32px !important;
          min-width:32px !important;
          min-height:32px !important;
          aspect-ratio:1 !important;
          overflow:hidden !important;
          clip-path:circle(50% at 50% 50%) !important;
        }

        /* ── "Mehr" trigger + popover ─────────────────────────────── */
        .sb-more-wrap { position: relative; }
        .sb-more-trigger {
          width: 100%; min-height: 28px;
          display: flex; align-items: center; gap: 8px;
          padding: 0 10px;
          background: transparent; border: 0; cursor: pointer;
          color: var(--text-muted);
          font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .02em;
          border-radius: 4px;
          margin-top: 1px;
          transition: background .12s, color .12s;
        }
        .sb-more-trigger:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }
        .sb-more-icon {
          width: 22px; display: inline-flex; align-items: center; justify-content: center;
          color: var(--text-muted);
        }
        .sb-more-label { flex: 1; text-align: left; }
        .sb-more-backdrop {
          position: fixed; inset: 0; z-index: 120000;
          background: transparent;
        }
        .sb-more-pop {
          /* position:fixed + coords are set inline so the menu escapes the
             scroll container and never gets clipped. */
          width: 232px; z-index: 121000;
          padding: 6px;
          border-radius: 4px;
          border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
          background: color-mix(in srgb, var(--card) 98%, #fff 2%);
          box-shadow:
            0 1px 2px rgba(15,23,42,.06),
            0 18px 44px -20px rgba(15,23,42,.36);
          animation: sbHelpIn .14s cubic-bezier(.16,1,.3,1) both;
          display: flex; flex-direction: column; gap: 1px;
        }
        [data-theme="dark"] .sb-more-pop,
        [data-theme="classic-dark"] .sb-more-pop {
          background: color-mix(in srgb, var(--card) 94%, #fff 6%);
          box-shadow:
            0 1px 2px rgba(0,0,0,.45),
            0 24px 60px -22px rgba(0,0,0,.6);
        }
        .sb-more-item {
          width: 100%; min-height: 32px;
          padding: 0 10px;
          display: flex; align-items: center; gap: 9px;
          background: transparent; border: 0;
          color: var(--text);
          font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .02em;
          text-decoration: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background .1s;
        }
        .sb-more-item:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        .sb-more-item svg { color: var(--text-muted); flex-shrink: 0; }
        .sb-more-divider {
          height: 1px; margin: 4px 6px;
          background: color-mix(in srgb, var(--border) 70%, transparent);
        }

        .sb-help-pop {
          /* Fixed so it escapes the sidebar's overflow:hidden and is never
             clipped on the right (it's wider than the 212px rail). */
          position: fixed; left: 16px; bottom: 58px;
          z-index: 121000;
          width: min(318px, calc(100vw - 32px));
          max-height: min(520px, calc(100dvh - 96px));
          overflow:auto;
          scrollbar-width:none;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
          background: color-mix(in srgb, var(--card) 98%, #fff 2%);
          box-shadow:
            0 1px 2px rgba(15,23,42,.06),
            0 18px 44px -20px rgba(15,23,42,.36);
          animation: sbHelpIn .14s cubic-bezier(.16,1,.3,1) both;
        }
        .sb-help-pop::-webkit-scrollbar { display:none; }
        [data-theme="dark"] .sb-help-pop,
        [data-theme="classic-dark"] .sb-help-pop {
          background: color-mix(in srgb, var(--card) 94%, #fff 6%);
          box-shadow:
            0 1px 2px rgba(0,0,0,.45),
            0 24px 60px -22px rgba(0,0,0,.6);
        }
        @keyframes sbHelpIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: none; } }

        .sb-help-list { display: flex; flex-direction: column; gap: 2px; }
        .sb-help-item {
          width: 100%;
          display: grid; grid-template-columns: 24px minmax(0, 1fr) max-content; gap: 11px;
          align-items: center;
          min-height: 34px;
          padding: 0 10px;
          border: 0; background: transparent;
          border-radius: 8px !important;
          color: var(--text);
          text-decoration: none;
          font: inherit;
          text-align: left;
          cursor: pointer;
          transition: background .12s ease, color .12s ease;
        }
        .sb-help-item:hover {
          background: color-mix(in srgb, var(--surface-2) 76%, transparent);
          color: var(--text);
        }
        .sb-help-item:active { background: color-mix(in srgb, var(--surface-2) 92%, transparent); }
        .sb-help-item:focus,
        .sb-help-item:focus-visible { outline:none; }
        .sb-help-icon {
          width: 22px; height: 22px; border-radius: 7px;
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
        }
        .sb-help-item:hover .sb-help-icon {
          color: var(--text);
        }
        .sb-help-title {
          min-width: 0;
          font-size: 13.5px; font-weight: 500; letter-spacing: .02em;
          color: var(--text);
          white-space: nowrap;
        }
        .sb-help-shortcut {
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: .02em;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .sb-help-section-title {
          margin: 12px 10px 6px;
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: .02em;
          color: var(--text-secondary);
        }
        .sb-help-news-list {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .sb-help-news-list::before {
          content: "";
          position: absolute;
          left: 20px;
          top: 16px;
          bottom: 16px;
          border-left: 1px dashed color-mix(in srgb, var(--border-strong) 62%, transparent);
          opacity: .55;
        }
        .sb-help-news-item {
          width: 100%;
          min-height: 32px;
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          padding: 0 10px;
          border: 0;
          border-radius: 4px;
          background: transparent;
          color: var(--text);
          text-align: left;
          text-decoration: none;
          font-family: inherit;
          cursor: pointer;
          transition: background .12s ease;
          position: relative;
        }
        .sb-help-news-item:hover {
          background: color-mix(in srgb, var(--surface-2) 76%, transparent);
        }
        .sb-help-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--text);
          justify-self: center;
          position: relative;
          z-index: 1;
        }
        .sb-help-news-label {
          min-width: 0;
          white-space: nowrap;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: .02em;
        }
        .sb-video-modal-layer {
          position:fixed;
          inset:0;
          z-index:12600;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
        }
        .sb-video-modal-backdrop {
          position:absolute;
          inset:0;
          border:0;
          background:rgba(15,23,42,.34);
          cursor:default;
        }
        .sb-video-modal {
          position:relative;
          z-index:1;
          width:min(760px, calc(100vw - 40px));
          max-height:calc(100dvh - 48px);
          overflow:hidden;
          display:flex;
          flex-direction:column;
          border-radius:18px;
          border:1px solid color-mix(in srgb, var(--border) 34%, transparent);
          background:var(--card);
          color:var(--text);
          box-shadow:0 32px 100px rgba(15,23,42,.24);
          animation:sbVideoModalIn .2s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes sbVideoModalIn {
          from { opacity:0; transform:translateY(10px) scale(.985); }
          to { opacity:1; transform:none; }
        }
        .sb-video-modal-head {
          height:54px;
          display:grid;
          grid-template-columns:1fr auto 1fr;
          align-items:center;
          padding:0 20px;
          border-bottom:0;
          color:var(--text-muted);
          font-size:18px;
          letter-spacing:0;
          flex-shrink:0;
        }
        .sb-video-modal-head strong {
          display:inline-flex;
          align-items:center;
          gap:6px;
          justify-self:center;
          color:var(--text);
          font-size:17px;
          font-weight:500;
        }
        .sb-video-modal-head button {
          justify-self:end;
          width:34px;
          height:34px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:0;
          border-radius:50% !important;
          background:transparent;
          color:var(--text-muted);
          cursor:pointer;
          overflow:hidden;
        }
        .sb-video-modal-head button:hover {
          background:color-mix(in srgb, var(--surface-2) 76%, transparent);
          color:var(--text);
        }
        .sb-video-modal-body {
          overflow:auto;
          padding:46px 44px 56px;
        }
        .sb-video-modal-body h1 {
          margin:0 0 32px;
          font-size:31px;
          line-height:1.15;
          font-weight:500;
          letter-spacing:0;
          color:var(--text);
        }
        .sb-video-stage {
          overflow:hidden;
          width:100%;
          aspect-ratio:16 / 9;
          border-radius:3px;
          background:var(--surface-2);
          box-shadow:0 16px 44px rgba(15,23,42,.12);
        }
        .sb-video-stage-placeholder {
          position:relative;
          width:100%;
          height:100%;
          overflow:hidden;
          background:#101821;
        }
        .sb-video-stage-image {
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          object-fit:cover;
          opacity:.96;
        }
        .sb-stage-grid {
          position:absolute;
          inset:-18% -8%;
          background:
            repeating-linear-gradient(0deg, color-mix(in srgb, var(--border) 68%, transparent) 0 1px, transparent 1px 28px),
            repeating-linear-gradient(90deg, color-mix(in srgb, var(--border) 54%, transparent) 0 1px, transparent 1px 44px);
          transform:perspective(600px) rotateX(54deg) translateY(20%);
          opacity:.55;
        }
        .sb-stage-card {
          position:absolute;
          border-radius:18px;
          border:1px solid color-mix(in srgb, var(--border) 75%, transparent);
          background:color-mix(in srgb, var(--card) 74%, transparent);
          box-shadow:0 18px 60px rgba(15,23,42,.12);
          transform:rotate(-7deg);
        }
        .sb-stage-card.one {
          width:46%;
          height:34%;
          left:12%;
          top:23%;
        }
        .sb-stage-card.two {
          width:52%;
          height:26%;
          right:10%;
          bottom:18%;
          opacity:.72;
        }
        .sb-stage-play {
          position:absolute;
          left:50%;
          top:50%;
          transform:translate(-50%, -50%);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:78px;
          height:78px;
          border-radius:999px;
          background:color-mix(in srgb, var(--card) 88%, transparent);
          color:var(--text);
          box-shadow:0 8px 32px rgba(15,23,42,.18);
          backdrop-filter:blur(12px);
        }
        .sb-stage-label {
          position:absolute;
          left:20px;
          bottom:18px;
          color:var(--text-muted);
          font-size:13px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .sb-video-copy-block {
          margin:42px 0 40px;
          display:flex;
          flex-direction:column;
          gap:18px;
        }
        .sb-video-copy-block p {
          margin:0;
          max-width:650px;
          font-size:19px;
          line-height:1.42;
          font-weight:400;
          letter-spacing:0;
          color:var(--text);
        }
        .sb-video-feature-card {
          overflow:hidden;
          border-radius:4px;
          background:var(--surface);
          border:1px solid color-mix(in srgb, var(--border) 28%, transparent);
        }
        .sb-video-feature-visual {
          position:relative;
          height:250px;
          overflow:hidden;
          background:
            radial-gradient(circle at 32% 38%, color-mix(in srgb, var(--accent, #14b8a6) 15%, transparent), transparent 26%),
            linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 90%, var(--card)), var(--card) 58%);
        }
        .sb-video-feature-visual span {
          position:absolute;
          height:22px;
          border-radius:999px;
          background:color-mix(in srgb, var(--text) 8%, transparent);
          transform:rotate(-9deg);
        }
        .sb-video-feature-visual span:nth-child(1) { width:58%; left:16%; top:32%; }
        .sb-video-feature-visual span:nth-child(2) { width:44%; left:24%; top:48%; opacity:.68; }
        .sb-video-feature-visual span:nth-child(3) { width:52%; left:34%; top:62%; opacity:.42; }
        .sb-video-feature-card > div:last-child {
          padding:26px 32px 30px;
        }
        .sb-video-feature-card h2 {
          margin:0 0 10px;
          font-size:23px;
          font-weight:500;
          letter-spacing:0;
          color:var(--text);
        }
        .sb-video-feature-card p {
          margin:0;
          max-width:560px;
          font-size:18px;
          line-height:1.45;
          color:var(--text-muted);
        }
        .sb-nav-scroll {
          flex:1 1 auto;
          min-height:0;
          overflow-y:auto;
          overflow-x:hidden;
          scrollbar-width:none;
          padding-bottom:240px;
          overscroll-behavior:contain;
        }
        .sb-nav-scroll::-webkit-scrollbar {
          display:none;
        }
        .sb-pill-action,
        .sb-square-action {
          min-height:42px;
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--card) 92%, transparent);
          color:var(--text);
          border-radius:18px;
          display:flex;
          align-items:center;
          justify-content:center;
          text-decoration:none;
          box-shadow:0 0 0 1px rgba(255,255,255,.02);
        }
        .sb-pill-action {
          gap:9px;
          padding:0 13px;
          font-size:13px;
          font-weight:660;
          letter-spacing:.02em;
        }
        .sb-square-action {
          color:var(--text-secondary);
          font-size:12px;
          font-weight:720;
          letter-spacing:.02em;
        }
        .sb-pill-action:hover,
        .sb-square-action:hover {
          background:var(--hover);
          border-color:var(--border-strong);
        }

        /* ── Tagro Monitoring Capsule — single-line ── */
        .sb-monitor-capsule {
          display:inline-flex; align-items:center; gap:7px;
          min-height:34px;
          padding:0 12px;
          border:0;
          background:#fff;
          border-radius:14px;
          text-decoration:none;
          color:var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.06);
          backdrop-filter:blur(18px) saturate(160%);
          -webkit-backdrop-filter:blur(18px) saturate(160%);
          transition:background .12s, color .12s, transform .12s ease, box-shadow .12s ease;
        }
        .sb-monitor-capsule--single { width:auto; max-width:100%; justify-content:flex-start; }
        .sb-monitor-capsule:hover {
          background:#fff;
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 3px 9px rgba(15,23,42,.07);
          transform:translateY(-1px);
        }
        [data-theme="dark"] .sb-monitor-capsule,
        [data-theme="classic-dark"] .sb-monitor-capsule {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 2px 7px rgba(0,0,0,.16);
        }
        [data-theme="dark"] .sb-monitor-capsule:hover,
        [data-theme="classic-dark"] .sb-monitor-capsule:hover {
          background:color-mix(in srgb, var(--surface) 88%, #fff 12%);
          box-shadow:0 1px 2px rgba(0,0,0,.32), 0 3px 9px rgba(0,0,0,.2);
        }
        .sb-monitor-dot {
          width:8px; height:8px; border-radius:50%;
          flex-shrink:0;
          box-shadow:0 0 0 4px color-mix(in srgb, currentColor 10%, transparent);
        }
        .sb-monitor-line {
          font-size:12px; font-weight:500; letter-spacing:.02em;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          color:var(--text);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          min-width:0;
        }

        /* ── User dropdown row ── */
        .usr-row {
          display:flex; align-items:center; gap:9px;
          padding:9px 12px; border-radius:14px;
          cursor:pointer; transition:background .08s;
          width:100%; border:none; font-family:inherit;
          background:transparent; text-decoration:none; color:var(--text);
          font-size:12.5px; font-weight:500;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          letter-spacing:.02em;
        }
        .usr-row:hover { background:var(--hover); }

        /* ── Mobile bar — Sana-style floating icon dock ── */
        .mob-bar {
          position:fixed; bottom:calc(12px + var(--safe-bottom));
          left:50%; transform:translateX(-50%);
          width:calc(100% - 32px); max-width:360px;
          background:rgba(242,242,247,0.88);
          backdrop-filter:blur(24px) saturate(180%);
          -webkit-backdrop-filter:blur(24px) saturate(180%);
          border:1px solid rgba(0,0,0,0.06);
          box-shadow:0 4px 24px rgba(0,0,0,0.08);
          border-radius:999px; z-index:200;
          align-items:center; padding:6px 14px; gap:0;
        }
        [data-theme="dark"] .mob-bar {
          background:rgba(28,28,30,0.88);
          border:1px solid rgba(255,255,255,0.08);
          box-shadow:0 4px 32px rgba(0,0,0,0.48);
        }
        .mt  { display:flex; flex-direction:column; align-items:center; gap:0; flex:1; min-height:48px; justify-content:center; cursor:pointer; text-decoration:none; border:none; background:transparent; font-family:inherit; -webkit-tap-highlight-color:transparent; transition:transform .1s; }
        .mt:active { transform:scale(.88); }
        .mti { width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:999px; transition:background .12s; }
        .mt.on .mti  { background:var(--nav-on); }
        .mt.has-avatar .mti { background:transparent !important; }
        .ml { display:none; }
        .mob-fab { width:52px; height:52px; border-radius:50%; background:var(--btn-prim); color:var(--btn-prim-text); display:flex; align-items:center; justify-content:center; margin:-4px 10px; box-shadow:0 4px 16px rgba(0,0,0,.18); border:none; cursor:pointer; transition:transform .15s ease,background .15s; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
        .mob-fab:active { transform:scale(.88); }
        .mob-fab.open { background:var(--surface-2); color:var(--text); box-shadow:inset 0 0 0 1px var(--border); }
        [data-theme="dark"] .mob-fab { box-shadow:0 4px 20px rgba(0,0,0,.42); }
        .mbd { position:fixed; inset:0; z-index:198; background:var(--modal-backdrop, rgba(245, 245, 247, 0.72)); backdrop-filter:none; -webkit-backdrop-filter:none; }
        .mob-quick { position:fixed; bottom:calc(96px + var(--safe-bottom)); left:50%; transform:translateX(-50%); width:calc(100% - 32px); max-width:340px; max-height:calc(100vh - 180px); overflow-y:auto; -webkit-overflow-scrolling:touch; z-index:199; display:flex; flex-direction:column; gap:6px; animation:mqUp .2s cubic-bezier(.16,1,.3,1) both; }
        .mob-quick::-webkit-scrollbar { display:none; }
        @keyframes mqUp { from{opacity:0;transform:translateX(-50%) translateY(18px);}to{opacity:1;transform:translateX(-50%) translateY(0);} }
        .mqi { display:flex; align-items:center; gap:14px; padding:14px 18px; background:var(--card); border:1px solid var(--border); border-radius:24px; text-decoration:none; color:inherit; -webkit-tap-highlight-color:transparent; transition:background .1s; }
        .mqi:active { background:var(--hover); }
        .mqi.primary-action { background:var(--btn-prim); border-color:transparent; }
        .mqi.primary-action .mqi-label { color:var(--btn-prim-text); }
        .mqi.primary-action .mqi-ico { background:rgba(0,0,0,.12); color:var(--btn-prim-text); }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <aside className="sidebar" style={{ pointerEvents:'none' }}>
        <div className="sidebar-inner" style={{ pointerEvents:'all', padding:'16px 14px 0', display:'flex', flexDirection:'column', position:'fixed' }}>

          <div className="sb-topbar">
            <SidebarProfileFooter
              avatarColor={avBg}
              avatarUrl={avatar}
              displayName={name}
              workspaceName={workspaceLabel}
              email={email}
              initials={init}
              isClient={isClient}
              members={members}
              onAvatarColorChange={changeAvatarColor}
              onLogout={logout}
              plan={plan}
            />
            <button
              className="sb-icon-btn sb-top-icon"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              title="Suchen"
              aria-label="Suchen"
            >
              <Ico name="search" sz={14} c="currentColor" weight="regular" />
            </button>
            {onCollapse && (
              <button
                className="sb-icon-btn sb-top-icon sb-collapse-icon"
                type="button"
                onClick={onCollapse}
                title="Sidebar einklappen"
                aria-label="Sidebar einklappen"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="14" rx="3" />
                  <path d="M9 5v14" />
                </svg>
              </button>
            )}
          </div>

          {/* Scrollable nav */}
          <div className="sb-nav-scroll">

            <div style={{ marginBottom:8 }}>
              <NavItems items={topNav} />
            </div>

            <div>
              <Section
                label="Persönlicher Bereich"
                expanded={workspaceExp}
                onToggle={() => setWorkspaceExp(v => !v)}
              >
                <NavItems items={coreNav} />
                {workspaceExp && (
                  <div className="sb-more-wrap">
                    <button
                      ref={moreTriggerRef}
                      type="button"
                      className="sb-more-trigger"
                      onClick={openMore}
                      aria-haspopup="menu"
                      aria-expanded={moreOpen}
                    >
                      <span className="sb-more-icon"><DotsThreeOutline size={14} weight="bold" /></span>
                      <span className="sb-more-label">Mehr</span>
                    </button>
                    {moreOpen && (
                      <>
                        <div className="sb-more-backdrop" onClick={() => setMoreOpen(false)} />
                        <div
                          className="sb-more-pop"
                          role="menu"
                          aria-label="Mehr"
                          style={{ position: 'fixed', left: morePos.left, top: morePos.top }}
                        >
                          {/* Neues Projekt — always reachable, even with one project. */}
                          <Link
                            href="/projects?new=1"
                            role="menuitem"
                            className="sb-more-item"
                            onClick={() => setMoreOpen(false)}
                          >
                            <Ico name="plus" sz={14} c="currentColor" weight="regular" />
                            <span>Neues Projekt anlegen</span>
                          </Link>
                          <div className="sb-more-divider" />
                          {/* Mitglieder — workspace team management. */}
                          <Link
                            href="/members"
                            role="menuitem"
                            className="sb-more-item"
                            onClick={() => setMoreOpen(false)}
                          >
                            <IdentificationBadge size={14} />
                            <span>Mitglieder</span>
                          </Link>
                          {/* Kunden — agency-mode client management. Always present. */}
                          <Link
                            href="/clients"
                            role="menuitem"
                            className="sb-more-item"
                            onClick={() => setMoreOpen(false)}
                          >
                            <Ico name="team" sz={14} c="currentColor" weight="regular" />
                            <span>Kunden</span>
                          </Link>
                          {/* Mitwirkende — separate from clients: invite contributors. */}
                          <Link
                            href="/observers"
                            role="menuitem"
                            className="sb-more-item"
                            onClick={() => setMoreOpen(false)}
                          >
                            <UsersThree size={14} />
                            <span>Mitwirkende</span>
                          </Link>
                          {moreItems.map((item) => {
                            const Icon = ICONS[item.icon] ?? FolderSimple
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                role="menuitem"
                                className="sb-more-item"
                                onClick={() => setMoreOpen(false)}
                              >
                                <Icon size={14} />
                                <span>{item.label}</span>
                              </Link>
                            )
                          })}
                          <div className="sb-more-divider" />
                          <button
                            type="button"
                            role="menuitem"
                            className="sb-more-item"
                            onClick={() => { setMoreOpen(false); setCustomizeOpen(true) }}
                          >
                            <GearSix size={14} />
                            <span>Sidebar anpassen</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Section>
            </div>

            {observedProjects.length > 0 && (
              <div>
                <Section
                  label="Beobachtete Projekte"
                  expanded={observedExp}
                  onToggle={() => setObservedExp(v => !v)}
                >
                  <div className="sb-subnav">
                    {observedProjects.map((p, projectIndex) => {
                      const on = pathname === `/project/${p.id}`
                      const dot = p.color || '#64748b'
                      return (
                        <Link key={p.id} href={`/project/${p.id}`} className={`proj-row ${on?'active':''}`} data-shortcut={projectShortcut(projectIndex)}>
                          <span className="proj-dot-button" style={{ border:`2px solid ${dot}`, background:'transparent', cursor:'default' }} />
                          <span className="proj-label">{p.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                </Section>
              </div>
            )}

            <div>
              <Section
                label={wsMode === 'agency' ? 'Kunden-Teams' : 'Teams'}
                expanded={teamsExp}
                onToggle={() => setTeamsExp(v => !v)}
              >
                <NavItems items={teamsNav} />
              </Section>
            </div>

            <div>
              <Section
                label="Tagro AI"
                expanded={tagroExp}
                onToggle={() => setTagroExp(v => !v)}
              >
                <NavItems items={tagroNav} />
              </Section>
            </div>

            <div>
              <Section
                label="Tools"
                expanded={toolsExp}
                onToggle={() => setToolsExp(v => !v)}
              >
                <NavItems items={toolsNav} />
              </Section>
            </div>

          </div>

          <div className="sb-bottom-actions">
            {whatsNewOpen && typeof document !== 'undefined'
              ? createPortal(
                  <div
                    onClick={() => setWhatsNewOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 120999 }}
                  />,
                  document.body,
                )
              : null}
            {videoTeaserVisible ? (
              <div className="sb-video-teaser-wrap">
                <button
                  type="button"
                  className="sb-video-teaser"
                  onClick={() => {
                    setWhatsNewOpen(false)
                    setVideoModalOpen(true)
                  }}
                  aria-label="So funktioniert Festag öffnen"
                >
                  <span className="sb-video-thumb sb-video-thumb-brand" aria-hidden>
                    <img src="/brand/favicon.svg?v=20260724-split-mark" alt="" className="sb-video-thumb-mark" />
                  </span>
                  <span className="sb-video-copy">
                    <strong>So funktioniert Festag</strong>
                    <span>15-Sekunden-Überblick</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="sb-video-dismiss"
                  aria-label="Video-Hinweis schließen"
                  onClick={() => setVideoTeaserVisible(false)}
                >
                  <X size={15} />
                </button>
              </div>
            ) : null}
            <SidebarExtensionPromo variant="codex" />
            <SidebarExtensionInstalledBadge />
            <div className="sb-codex-footer">
              <Link href="/settings" className="sb-footer-settings">
                <GearSix size={16} weight="regular" />
                <span>Einstellungen</span>
              </Link>
              <div className="sb-help-dock" style={{ position:'relative', width:'auto', zIndex:2 }}>
                {whatsNewOpen && typeof document !== 'undefined' ? createPortal((
                  <div className="sb-help-pop" role="menu" aria-label="Hilfe und Einführung">
                    <div className="sb-help-list">
                      {HELP_ITEMS.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.title}
                            type="button"
                            className="sb-help-item"
                            role="menuitem"
                            onClick={() => { void handleHelpItem(item) }}
                          >
                            <span className="sb-help-icon">
                              <Icon size={15} weight="regular" />
                            </span>
                            <span className="sb-help-title">{item.title}</span>
                            {item.shortcut ? <span className="sb-help-shortcut">{item.shortcut}</span> : null}
                          </button>
                        )
                      })}
                      <div className="sb-help-section-title">Was ist neu</div>
                      <div className="sb-help-news-list" role="group" aria-label="Was ist neu">
                        {HELP_NEWS_ITEMS.map((item) => (
                          <button
                            key={item.title}
                            type="button"
                            className="sb-help-news-item"
                            onClick={() => {
                              setWhatsNewOpen(false)
                              router.push(item.href)
                            }}
                          >
                            <span className="sb-help-dot" />
                            <span className="sb-help-news-label">{item.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ), document.body) : null}
                <button
                  type="button"
                  className="sb-footer-pill"
                  aria-label="Hilfe & Einführung öffnen"
                  aria-expanded={whatsNewOpen}
                  onClick={() => setWhatsNewOpen((value) => !value)}
                >
                  Hilfe
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ══ MOBILE FLOATING NAV BAR ══
          Hidden when the user is in an object/content context — those routes
          use the 2-button TagroMobileBar instead (Statusbericht + Mit Tagro
          bearbeiten). Top-level list pages still get the 5-button nav. */}
      {!(
        pathname === '/dashboard' ||
        pathname.startsWith('/project/') ||
        pathname.startsWith('/projects/') && pathname.split('/').length >= 4 ||
        /^\/tasks\/[^/]+$/.test(pathname) ||
        /^\/clients\/[^/]+$/.test(pathname) ||
        pathname.startsWith('/reports/') ||
        pathname.startsWith('/documents/') ||
        pathname.startsWith('/decisions/')
      ) && (
      <nav className="bottom-nav mob-bar">
        {mobPrimary.slice(0,2).map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'}`}>
              <div className="mti"><Ico name={item.icon} sz={21} c={on?'var(--text)':'var(--text-muted)'} weight={on?'bold':'regular'}/></div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}
        <button
          className={`mob-fab ${actionSheetOpen?'open':''}`}
          onClick={() => setActionSheetOpen(v => !v)}
          aria-label="Schnellaktion"
          aria-expanded={actionSheetOpen}
        >
          {actionSheetOpen
            ? <Ico name="close" sz={20} c="var(--btn-prim-text)" weight="bold" />
            : <Ico name="plus"  sz={22} c="var(--btn-prim-text)" weight="regular" />
          }
        </button>
        {mobPrimary.slice(2).map(item => {
          const on      = isOn(item.href)
          // "Mehr" opens the pop-up sheet with everything else — it is not a
          // page of its own on mobile (matches the ⋯ more-menu pattern).
          if (item.href === '/more') {
            return (
              <button
                key={item.href}
                type="button"
                className={`mt ${more?'on':'off'}`}
                onClick={() => setMore(v => !v)}
                aria-haspopup="menu"
                aria-expanded={more}
              >
                <div className="mti"><Ico name="more" sz={21} c={more?'var(--text)':'var(--text-muted)'} weight={more?'bold':'regular'}/></div>
                <span className="ml">Mehr</span>
              </button>
            )
          }
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'}`}>
              <div className="mti">
                <Ico name={item.icon} sz={21} c={on?'var(--text)':'var(--text-muted)'} weight={on?'bold':'regular'}/>
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      )}

      {/* Mobile context-aware action sheet (FAB target) */}
      {(() => {
        const sheetCtx = mobileFabTitle({ pathname })
        return (
          <MobileActionSheet
            open={actionSheetOpen}
            onClose={() => setActionSheetOpen(false)}
            title={sheetCtx.title}
            subtitle={sheetCtx.subtitle}
            items={mobileFabActions({ pathname })}
          />
        )
      })()}

      {more && (
        <>
          <div className="mbd" onClick={() => setMore(false)} />
          <div className="mob-quick">
            <Link href={mobQuick[0].href} className="mqi primary-action" onClick={() => setMore(false)}>
              <div className="mqi-ico" style={{ width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'rgba(0,0,0,.14)' }}>
                <Ico name={mobQuick[0].icon} sz={18} c="var(--btn-prim-text)" weight="regular"/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p className="mqi-label" style={{ fontSize:15,fontWeight:700,margin:'0 0 1px',color:'var(--btn-prim-text)' }}>{mobQuick[0].label}</p>
                <p style={{ fontSize:11.5,margin:0,color:'var(--btn-prim-text)',opacity:.65 }}>{isDev?'Jobs ansehen →':'Projekt starten →'}</p>
              </div>
            </Link>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {mobQuick.slice(1).map(item => {
                const on = isOn(item.href)
                return (
                  <Link key={item.href} href={resolve(item.href)} className="mqi" onClick={() => setMore(false)}
                    style={{ borderRadius:14, gap:10, padding:'12px 13px' }}>
                    <div style={{ width:34,height:34,borderRadius:10,background:on?'var(--text)':'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <Ico name={item.icon} sz={16} c={on?'var(--bg)':'var(--text-secondary)'} weight="regular"/>
                    </div>
                    <span className="mqi-label" style={{ fontSize:13,fontWeight:on?700:600,color:'var(--text)',lineHeight:1.25 }}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:2 }}>
              <button onClick={logout} style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,fontSize:13,fontWeight:600,color:'var(--text-muted)',cursor:'pointer',fontFamily:'inherit' }}>
                <Ico name="logout" sz={15} c="currentColor" weight="regular"/>Abmelden
              </button>
              <Link href="/settings" onClick={() => setMore(false)}
                style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,fontSize:13,fontWeight:600,color:'var(--text)',textDecoration:'none' }}>
                <Ico name="settings" sz={15} c="currentColor" weight="regular"/>Einstellungen
              </Link>
            </div>
          </div>
        </>
      )}

      {videoModalOpen ? (
        <div className="sb-video-modal-layer" role="dialog" aria-modal="true" aria-label="So funktioniert Festag">
          <button
            type="button"
            className="sb-video-modal-backdrop"
            aria-label="Dialog schließen"
            onClick={() => setVideoModalOpen(false)}
          />
          <article className="sb-video-modal">
            <header className="sb-video-modal-head">
              <span>Jun 1</span>
              <strong>Festag Guide <ArrowSquareOut size={15} weight="bold" /></strong>
              <button type="button" onClick={() => setVideoModalOpen(false)} aria-label="Schließen">
                <X size={20} />
              </button>
            </header>

            <div className="sb-video-modal-body">
              <h1>So funktioniert Festag</h1>

              <div className="sb-video-stage">
                <ProjectCreationIntroAnimation variant="stage" />
              </div>

              <section className="sb-video-copy-block">
                <p>
                  Festag sammelt Projekt-Signale, übersetzt sie in klare Briefings und zeigt dir,
                  was wirklich passiert: Fortschritt, Risiken, Entscheidungen und nächste Schritte.
                </p>
                <p>
                  Statt jeden Status manuell zusammenzusuchen, bekommst du eine ruhige Übersicht:
                  Projekte, Tasks, Meilensteine und Tagro liegen an einem Ort und bleiben für Kunden
                  verständlich.
                </p>
                <p>
                  Wenn ein Projekt startet, strukturiert Tagro dein Briefing, bereitet Aufgaben vor
                  und hält die Kommunikation so nah am echten Lieferstand wie möglich.
                </p>
              </section>

              <div className="sb-video-feature-card">
                <div className="sb-video-feature-visual" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <h2>Von Rohsignal zu Klarheit</h2>
                  <p>
                    Updates, Entscheidungen und offene Punkte werden in eine Kundensicht übersetzt,
                    damit niemand raten muss, wo das Projekt steht.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      <CustomizeSidebarModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
      />
    </>
  )
}
