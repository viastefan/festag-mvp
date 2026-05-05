'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import SupportButton from '@/components/SupportButton'
import ViewSwitch from '@/components/ViewSwitch'
import {
  House, FolderSimple, Sparkle, ChatCircle, ChartLineUp,
  CreditCard, FileText, UserCircle, GearSix,
  SunHorizon, GridFour, Stack, LinkSimple,
  Plus, CaretRight, DotsThreeOutline, X,
  SignOut, UsersThree, Bell, Briefcase,
  Clock, CheckSquare, Code, FileCode,
} from '@phosphor-icons/react'

/* ── Project color palette ── */
const PROJECT_COLORS = ['#0A0B0A','#34C759','#0EA5E9','#F59E0B','#D14343','#64748B','#14B8A6','#94A3B8']
export function projectColor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PROJECT_COLORS[h % PROJECT_COLORS.length]
}

/* ── Icon renderer using Phosphor ── */
const ICONS: Record<string, React.ElementType> = {
  home:      House,
  project:   FolderSimple,
  sparkle:   Sparkle,
  chat:      ChatCircle,
  activity:  ChartLineUp,
  billing:   CreditCard,
  card:      CreditCard,
  doc:       FileText,
  user:      UserCircle,
  settings:  GearSix,
  estimate:  SunHorizon,
  grid:      GridFour,
  layers:    Stack,
  link:      LinkSimple,
  plus:      Plus,
  chevron:   CaretRight,
  more:      DotsThreeOutline,
  close:     X,
  logout:    SignOut,
  team:      UsersThree,
  bell:      Bell,
  briefcase: Briefcase,
  clock:     Clock,
  check:     CheckSquare,
  code:      Code,
  task:      FileCode,
}

function Ico({ name, sz=16, c='currentColor', weight='regular' }: { name:string; sz?:number; c?:string; weight?:'thin'|'light'|'regular'|'bold'|'fill'|'duotone' }) {
  const Icon = ICONS[name]
  if (!Icon) return null
  return <Icon size={sz} color={c} weight={weight} />
}

type NavItem = { href: string; icon: string; label: string; badge?: number }

