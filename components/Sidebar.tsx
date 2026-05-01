'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

/* ── Project color palette ── */
const PROJECT_COLORS = ['#6366f1','#0ea5e9','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#14b8a6']
export function projectColor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PROJECT_COLORS[h % PROJECT_COLORS.length]
}

/* ── Icon renderer ── */
function Ico({ name, sz=16, c='currentColor', sw=1.75 }: { name:string; sz?:number; c?:string; sw?:number }) {
  const paths: Record<string,React.ReactNode> = {
    home:     <><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></>,
    project:  <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>,
    sparkle:  <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    chat:     <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    billing:  <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
    doc:      <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></>,
    user:     <><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    estimate: <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></>,
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    chevron:  <polyline points="9 18 15 12 9 6"/>,
    more:     <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    close:    <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>,
    logout:   <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    team:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bell:     <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    card:     <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
  }
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? null}
    </svg>
  )
}

type NavItem = { href: string; icon: string; label: string; badge?: number }

const MAIN_NAV: NavItem[] = [
  { href:'/dashboard',       icon:'home',     label:'Dashboard' },
  { href:'/messages',        icon:'chat',     label:'Nachrichten' },
  { href:'/teams',           icon:'team',     label:'Teams' },
  { href:'/activity',        icon:'activity', label:'Aktivität' },
]
const PROJECT_NAV: NavItem[] = [
  { href:'/project/current', icon:'project',  label:'Mein Projekt' },
  { href:'/reports',         icon:'doc',      label:'Statusberichte' },
  { href:'/ai',              icon:'sparkle',  label:'AI Assistent' },
  { href:'/documents',       icon:'doc',      label:'Dokumente' },
]
const TOOLS_NAV: NavItem[] = [
  { href:'/estimator',  icon:'estimate', label:'Preisschätzer' },
  { href:'/pricing',    icon:'sparkle',  label:'Pakete & Pläne' },
  { href:'/invite',     icon:'team',     label:'Team einladen' },
  { href:'/connectors', icon:'grid',     label:'Connectors' },
  { href:'/addons',     icon:'grid',     label:'Add-ons' },
]
const ACCOUNT_NAV: NavItem[] = [
  { href:'/billing',  icon:'card',     label:'Abrechnung' },
  { href:'/settings', icon:'settings', label:'Einstellungen' },
]

const MOB_PRIMARY: NavItem[] = [
  { href:'/dashboard',       icon:'home',    label:'Home' },
  { href:'/project/current', icon:'project', label:'Projekt' },
  // center FAB slot
  { href:'/ai',              icon:'sparkle', label:'AI' },
  { href:'/settings',        icon:'user',    label:'Profil' },
]

// Quick actions in the FAB pop-up menu
const MOB_QUICK = [
  { href:'/new-project', icon:'plus',     label:'Neues Projekt',   primary: true },
  { href:'/messages',    icon:'chat',     label:'Nachrichten' },
  { href:'/teams',       icon:'team',     label:'Teams' },
  { href:'/activity',    icon:'activity', label:'Aktivität' },
  { href:'/documents',   icon:'doc',      label:'Dokumente' },
  { href:'/estimator',   icon:'estimate', label:'Preisschätzer' },
  { href:'/addons',      icon:'grid',     label:'Add-ons' },
  { href:'/billing',     icon:'card',     label:'Abrechnung' },
]

const ROLE_LABEL: Record<string,string> = { client:'Client', dev:'Developer', admin:'Admin' }
const ROLE_COLOR: Record<string,string> = { client:'var(--accent)', dev:'#22c55e', admin:'#f59e0b' }

