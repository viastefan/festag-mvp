'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const ALL_NAV = [
  { href:'/dashboard',       icon:'home',     label:'Home' },
  { href:'/project/current', icon:'project',  label:'Aktuelles Projekt' },
  { href:'/ai',              icon:'sparkle',  label:'AI' },
  { href:'/messages',        icon:'chat',     label:'Messages' },
  { href:'/addons',          icon:'grid',     label:'Add-ons' },
  { href:'/activity',        icon:'activity', label:'Activity' },
  { href:'/billing',         icon:'billing',  label:'Billing' },
  { href:'/documents',       icon:'doc',      label:'Dokumente' },
  { href:'/settings',        icon:'user',     label:'Profil' },
]
const MOB_PRIMARY = [
  { href:'/dashboard',       icon:'home',    label:'Home' },
  { href:'/project/current', icon:'project', label:'Projekt' },
  { href:'/ai',              icon:'sparkle', label:'AI' },
  { href:'/messages',        icon:'chat',    label:'Chat' },
  { href:'/settings',        icon:'user',    label:'Profil' },
]
const MOB_MORE = [
  { href:'/addons',    icon:'grid',     label:'Add-ons' },
  { href:'/activity',  icon:'activity', label:'Activity' },
  { href:'/billing',   icon:'billing',  label:'Billing' },
  { href:'/documents', icon:'doc',      label:'Dokumente' },
]

function Ico({ name, sz=18, on=false }: { name:string; sz?:number; on?:boolean }) {
  const c = on ? '#0F172A' : '#94A3B8', sw = on ? 2 : 1.7
  if (name==='grid') return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  const d: Record<string,string> = {
    home:    'M3 12l9-9 9 9 M5 10v10h14V10',
    project: 'M3 3h18v18H3z M3 9h18 M9 21V9',
    sparkle: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4',
    chat:    'M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z',
    activity:'M22 12h-4l-3 9L9 3l-3 9H2',
    billing: 'M2 5h20v14H2z M2 10h20',
    doc:     'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4',
    user:    'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c0-4 4-6 8-6s8 2 8 6',
    more:    'M5 12h.01 M12 12h.01 M19 12h.01',
    close:   'M18 6L6 18 M6 6l12 12',
  }
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {(d[name]||'').split(' M').map((seg,i) => <path key={i} d={i===0?seg:'M'+seg} />)}
    </svg>
  )
}

