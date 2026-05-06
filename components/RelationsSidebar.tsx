'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  House, Briefcase, FileText, ChatCircle,
  Notebook, Brain, SignOut, UsersThree, GearSix,
  List, X,
} from '@phosphor-icons/react'
import ViewSwitch from '@/components/ViewSwitch'

type NavItem = {
  href: string
  label: string
  Icon: React.ComponentType<any>
}

// Kunden-Verwaltung: privates B2B-Bereich, Bestandskunden
const NAV_ITEMS: NavItem[] = [
  { href: '/relations',           label: 'Übersicht',    Icon: House        },
  { href: '/relations/projects',  label: 'Projekte',     Icon: Briefcase    },
  { href: '/relations/messages',  label: 'Nachrichten',  Icon: ChatCircle   },
  { href: '/relations/documents', label: 'Dokumente',    Icon: FileText     },
  { href: '/relations/notes',     label: 'Notizen',      Icon: Notebook     },
  { href: '/relations/ai',        label: 'Tagro AI',     Icon: Brain        },
  { href: '/relations/users',     label: 'Kunden',       Icon: UsersThree   },
]

export default function RelationsSidebar() {
  const pathname    = usePathname()
  const [email,   setEmail]   = useState('')
  const [name,    setName]    = useState('')
  const [avatar,  setAvatar]  = useState<string|null>(null)
  const [mobOpen, setMobOpen] = useState(false)

  useEffect(() => {
    setMobOpen(false)
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data: p } = await createClient()
        .from('profiles').select('first_name,full_name,avatar_url')
        .eq('id', data.user.id).single()
      if (p) {
        setName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setAvatar((p as any).avatar_url ?? null)
      }
    })
  }, [pathname])

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  const isOn = (href: string) =>
    href === '/relations' ? pathname === '/relations' : pathname.startsWith(href)

  const init = (name || email || 'U').charAt(0).toUpperCase()

  const Inner = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'16px 10px 18px' }}>

      {/* Logo + ViewSwitch */}
      <div style={{ padding:'0 8px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <Link href="/relations" style={{ textDecoration:'none' }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height:18, display:'block', filter:'var(--logo-filter,none)' }}/>
          </Link>
        </div>
        <ViewSwitch />
      </div>

      {/* Nav */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>
        <p style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.09em', textTransform:'uppercase', padding:'6px 11px 3px', margin:0, opacity:.6 }}>
          Kunden
        </p>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const on = isOn(href)
          return (
            <Link key={href} href={href} onClick={() => setMobOpen(false)}
              className={`rni ${on ? 'rni-on' : 'rni-off'}`}>
              <Icon size={15} weight={on ? 'bold' : 'regular'} color={on ? 'var(--text)' : 'var(--text-muted)'} />
              <span style={{ flex:1 }}>{label}</span>
            </Link>
          )
        })}

        {/* Settings link */}
        <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)' }}>
          <Link href="/settings" onClick={() => setMobOpen(false)}
            className={`rni ${pathname.startsWith('/settings') ? 'rni-on' : 'rni-off'}`}>
            <GearSix size={15} weight={pathname.startsWith('/settings') ? 'bold' : 'regular'} color={pathname.startsWith('/settings') ? 'var(--text)' : 'var(--text-muted)'} />
            <span style={{ flex:1 }}>Einstellungen</span>
          </Link>
        </div>
      </div>

      {/* User block */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:9, marginTop:8 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:9,
          padding:'7px 9px', borderRadius:11,
          border:'1px solid var(--border)', background:'var(--surface-2)',
        }}>
          <Link href="/settings" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover', border:'1.5px solid var(--border)', flexShrink:0 }}/>
              : <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--btn-prim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10.5, fontWeight:700, color:'var(--btn-prim-text)', flexShrink:0 }}>{init}</div>
            }
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>{name || email.split('@')[0]}</p>
              <p style={{ fontSize:10, fontWeight:500, color:'var(--text-muted)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>{email}</p>
            </div>
          </Link>
          <button onClick={logout} title="Abmelden"
            style={{ width:26, height:26, borderRadius:7, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0, transition:'color .12s,background .12s' }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--text)'; e.currentTarget.style.background='var(--card)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='transparent' }}>
            <SignOut size={12} weight="regular" />
          </button>
        </div>

        {/* Legal links */}
        <div style={{ padding:'6px 3px 2px', display:'flex', flexWrap:'nowrap', alignItems:'center', justifyContent:'space-between', gap:3 }}>
          {[{href:'/impressum',label:'Impressum'},{href:'/datenschutz',label:'Datenschutz'},{href:'/agb',label:'AGB'},{href:'/widerruf',label:'Widerruf'}].map((l,i,arr) => (
            <span key={l.href} style={{ display:'inline-flex', alignItems:'center', gap:3, flexShrink:0 }}>
              <Link href={l.href} style={{ fontSize:8, color:'var(--text-muted)', textDecoration:'none', opacity:.5, whiteSpace:'nowrap', transition:'opacity .12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity='1' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity='.5' }}>
                {l.label}
              </Link>
              {i < arr.length-1 && <span style={{ fontSize:6, color:'var(--text-muted)', opacity:.3 }}>·</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Nav styles */}
      <style>{`
        .rni { display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:9px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;color:inherit;transition:background .1s,color .1s;white-space:nowrap;overflow:hidden; }
        .rni-on  { background:var(--nav-on);font-weight:700;color:var(--nav-on-text); }
        .rni-off { color:var(--nav-off-text); }
        .rni-off:hover { background:rgba(0,0,0,0.035);color:var(--text); }
        [data-theme="dark"] .rni-off:hover { background:rgba(255,255,255,0.05); }
        [data-theme="read"] .rni-off:hover { background:rgba(0,0,0,0.04); }
      `}</style>
    </div>
  )

  return (
    <>
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
        backdropFilter:'blur(24px) saturate(180%)',
        WebkitBackdropFilter:'blur(24px) saturate(180%)',
        borderBottom:'1px solid var(--border)',
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
