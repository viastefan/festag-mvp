'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import SidebarProfileFooter from '@/components/SidebarProfileFooter'
import SupportButton from '@/components/SupportButton'
import TeamsModal from '@/components/TeamsModal'
import {
  House, FolderSimple, Sparkle, ChatCircle, ChartLineUp,
  CreditCard, FileText, UserCircle, GearSix,
  SunHorizon, GridFour, Stack, LinkSimple,
  Plus, CaretRight, DotsThreeOutline, X,
  SignOut, UsersThree, Bell, Briefcase,
  Clock, CheckSquare, Code, FileCode,
  Tray, MagnifyingGlass,
} from '@phosphor-icons/react'
import { autoAvatarColor, avatarInitials } from '@/lib/avatar'
import { broadcastProfileSync, subscribeProfileSync } from '@/lib/profile-sync'

export function projectColor(_id: string, color?: string | null) { return color || 'var(--text-muted)' }

const ICONS: Record<string, React.ElementType> = {
  home: House, project: FolderSimple, sparkle: Sparkle, chat: ChatCircle,
  activity: ChartLineUp, billing: CreditCard, card: CreditCard, doc: FileText,
  user: UserCircle, settings: GearSix, estimate: SunHorizon, grid: GridFour,
  layers: Stack, link: LinkSimple, plus: Plus, chevron: CaretRight,
  more: DotsThreeOutline, close: X, logout: SignOut, team: UsersThree,
  bell: Bell, briefcase: Briefcase, clock: Clock, check: CheckSquare,
  code: Code, task: FileCode, inbox: Tray, search: MagnifyingGlass,
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

const CLIENT_TOP: NavItem[] = [
  { href:'/dashboard', icon:'home', label:'Dashboard' },
  { href:'/relations/messages', icon:'inbox', label:'Inbox' },
]
const CLIENT_CORE: NavItem[] = [
  { href:'/tasks', icon:'task', label:'Aufgaben' },
]
const CLIENT_TEAMS: NavItem[] = [
  { href:'/teams?view=projects', icon:'project', label:'Projekte' },
  { href:'/teams?view=tasks', icon:'task', label:'Aufgaben' },
  { href:'/teams?view=messages', icon:'chat', label:'Nachrichten' },
]
const CLIENT_TAGRO: NavItem[] = [
  { href:'/ai?view=reports', icon:'activity', label:'Statusberichte' },
  { href:'/ai?view=tasks', icon:'task', label:'Tasks' },
  { href:'/ai?view=notes', icon:'card', label:'Notizen' },
  { href:'/ai?view=chat', icon:'chat', label:'Chat' },
]
const CLIENT_TOOLS: NavItem[] = [
  { href:'/estimator',  icon:'estimate', label:'Preisschätzer' },
  { href:'/connectors', icon:'link',     label:'Connectors' },
  { href:'/addons',     icon:'grid',     label:'Add-ons' },
]
const CLIENT_MOB_PRIMARY: NavItem[] = [
  { href:'/dashboard',       icon:'home',    label:'Home' },
  { href:'/project/current', icon:'project', label:'Projekt' },
  { href:'/ai',              icon:'sparkle', label:'AI' },
  { href:'/settings',        icon:'user',    label:'Profil' },
]
const CLIENT_MOB_QUICK = [
  { href:'/new-project', icon:'plus',     label:'Neues Projekt', primary: true },
  { href:'/messages',    icon:'chat',     label:'Nachrichten' },
  { href:'/documents',   icon:'doc',      label:'Dokumente' },
  { href:'/estimator',   icon:'estimate', label:'Preisschätzer' },
  { href:'/addons',      icon:'grid',     label:'Add-ons' },
  { href:'/reports',     icon:'activity', label:'Statusberichte' },
]

const DEV_MAIN: NavItem[] = [
  { href:'/dev',      icon:'home',     label:'Dashboard' },
  { href:'/messages', icon:'chat',     label:'Nachrichten' },
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
  { href:'/messages',     icon:'chat',      label:'Nachrichten' },
  { href:'/dev/tasks',    icon:'task',      label:'Meine Tasks' },
  { href:'/dev/projects', icon:'project',   label:'Projekte' },
  { href:'/dev/time',     icon:'clock',     label:'Zeiterfassung' },
  { href:'/connectors',   icon:'link',      label:'Connectors' },
]

const ROLE_LABEL: Record<string,string> = { client:'Client', dev:'Developer', admin:'Admin' }

export default function Sidebar() {
  const pathname  = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [uid,      setUid]      = useState<string|null>(null)
  const [email,    setEmail]    = useState('')
  const [fn,       setFn]       = useState('')
  const [fullName, setFullName] = useState('')
  const [avatar,   setAvatar]   = useState<string|null>(null)
  const [avatarColor, setAvatarColor] = useState<string|null>(null)
  const [role,     setRole]     = useState('client')
  const [plan,     setPlan]     = useState('free')
  const [projId,   setProjId]   = useState<string|null>(null)
  const [projects, setProjects] = useState<{id:string;title:string;status:string;color:string|null}[]>([])
  const [more, setMore] = useState(false)
  const [workspaceExp, setWorkspaceExp] = useState(true)
  const [projExp, setProjExp] = useState(true)
  const [teamsExp, setTeamsExp] = useState(false)
  const [tagroExp, setTagroExp] = useState(true)
  const [toolsExp, setToolsExp] = useState(false)
  const [teamsOpen,  setTeamsOpen] = useState(false)
  const [colorPickId, setColorPickId] = useState<string|null>(null)

  const isClient = true
  const isDev = false
  const homeHref = '/dashboard'
  const topNav = CLIENT_TOP
  const coreNav = CLIENT_CORE
  const teamsNav = CLIENT_TEAMS
  const tagroNav = CLIENT_TAGRO
  const toolsNav = CLIENT_TOOLS
  const mobPrimary = CLIENT_MOB_PRIMARY
  const mobQuick = CLIENT_MOB_QUICK

  useEffect(() => {
    const handler = () => setTeamsOpen(true)
    window.addEventListener('open-teams-modal', handler)
    return () => window.removeEventListener('open-teams-modal', handler)
  }, [])

  useEffect(() => {
    try {
      const storedProjects = window.localStorage.getItem('sidebar-projects-expanded')
      const storedTeams = window.localStorage.getItem('sidebar-teams-expanded')
      const storedWorkspace = window.localStorage.getItem('sidebar-workspace-expanded')
      const storedTagro = window.localStorage.getItem('sidebar-tagro-expanded')
      const storedTools = window.localStorage.getItem('sidebar-tools-expanded')
      if (storedProjects !== null) setProjExp(storedProjects === 'true')
      if (storedTeams !== null) setTeamsExp(storedTeams === 'true')
      if (storedWorkspace !== null) setWorkspaceExp(storedWorkspace === 'true')
      if (storedTagro !== null) setTagroExp(storedTagro === 'true')
      if (storedTools !== null) setToolsExp(storedTools === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-projects-expanded', String(projExp)) } catch {}
  }, [projExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-workspace-expanded', String(workspaceExp)) } catch {}
  }, [workspaceExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-teams-expanded', String(teamsExp)) } catch {}
  }, [teamsExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-tagro-expanded', String(tagroExp)) } catch {}
  }, [tagroExp])

  useEffect(() => {
    try { window.localStorage.setItem('sidebar-tools-expanded', String(toolsExp)) } catch {}
  }, [toolsExp])

  useEffect(() => {
    setMore(false)
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUid(data.user.id)
      setEmail(data.user.email ?? '')
      const { data: p } = await sb.from('profiles').select('first_name,full_name,avatar_url,avatar_color,role,plan').eq('id', data.user.id).single()
      if (p) {
        setFn((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setFullName((p as any).full_name ?? '')
        setAvatar((p as any).avatar_url ?? null)
        setAvatarColor((p as any).avatar_color ?? null)
        setRole((p as any).role ?? 'client')
        setPlan((p as any).plan ?? 'free')
      }
    })
    createClient().from('projects').select('id,title,status,color').order('created_at',{ascending:false}).limit(12).then(({ data }) => {
      const list = (data as any[]) ?? []
      setProjects(list)
      // Find active project for sub-nav links, but keep section collapsed
      if (list.length) {
        const prio: Record<string,number> = { active:0,testing:1,planning:2,intake:3,done:4 }
        setProjId([...list].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
      }
    })
  }, [pathname])

  useEffect(() => {
    return subscribeProfileSync((payload) => {
      if (payload.firstName !== undefined) setFn(payload.firstName ?? '')
      if (payload.fullName !== undefined) setFullName(payload.fullName ?? '')
      if (payload.avatarUrl !== undefined) setAvatar(payload.avatarUrl ?? null)
      if (payload.avatarColor !== undefined) setAvatarColor(payload.avatarColor ?? null)
      if (payload.plan !== undefined && payload.plan !== null) setPlan(payload.plan)
    })
  }, [])

  const PROJ_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#64748b']

  async function setProjectColor(id: string, color: string) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, color } : p))
    setColorPickId(null)
    await (createClient() as any).from('projects').update({ color }).eq('id', id)
  }

  const logout  = async () => { await createClient().auth.signOut(); window.location.href='/login' }
  const resolve = (h: string) => h==='/project/current'?(projId?`/project/${projId}`:'/dashboard'):h
  const isOn    = (h: string) => {
    const [cleanHref, query] = h.split('?')
    const targetParams = new URLSearchParams(query ?? '')
    const targetView = targetParams.get('view')
    const currentView = searchParams.get('view') || (cleanHref === '/ai' ? 'chat' : null)

    if (targetView) {
      return pathname === cleanHref && currentView === targetView
    }
    if (cleanHref==='/dashboard') return pathname==='/dashboard'
    if (cleanHref==='/dev')       return pathname==='/dev'
    if (cleanHref==='/project/current') return pathname.startsWith('/project/')
    return pathname.startsWith(cleanHref)
  }
  const name = fn || email.split('@')[0] || 'Konto'
  const init = avatarInitials(fn, fullName, email)
  const avBg = avatarColor || autoAvatarColor(uid || email)

  async function changeAvatarColor(c: string) {
    setAvatarColor(c)
    broadcastProfileSync({ avatarColor: c })
    if (!uid) return
    try { await (createClient() as any).from('profiles').update({ avatar_color: c }).eq('id', uid) } catch {}
  }

  // ── NavItems list (no section header) ──
  function NavItems({ items }: { items: NavItem[] }) {
    return (
      <>
        {items.map(item => {
          const on = isOn(item.href)
          return (
            <Link key={`${item.href}-${item.label}`} href={resolve(item.href)} className={`ni ${on?'ni-on':'ni-off'}`}>
              <Ico name={item.icon} sz={14} c={on?'var(--text)':'var(--text-muted)'} weight={on?'bold':'regular'} />
              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>
              {item.badge ? (
                <span style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', background:'var(--border)', borderRadius:10, padding:'0 5px', minWidth:16, textAlign:'center', lineHeight:'16px' }}>{item.badge}</span>
              ) : null}
            </Link>
          )
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
            <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', letterSpacing:'.01em', lineHeight:'18px' }}>{label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.4" strokeLinecap="round"
              style={{ flexShrink:0, opacity:.72, transform:expanded?'rotate(90deg)':'rotate(0deg)', transition:'none' }}>
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
    return (
      <div style={{ marginBottom: 1 }}>
        <div
          className={`ni ${active ? 'ni-on' : 'ni-off'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingRight: 6,
          }}
        >
          <Link
            href={resolve(href)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1, textDecoration: 'none', color: 'inherit', height: '100%' }}
          >
            <span style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Ico name={icon} sz={14} c={active ? 'var(--text)' : 'var(--text-muted)'} weight={active ? 'bold' : 'regular'} />
            </span>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </Link>
          <button
            className="sb-icon-btn"
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
            aria-label={`${label} ein- oder ausklappen`}
            style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6, flexShrink: 0 }}
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

  return (
    <>
      <style>{`
        :root {
          --sb-row-h: 27px;
          --sb-icon: 16px;
          --sb-font: 13px;
          --sb-x: 10px;
        }
        /* ── Nav item ── */
        .ni {
          display:flex; align-items:center; gap:7px;
          min-height: var(--sb-row-h);
          padding:0 var(--sb-x); border-radius:8px;
          font-size:var(--sb-font); font-weight:500;
          cursor:pointer; text-decoration:none; color:inherit;
          transition:background .12s, color .12s;
          white-space:nowrap; overflow:hidden;
          width:calc(100% - 4px);
          box-sizing:border-box;
          margin:0 2px;
        }
        .ni-on  { background:rgba(0,0,0,0.048); font-weight:600; color:var(--text); }
        [data-theme="dark"] .ni-on { background:rgba(255,255,255,0.075); color:var(--nav-on-text); }
        [data-theme="read"] .ni-on { background:rgba(0,0,0,0.05); color:var(--text); }
        .ni-off { color:var(--text-secondary); }
        .ni-off:hover { background:rgba(0,0,0,0.03); color:var(--text); }
        [data-theme="dark"] .ni-off:hover { background:rgba(255,255,255,0.045); }
        [data-theme="read"] .ni-off:hover { background:rgba(0,0,0,0.04); }
        .ni:focus { outline: none; }
        .ni:focus-visible {
          box-shadow: 0 0 0 2px var(--focus-ring, rgba(64, 105, 225, 0.35));
        }
        .sb-section {
          margin: 20px 0 18px;
        }
        .sb-section-head {
          display:flex;
          align-items:center;
          min-height:22px;
          padding:0 8px 5px;
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
        .proj-row {
          display:flex; align-items:center; gap:7px;
          min-height: 23px;
          padding:0 var(--sb-x); border-radius:8px;
          font-size:12.5px; font-weight:500;
          cursor:pointer; text-decoration:none;
          color:var(--text-muted);
          transition:background .08s, color .08s;
          overflow:hidden;
          width:calc(100% - 4px);
          box-sizing:border-box;
          margin:0 2px;
        }
        .proj-row:hover { background:rgba(0,0,0,0.04); color:var(--text); }
        [data-theme="dark"] .proj-row:hover { background:rgba(255,255,255,0.05); }
        .proj-row.active { background:var(--nav-on); color:var(--nav-on-text); font-weight:600; }
        .proj-row.proj-new { opacity:.55; transition:opacity .12s; }
        .proj-row.proj-new:hover { opacity:1; background:rgba(0,0,0,0.035); }
        [data-theme="dark"] .proj-row.proj-new:hover { background:rgba(255,255,255,0.05); }
        .proj-row:focus { outline: none; }
        .proj-row:focus-visible {
          box-shadow: 0 0 0 2px var(--focus-ring, rgba(64, 105, 225, 0.35));
        }

        .sb-icon-btn:focus { outline: none; }
        .sb-icon-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--focus-ring, rgba(64, 105, 225, 0.35));
        }

        /* ── User dropdown row ── */
        .usr-row {
          display:flex; align-items:center; gap:9px;
          padding:7px 10px; border-radius:8px;
          cursor:pointer; transition:background .08s;
          width:100%; border:none; font-family:inherit;
          background:transparent; text-decoration:none; color:var(--text);
          font-size:12.5px; font-weight:500;
        }
        .usr-row:hover { background:var(--surface-2); }

        /* ── Mobile bar (glass) ── */
        .mob-bar {
          position:fixed; bottom:calc(14px + var(--safe-bottom));
          left:50%; transform:translateX(-50%);
          width:calc(100% - 28px); max-width:380px;
          background:var(--sidebar-bg);
          backdrop-filter:blur(36px) saturate(200%);
          -webkit-backdrop-filter:blur(36px) saturate(200%);
          border:1px solid var(--sidebar-border);
          box-shadow:0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.10);
          border-radius:30px; z-index:200;
          align-items:center; padding:10px 16px; gap:0;
        }
        [data-theme="dark"] .mob-bar {
          box-shadow:0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .mt  { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; min-height:44px; justify-content:center; cursor:pointer; text-decoration:none; border:none; background:transparent; font-family:inherit; -webkit-tap-highlight-color:transparent; transition:transform .1s; }
        .mt:active { transform:scale(.88); }
        .mti { width:32px; height:26px; display:flex; align-items:center; justify-content:center; border-radius:8px; transition:background .12s; }
        .mt.on .mti  { background:var(--nav-on); }
        .mt.has-avatar .mti { background:transparent !important; }
        .mt.on .ml   { color:var(--text); font-weight:700; }
        .mt.off .ml  { color:var(--text-muted); font-weight:500; }
        .ml { font-size:9.5px; letter-spacing:.01em; transition:color .12s; line-height:1; }
        .mob-fab { width:50px; height:50px; border-radius:50%; background:var(--btn-prim); color:var(--btn-prim-text); display:flex; align-items:center; justify-content:center; margin:-6px 12px; box-shadow:0 4px 18px rgba(0,0,0,.35); border:none; cursor:pointer; transition:transform .15s ease,background .15s; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
        .mob-fab:active { transform:scale(.88); }
        .mob-fab.open { background:var(--surface-2); box-shadow:0 2px 8px rgba(0,0,0,.2); }
        .mbd { position:fixed; inset:0; z-index:198; background:rgba(0,0,0,.40); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
        .mob-quick { position:fixed; bottom:calc(96px + var(--safe-bottom)); left:50%; transform:translateX(-50%); width:calc(100% - 32px); max-width:340px; z-index:199; display:flex; flex-direction:column; gap:6px; animation:mqUp .2s cubic-bezier(.16,1,.3,1) both; }
        @keyframes mqUp { from{opacity:0;transform:translateX(-50%) translateY(18px);}to{opacity:1;transform:translateX(-50%) translateY(0);} }
        .mqi { display:flex; align-items:center; gap:14px; padding:13px 16px; background:var(--surface); border:1px solid var(--border); border-radius:16px; text-decoration:none; color:inherit; -webkit-tap-highlight-color:transparent; transition:background .1s; }
        .mqi:active { background:var(--card); }
        .mqi.primary-action { background:var(--btn-prim); border-color:transparent; }
        .mqi.primary-action .mqi-label { color:var(--btn-prim-text); }
        .mqi.primary-action .mqi-ico { background:rgba(0,0,0,.12); color:var(--btn-prim-text); }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <aside className="sidebar" style={{ pointerEvents:'none' }}>
        <div className="sidebar-inner" style={{ pointerEvents:'all', padding:'14px 8px 14px', display:'flex', flexDirection:'column' }}>

          {/* Logo + Support */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 6px', marginBottom:10, gap:8 }}>
            <Link href={homeHref} style={{ textDecoration:'none', display:'flex', alignItems:'center' }}>
              <img src="/brand/logo.svg" alt="festag" style={{ height:17, display:'block', filter:'var(--logo-filter,none)' }}/>
            </Link>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <button
                className="sb-icon-btn"
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                title="Suchen"
                style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', background:'transparent', border:'1px solid transparent' }}
              >
                <Ico name="search" sz={14} c="currentColor" weight="regular" />
              </button>
              <SupportButton />
            </div>
          </div>

          {/* Scrollable nav */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>

            <div style={{ marginBottom:8 }}>
              <NavItems items={topNav} />
            </div>

            <div>
              <Section
                label="Workspace"
                expanded={workspaceExp}
                onToggle={() => setWorkspaceExp(v => !v)}
                action={
                  <button
                    className="sb-icon-btn"
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push('/onboarding') }}
                    title="Neues Projekt"
                    style={{ width: 18, height: 18, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6 }}
                  >
                    <Ico name="plus" sz={11} c="currentColor" weight="regular" />
                  </button>
                }
              >
                {isClient && (
                  <ExpandableNavSection
                    href="/relations/projects"
                    icon="project"
                    label="Projekte"
                    expanded={projExp}
                    onToggle={() => setProjExp(v => !v)}
                    activeOverride={pathname.startsWith('/project/') || pathname.startsWith('/relations/projects')}
                  >
                    {projects.map(p => {
                      const on = pathname === `/project/${p.id}`
                      const dot = p.color || '#64748b'
                      const picking = colorPickId === p.id
                      return (
                        <div key={p.id} style={{ position:'relative' }}>
                          <Link href={`/project/${p.id}`} className={`proj-row ${on?'active':''}`} style={{ paddingLeft:6 }}>
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setColorPickId(picking ? null : p.id) }}
                              title="Farbe ändern"
                              style={{ width:10, height:10, borderRadius:'50%', background:'transparent', flexShrink:0, border:`2px solid ${dot}`, cursor:'pointer', padding:0, outline:'none', boxSizing:'border-box' }}
                            />
                            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</span>
                          </Link>
                          {picking && (
                            <>
                              <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={() => setColorPickId(null)} />
                              <div style={{ position:'absolute', left:8, top:'calc(100% + 4px)', zIndex:201, background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:8, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5, boxShadow:'0 8px 24px rgba(0,0,0,.2)' }}>
                                {PROJ_COLORS.map(c => (
                                  <button key={c} onClick={() => setProjectColor(p.id, c)}
                                    style={{ width:18, height:18, borderRadius:5, background:c, border: dot===c?'2px solid var(--text)':'2px solid transparent', cursor:'pointer', padding:0 }}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}

                    <Link href="/onboarding" className="proj-row proj-new" style={{ paddingLeft:6 }}>
                      <span style={{
                        width:10, height:10, borderRadius:3,
                        border:'1px dashed var(--text-muted)',
                        flexShrink:0, opacity:.6,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <span style={{ fontSize:9, color:'var(--text-muted)', lineHeight:1, fontWeight:600 }}>+</span>
                      </span>
                      <span style={{ fontStyle:'normal', fontSize:12, color:'var(--text-muted)' }}>
                        {projects.length === 0 ? 'Erstes Projekt anlegen…' : 'Neues Projekt…'}
                      </span>
                    </Link>
                  </ExpandableNavSection>
                )}
                <NavItems items={coreNav} />
              </Section>
            </div>

            <div>
              <Section
                label="Teams"
                expanded={teamsExp}
                onToggle={() => setTeamsExp(v => !v)}
                action={
                  <button
                    className="sb-icon-btn"
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTeamsOpen(true) }}
                    title="Neues Team erstellen"
                    style={{ width: 18, height: 18, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6 }}
                  >
                    <Ico name="plus" sz={11} c="currentColor" weight="regular" />
                  </button>
                }
              >
                <div
                  className={`ni ${isOn('/teams?view=projects') ? 'ni-on' : 'ni-off'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingRight: 6,
                  }}
                >
                  <Link
                    href={resolve('/teams?view=projects')}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1, textDecoration: 'none', color: 'inherit', height: '100%' }}
                  >
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Ico name="project" sz={14} c={isOn('/teams?view=projects') ? 'var(--text)' : 'var(--text-muted)'} weight={isOn('/teams?view=projects') ? 'bold' : 'regular'} />
                    </span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Projekte</span>
                  </Link>
                </div>
                <NavItems items={teamsNav.slice(1)} />
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

          <SidebarProfileFooter
            avatarColor={avBg}
            avatarUrl={avatar}
            displayName={name}
            email={email}
            initials={init}
            isClient={isClient}
            onAvatarColorChange={changeAvatarColor}
            onLogout={logout}
            plan={plan}
          />
        </div>
      </aside>

      {/* ══ MOBILE FLOATING NAV BAR ══ */}
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
        <button className={`mob-fab ${more?'open':''}`} onClick={() => setMore(v => !v)} aria-label="Menü">
          {more
            ? <Ico name="close" sz={20} c="var(--text)"          weight="bold" />
            : <Ico name="plus"  sz={22} c="var(--btn-prim-text)" weight="regular" />
          }
        </button>
        {mobPrimary.slice(2).map(item => {
          const on      = isOn(item.href)
          const isAv    = item.icon === 'user' && !!avatar
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'} ${isAv?'has-avatar':''}`}>
              <div className="mti">
                {isAv
                  ? <img src={avatar!} alt="" style={{ width:26,height:26,borderRadius:'50%',objectFit:'cover',border:on?'2.5px solid var(--text)':'2px solid var(--border)',display:'block' }}/>
                  : <Ico name={item.icon} sz={21} c={on?'var(--text)':'var(--text-muted)'} weight={on?'bold':'regular'}/>
                }
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <TeamsModal open={teamsOpen} onClose={() => setTeamsOpen(false)} />

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
    </>
  )
}
