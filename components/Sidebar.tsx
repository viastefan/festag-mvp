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
  { href:'/activity',        icon:'activity', label:'Aktivität' },
]
const PROJECT_NAV: NavItem[] = [
  { href:'/project/current', icon:'project',  label:'Mein Projekt' },
  { href:'/reports',         icon:'doc',      label:'Statusberichte' },
  { href:'/ai',              icon:'sparkle',  label:'AI Assistent' },
  { href:'/documents',       icon:'doc',      label:'Dokumente' },
]
const TOOLS_NAV: NavItem[] = [
  { href:'/estimator', icon:'estimate', label:'Preisschätzer' },
  { href:'/pricing',   icon:'sparkle',  label:'Pakete & Pläne' },
  { href:'/invite',    icon:'team',     label:'Team einladen' },
  { href:'/addons',    icon:'grid',     label:'Add-ons' },
]
const ACCOUNT_NAV: NavItem[] = [
  { href:'/billing',  icon:'card',     label:'Abrechnung' },
  { href:'/settings', icon:'settings', label:'Einstellungen' },
]

const MOB_PRIMARY: NavItem[] = [
  { href:'/dashboard',       icon:'home',    label:'Home' },
  { href:'/project/current', icon:'project', label:'Projekt' },
  { href:'/ai',              icon:'sparkle', label:'AI' },
  { href:'/messages',        icon:'chat',    label:'Chat' },
  { href:'/settings',        icon:'user',    label:'Profil' },
]
const MOB_MORE: NavItem[] = [
  { href:'/estimator', icon:'estimate', label:'Preisschätzer' },
  { href:'/addons',    icon:'grid',     label:'Add-ons' },
  { href:'/activity',  icon:'activity', label:'Aktivität' },
  { href:'/billing',   icon:'card',     label:'Abrechnung' },
  { href:'/documents', icon:'doc',      label:'Dokumente' },
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
  const [projExp, setProjExp] = useState(true)
  const [viewAs,  setViewAs]  = useState<string|null>(null)

  useEffect(() => {
    setMore(false)
    if (typeof window !== 'undefined') {
      setViewAs(localStorage.getItem('festag_view_as') || null)
    }
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
      if (!data?.length) return
      setProjects(data)
      const prio: Record<string,number> = {active:0,testing:1,planning:2,intake:3,done:4}
      setProjId([...data].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
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
        .mob-bar { position:fixed;bottom:14px;left:50%;transform:translateX(-50%);width:calc(100% - 24px);max-width:400px;background:var(--sidebar-bg);backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);border:1px solid var(--border);box-shadow:var(--shadow-lg);border-radius:24px;z-index:200;justify-content:space-around;align-items:center;padding:8px 4px;padding-bottom:calc(8px + var(--safe-bottom)); }
        .mt  { display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;min-height:44px;justify-content:center;cursor:pointer;text-decoration:none;border:none;background:transparent;font-family:inherit;-webkit-tap-highlight-color:transparent; }
        .mt:active { transform:scale(.9); }
        .mti { width:34px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:9px;transition:background .12s; }
        .mt.on .mti  { background:var(--nav-on); }
        .mt.has-avatar .mti { background:transparent !important; }
        .mt.on .ml   { color:var(--text);font-weight:700; }
        .mt.off .ml  { color:var(--text-muted);font-weight:500; }
        .ml { font-size:10px;letter-spacing:.01em;transition:color .12s;line-height:1; }
        .mbd { position:fixed;inset:0;z-index:198;background:rgba(0,0,0,.32);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px); }
        .msh { position:fixed;bottom:0;left:0;right:0;z-index:199;background:var(--surface);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border-radius:20px 20px 0 0;border-top:1px solid rgba(0,0,0,.05);padding:8px 18px calc(110px + var(--safe-bottom)) 18px;box-shadow:0 -8px 40px rgba(15,23,42,.09);animation:shUp .18s cubic-bezier(.16,1,.3,1); }
        @keyframes shUp { from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:translateY(0);} }
        .mr { display:flex;align-items:center;gap:13px;padding:11px 3px;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;-webkit-tap-highlight-color:transparent; }
        .mr:last-child{border-bottom:none;}
        .mr:active{opacity:.6;}
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
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:`${ROLE_COLOR[viewAs||role]}20`, color:ROLE_COLOR[viewAs||role], letterSpacing:'.05em' }}>{ROLE_LABEL[viewAs||role] ?? 'Client'}{viewAs ? ' · TEST' : ''}</span>
                  </div>
                </div>
              </div>
            </Link>
            {role === 'admin' && (
              <div style={{ display:'flex', gap:3, marginTop:6, padding:'2px', background:'var(--surface-2)', borderRadius:7 }}>
                {(['admin','dev','client'] as const).map(r => {
                  const active = (viewAs||role) === r
                  return (
                    <button key={r} onClick={() => {
                      const next = r === role ? null : r
                      if (next) localStorage.setItem('festag_view_as', next)
                      else localStorage.removeItem('festag_view_as')
                      setViewAs(next)
                      window.location.reload()
                    }}
                    style={{ flex:1, padding:'4px 0', fontSize:9.5, fontWeight:700, border:'none', cursor:'pointer', borderRadius:5, background:active?'var(--bg)':'transparent', color:active?ROLE_COLOR[r]:'var(--text-muted)', fontFamily:'inherit', boxShadow:active?'0 1px 3px rgba(0,0,0,.06)':'none' }}>
                      {ROLE_LABEL[r]}
                    </button>
                  )
                })}
              </div>
            )}
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
      ══════════════════════════════════ */}
      <nav className="bottom-nav mob-bar">
        {MOB_PRIMARY.map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'} ${item.icon==='user'&&avatar?'has-avatar':''}`}>
              <div className="mti">
                {item.icon==='user' && avatar ? (
                  <img src={avatar} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', border:on?'2.5px solid var(--bg)':'2px solid var(--border)', display:'block' }} />
                ) : (
                  <div style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Ico name={item.icon} sz={22} c={on?'var(--text)':'var(--text-muted)'} sw={on?2.1:1.65} />
                  </div>
                )}
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}
        <button className={`mt ${more?'on':'off'}`} onClick={() => setMore(v => !v)}>
          <div className="mti">
            <div style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Ico name={more?'close':'more'} sz={22} c={more?'var(--text)':'var(--text-muted)'} sw={more?2.1:1.65} />
            </div>
          </div>
          <span className="ml">{more?'Schließen':'Mehr'}</span>
        </button>
      </nav>

      {/* Mehr sheet */}
      {more && (
        <>
          <div className="mbd" onClick={() => setMore(false)} />
          <div className="msh">
            <div style={{ width:34, height:4, borderRadius:2, background:'var(--border-strong)', margin:'0 auto 14px' }}/>
            <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', marginBottom:6 }}>WEITERE SEITEN</p>
            {MOB_MORE.map(item => {
              const on = isOn(item.href)
              return (
                <Link key={item.href} href={resolve(item.href)} className="mr" onClick={() => setMore(false)}>
                  <div style={{ width:40, height:40, borderRadius:11, background:on?'var(--text)':'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Ico name={item.icon} sz={18} c={on?'var(--bg)':'var(--text-secondary)'} sw={1.75} />
                  </div>
                  <p style={{ fontSize:15, fontWeight:on?700:600, color:'var(--text)', margin:0, flex:1 }}>{item.label}</p>
                  <Ico name="chevron" sz={14} c="var(--text-muted)" sw={1.75} />
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
