'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const ALL_NAV = [
  { href: '/dashboard',       icon: 'home',     label: 'Home' },
  { href: '/project/current', icon: 'project',  label: 'Aktuelles Projekt' },
  { href: '/ai',              icon: 'sparkle',  label: 'AI' },
  { href: '/messages',        icon: 'chat',     label: 'Messages' },
  { href: '/addons',          icon: 'grid',     label: 'Add-ons' },
  { href: '/activity',        icon: 'activity', label: 'Activity' },
  { href: '/billing',         icon: 'billing',  label: 'Billing' },
  { href: '/documents',       icon: 'doc',      label: 'Dokumente' },
  { href: '/settings',        icon: 'user',     label: 'Profil' },
]

// Mobile: 5 primary + "Mehr" drawer for the rest
const MOB_PRIMARY = [
  { href: '/dashboard',       icon: 'home',    label: 'Home' },
  { href: '/project/current', icon: 'project', label: 'Projekt' },
  { href: '/ai',              icon: 'sparkle', label: 'AI' },
  { href: '/messages',        icon: 'chat',    label: 'Chat' },
  { href: '/settings',        icon: 'user',    label: 'Profil' },
]
const MOB_MORE = [
  { href: '/addons',    icon: 'grid',     label: 'Add-ons' },
  { href: '/activity',  icon: 'activity', label: 'Activity' },
  { href: '/billing',   icon: 'billing',  label: 'Billing' },
  { href: '/documents', icon: 'doc',      label: 'Dokumente' },
]

function SvgIcon({ name, sz = 18, active = false }: { name: string; sz?: number; active?: boolean }) {
  const c = active ? '#0F172A' : '#94A3B8'
  const sw = active ? 2 : 1.7

  if (name === 'grid') return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )

  const d: Record<string, string> = {
    home:     'M3 12l9-9 9 9 M5 10v10h14V10',
    project:  'M3 3h18v18H3z M3 9h18 M9 21V9',
    sparkle:  'M12 3v4 M12 17v4 M3 12h4 M17 12h4',
    chat:     'M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
    billing:  'M2 5h20v14H2z M2 10h20',
    doc:      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4',
    user:     'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c0-4 4-6 8-6s8 2 8 6',
    more:     'M5 12h.01 M12 12h.01 M19 12h.01',
    close:    'M18 6L6 18 M6 6l12 12',
  }

  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {(d[name] || '').split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  )
}

