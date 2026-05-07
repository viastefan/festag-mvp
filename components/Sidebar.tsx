'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import SupportButton from '@/components/SupportButton'
import ViewSwitch from '@/components/ViewSwitch'
import TeamsModal from '@/components/TeamsModal'
import {
  House, FolderSimple, Sparkle, ChatCircle, ChartLineUp,
  CreditCard, FileText, UserCircle, GearSix,
  SunHorizon, GridFour, Stack, LinkSimple,
  Plus, CaretRight, DotsThreeOutline, X,
  SignOut, UsersThree, Bell, Briefcase,
  Clock, CheckSquare, Code, FileCode,
  Moon, Sun, BookOpen,
} from '@phosphor-icons/react'
import { getTheme, setTheme, ThemeMode } from '@/lib/theme'
import { autoAvatarColor, avatarInitials, avatarTextColor, AVATAR_COLORS } from '@/lib/avatar'

export function projectColor(_id: string, color?: string | null) { return color || 'var(--text-muted)' }

const ICONS: Record<string, React.ElementType> = {
  home: House, project: FolderSimple, sparkle: Sparkle, chat: ChatCircle,
  activity: ChartLineUp, billing: CreditCard, card: CreditCard, doc: FileText,
  user: UserCircle, settings: GearSix, estimate: SunHorizon, grid: GridFour,
  layers: Stack, link: LinkSimple, plus: Plus, chevron: CaretRight,
  more: DotsThreeOutline, close: X, logout: SignOut, team: UsersThree,
  bell: Bell, briefcase: Briefcase, clock: Clock, check: CheckSquare,
  code: Code, task: FileCode,
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

const CLIENT_MAIN: NavItem[] = [
  { href:'/dashboard', icon:'home',     label:'Dashboard' },
  { href:'/messages',  icon:'chat',     label:'Nachrichten' },
  { href:'/activity',  icon:'activity', label:'Aktivität' },
]
const CLIENT_PROJECT: NavItem[] = [
  { href:'/project/current', icon:'project',  label:'Mein Projekt' },
  { href:'/reports',         icon:'activity', label:'Statusberichte' },
  { href:'/ai',              icon:'sparkle',  label:'AI Assistent' },
  { href:'/documents',       icon:'doc',      label:'Dokumente' },
]
const CLIENT_TOOLS: NavItem[] = [
  { href:'/estimator',  icon:'estimate', label:'Preisschätzer' },
  { href:'/pricing',    icon:'layers',   label:'Pakete & Pläne' },
  { href:'/connectors', icon:'link',     label:'Connectors' },
  { href:'/addons',     icon:'grid',     label:'Add-ons' },
]
const CLIENT_BILLING: NavItem[] = [
  { href:'/billing',   icon:'card', label:'Abrechnung' },
  { href:'/documents', icon:'doc',  label:'Dokumente' },
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
  { href:'/activity',    icon:'activity', label:'Aktivität' },
  { href:'/documents',   icon:'doc',      label:'Dokumente' },
  { href:'/estimator',   icon:'estimate', label:'Preisschätzer' },
  { href:'/addons',      icon:'grid',     label:'Add-ons' },
  { href:'/billing',     icon:'card',     label:'Abrechnung' },
]

const DEV_MAIN: NavItem[] = [
  { href:'/dev',      icon:'home',     label:'Dashboard' },
  { href:'/messages', icon:'chat',     label:'Nachrichten' },
  { href:'/activity', icon:'activity', label:'Aktivität' },
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
const DEV_BILLING: NavItem[] = [
  { href:'/billing', icon:'card', label:'Abrechnung' },
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
  { href:'/activity',     icon:'activity',  label:'Aktivität' },
]

const ROLE_LABEL: Record<string,string> = { client:'Client', dev:'Developer', admin:'Admin' }

export default function Sidebar() {
  const pathname  = usePathname()
  const [uid,      setUid]      = useState<string|null>(null)
  const [email,    setEmail]    = useState('')
  const [fn,       setFn]       = useState('')
  const [fullName, setFullName] = useState('')
  const [avatar,   setAvatar]   = useState<string|null>(null)
  const [avatarColor, setAvatarColor] = useState<string|null>(null)
  const [role,     setRole]     = useState('client')
  const [plan,     setPlan]     = useState('free')
  const [avatarPick, setAvatarPick] = useState(false)
  const [projId,   setProjId]   = useState<string|null>(null)
  const [projects, setProjects] = useState<{id:string;title:string;status:string;color:string|null}[]>([])
  const [more,       setMore]      = useState(false)
  const [projExp,    setProjExp]    = useState(true)
  const [toolsExp,   setToolsExp]   = useState(true)
  const [billExp,    setBillExp]    = useState(false)
  const [teamsOpen,  setTeamsOpen] = useState(false)
  const [userMenu,   setUserMenu]  = useState(false)
  const [designMenu, setDesignMenu] = useState(false)
  const [colorPickId, setColorPickId] = useState<string|null>(null)
  const [themeMode,  setThemeMode] = useState<ThemeMode>('dark')

  const isClient = role !== 'dev'
  const isDev    = role === 'dev'
  const homeHref   = isDev ? '/dev' : '/dashboard'
  const mainNav    = isDev ? DEV_MAIN    : CLIENT_MAIN
  const toolsNav    = isDev ? DEV_TOOLS   : CLIENT_TOOLS
  const billingNav  = isDev ? DEV_BILLING : CLIENT_BILLING
  const mobPrimary = isDev ? DEV_MOB_PRIMARY : CLIENT_MOB_PRIMARY
  const mobQuick   = isDev ? DEV_MOB_QUICK   : CLIENT_MOB_QUICK

  useEffect(() => {
    setThemeMode(getTheme())
    const handler = () => setTeamsOpen(true)
    window.addEventListener('open-teams-modal', handler)
    return () => window.removeEventListener('open-teams-modal', handler)
  }, [])

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

  const PROJ_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#64748b']

  async function setProjectColor(id: string, color: string) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, color } : p))
    setColorPickId(null)
    await (createClient() as any).from('projects').update({ color }).eq('id', id)
  }

  const logout  = async () => { await createClient().auth.signOut(); window.location.href='/login' }
  const resolve = (h: string) => h==='/project/current'?(projId?`/project/${projId}`:'/dashboard'):h
  const isOn    = (h: string) => {
    if (h==='/dashboard') return pathname==='/dashboard'
    if (h==='/dev')       return pathname==='/dev'
    if (h==='/project/current') return pathname.startsWith('/project/')
    return pathname.startsWith(h)
  }
  const name = fn || email.split('@')[0] || 'Konto'
  const init = avatarInitials(fn, fullName, email)
  const avBg = avatarColor || autoAvatarColor(uid || email)
  const avFg = avatarTextColor(avBg)

  async function changeAvatarColor(c: string) {
    setAvatarColor(c); setAvatarPick(false)
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
            <Link key={item.href} href={resolve(item.href)} className={`ni ${on?'ni-on':'ni-off'}`}>
              <Ico name={item.icon} sz={14} c={on?'var(--text)':'var(--text-muted)'} weight={on?'bold':'regular'} />
              <span style={{ flex:1 }}>{item.label}</span>
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
      <div style={{ marginBottom:2 }}>
        <div style={{ display:'flex', alignItems:'center', padding:'4px 8px 2px' }}>
          <button onClick={onToggle} style={{
            display:'flex', alignItems:'center', gap:4, flex:1,
            background:'transparent', border:'none', cursor:'pointer',
            fontFamily:'inherit', padding:0, textAlign:'left',
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round"
              style={{ flexShrink:0, opacity:.7, transform:expanded?'rotate(90deg)':'rotate(0deg)', transition:'transform .18s cubic-bezier(.16,1,.3,1)' }}>
              <path d="M9 6l6 6-6 6"/>
            </svg>
            <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', letterSpacing:'.01em' }}>{label}</span>
          </button>
          {action}
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

  // ── Flat section (no header) ──
  function FlatSection({ label, items }: { label: string; items: NavItem[] }) {
    return (
      <div style={{ marginBottom:6 }}>
        <p style={{ fontSize:10.5, fontWeight:600, color:'var(--text-muted)', padding:'5px 9px 2px', margin:0, opacity:.55 }}>{label}</p>
        <NavItems items={items} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        /* ── Nav item ── */
        .ni {
          display:flex; align-items:center; gap:7px;
          padding:5px 9px; border-radius:7px;
          font-size:13px; font-weight:500;
          cursor:pointer; text-decoration:none; color:inherit;
          transition:background .12s, color .12s;
          white-space:nowrap; overflow:hidden;
          margin:0 2px;
        }
        .ni-on  { background:rgba(0,0,0,0.055); font-weight:600; color:var(--text); }
        [data-theme="dark"] .ni-on { background:rgba(255,255,255,0.09); color:var(--nav-on-text); }
        [data-theme="read"] .ni-on { background:rgba(0,0,0,0.055); color:var(--text); }
        .ni-off { color:var(--text-secondary); }
        .ni-off:hover { background:rgba(0,0,0,0.035); color:var(--text); }
        [data-theme="dark"] .ni-off:hover { background:rgba(255,255,255,0.05); }
        [data-theme="read"] .ni-off:hover { background:rgba(0,0,0,0.04); }

        /* ── Project row ── */
        .proj-row {
          display:flex; align-items:center; gap:7px;
          padding:4px 9px; border-radius:7px;
          font-size:12px; font-weight:500;
          cursor:pointer; text-decoration:none;
          color:var(--text-muted);
          transition:background .08s, color .08s;
          overflow:hidden; margin:0 2px;
        }
        .proj-row:hover { background:rgba(0,0,0,0.04); color:var(--text); }
        [data-theme="dark"] .proj-row:hover { background:rgba(255,255,255,0.05); }
        .proj-row.active { background:var(--nav-on); color:var(--nav-on-text); font-weight:600; }
        .proj-row.proj-new { opacity:.55; transition:opacity .12s; }
        .proj-row.proj-new:hover { opacity:1; background:rgba(0,0,0,0.035); }
        [data-theme="dark"] .proj-row.proj-new:hover { background:rgba(255,255,255,0.05); }

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
        <div className="sidebar-inner" style={{ pointerEvents:'all', padding:'14px 8px 14px', display:'flex', flexDirection:'column', height:'100%', boxSizing:'border-box' }}>

          {/* Logo + Support */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 6px', marginBottom:10, gap:8 }}>
            <Link href={homeHref} style={{ textDecoration:'none', display:'flex', alignItems:'center' }}>
              <img src="/brand/logo.svg" alt="festag" style={{ height:17, display:'block', filter:'var(--logo-filter,none)' }}/>
            </Link>
            <SupportButton />
          </div>

          {/* ViewSwitch */}
          <div style={{ padding:'0 2px', marginBottom:10 }}>
            <ViewSwitch />
          </div>

          {/* Scrollable nav */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>

            {/* Main nav — always visible, no section header (like Linear's top items) */}
            <div style={{ marginBottom:6 }}>
              <NavItems items={mainNav} />
              {/* Teams — nur für Admin sichtbar */}
              {role === 'admin' && (
                <Link href="/teams" className={`ni ${isOn('/teams')?'ni-on':'ni-off'}`}>
                  <Ico name="team" sz={14} c={isOn('/teams')?'var(--text)':'var(--text-muted)'} weight={isOn('/teams')?'bold':'regular'} />
                  <span style={{ flex:1 }}>Teams</span>
                </Link>
              )}
            </div>

            {/* Projects — collapsible */}
            {isClient && (
              <Section
                label="Projekte"
                expanded={projExp}
                onToggle={() => setProjExp(v => !v)}
                action={
                  <Link href="/onboarding" onClick={e => e.stopPropagation()}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:5, opacity:.45, textDecoration:'none', transition:'opacity .1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity='0.9'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity='0.45'}
                  >
                    <Ico name="plus" sz={11} c="var(--text-muted)" weight="regular" />
                  </Link>
                }
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

                {/* Immer sichtbar: dezenter Onboarding-Einstieg, auch wenn Projekte existieren.
                    Linear-style: kleiner Plus-Punkt, kein CTA-Button. */}
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

                {/* Sub-links for active project */}
                {projId && (
                  <div style={{ marginLeft:12, borderLeft:'1px solid var(--border)', paddingLeft:6, marginTop:1, marginBottom:2 }}>
                    {CLIENT_PROJECT.map(item => {
                      const on = isOn(item.href)
                      return (
                        <Link key={item.href} href={resolve(item.href)} className={`ni ${on?'ni-on':'ni-off'}`}
                          style={{ fontSize:11.5, padding:'4px 8px', borderRadius:6, margin:'0 1px' }}>
                          <Ico name={item.icon} sz={12} c={on?'var(--text)':'var(--text-muted)'} weight={on?'bold':'regular'} />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </Section>
            )}

            {/* Dev: Work section */}
            {isDev && <FlatSection label="Arbeit" items={DEV_WORK} />}

            {/* Tools — collapsible */}
            <Section
              label="Tools"
              expanded={toolsExp}
              onToggle={() => setToolsExp(v => !v)}
            >
              <NavItems items={toolsNav} />
            </Section>

            {/* Abrechnung — collapsible */}
            <Section
              label="Abrechnung"
              expanded={billExp}
              onToggle={() => setBillExp(v => !v)}
            >
              <NavItems items={billingNav} />
            </Section>

          </div>

          {/* ── User block (Claude-exact footer) ── */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:6, marginTop:4, position:'relative', display:'flex', alignItems:'center', gap:4 }}>

            {/* ── Main user menu popup (left trigger) ── */}
            {userMenu && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:1000 }} onClick={() => setUserMenu(false)} />
                <div style={{
                  position:'absolute', bottom:'calc(100% + 8px)', left:0,
                  minWidth:240,
                  background:'var(--surface)',
                  border:'1px solid var(--border)',
                  borderRadius:12,
                  boxShadow:'0 16px 48px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.10)',
                  zIndex:1001,
                  padding:'6px',
                  overflow:'hidden',
                  animation:'um-pop .14s ease-out both',
                }}>
                  {/* Email */}
                  <p style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)', padding:'8px 11px 6px', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</p>

                  {/* Items */}
                  <Link href="/settings" className="usr-row" onClick={() => setUserMenu(false)}>
                    <Ico name="settings" sz={14} c="var(--text-secondary)" weight="regular"/>
                    <span style={{ flex:1 }}>Einstellungen</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'ui-monospace, "SF Mono", Menlo, monospace' }}>⌘,</span>
                  </Link>
                  {isClient && (
                    <Link href="/billing" className="usr-row" onClick={() => setUserMenu(false)}>
                      <Ico name="billing" sz={14} c="var(--text-secondary)" weight="regular"/>
                      <span style={{ flex:1 }}>Abrechnung & Plan</span>
                    </Link>
                  )}
                  <Link href="/messages" className="usr-row" onClick={() => setUserMenu(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    <span style={{ flex:1 }}>Hilfe erhalten</span>
                  </Link>

                  <div style={{ height:1, background:'var(--border)', margin:'4px 4px' }}/>

                  {isClient && (
                    <Link href="/pricing" className="usr-row" onClick={() => setUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                      <span style={{ flex:1 }}>Tarif upgraden</span>
                    </Link>
                  )}
                  <Link href="/connectors" className="usr-row" onClick={() => setUserMenu(false)}>
                    <Ico name="link" sz={14} c="var(--text-secondary)" weight="regular"/>
                    <span style={{ flex:1 }}>Connectors</span>
                  </Link>
                  <Link href="/addons" className="usr-row" onClick={() => setUserMenu(false)}>
                    <Ico name="grid" sz={14} c="var(--text-secondary)" weight="regular"/>
                    <span style={{ flex:1 }}>Add-Ons</span>
                  </Link>

                  <div style={{ height:1, background:'var(--border)', margin:'4px 4px' }}/>

                  <button className="usr-row" onClick={logout} style={{ width:'100%' }}>
                    <Ico name="logout" sz={14} c="var(--text-secondary)" weight="regular"/>
                    <span style={{ flex:1 }}>Abmelden</span>
                  </button>
                </div>
              </>
            )}

            {/* ── Design popup (right trigger) ── */}
            {designMenu && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:1000 }} onClick={() => setDesignMenu(false)} />
                <div style={{
                  position:'absolute', bottom:'calc(100% + 8px)', right:0,
                  minWidth:180,
                  background:'var(--surface)',
                  border:'1px solid var(--border)',
                  borderRadius:12,
                  boxShadow:'0 16px 48px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.10)',
                  zIndex:1001,
                  padding:'6px',
                  overflow:'hidden',
                  animation:'um-pop .14s ease-out both',
                }}>
                  <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', padding:'6px 11px 4px', margin:0, letterSpacing:'.04em' }}>Design</p>
                  {([
                    { mode:'dark'  as ThemeMode, label:'Dunkel'   },
                    { mode:'light' as ThemeMode, label:'Hell'     },
                    { mode:'read'  as ThemeMode, label:'Lesemodus'},
                  ] as const).map(({ mode, label }) => {
                    const active = themeMode === mode
                    return (
                      <button key={mode} className="usr-row" onClick={() => {
                        setThemeMode(mode); setTheme(mode); setDesignMenu(false)
                      }}
                        style={{ width:'100%' }}
                      >
                        <span style={{ flex:1, color: active ? 'var(--text)' : 'var(--text-secondary)', fontWeight: active ? 600 : 500 }}>{label}</span>
                        {active && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #3b82f6)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        )}
                      </button>
                    )
                  })}

                  {!avatar && (
                    <>
                      <div style={{ height:1, background:'var(--border)', margin:'4px 4px' }}/>
                      <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', padding:'6px 11px 6px', margin:0, letterSpacing:'.04em' }}>Avatar-Farbe</p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, padding:'0 8px 6px' }}>
                        {AVATAR_COLORS.map(c => {
                          const sel = (avatarColor || avBg) === c
                          return (
                            <button key={c} onClick={() => changeAvatarColor(c)}
                              style={{ width:'100%', aspectRatio:'1/1', borderRadius:'50%', background:c, border: sel ? '2px solid var(--text)' : '2px solid transparent', cursor:'pointer', padding:0, transition:'transform .15s cubic-bezier(.16,1,.3,1)' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='scale(1.12)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform='scale(1)'}
                              aria-label={`Farbe ${c}`}
                            />
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <style>{`
              @keyframes um-pop {
                from { opacity: 0; transform: translateY(4px) scale(.98); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>

            {/* Trigger left — name + chevron */}
            <button
              onClick={() => { setUserMenu(m => !m); setDesignMenu(false) }}
              style={{
                flex:1, minWidth:0,
                display:'flex', alignItems:'center', gap:8,
                padding:'5px 8px 5px 5px', borderRadius:8,
                background: userMenu ? 'var(--surface-2)' : 'transparent',
                border:'none', cursor:'pointer', fontFamily:'inherit',
                transition:'background .1s',
              }}
              onMouseEnter={e => { if (!userMenu) (e.currentTarget as HTMLElement).style.background='var(--surface-2)' }}
              onMouseLeave={e => { if (!userMenu) (e.currentTarget as HTMLElement).style.background='transparent' }}
            >
              {avatar
                ? <img src={avatar} alt="" style={{ width:24,height:24,borderRadius:'50%',objectFit:'cover',border:'1.5px solid var(--border)',flexShrink:0 }}/>
                : <div style={{ width:24,height:24,borderRadius:'50%',background:avBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700,color:avFg,flexShrink:0,letterSpacing:'.02em' }}>{init}</div>
              }
              <span style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:5, overflow:'hidden' }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                {isClient && plan !== 'free' && (
                  <>
                    <span style={{ color:'var(--text-muted)', fontSize:11 }}>·</span>
                    <span style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)', flexShrink:0 }}>
                      {plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : plan === 'enterprise' ? 'Ent.' : plan}
                    </span>
                  </>
                )}
              </span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink:0, opacity:.55 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* Trigger right — sliders icon */}
            <button
              onClick={() => { setDesignMenu(m => !m); setUserMenu(false) }}
              aria-label="Design-Einstellungen"
              style={{
                width:30, height:30, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius:8,
                background: designMenu ? 'var(--surface-2)' : 'transparent',
                border:'none', cursor:'pointer', fontFamily:'inherit',
                transition:'background .1s',
                color:'var(--text-muted)',
              }}
              onMouseEnter={e => { if (!designMenu) { (e.currentTarget as HTMLElement).style.background='var(--surface-2)'; (e.currentTarget as HTMLElement).style.color='var(--text)' } }}
              onMouseLeave={e => { if (!designMenu) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--text-muted)' } }}
            >
              {/* Sliders icon (matches Claude's UI) */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="11" y2="6"/>
                <circle cx="15" cy="6" r="2"/>
                <line x1="17" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="18" x2="7" y2="18"/>
                <circle cx="10" cy="18" r="2"/>
                <line x1="12" y1="18" x2="20" y2="18"/>
              </svg>
            </button>

          </div>
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
