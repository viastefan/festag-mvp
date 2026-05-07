'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTheme, setTheme, ThemeMode } from '@/lib/theme'
import { autoAvatarColor, avatarTextColor, AVATAR_COLORS } from '@/lib/avatar'
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
  const [designMenu, setDesignMenu] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    setThemeMode(getTheme())
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
  const avBg = autoAvatarColor(email || displayName)
  const avFg = avatarTextColor(avBg)

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
      <div style={{ paddingTop:8, marginTop:6, position:'relative', display:'flex', alignItems:'center', gap:4 }}>

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

        {designMenu && (
          <>
            <div style={{ position:'fixed', inset:0, zIndex:1000 }} onClick={() => setDesignMenu(false)} />
            <div style={{
              position:'absolute', bottom:'calc(100% + 8px)', left:0, right:0,
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
                { mode:'dark' as ThemeMode, label:'Dunkel' },
                { mode:'light' as ThemeMode, label:'Hell' },
                { mode:'read' as ThemeMode, label:'Lesemodus' },
              ] as const).map(({ mode, label }) => {
                const active = themeMode === mode
                return (
                  <button
                    key={mode}
                    className="rni-drop"
                    onClick={() => {
                      setThemeMode(mode)
                      setTheme(mode)
                      setDesignMenu(false)
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
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:5, padding:'0 8px 8px' }}>
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setDesignMenu(false)}
                        style={{
                          width:18,
                          height:18,
                          borderRadius:'50%',
                          background:'transparent',
                          border:`2px solid ${c}`,
                          outline: avBg === c ? '2px solid var(--text)' : 'none',
                          outlineOffset: 1.5,
                          cursor:'pointer',
                          padding:0,
                          boxSizing:'border-box',
                        }}
                        aria-label={`Farbe ${c}`}
                      />
                    ))}
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

        {/* Trigger */}
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
          onMouseEnter={e => { if (!userMenu) e.currentTarget.style.background='var(--surface-2)' }}
          onMouseLeave={e => { if (!userMenu) e.currentTarget.style.background='transparent' }}
        >
          {avatar
            ? <img src={avatar} alt="" style={{ width:24,height:24,borderRadius:'50%',objectFit:'cover',border:'1.5px solid var(--border)',flexShrink:0 }}/>
            : <div style={{ width:24,height:24,borderRadius:'50%',background:avBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700,color:avFg,flexShrink:0,letterSpacing:'.02em' }}>{init}</div>
          }
          <span style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:5, overflow:'hidden' }}>
            <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</span>
            {plan !== 'free' && (
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
          onMouseEnter={e => { if (!designMenu) { e.currentTarget.style.background='var(--surface-2)'; e.currentTarget.style.color='var(--text)' } }}
          onMouseLeave={e => { if (!designMenu) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' } }}
        >
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
