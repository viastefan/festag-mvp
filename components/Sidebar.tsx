'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const ALL_NAV = [
  { href:'/dashboard',       label:'Home' },
  { href:'/project/current', label:'Aktuelles Projekt' },
  { href:'/ai',              label:'AI' },
  { href:'/messages',        label:'Messages' },
  { href:'/addons',          label:'Add-ons' },
  { href:'/activity',        label:'Activity' },
  { href:'/billing',         label:'Billing' },
  { href:'/documents',       label:'Dokumente' },
  { href:'/settings',        label:'Profil' },
]
const MOB_PRIMARY = [
  { href:'/dashboard',       label:'Home' },
  { href:'/project/current', label:'Projekt' },
  { href:'/ai',              label:'AI' },
  { href:'/messages',        label:'Chat' },
  { href:'/settings',        label:'Profil' },
]
const MOB_MORE = [
  { href:'/addons',    label:'Add-ons' },
  { href:'/activity',  label:'Activity' },
  { href:'/billing',   label:'Billing' },
  { href:'/documents', label:'Dokumente' },
]

const PROJECT_COLORS = ['#2563EB', '#0EA5E9', '#16A36C', '#D97706', '#7C3AED', '#DC2626']

export function projectColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}

export default function Sidebar() {
  const pathname = usePathname()
  const [email,   setEmail]   = useState('')
  const [fn,      setFn]      = useState('')
  const [avatar,  setAvatar]  = useState<string|null>(null)
  const [projId,  setProjId]  = useState<string|null>(null)
  const [more,    setMore]    = useState(false)
  const [helpOpen,setHelpOpen]= useState(false)

  useEffect(() => {
    setMore(false)
    setHelpOpen(false)
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data:p } = await sb.from('profiles').select('first_name,full_name,avatar_url').eq('id', data.user.id).single()
      if (p) {
        setFn(p.first_name ?? p.full_name?.split(' ')[0] ?? '')
        setAvatar(p.avatar_url ?? null)
      }
    })
    createClient().from('projects').select('id,status').order('created_at',{ascending:false}).limit(5).then(({data}) => {
      if (!data?.length) return
      const prio: Record<string,number> = {active:0,testing:1,planning:2,intake:3,done:4}
      setProjId([...data].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
    })
  }, [pathname])

  const logout = async () => { await createClient().auth.signOut(); window.location.href='/login' }
  const resolve = (h:string) => h==='/project/current' ? (projId?`/project/${projId}`:'/dashboard') : h
  const isOn = (h:string) => {
    if (h==='/dashboard') return pathname==='/dashboard'
    if (h==='/project/current') return pathname.startsWith('/project/')
    return pathname.startsWith(h)
  }
  const name = fn || email.split('@')[0] || 'Konto'
  const init = (fn || email || 'U').charAt(0).toUpperCase()

  return (
    <>
      <style>{`
        /* ── Desktop nav items ── */
        .ni { display:flex;align-items:center;padding:7px 10px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;color:inherit;transition:background .12s,color .12s;white-space:nowrap;overflow:hidden; }
        .ni-on  { background:var(--nav-on);font-weight:650;color:var(--nav-on-text); }
        .ni-off { color:var(--nav-off-text); }
        .ni-off:hover { background:rgba(15,23,42,.045);color:var(--text); }

        /* ── Mobile floating bar — ONLY rendered on mobile via .bottom-nav class ──
           The .bottom-nav class is display:none on desktop (globals.css)
           and display:flex on mobile. So this CSS only takes effect on mobile. */
        .mob-bar {
          position: fixed;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 24px);
          max-width: 400px;

          /* ── 90% white + subtle glass — modern & clean ──
             High opacity white gives crisp readable tabs.
             Small blur adds the glass depth without muddiness. */
          background: rgba(255, 255, 255, 0.90);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);

          /* Thicker border for the premium card look */
          border: 1.5px solid rgba(255, 255, 255, 0.96);
          border-bottom: 1.5px solid rgba(180, 200, 220, 0.35);

          /* Refined shadow stack */
          box-shadow:
            0 8px 32px rgba(15, 23, 42, 0.10),
            0 3px 10px rgba(15, 23, 42, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 1);

          border-radius: 18px;
          z-index: 200;
          justify-content: space-around;
          align-items: center;
          padding: 8px 4px;
          padding-bottom: calc(8px + var(--safe-bottom));
        }

        .mt { display:flex;align-items:center;justify-content:center;flex:1;min-height:40px;cursor:pointer;text-decoration:none;border:none;background:transparent;font-family:inherit;-webkit-tap-highlight-color:transparent; }
        .mt:active { transform:scale(.9); }
        .mt.on  { background:rgba(15,23,42,.08); border-radius:9px; }
        .mt.on  .ml  { color:#0F172A;font-weight:700; }
        .mt.off .ml  { color:#94A3B8;font-weight:500; }
        .ml { font-size:11px;letter-spacing:.01em;transition:color .12s;line-height:1; }

        /* More sheet */
        .mbd { position:fixed;inset:0;z-index:198;background:rgba(0,0,0,.08);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px); }
        .msh {
          position:fixed;bottom:0;left:0;right:0;z-index:199;
          background:rgba(255,255,255,.97);
          backdrop-filter:blur(28px);
          -webkit-backdrop-filter:blur(28px);
          border-radius:20px 20px 0 0;
          border-top:1px solid rgba(0,0,0,.05);
          padding:8px 18px calc(110px + var(--safe-bottom)) 18px;
          box-shadow:0 -8px 40px rgba(15,23,42,.09);
          animation:shUp .18s cubic-bezier(.16,1,.3,1);
        }
        @keyframes shUp { from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:translateY(0);} }
        .mr { display:flex;align-items:center;gap:13px;padding:11px 3px;border-bottom:1px solid #F8FAFC;text-decoration:none;color:inherit;-webkit-tap-highlight-color:transparent; }
        .mr:last-child{border-bottom:none;}
        .mr:active{opacity:.6;}
        .help-menu { position:absolute;left:0;right:0;bottom:68px;background:#17181b;border:1px solid rgba(255,255,255,.08);border-radius:14px;box-shadow:0 24px 60px rgba(15,23,42,.24);padding:7px;z-index:220; }
        .help-row { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border-radius:8px;color:rgba(255,255,255,.78);font-size:12.5px;font-weight:550;text-decoration:none; }
        .help-row:hover { background:rgba(255,255,255,.06);color:#fff; }
        .help-kbd { color:rgba(255,255,255,.42);font-size:11px;font-weight:600; }
        .account-shell { background:#17181b;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:8px;box-shadow:0 10px 30px rgba(15,23,42,.18); }
        .account-row { display:flex;align-items:center;gap:10px;padding:4px 4px 8px 4px;color:#fff;text-decoration:none; }
        .account-meta { font-size:11px;color:rgba(255,255,255,.45);margin:0; }
        .account-name { font-size:13px;font-weight:650;color:#fff;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .account-actions { display:flex;gap:6px; }
        .account-btn { height:30px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);border-radius:8px;color:rgba(255,255,255,.78);font-size:11.5px;font-weight:600;font-family:inherit;padding:0 10px; }
        .account-btn:hover { background:rgba(255,255,255,.08);color:#fff; }
      `}</style>

      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR
          Shown via .sidebar class (display:flex on desktop)
      ════════════════════════════════════════ */}
      <aside className="sidebar" style={{ position:'fixed',top:0,left:0,width:256,height:'100vh',zIndex:100,padding:'12px',pointerEvents:'none' }}>
        <div className="sidebar-inner" style={{ pointerEvents:'all',padding:'18px 10px 18px 10px',display:'flex',flexDirection:'column',height:'100%' }}>

          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration:'none',display:'block' }}>
            <div style={{ padding:'0 8px',marginBottom:20 }}>
              <img src="/brand/logo.svg" alt="festag" style={{ height:14,display:'block',filter:'var(--logo-filter,none)',opacity:.92 }} />
            </div>
          </Link>

          {/* Nav items */}
          <nav style={{ flex:1,display:'flex',flexDirection:'column',gap:1,overflowY:'auto',overflowX:'hidden' }}>
            {ALL_NAV.map(item => {
              const on = isOn(item.href)
              return (
                <Link key={item.href} href={resolve(item.href)} className={`ni ${on?'ni-on':'ni-off'}`}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Account + help */}
          <div style={{ position:'relative',borderTop:'1px solid var(--border)',paddingTop:10,marginTop:8,paddingBottom:4 }}>
            {helpOpen && (
              <div className="help-menu">
                {[
                  ['Search help', ''],
                  ['Docs', ''],
                  ['Contact us', ''],
                  ['Keyboard shortcuts', 'G then /'],
                  ['System status', ''],
                  ['Settings', 'G then S'],
                  ['Releases', ''],
                  ['Full changelog', ''],
                  ['Impressum & Datenschutz', ''],
                ].map(([label, hint]) => (
                  <Link key={label} href={label === 'Settings' ? '/settings' : '#'} className="help-row" onClick={() => setHelpOpen(false)}>
                    <span>{label}</span>
                    {hint && <span className="help-kbd">{hint}</span>}
                  </Link>
                ))}
              </div>
            )}

            <div className="account-shell">
              <Link href="/settings" className="account-row">
                {avatar ? (
                  <img src={avatar} alt="" style={{ width:30,height:30,borderRadius:'50%',objectFit:'cover',border:'1px solid rgba(255,255,255,.12)',flexShrink:0 }}/>
                ) : (
                  <div style={{ width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0 }}>{init}</div>
                )}
                <div style={{ flex:1,minWidth:0 }}>
                  <p className="account-name">{name}</p>
                  <p className="account-meta">Pro</p>
                </div>
                <span style={{ color:'rgba(255,255,255,.42)',fontSize:11,flexShrink:0 }}>Menu</span>
              </Link>
              <div className="account-actions">
                <button
                  onClick={() => setHelpOpen(v => !v)}
                  className="account-btn"
                  aria-label="Help"
                >
                  Help
                </button>
                <button
                  onClick={logout}
                  className="account-btn"
                >
                  Abmelden
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE FLOATING NAV BAR
          .bottom-nav = display:none on desktop, display:flex on mobile (globals.css)
      ════════════════════════════════════════ */}
      <nav className="bottom-nav mob-bar">
        {MOB_PRIMARY.map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'}`}>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}

        {/* Mehr */}
        <button className={`mt ${more?'on':'off'}`} onClick={()=>setMore(v=>!v)}>
          <span className="ml">{more?'Schließen':'Mehr'}</span>
        </button>
      </nav>

      {/* Mehr sheet */}
      {more && (
        <>
          <div className="mbd" onClick={()=>setMore(false)} />
          <div className="msh">
            <div style={{ width:34,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 14px' }}/>
            <p style={{ fontSize:10.5,fontWeight:700,color:'#94A3B8',letterSpacing:'.08em',marginBottom:6 }}>WEITERE SEITEN</p>
            {MOB_MORE.map(item => {
              const on = isOn(item.href)
              return (
                <Link key={item.href} href={resolve(item.href)} className="mr" onClick={()=>setMore(false)}>
                  <p style={{ fontSize:15,fontWeight:on?700:600,color:'#0F172A',margin:0,flex:1 }}>{item.label}</p>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
