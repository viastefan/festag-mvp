'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  House, Briefcase, FileText, ChatCircle,
  Notebook, Brain, SignOut, GearSix,
  List, X, CaretRight, Bell, CreditCard, ChartLineUp,
} from '@phosphor-icons/react'
import ViewSwitch from '@/components/ViewSwitch'
import TeamsModal from '@/components/TeamsModal'
import SupportButton from '@/components/SupportButton'

type NavItem = {
  href: string
  label: string
  Icon: React.ComponentType<any>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/relations',           label: 'Übersicht',    Icon: House        },
  { href: '/relations/projects',  label: 'Projekte',     Icon: Briefcase    },
  { href: '/relations/messages',  label: 'Nachrichten',  Icon: ChatCircle   },
  { href: '/relations/documents', label: 'Dokumente',    Icon: FileText     },
  { href: '/relations/notes',     label: 'Notizen',      Icon: Notebook     },
  { href: '/relations/ai',        label: 'Tagro AI',     Icon: Brain        },
]

export default function RelationsSidebar() {
  const pathname    = usePathname()
  const [email,     setEmail]     = useState('')
  const [name,      setName]      = useState('')
  const [avatar,    setAvatar]    = useState<string|null>(null)
  const [plan,      setPlan]      = useState('free')
  const [mobOpen,   setMobOpen]   = useState(false)
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [userMenu,  setUserMenu]  = useState(false)

  useEffect(() => {
    const handler = () => setTeamsOpen(true)
    window.addEventListener('open-teams-modal', handler)
    return () => window.removeEventListener('open-teams-modal', handler)
  }, [])

  useEffect(() => {
    setMobOpen(false)
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data: p } = await createClient()
        .from('profiles').select('first_name,full_name,avatar_url,plan')
        .eq('id', data.user.id).single()
      if (p) {
        setName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setAvatar((p as any).avatar_url ?? null)
        setPlan((p as any).plan ?? 'free')
      }
    })
  }, [pathname])

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  const isOn = (href: string) =>
    href === '/relations' ? pathname === '/relations' : pathname.startsWith(href)

  const displayName = name || email.split('@')[0] || 'Konto'
  const init = (name || email || 'U').charAt(0).toUpperCase()

  const Inner = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'14px 8px 16px' }}>

      {/* Logo + SupportButton */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 6px', marginBottom:10, gap:8 }}>
        <Link href="/relations" style={{ textDecoration:'none', display:'flex', alignItems:'center' }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:17, display:'block', filter:'var(--logo-filter,none)' }}/>
        </Link>
        <SupportButton />
      </div>

      {/* ViewSwitch */}
      <div style={{ padding:'0 2px', marginBottom:10 }}>
        <ViewSwitch />
      </div>

      {/* Nav */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const on = isOn(href)
          return (
            <Link key={href} href={href} onClick={() => setMobOpen(false)}
              className={`rni ${on ? 'rni-on' : 'rni-off'}`}>
              <Icon size={14} weight={on ? 'bold' : 'regular'} color={on ? 'var(--text)' : 'var(--text-muted)'} />
              <span style={{ flex:1 }}>{label}</span>
            </Link>
          )
        })}
      </div>

      {/* ── User block ── */}
      <div style={{ paddingTop:8, marginTop:6, position:'relative' }}>

        {/* Dropdown */}
        {userMenu && (
          <>
            <div style={{ position:'fixed', inset:0, zIndex:1000 }} onClick={() => setUserMenu(false)} />
            <div style={{
              position:'absolute', bottom:'calc(100% + 6px)', left:0, right:0,
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:13,
              boxShadow:'0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
              zIndex:1001, padding:'4px',
            }}>
              {/* Header */}
              <div style={{ padding:'10px 11px 8px', display:'flex', alignItems:'center', gap:9 }}>
                {avatar
                  ? <img src={avatar} alt="" style={{ width:30,height:30,borderRadius:'50%',objectFit:'cover',border:'1.5px solid var(--border)',flexShrink:0 }}/>
                  : <div style={{ width:30,height:30,borderRadius:'50%',background:'var(--btn-prim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'var(--btn-prim-text)',flexShrink:0 }}>{init}</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--text)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</p>
                  <p style={{ margin:0, fontSize:10.5, color:'var(--text-muted)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</p>
                </div>
                <span style={{ flexShrink:0, fontSize:9, fontWeight:700, letterSpacing:'.05em', color:'var(--text-muted)', background:'var(--border)', padding:'2px 6px', borderRadius:5, lineHeight:1.6 }}>
                  {plan === 'free' ? 'Free' : plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : plan === 'enterprise' ? 'Enterprise' : plan}
                </span>
              </div>
              <div style={{ height:1, background:'var(--border)', margin:'2px 0' }}/>

              {/* Konto */}
              <p style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', padding:'6px 11px 2px', margin:0, opacity:.55 }}>KONTO</p>
              <Link href="/settings" className="rni-drop" onClick={() => setUserMenu(false)}>
                <GearSix size={13} color="var(--text-muted)" weight="regular" />
                <span style={{ flex:1 }}>Einstellungen</span>
              </Link>
              <Link href="/billing" className="rni-drop" onClick={() => setUserMenu(false)}>
                <CreditCard size={13} color="var(--text-muted)" weight="regular" />
                <span style={{ flex:1 }}>Abrechnung & Plan</span>
              </Link>
              <Link href="/activity" className="rni-drop" onClick={() => setUserMenu(false)}>
                <ChartLineUp size={13} color="var(--text-muted)" weight="regular" />
                <span style={{ flex:1 }}>Account-Verlauf</span>
              </Link>

              <div style={{ height:1, background:'var(--border)', margin:'2px 0' }}/>

              {/* Rechtliches */}
              <p style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', padding:'6px 11px 2px', margin:0, opacity:.55 }}>RECHTLICHES</p>
              {[
                { href:'/impressum',   label:'Impressum' },
                { href:'/datenschutz', label:'Datenschutz' },
                { href:'/agb',         label:'AGB' },
                { href:'/widerruf',    label:'Widerruf' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="rni-drop" onClick={() => setUserMenu(false)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink:0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ flex:1 }}>{l.label}</span>
                </Link>
              ))}

              <div style={{ height:1, background:'var(--border)', margin:'2px 0' }}/>

              {/* Abmelden */}
              <button className="rni-drop" onClick={logout} style={{ width:'100%', color:'var(--red,#D14343)' }}>
                <SignOut size={13} color="var(--red,#D14343)" weight="regular" />
                <span style={{ flex:1, color:'var(--red,#D14343)' }}>Abmelden</span>
              </button>
            </div>
          </>
        )}

        {/* Trigger */}
        <button
          onClick={() => setUserMenu(m => !m)}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'5px 7px', borderRadius:8,
            background: userMenu ? 'var(--surface-2)' : 'transparent',
            border:'none', cursor:'pointer', fontFamily:'inherit',
            transition:'background .12s',
          }}
          onMouseEnter={e => { if (!userMenu) e.currentTarget.style.background='rgba(0,0,0,0.04)' }}
          onMouseLeave={e => { if (!userMenu) e.currentTarget.style.background='transparent' }}
        >
          {avatar
            ? <img src={avatar} alt="" style={{ width:22,height:22,borderRadius:'50%',objectFit:'cover',border:'1.5px solid var(--border)',flexShrink:0 }}/>
            : <div style={{ width:22,height:22,borderRadius:'50%',background:'var(--btn-prim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700,color:'var(--btn-prim-text)',flexShrink:0 }}>{init}</div>
          }
          <span style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:5, overflow:'hidden' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</span>
            <span style={{ flexShrink:0, fontSize:8.5, fontWeight:700, letterSpacing:'.04em', color:'var(--text-muted)', background:'var(--border)', padding:'1px 4px', borderRadius:4, lineHeight:1.6 }}>
              {plan === 'free' ? 'Free' : plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : plan === 'enterprise' ? 'Ent.' : plan}
            </span>
          </span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"
            style={{ flexShrink:0, transform:userMenu?'rotate(180deg)':'rotate(0deg)', transition:'transform .16s', opacity:.6 }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>

      {/* Nav styles */}
      <style>{`
        .rni {
          display:flex; align-items:center; gap:7px;
          padding:5px 9px; border-radius:7px;
          font-size:13px; font-weight:500;
          cursor:pointer; text-decoration:none; color:inherit;
          transition:background .12s, color .12s;
          white-space:nowrap; overflow:hidden;
          margin:0 2px;
        }
        .rni-on  { background:rgba(0,0,0,0.055); font-weight:600; color:var(--text); }
        [data-theme="dark"] .rni-on { background:rgba(255,255,255,0.09); color:var(--nav-on-text); }
        .rni-off { color:var(--text-secondary); }
        .rni-off:hover { background:rgba(0,0,0,0.035); color:var(--text); }
        [data-theme="dark"] .rni-off:hover { background:rgba(255,255,255,0.05); }
        .rni-drop {
          display:flex; align-items:center; gap:9px;
          padding:7px 10px; border-radius:8px;
          cursor:pointer; transition:background .08s;
          width:100%; border:none; font-family:inherit;
          background:transparent; text-decoration:none; color:var(--text);
          font-size:12.5px; font-weight:500;
        }
        .rni-drop:hover { background:var(--surface-2); }
      `}</style>
    </div>
  )

  return (
    <>
      <TeamsModal open={teamsOpen} onClose={() => setTeamsOpen(false)} />

      {/* Desktop */}
      <aside className="sidebar" style={{ pointerEvents:'none' }}>
        <div className="sidebar-inner" style={{ pointerEvents:'all', height:'100%' }}>
          <Inner />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="show-mobile" style={{
        position:'sticky', top:0, zIndex:200,
        display:'flex', alignItems:'center', gap:10,
        padding:'12px 16px',
        background:'var(--sidebar-bg)',
        backdropFilter:'blur(36px) saturate(200%)',
        WebkitBackdropFilter:'blur(36px) saturate(200%)',
        borderBottom:'1px solid var(--sidebar-border)',
      }}>
        <button onClick={() => setMobOpen(v => !v)}
          style={{ width:36, height:36, borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)', fontFamily:'inherit' }}>
          {mobOpen ? <X size={18} weight="bold"/> : <List size={18} weight="bold"/>}
        </button>
        <Link href="/relations" style={{ textDecoration:'none' }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:16, display:'block', filter:'var(--logo-filter,none)' }}/>
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobOpen && (
        <>
          <div onClick={() => setMobOpen(false)} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,.4)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)' }}/>
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:280, maxWidth:'85vw', zIndex:251, background:'var(--sidebar-bg)', borderRight:'1px solid var(--border)', boxShadow:'var(--shadow-lg)', animation:'slideInLeft .2s cubic-bezier(.16,1,.3,1) both' }}>
            <Inner />
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInLeft { from{opacity:0;transform:translateX(-24px);}to{opacity:1;transform:translateX(0);} }
        @media (min-width:769px) { .show-mobile{display:none!important;} }
      `}</style>
    </>
  )
}
