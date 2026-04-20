'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',       icon: 'home',    label: 'Home' },
  { href: '/project/current', icon: 'project', label: 'Aktuelles Projekt' },
  { href: '/ai',              icon: 'sparkle', label: 'AI' },
  { href: '/addons',          icon: 'grid',    label: 'Add-ons' },
  { href: '/messages',        icon: 'chat',    label: 'Messages' },
  { href: '/billing',         icon: 'billing', label: 'Billing' },
  { href: '/documents',       icon: 'doc',     label: 'Dokumente' },
  { href: '/settings',        icon: 'user',    label: 'Profil' },
]

const MOB = [
  { href: '/dashboard',       icon: 'home',    label: 'Home' },
  { href: '/project/current', icon: 'project', label: 'Projekt' },
  { href: '/ai',              icon: 'sparkle', label: 'AI' },
  { href: '/messages',        icon: 'chat',    label: 'Chat' },
  { href: '/settings',        icon: 'user',    label: 'Profil' },
]

function Icon({ name, sz = 18, active = false }: { name: string; sz?: number; active?: boolean }) {
  const c = active ? '#0F172A' : '#94A3B8'
  const sw = active ? 2 : 1.7
  const p: Record<string, string> = {
    home:    'M3 12l9-9 9 9M5 10v10h14V10',
    project: 'M3 3h18v18H3zM3 9h18M9 21V9',
    sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
    grid:    '',
    chat:    'M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z',
    billing: 'M2 5h20v14H2zM2 10h20',
    doc:     'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
    user:    'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 20c0-4 4-6 8-6s8 2 8 6',
  }
  if (name === 'grid') return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {p[name]?.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [email, setEmail]       = useState('')
  const [firstName, setFn]      = useState('')
  const [avatarUrl, setAvatar]  = useState<string|null>(null)
  const [projectId, setProjId]  = useState<string|null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data: p } = await supabase.from('profiles').select('first_name, full_name, avatar_url').eq('id', data.user.id).single()
      if (p) {
        setFn(p.first_name ?? p.full_name?.split(' ')[0] ?? '')
        setAvatar(p.avatar_url ?? null)
      }
    })
    supabase.from('projects').select('id, status').order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (!data?.length) return
      const prio: Record<string,number> = { active:0, testing:1, planning:2, intake:3, done:4 }
      setProjId([...data].sort((a,b)=>(prio[a.status]??9)-(prio[b.status]??9))[0].id)
    })
  }, [])

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }
  const displayName = firstName || email.split('@')[0] || 'Konto'
  const initial = (firstName || email || 'U').charAt(0).toUpperCase()

  const resolve = (href: string) =>
    href === '/project/current' ? (projectId ? `/project/${projectId}` : '/dashboard') : href

  const isActive = (href: string) => {
    const h = resolve(href)
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/project/current') return pathname.startsWith('/project/')
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ─── Desktop sidebar ─── */}
      <aside className="sidebar" style={{
        position: 'fixed', top: 0, left: 0, width: 240, height: '100vh',
        background: '#FFF', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '22px 12px', zIndex: 100,
      }}>
        <style>{`
          .nav-item { display:flex; align-items:center; gap:11px; padding:9px 12px; border-radius:12px; font-size:14px; cursor:pointer; transition:all .12s; text-decoration:none; color:inherit; }
          .nav-item-on  { background:#F1F5F9; font-weight:600; color:#0F172A; }
          .nav-item-off { font-weight:500; color:#64748B; }
          .nav-item-off:hover { background:#F8FAFC; color:#0F172A; }
        `}</style>

        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '0 8px', marginBottom: 24 }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height: 19 }} />
          </div>
        </Link>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={resolve(item.href)} className={`nav-item ${active ? 'nav-item-on' : 'nav-item-off'}`}>
                <Icon name={item.icon} active={active} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User block with avatar */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              {/* Avatar */}
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                  {initial}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Client</p>
              </div>
            </div>
          </Link>
          <button onClick={logout} style={{ width: '100%', padding: '7px 10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', borderRadius: 10, marginTop: 2, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Abmelden
          </button>
        </div>
      </aside>

      {/* ─── Mobile floating bottom nav ─── */}
      <nav className="bottom-nav" style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 400,
        background: 'rgba(15,23,42,0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: 24,
        boxShadow: '0 8px 40px rgba(15,23,42,0.35), 0 2px 8px rgba(15,23,42,0.2)',
        zIndex: 200,
        justifyContent: 'space-around', alignItems: 'center',
        padding: '10px 8px', paddingBottom: 'calc(10px + var(--safe-bottom))',
        height: 'auto', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <style>{`
          .mob-item { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; min-height:44px; justify-content:center; cursor:pointer; transition:transform .1s; text-decoration:none; }
          .mob-item:active { transform:scale(.93); }
          .mob-dot { width:4px; height:4px; border-radius:50%; background:rgba(255,255,255,.6); margin-top:1px; }
          .mob-label { font-size:10px; letter-spacing:.01em; }
        `}</style>
        {MOB.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={resolve(item.href)} className="mob-item">
              {/* Icon — white tones */}
              <div style={{ width: 36, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: active ? 'rgba(255,255,255,0.15)' : 'transparent', transition: 'background .15s' }}>
                {item.icon === 'user' && avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${active ? '#fff' : 'rgba(255,255,255,.3)'}`, transition: 'border-color .15s' }} />
                ) : (
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : 'rgba(255,255,255,.5)'} strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
                    {item.icon === 'grid' ? (
                      <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>
                    ) : (
                      <path d={({
                        home:    'M3 12l9-9 9 9M5 10v10h14V10',
                        project: 'M3 3h18v18H3zM3 9h18M9 21V9',
                        sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4',
                        chat:    'M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z',
                        user:    'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 20c0-4 4-6 8-6s8 2 8 6',
                      } as Record<string,string>)[item.icon] ?? ''} />
                    )}
                  </svg>
                )}
              </div>
              {active && <div className="mob-dot" />}
              <span className="mob-label" style={{ color: active ? '#fff' : 'rgba(255,255,255,.45)', fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