export default function Sidebar() {
  const pathname  = usePathname()
  const [email,   setEmail]   = useState('')
  const [fn,      setFn]      = useState('')
  const [avatar,  setAvatar]  = useState<string|null>(null)
  const [role,    setRole]    = useState('client')
  const [projId,  setProjId]  = useState<string|null>(null)
  const [projects,setProjects]= useState<{id:string;title:string;status:string}[]>([])
  const [more,    setMore]    = useState(false)
  const [projExp, setProjExp] = useState(false)

  useEffect(() => {
    setMore(false)
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data:p } = await sb.from('profiles').select('first_name,full_name,avatar_url,role').eq('id', data.user.id).single()
      if (p) {
        setFn((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setAvatar((p as any).avatar_url ?? null)
        setRole((p as any).role ?? 'client')
      }
    })
    createClient().from('projects').select('id,title,status').order('created_at',{ascending:false}).limit(8).then(({data}) => {
      const list = (data as any[]) ?? []
      if (!list.length) { setProjects([]); setProjExp(false); return }
      setProjects(list)
      // Auto-expand the project section once user has at least one project
      setProjExp(true)
      const prio: Record<string,number> = {active:0,testing:1,planning:2,intake:3,done:4}
      setProjId([...list].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
    })
  }, [pathname])

  const logout  = async () => { await createClient().auth.signOut(); window.location.href='/login' }
  const resolve = (h:string) => h==='/project/current'?(projId?`/project/${projId}`:'/dashboard'):h
  const isOn    = (h:string) => {
    if (h==='/dashboard')       return pathname==='/dashboard'
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
              <Ico name={item.icon} sz={15} c={on?'var(--text)':'var(--text-muted)'} sw={on?2.1:1.65} />
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

          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration:'none', display:'block', padding:'0 8px', marginBottom:18 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height:18, display:'block', filter:'var(--logo-filter,none)' }}/>
          </Link>

          {/* Scrollable nav */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>

            {/* Main nav */}
            <NavSection label="Übersicht" items={MAIN_NAV} />

            {/* Projects */}
            <div style={{ marginBottom:4 }}>
              <button onClick={() => setProjExp(v => !v)}
                style={{ display:'flex', alignItems:'center', gap:6, width:'100%', padding:'6px 11px 3px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                <span style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.09em', textTransform:'uppercase', opacity:.6, flex:1, textAlign:'left' }}>Projekte</span>
                <span style={{ opacity:.4, transition:'transform .15s', display:'block', transform:projExp?'rotate(90deg)':'none' }}>
                  <Ico name="chevron" sz={11} c="var(--text-muted)" sw={2} />
                </span>
                <Link href="/new-project" onClick={e => e.stopPropagation()}
                  style={{ opacity:.5, display:'flex', marginLeft:2, padding:2, borderRadius:5, textDecoration:'none' }}>
                  <Ico name="plus" sz={11} c="var(--text-muted)" sw={2.2} />
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

                  {/* Project sub-nav (current project) */}
                  {projId && (
                    <div style={{ marginLeft:11, borderLeft:'1.5px solid var(--border)', paddingLeft:8, marginTop:2, marginBottom:2 }}>
                      {PROJECT_NAV.map(item => {
                        const on = isOn(item.href)
                        return (
                          <Link key={item.href} href={resolve(item.href)}
                            className={`ni ${on?'ni-on':'ni-off'}`}
                            style={{ fontSize:12, padding:'5px 9px', borderRadius:7 }}>
                            <Ico name={item.icon} sz={13} c={on?'var(--text)':'var(--text-muted)'} sw={on?2:1.6} />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <NavSection label="Tools" items={TOOLS_NAV} />
            <NavSection label="Konto" items={ACCOUNT_NAV} />
          </div>

          {/* User block */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, paddingBottom:6, marginTop:8 }}>
            <Link href="/settings" style={{ textDecoration:'none' }}>
              <div className="usr-row"
                style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 9px', borderRadius:10, cursor:'pointer', transition:'background .1s' }}>
                {avatar ? (
                  <img src={avatar} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--border)', flexShrink:0 }}/>
                ) : (
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--accent-text)', flexShrink:0 }}>{init}</div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:`${ROLE_COLOR[role]}20`, color:ROLE_COLOR[role], letterSpacing:'.05em' }}>{ROLE_LABEL[role] ?? 'Client'}</span>
                  </div>
                </div>
              </div>
            </Link>
            <button onClick={logout}
              style={{ width:'100%', padding:'7px 9px', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', fontSize:11.5, color:'var(--text-muted)', borderRadius:9, marginTop:4, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, transition:'color .1s' }}
              onMouseEnter={e => (e.currentTarget.style.color='var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}>
              <Ico name="logout" sz={12} c="currentColor" sw={2} />
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════
          MOBILE FLOATING NAV BAR
          4 items + center FAB (three-dots)
      ══════════════════════════════════ */}
      <nav className="bottom-nav mob-bar">
        {/* Left 2: Home, Projekt */}
        {MOB_PRIMARY.slice(0,2).map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'}`}>
              <div className="mti">
                <Ico name={item.icon} sz={21} c={on?'var(--text)':'var(--text-muted)'} sw={on?2.1:1.65} />
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}

        {/* Center FAB — plus / close */}
        <button className={`mob-fab ${more?'open':''}`} onClick={() => setMore(v => !v)} aria-label="Menü">
          {more
            ? <Ico name="close"  sz={20} c="var(--text)"          sw={2.5} />
            : <Ico name="plus"   sz={22} c="var(--btn-prim-text)" sw={2.2} />
          }
        </button>

        {/* Right 2: AI, Profil */}
        {MOB_PRIMARY.slice(2).map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'} ${item.icon==='user'&&avatar?'has-avatar':''}`}>
              <div className="mti">
                {item.icon==='user' && avatar ? (
                  <img src={avatar} alt="" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover', border:on?'2.5px solid var(--text)':'2px solid var(--border)', display:'block' }} />
                ) : (
                  <Ico name={item.icon} sz={21} c={on?'var(--text)':'var(--text-muted)'} sw={on?2.1:1.65} />
                )}
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Quick action panel — slides up from FAB */}
      {more && (
        <>
          <div className="mbd" onClick={() => setMore(false)} />
          <div className="mob-quick">
            {/* Primary action first */}
            <Link href="/new-project" className="mqi primary-action" onClick={() => setMore(false)}>
              <div className="mqi-ico" style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:'rgba(0,0,0,.14)' }}>
                <Ico name="plus" sz={18} c="var(--btn-prim-text)" sw={2.2} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p className="mqi-label" style={{ fontSize:15, fontWeight:700, margin:'0 0 1px', color:'var(--btn-prim-text)' }}>Neues Projekt</p>
                <p style={{ fontSize:11.5, margin:0, color:'var(--btn-prim-text)', opacity:.65 }}>Projekt starten →</p>
              </div>
            </Link>

            {/* 2-col grid for secondary actions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {MOB_QUICK.slice(1).map(item => {
                const on = isOn(item.href)
                return (
                  <Link key={item.href} href={resolve(item.href)} className="mqi" onClick={() => setMore(false)}
                    style={{ borderRadius:14, gap:10, padding:'12px 13px' }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:on?'var(--text)':'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Ico name={item.icon} sz={16} c={on?'var(--bg)':'var(--text-secondary)'} sw={1.8} />
                    </div>
                    <span className="mqi-label" style={{ fontSize:13, fontWeight:on?700:600, color:'var(--text)', lineHeight:1.25 }}>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Bottom: theme + logout row */}
            <div style={{ display:'flex', gap:6, marginTop:2 }}>
              <button onClick={logout}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, fontSize:13, fontWeight:600, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>
                <Ico name="logout" sz={15} c="currentColor" sw={1.8}/>
                Abmelden
              </button>
              <Link href="/settings" onClick={() => setMore(false)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, fontSize:13, fontWeight:600, color:'var(--text)', textDecoration:'none' }}>
                <Ico name="settings" sz={15} c="currentColor" sw={1.8}/>
                Einstellungen
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