export default function Sidebar() {
  const pathname  = usePathname()
  const [email,   setEmail]   = useState('')
  const [fn,      setFn]      = useState('')
  const [avatar,  setAvatar]  = useState<string|null>(null)
  const [projId,  setProjId]  = useState<string|null>(null)
  const [more,    setMore]    = useState(false)

  useEffect(() => {
    setMore(false)
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data:p } = await sb.from('profiles').select('first_name,full_name,avatar_url').eq('id',data.user.id).single()
      if (p) { setFn(p.first_name ?? p.full_name?.split(' ')[0] ?? ''); setAvatar(p.avatar_url ?? null) }
    })
    createClient().from('projects').select('id,status').order('created_at',{ascending:false}).limit(5).then(({data}) => {
      if (!data?.length) return
      const prio: Record<string,number> = {active:0,testing:1,planning:2,intake:3,done:4}
      setProjId([...data].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
    })
  }, [pathname])

  const logout = async () => { await createClient().auth.signOut(); window.location.href='/login' }
  const resolve = (h:string) => h==='/project/current'?(projId?`/project/${projId}`:'/dashboard'):h
  const isOn = (h:string) => {
    if (h==='/dashboard') return pathname==='/dashboard'
    if (h==='/project/current') return pathname.startsWith('/project/')
    return pathname.startsWith(h)
  }
  const name  = fn || email.split('@')[0] || 'Konto'
  const init  = (fn || email || 'U').charAt(0).toUpperCase()

  return (
    <>
      <style>{`
        .ni { display:flex;align-items:center;gap:10px;padding:8px 11px;border-radius:11px;font-size:13.5px;font-weight:500;cursor:pointer;text-decoration:none;color:inherit;transition:all .1s; }
        .ni-on  { background:#F1F5F9;font-weight:700;color:#0F172A; }
        .ni-off { color:#64748B; }
        .ni-off:hover { background:#F8FAFC;color:#0F172A; }
        /* Mobile floating bar */
        .mob-bar {
          position:fixed;bottom:14px;left:50%;transform:translateX(-50%);
          width:calc(100% - 28px);max-width:400px;
          background:rgba(255,255,255,.88);
          backdrop-filter:blur(28px) saturate(200%) brightness(105%);
          -webkit-backdrop-filter:blur(28px) saturate(200%) brightness(105%);
          border:1px solid rgba(255,255,255,.95);
          border-bottom:1px solid rgba(0,0,0,.04);
          box-shadow:0 8px 32px rgba(15,23,42,.10),0 2px 8px rgba(15,23,42,.05),inset 0 1px 0 rgba(255,255,255,1);
          border-radius:22px;z-index:200;
          display:flex;justify-content:space-around;align-items:center;
          padding:8px 4px;padding-bottom:calc(8px + var(--safe-bottom));
        }
        .mt { display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;min-height:44px;justify-content:center;cursor:pointer;text-decoration:none;border:none;background:transparent;font-family:inherit;-webkit-tap-highlight-color:transparent; }
        .mt:active { transform:scale(.9); }
        .mti { width:34px;height:27px;display:flex;align-items:center;justify-content:center;border-radius:9px;transition:background .12s; }
        .mt.on .mti  { background:rgba(15,23,42,.08); }
        .mt.on .ml   { color:#0F172A;font-weight:700; }
        .mt.off .ml  { color:#94A3B8;font-weight:500; }
        .ml { font-size:10px;letter-spacing:.01em;transition:color .12s; }
        /* More sheet */
        .mbd { position:fixed;inset:0;z-index:198;background:rgba(0,0,0,.08);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px); }
        .msh {
          position:fixed;bottom:0;left:0;right:0;z-index:199;
          background:rgba(255,255,255,.97);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
          border-radius:20px 20px 0 0;border-top:1px solid rgba(0,0,0,.05);
          padding:8px 18px calc(110px + var(--safe-bottom)) 18px;
          box-shadow:0 -8px 40px rgba(15,23,42,.09);
          animation:shUp .18s cubic-bezier(.16,1,.3,1);
        }
        @keyframes shUp { from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:translateY(0);} }
        .mr { display:flex;align-items:center;gap:13px;padding:11px 3px;border-bottom:1px solid #F8FAFC;text-decoration:none;color:inherit;-webkit-tap-highlight-color:transparent; }
        .mr:last-child{border-bottom:none;}
        .mr:active{opacity:.6;}
      `}</style>

      {/* ══ DESKTOP — floating sidebar card ══ */}
      <aside className="sidebar" style={{ position:'fixed',top:0,left:0,width:256,height:'100vh',zIndex:100,padding:'12px' }}>
        <div className="sidebar-inner" style={{ height:'100%',display:'flex',flexDirection:'column',padding:'20px 10px 20px 10px' }}>
          {/* Logo — slightly bigger */}
          <Link href="/dashboard" style={{ textDecoration:'none' }}>
            <div style={{ padding:'0 8px',marginBottom:24 }}>
              <img src="/brand/logo.svg" alt="festag" style={{ height:15,display:'block' }} />
            </div>
          </Link>

          <nav style={{ flex:1,display:'flex',flexDirection:'column',gap:1,overflowY:'auto' }}>
            {ALL_NAV.map(item => {
              const on = isOn(item.href)
              return (
                <Link key={item.href} href={resolve(item.href)} className={`ni ${on?'ni-on':'ni-off'}`}>
                  <Ico name={item.icon} sz={16} on={on} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User */}
          <div style={{ borderTop:'1px solid #F5F7FA',paddingTop:10,marginTop:6 }}>
            <Link href="/settings" style={{ textDecoration:'none' }}>
              <div style={{ display:'flex',alignItems:'center',gap:9,padding:'7px 9px',borderRadius:11,cursor:'pointer',transition:'background .1s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#F8FAFC'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
              >
                {avatar
                  ? <img src={avatar} alt="" style={{ width:28,height:28,borderRadius:'50%',objectFit:'cover',border:'2px solid #F1F5F9',flexShrink:0 }}/>
                  : <div style={{ width:28,height:28,borderRadius:'50%',background:'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#0F172A',flexShrink:0 }}>{init}</div>
                }
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:12.5,fontWeight:600,color:'#0F172A',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name}</p>
                  <p style={{ fontSize:10.5,color:'#94A3B8',margin:0 }}>Client</p>
                </div>
              </div>
            </Link>
            <button onClick={logout} style={{ width:'100%',padding:'6px 9px',textAlign:'left',border:'none',background:'transparent',cursor:'pointer',fontSize:11.5,color:'#94A3B8',borderRadius:9,marginTop:1,marginBottom:4,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* ══ MOBILE — floating glass bar (ONLY mobile) ══ */}
      <nav className="bottom-nav mob-bar">
        {MOB_PRIMARY.map(item => {
          const on = isOn(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className={`mt ${on?'on':'off'}`}>
              <div className="mti">
                {item.icon==='user' && avatar
                  ? <img src={avatar} alt="" style={{ width:22,height:22,borderRadius:'50%',objectFit:'cover',border:`2px solid ${on?'#0F172A':'#E2E8F0'}` }}/>
                  : <Ico name={item.icon} sz={21} on={on} />
                }
              </div>
              <span className="ml">{item.label}</span>
            </Link>
          )
        })}
        <button className={`mt ${more?'on':'off'}`} onClick={()=>setMore(v=>!v)}>
          <div className="mti"><Ico name={more?'close':'more'} sz={21} on={more} /></div>
          <span className="ml">{more?'Schließen':'Mehr'}</span>
        </button>
      </nav>

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
                  <div style={{ width:40,height:40,borderRadius:11,background:on?'#0F172A':'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <Ico name={item.icon} sz={19} on={on} />
                  </div>
                  <p style={{ fontSize:15,fontWeight:on?700:600,color:'#0F172A',margin:0,flex:1 }}>{item.label}</p>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