export default function Sidebar() {
  const pathname  = usePathname()
  const [email,      setEmail]      = useState('')
  const [firstName,  setFirstName]  = useState('')
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null)
  const [projectId,  setProjectId]  = useState<string | null>(null)
  const [showMore,   setShowMore]   = useState(false)

  useEffect(() => {
    setShowMore(false) // close drawer on nav
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data: p } = await supabase
        .from('profiles')
        .select('first_name, full_name, avatar_url')
        .eq('id', data.user.id)
        .single()
      if (p) {
        setFirstName(p.first_name ?? p.full_name?.split(' ')[0] ?? '')
        setAvatarUrl(p.avatar_url ?? null)
      }
    })
    supabase.from('projects').select('id,status').order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (!data?.length) return
      const prio: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
      setProjectId([...data].sort((a, b) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9))[0].id)
    })
  }, [pathname])

  const logout  = async () => { await createClient().auth.signOut(); window.location.href = '/login' }
  const resolve = (h: string) => h === '/project/current' ? (projectId ? `/project/${projectId}` : '/dashboard') : h
  const isActive = (h: string) => {
    if (h === '/dashboard') return pathname === '/dashboard'
    if (h === '/project/current') return pathname.startsWith('/project/')
    return pathname.startsWith(h)
  }
  const displayName = firstName || email.split('@')[0] || 'Konto'
  const initial     = (firstName || email || 'U').charAt(0).toUpperCase()

  return (
    <>
      <style>{`
        /* ── Desktop nav items ── */
        .nav-i { display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;color:inherit;transition:background .1s,color .1s; }
        .nav-on  { background:#F1F5F9;font-weight:700;color:#0F172A; }
        .nav-off { color:#64748B; }
        .nav-off:hover { background:#F8FAFC;color:#0F172A; }

        /* ─────────────────────────────────────────────────────
           MOBILE FLOATING NAV — white glassmorphism pill
        ───────────────────────────────────────────────────── */
        .mob-bar {
          position: fixed;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 28px);
          max-width: 420px;
          /* Glassmorphism: translucent white */
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(32px) saturate(200%) brightness(105%);
          -webkit-backdrop-filter: blur(32px) saturate(200%) brightness(105%);
          /* Layered borders for depth */
          border: 1px solid rgba(255,255,255,0.9);
          border-bottom: 1px solid rgba(0,0,0,0.04);
          box-shadow:
            0 8px 32px rgba(15,23,42,0.10),
            0 2px 8px rgba(15,23,42,0.06),
            inset 0 1px 0 rgba(255,255,255,1);
          border-radius: 24px;
          z-index: 200;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 4px;
          padding-bottom: calc(8px + var(--safe-bottom));
        }
        .mob-tab {
          display:flex;flex-direction:column;align-items:center;gap:3px;
          flex:1;min-height:44px;justify-content:center;
          cursor:pointer;text-decoration:none;border:none;background:transparent;
          font-family:inherit;
          transition:transform .1s;
          -webkit-tap-highlight-color:transparent;
        }
        .mob-tab:active { transform:scale(.9); }
        .mob-icon {
          width:36px;height:28px;
          display:flex;align-items:center;justify-content:center;
          border-radius:10px;
          transition:background .12s;
        }
        .mob-tab.mob-on .mob-icon  { background:rgba(15,23,42,0.08); }
        .mob-tab.mob-on .mob-lbl   { color:#0F172A;font-weight:700; }
        .mob-tab.mob-off .mob-lbl  { color:#94A3B8;font-weight:500; }
        .mob-lbl { font-size:10px;letter-spacing:.01em;transition:color .12s; }

        /* ── "Mehr" slide-up sheet ── */
        .more-bd {
          position:fixed;inset:0;z-index:198;
          background:rgba(0,0,0,0.10);
          backdrop-filter:blur(2px);
          -webkit-backdrop-filter:blur(2px);
        }
        .more-sh {
          position:fixed;bottom:0;left:0;right:0;z-index:199;
          background:rgba(255,255,255,0.97);
          backdrop-filter:blur(30px) saturate(180%);
          -webkit-backdrop-filter:blur(30px) saturate(180%);
          border-radius:20px 20px 0 0;
          border-top:1px solid rgba(0,0,0,0.06);
          padding:10px 20px calc(112px + var(--safe-bottom)) 20px;
          box-shadow:0 -8px 40px rgba(15,23,42,0.10);
          animation:sheetUp .2s cubic-bezier(.16,1,.3,1);
        }
        @keyframes sheetUp { from{opacity:0;transform:translateY(36px);}to{opacity:1;transform:translateY(0);} }
        .more-row {
          display:flex;align-items:center;gap:14px;padding:12px 4px;
          border-bottom:1px solid #F1F5F9;text-decoration:none;color:inherit;
          transition:opacity .1s;-webkit-tap-highlight-color:transparent;
        }
        .more-row:last-child { border-bottom:none; }
        .more-row:active { opacity:.65; }
        .more-ico { width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
      `}</style>

      {/* ══════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════ */}
      <aside className="sidebar" style={{
        position:'fixed',top:0,left:0,width:240,height:'100vh',
        background:'#FFF',borderRight:'1px solid #F1F5F9',
        display:'flex',flexDirection:'column',padding:'22px 12px',zIndex:100,
        boxShadow:'1px 0 24px rgba(0,0,0,0.03)',
      }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ textDecoration:'none' }}>
          <div style={{ padding:'0 8px',marginBottom:28 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height:13,display:'block' }} />
          </div>
        </Link>

        <nav style={{ flex:1,display:'flex',flexDirection:'column',gap:2,overflowY:'auto' }}>
          {ALL_NAV.map(item => {
            const on = isActive(item.href)
            return (
              <Link key={item.href} href={resolve(item.href)} className={`nav-i ${on?'nav-on':'nav-off'}`}>
                <SvgIcon name={item.icon} sz={17} active={on} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User block */}
        <div style={{ borderTop:'1px solid #F1F5F9',paddingTop:12,marginTop:8 }}>
          <Link href="/settings" style={{ textDecoration:'none' }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:12,cursor:'pointer',transition:'background .12s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#F8FAFC'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width:30,height:30,borderRadius:'50%',objectFit:'cover',border:'2px solid #F1F5F9',flexShrink:0 }} />
                : <div style={{ width:30,height:30,borderRadius:'50%',background:'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#0F172A',flexShrink:0 }}>{initial}</div>
              }
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:13,fontWeight:600,color:'#0F172A',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{displayName}</p>
                <p style={{ fontSize:11,color:'#94A3B8',margin:0 }}>Client</p>
              </div>
            </div>
          </Link>
          <button onClick={logout} style={{ width:'100%',padding:'7px 10px',textAlign:'left',border:'none',background:'transparent',cursor:'pointer',fontSize:12,color:'#94A3B8',borderRadius:10,marginTop:2,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Abmelden
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════
          MOBILE FLOATING NAV BAR
      ══════════════════════════════════════ */}
      <nav className="bottom-nav mob-bar">
        {MOB_PRIMARY.map(item => {
          const on   = isActive(item.href)
          const href = resolve(item.href)
          return (
            <Link key={item.href} href={href} className={`mob-tab ${on?'mob-on':'mob-off'}`}>
              <div className="mob-icon">
                {item.icon === 'user' && avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width:24,height:24,borderRadius:'50%',objectFit:'cover',border:`2px solid ${on?'#0F172A':'#E2E8F0'}` }} />
                  : <SvgIcon name={item.icon} sz={22} active={on} />
                }
              </div>
              <span className="mob-lbl">{item.label}</span>
            </Link>
          )
        })}

        {/* Mehr */}
        <button className={`mob-tab ${showMore?'mob-on':'mob-off'}`} onClick={() => setShowMore(v => !v)}>
          <div className="mob-icon">
            <SvgIcon name={showMore ? 'close' : 'more'} sz={22} active={showMore} />
          </div>
          <span className="mob-lbl">{showMore ? 'Schließen' : 'Mehr'}</span>
        </button>
      </nav>

      {/* ══════════════════════════════════════
          "MEHR" SHEET
      ══════════════════════════════════════ */}
      {showMore && (
        <>
          <div className="more-bd" onClick={() => setShowMore(false)} />
          <div className="more-sh">
            {/* Handle */}
            <div style={{ width:36,height:4,borderRadius:2,background:'#E2E8F0',margin:'0 auto 16px' }} />
            <p style={{ fontSize:11,fontWeight:700,color:'#94A3B8',letterSpacing:'.08em',marginBottom:8 }}>WEITERE SEITEN</p>
            {MOB_MORE.map(item => {
              const on = isActive(item.href)
              return (
                <Link key={item.href} href={resolve(item.href)} className="more-row" onClick={() => setShowMore(false)}>
                  <div className="more-ico" style={{ background: on ? '#0F172A' : '#F1F5F9' }}>
                    <SvgIcon name={item.icon} sz={20} active={on} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:15,fontWeight:on?700:600,color:'#0F172A',margin:0 }}>{item.label}</p>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