/* ── CLIENT nav ── */
const CLIENT_MAIN: NavItem[] = [
  { href:'/dashboard', icon:'home',     label:'Dashboard' },
  { href:'/messages',  icon:'chat',     label:'Nachrichten' },
  { href:'/teams',     icon:'team',     label:'Teams' },
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
const CLIENT_ACCOUNT: NavItem[] = [
  { href:'/billing',  icon:'card',     label:'Abrechnung' },
  { href:'/settings', icon:'settings', label:'Einstellungen' },
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
  { href:'/teams',       icon:'team',     label:'Teams' },
  { href:'/activity',    icon:'activity', label:'Aktivität' },
  { href:'/documents',   icon:'doc',      label:'Dokumente' },
  { href:'/estimator',   icon:'estimate', label:'Preisschätzer' },
  { href:'/addons',      icon:'grid',     label:'Add-ons' },
  { href:'/billing',     icon:'card',     label:'Abrechnung' },
]

/* ── DEV nav ── */
const DEV_MAIN: NavItem[] = [
  { href:'/dev',      icon:'home',      label:'Dashboard' },
  { href:'/messages', icon:'chat',      label:'Nachrichten' },
  { href:'/teams',    icon:'team',      label:'Teams' },
  { href:'/activity', icon:'activity',  label:'Aktivität' },
]
const DEV_WORK: NavItem[] = [
  { href:'/dev/jobs',      icon:'briefcase', label:'Job Board' },
  { href:'/dev/tasks',     icon:'task',      label:'Meine Tasks' },
  { href:'/dev/projects',  icon:'project',   label:'Meine Projekte' },
  { href:'/dev/time',      icon:'clock',     label:'Zeiterfassung' },
]
const DEV_TOOLS: NavItem[] = [
  { href:'/connectors', icon:'grid',  label:'Connectors' },
  { href:'/addons',     icon:'grid',  label:'Add-ons' },
]
const DEV_ACCOUNT: NavItem[] = [
  { href:'/settings', icon:'settings', label:'Einstellungen' },
]

const DEV_MOB_PRIMARY: NavItem[] = [
  { href:'/dev',           icon:'home',      label:'Home' },
  { href:'/dev/jobs',      icon:'briefcase', label:'Jobs' },
  { href:'/dev/tasks',     icon:'task',      label:'Tasks' },
  { href:'/settings',      icon:'user',      label:'Profil' },
]
const DEV_MOB_QUICK = [
  { href:'/dev/jobs',     icon:'briefcase', label:'Job Board',     primary: true },
  { href:'/messages',     icon:'chat',      label:'Nachrichten' },
  { href:'/teams',        icon:'team',      label:'Teams' },
  { href:'/dev/tasks',    icon:'task',      label:'Meine Tasks' },
  { href:'/dev/projects', icon:'project',   label:'Projekte' },
  { href:'/dev/time',     icon:'clock',     label:'Zeiterfassung' },
  { href:'/connectors',   icon:'grid',      label:'Connectors' },
  { href:'/activity',     icon:'activity',  label:'Aktivität' },
]

const ROLE_LABEL: Record<string,string> = { client:'Client', dev:'Developer', admin:'Admin' }

export default function Sidebar() {
  const pathname  = usePathname()
  const [email,   setEmail]   = useState('')
  const [fn,      setFn]      = useState('')
  const [avatar,  setAvatar]  = useState<string|null>(null)
  const [role,    setRole]    = useState('client')
  const [plan,    setPlan]    = useState('free')
  const [projId,  setProjId]  = useState<string|null>(null)
  const [projects,setProjects]= useState<{id:string;title:string;status:string}[]>([])
  const [more,    setMore]    = useState(false)
  const [projExp, setProjExp] = useState(false)

  const isClient = role !== 'dev'
  const isDev    = role === 'dev'

  const homeHref    = isDev ? '/dev' : '/dashboard'
  const mainNav     = isDev ? DEV_MAIN     : CLIENT_MAIN
  const toolsNav    = isDev ? DEV_TOOLS    : CLIENT_TOOLS
  const accountNav  = isDev ? DEV_ACCOUNT  : CLIENT_ACCOUNT
  const mobPrimary  = isDev ? DEV_MOB_PRIMARY : CLIENT_MOB_PRIMARY
  const mobQuick    = isDev ? DEV_MOB_QUICK   : CLIENT_MOB_QUICK

  useEffect(() => {
    setMore(false)
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data:p } = await sb.from('profiles').select('first_name,full_name,avatar_url,role,plan').eq('id', data.user.id).single()
      if (p) {
        setFn((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setAvatar((p as any).avatar_url ?? null)
        setRole((p as any).role ?? 'client')
        setPlan((p as any).plan ?? 'free')
      }
    })
    // Only load projects for client accounts
    createClient().from('projects').select('id,title,status').order('created_at',{ascending:false}).limit(8).then(({data}) => {
      const list = (data as any[]) ?? []
      if (!list.length) { setProjects([]); setProjExp(false); return }
      setProjects(list)
      setProjExp(true)
      const prio: Record<string,number> = {active:0,testing:1,planning:2,intake:3,done:4}
      setProjId([...list].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
    })
  }, [pathname])

  const logout  = async () => { await createClient().auth.signOut(); window.location.href='/login' }
  const resolve = (h:string) => h==='/project/current'?(projId?`/project/${projId}`:'/dashboard'):h
  const isOn    = (h:string) => {
    if (h==='/dashboard') return pathname==='/dashboard'
    if (h==='/dev')       return pathname==='/dev'
    if (h==='/project/current') return pathname.startsWith('/project/')
    return pathname.startsWith(h)
  }
  const name = fn || email.split('@')[0] || 'Konto'
  const init = (fn || email || 'U').charAt(0).toUpperCase()

  function NavSection({ label, items }: { label:string; items:NavItem[] }) {
    return (
      <div style={{ marginBottom:4 }}>
        <p style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.09em', textTransform:'uppercase', padding:'6px 11px 3px', margin:0, opacity:.6 }}>{label}</p>
        {items.map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)}
              className={`ni ${on?'ni-on':'ni-off'}`}
              style={{ position:'relative' }}>
              <Ico name={item.icon} sz={15} c={on?'var(--text)':'var(--text-muted)'} weight={on?'bold':'regular'} />
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge ? <span style={{ fontSize:10, fontWeight:700, color:'var(--accent-text)', background:'var(--accent)', borderRadius:10, padding:'1px 6px', minWidth:16, textAlign:'center' }}>{item.badge}</span> : null}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <style>{`
        .ni { display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:9px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;color:inherit;transition:background .1s,color .1s;white-space:nowrap;overflow:hidden; }
        .ni-on  { background:var(--nav-on);font-weight:700;color:var(--nav-on-text); }
        .ni-off { color:var(--nav-off-text); }
        .ni-off:hover { background:var(--card);color:var(--text); }
        .usr-row:hover { background:var(--card); }
        .proj-row { display:flex;align-items:center;gap:8px;padding:6px 11px;border-radius:9px;font-size:12.5px;font-weight:500;cursor:pointer;text-decoration:none;color:var(--text-secondary);transition:background .1s,color .1s;overflow:hidden; }
        .proj-row:hover { background:var(--card);color:var(--text); }
        .proj-row.active { background:var(--nav-on);color:var(--nav-on-text);font-weight:700; }

        /* ── Mobile floating bar ── */
        .mob-bar { position:fixed;bottom:calc(14px + var(--safe-bottom));left:50%;transform:translateX(-50%);width:calc(100% - 28px);max-width:380px;background:var(--sidebar-bg);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid var(--border);box-shadow:var(--shadow-lg);border-radius:32px;z-index:200;align-items:center;padding:10px 16px;gap:0; }

        /* Nav tab items */
        .mt  { display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;min-height:44px;justify-content:center;cursor:pointer;text-decoration:none;border:none;background:transparent;font-family:inherit;-webkit-tap-highlight-color:transparent;transition:transform .1s; }
        .mt:active { transform:scale(.88); }
        .mti { width:32px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .12s; }
        .mt.on .mti  { background:var(--nav-on); }
        .mt.has-avatar .mti { background:transparent !important; }
        .mt.on .ml   { color:var(--text);font-weight:700; }
        .mt.off .ml  { color:var(--text-muted);font-weight:500; }
        .ml { font-size:9.5px;letter-spacing:.01em;transition:color .12s;line-height:1; }

        /* Center FAB */
        .mob-fab { width:50px;height:50px;border-radius:50%;background:var(--btn-prim);color:var(--btn-prim-text);display:flex;align-items:center;justify-content:center;margin:-6px 12px;box-shadow:0 4px 18px rgba(0,0,0,.35);border:none;cursor:pointer;transition:transform .15s ease,background .15s;flex-shrink:0;-webkit-tap-highlight-color:transparent; }
        .mob-fab:active { transform:scale(.88); }
        .mob-fab.open { background:var(--surface-2);box-shadow:0 2px 8px rgba(0,0,0,.2); }

        /* Backdrop */
        .mbd { position:fixed;inset:0;z-index:198;background:rgba(0,0,0,.40);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px); }

        /* Quick action panel */
        .mob-quick { position:fixed;bottom:calc(96px + var(--safe-bottom));left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:340px;z-index:199;display:flex;flex-direction:column;gap:6px;animation:mqUp .2s cubic-bezier(.16,1,.3,1) both; }
        @keyframes mqUp { from{opacity:0;transform:translateX(-50%) translateY(18px);}to{opacity:1;transform:translateX(-50%) translateY(0);} }

        /* Quick action items */
        .mqi { display:flex;align-items:center;gap:14px;padding:13px 16px;background:var(--surface);border:1px solid var(--border);border-radius:16px;text-decoration:none;color:inherit;-webkit-tap-highlight-color:transparent;transition:background .1s; }
        .mqi:active { background:var(--card); }
        .mqi.primary-action { background:var(--btn-prim);border-color:transparent; }
        .mqi.primary-action .mqi-label { color:var(--btn-prim-text); }
        .mqi.primary-action .mqi-ico { background:rgba(0,0,0,.12);color:var(--btn-prim-text); }
      `}</style>

      {/* ══════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════ */}
      <aside className="sidebar" style={{ pointerEvents:'none' }}>
        <div className="sidebar-inner" style={{ pointerEvents:'all', padding:'16px 10px 18px', display:'flex', flexDirection:'column', height:'100%' }}>

          {/* Logo + Support-Button */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px', marginBottom:12, gap:8 }}>
            <Link href={homeHref} style={{ textDecoration:'none', display:'flex', alignItems:'center' }}>
              <img src="/brand/logo.svg" alt="festag" style={{ height:18, display:'block', filter:'var(--logo-filter,none)' }}/>
            </Link>
            <SupportButton />
          </div>

          {/* View-Switch — direkt unter dem Logo */}
          <div style={{ padding:'0 4px', marginBottom:14 }}>
            <ViewSwitch />
          </div>

          {/* Scrollable nav */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>

            {/* Main nav */}
            <NavSection label="Übersicht" items={mainNav} />

            {/* CLIENT: Projects section */}
            {isClient && (
              <div style={{ marginBottom:4 }}>
                <button onClick={() => setProjExp(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:6, width:'100%', padding:'6px 11px 3px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                  <span style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.09em', textTransform:'uppercase', opacity:.6, flex:1, textAlign:'left' }}>Projekte</span>
                  <span style={{ opacity:.4, transition:'transform .15s', display:'block', transform:projExp?'rotate(90deg)':'none' }}>
                    <Ico name="chevron" sz={11} c="var(--text-muted)" weight="light" />
                  </span>
                  <Link href="/new-project" onClick={e => e.stopPropagation()}
                    style={{ opacity:.5, display:'flex', marginLeft:2, padding:2, borderRadius:5, textDecoration:'none' }}>
                    <Ico name="plus" sz={11} c="var(--text-muted)" weight="regular" />
                  </Link>
                </button>

                {projExp && (
                  <>
                    {projects.length > 0 ? projects.map(p => {
                      const on = pathname === `/project/${p.id}`
                      return (
                        <Link key={p.id} href={`/project/${p.id}`} className={`proj-row ${on?'active':''}`}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:projectColor(p.id), flexShrink:0 }}/>
                          <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</span>
                        </Link>
                      )
                    }) : (
                      <Link href="/new-project" className="proj-row" style={{ opacity:.6 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--border)', flexShrink:0 }}/>
                        <span style={{ fontStyle:'italic', fontSize:12 }}>Neues Projekt</span>
                      </Link>
                    )}

                    {projId && (
                      <div style={{ marginLeft:11, borderLeft:'1.5px solid var(--border)', paddingLeft:8, marginTop:2, marginBottom:2 }}>
                        {CLIENT_PROJECT.map(item => {
                          const on = isOn(item.href)
                          return (
                            <Link key={item.href} href={resolve(item.href)}
                              className={`ni ${on?'ni-on':'ni-off'}`}
                              style={{ fontSize:12, padding:'5px 9px', borderRadius:7 }}>
                              <Ico name={item.icon} sz={13} c={on?'var(--text)':'var(--text-muted)'} weight={on?"bold":"regular"} />
                              {item.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* DEV: Work section */}
            {isDev && <NavSection label="Arbeit" items={DEV_WORK} />}

            <NavSection label="Tools" items={toolsNav} />
            <NavSection label="Konto" items={accountNav} />
          </div>

          {/* User block */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, marginTop:8 }}>

            {/* Plan badge row — only for client, only in Festwerk context */}
            {isClient && !pathname.startsWith('/relations') && (
              <Link href="/pricing" style={{ textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px 7px', borderRadius:10, transition:'background .1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--card)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', letterSpacing:'-.01em' }}>{name}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>·</span>
                  <span style={{
                    fontSize:11, fontWeight:700, letterSpacing:'.01em',
                    color: plan==='free' ? 'var(--text-muted)' : plan==='pro' ? 'var(--green,#34c759)' : plan==='enterprise' ? 'var(--accent-text,#fff)' : 'var(--text)',
                    background: plan==='enterprise' ? 'var(--accent)' : 'transparent',
                    padding: plan==='enterprise' ? '1px 6px' : '0',
                    borderRadius: plan==='enterprise' ? 5 : 0,
                  }}>
                    {plan === 'free' ? 'Free' : plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : plan === 'enterprise' ? 'Enterprise' : plan}
                  </span>
                </div>
                <Ico name="chevron" sz={12} c="var(--text-muted)" weight="light" />
              </Link>
            )}

            {/* Avatar + logout row */}
            <div style={{
              background:'var(--surface-2)', border:'1px solid var(--border)',
              borderRadius:12, padding:'8px 10px',
              display:'flex', alignItems:'center', gap:10,
            }}>
              <Link href="/settings" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:9, flex:1, minWidth:0 }}>
                {avatar ? (
                  <img src={avatar} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', border:'1.5px solid var(--border)', flexShrink:0 }}/>
                ) : (
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--accent-text)', flexShrink:0 }}>{init}</div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11.5, fontWeight:600, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.25 }}>{email}</p>
                  <p style={{ fontSize:9.5, fontWeight:600, color:'var(--text-muted)', margin:'1px 0 0', letterSpacing:'.04em', textTransform:'uppercase' }}>{ROLE_LABEL[role] ?? 'Client'}</p>
                </div>
              </Link>
              <button onClick={logout} title="Abmelden" aria-label="Abmelden"
                style={{
                  width:26, height:26, borderRadius:8, border:'1px solid var(--border)',
                  background:'var(--surface)', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--text-muted)', flexShrink:0, transition:'color .12s, background .12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color='var(--text)'; e.currentTarget.style.background='var(--bg)' }}
                onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='var(--surface)' }}>
                <Ico name="logout" sz={12} c="currentColor" weight="regular" />
              </button>
            </div>

            {/* Legal links only */}
            <div style={{ padding:'8px 4px 2px', display:'flex', flexWrap:'nowrap', alignItems:'center', justifyContent:'space-between', gap:4 }}>
              {[
                { href:'/impressum',   label:'Impressum' },
                { href:'/datenschutz', label:'Datenschutz' },
                { href:'/agb',         label:'AGB' },
                { href:'/widerruf',    label:'Widerruf' },
              ].map((l, i, arr) => (
                <span key={l.href} style={{ display:'inline-flex', alignItems:'center', gap:4, flexShrink:0, whiteSpace:'nowrap' }}>
                  <Link href={l.href}
                    style={{ fontSize:8.5, color:'var(--text-muted)', textDecoration:'none', opacity:.65, letterSpacing:'.01em', whiteSpace:'nowrap', transition:'opacity .12s, color .12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity='1'; (e.currentTarget as HTMLElement).style.color='var(--text)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity='.65'; (e.currentTarget as HTMLElement).style.color='var(--text-muted)' }}
                  >{l.label}</Link>
                  {i < arr.length - 1 && <span style={{ fontSize:7, color:'var(--text-muted)', opacity:.35 }}>·</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════
          MOBILE FLOATING NAV BAR
      ══════════════════════════════════ */}
      <nav className="bottom-nav mob-bar">
        {/* Left 2 items */}
        {mobPrimary.slice(0,2).map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'}`}>
              <div className="mti">
                <Ico name={item.icon} sz={21} c={on?'var(--text)':'var(--text-muted)'} weight={on?"bold":"regular"} />
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}

        {/* Center FAB — plus / close */}
        <button className={`mob-fab ${more?'open':''}`} onClick={() => setMore(v => !v)} aria-label="Menü">
          {more
            ? <Ico name="close"  sz={20} c="var(--text)"          weight="bold" />
            : <Ico name="plus"   sz={22} c="var(--btn-prim-text)" weight="regular" />
          }
        </button>

        {/* Right 2 items */}
        {mobPrimary.slice(2).map(item => {
          const on = isOn(item.href)
          const isAvatar = item.icon === 'user' && !!avatar
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'} ${isAvatar?'has-avatar':''}`}>
              <div className="mti">
                {isAvatar ? (
                  <img src={avatar!} alt="" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover', border:on?'2.5px solid var(--text)':'2px solid var(--border)', display:'block' }} />
                ) : (
                  <Ico name={item.icon} sz={21} c={on?'var(--text)':'var(--text-muted)'} weight={on?"bold":"regular"} />
                )}
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Quick action panel */}
      {more && (
        <>
          <div className="mbd" onClick={() => setMore(false)} />
          <div className="mob-quick">
            {/* Primary action */}
            <Link href={mobQuick[0].href} className="mqi primary-action" onClick={() => setMore(false)}>
              <div className="mqi-ico" style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:'rgba(0,0,0,.14)' }}>
                <Ico name={mobQuick[0].icon} sz={18} c="var(--btn-prim-text)" weight="regular" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p className="mqi-label" style={{ fontSize:15, fontWeight:700, margin:'0 0 1px', color:'var(--btn-prim-text)' }}>{mobQuick[0].label}</p>
                <p style={{ fontSize:11.5, margin:0, color:'var(--btn-prim-text)', opacity:.65 }}>{isDev ? 'Jobs ansehen →' : 'Projekt starten →'}</p>
              </div>
            </Link>

            {/* 2-col grid for secondary actions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {mobQuick.slice(1).map(item => {
                const on = isOn(item.href)
                return (
                  <Link key={item.href} href={resolve(item.href)} className="mqi" onClick={() => setMore(false)}
                    style={{ borderRadius:14, gap:10, padding:'12px 13px' }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:on?'var(--text)':'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Ico name={item.icon} sz={16} c={on?'var(--bg)':'var(--text-secondary)'} weight="regular" />
                    </div>
                    <span className="mqi-label" style={{ fontSize:13, fontWeight:on?700:600, color:'var(--text)', lineHeight:1.25 }}>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Bottom: logout + settings */}
            <div style={{ display:'flex', gap:6, marginTop:2 }}>
              <button onClick={logout}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, fontSize:13, fontWeight:600, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>
                <Ico name="logout" sz={15} c="currentColor" weight="regular"/>
                Abmelden
              </button>
              <Link href="/settings" onClick={() => setMore(false)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, fontSize:13, fontWeight:600, color:'var(--text)', textDecoration:'none' }}>
                <Ico name="settings" sz={15} c="currentColor" weight="regular"/>
                Einstellungen
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
