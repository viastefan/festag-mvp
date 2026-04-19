'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dev',       icon: 'home',    label: 'Übersicht' },
  { href: '/dev/jobs',  icon: 'inbox',   label: 'Jobs' },
  { href: '/dev/tasks', icon: 'check',   label: 'Tasks' },
  { href: '/dev/team',  icon: 'users',   label: 'Team' },
]

function Icon({ name, active }: { name: string; active: boolean }) {
  const c = active ? '#0F172A' : '#94A3B8'; const sw = active ? 1.8 : 1.6
  switch (name) {
    case 'home':  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
    case 'inbox': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 12h6l2 3h4l2-3h6"/></svg>
    case 'check': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    case 'users': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M15 14c2 0 5 1 5 4"/></svg>
    default: return null
  }
}

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
      if (p?.role === 'dev' || p?.role === 'admin') {
        setAuthed(true); setEmail(data.session.user.email ?? '')
      } else { window.location.href = '/dashboard' }
      setChecking(false)
    })
  }, [])

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
  if (!authed) return null

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside className="sidebar" style={{ position: 'fixed', top: 0, left: 0, width: 240, height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 14px', zIndex: 100 }}>
        <div style={{ padding: '0 8px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 18 }} />
          <span style={{ padding: '2px 7px', background: 'var(--green-bg)', color: 'var(--green-dark)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', borderRadius: 4 }}>DEV</span>
        </div>
        <div style={{ margin: '0 0 14px', padding: '10px 12px', background: 'var(--green-bg)', borderRadius: 10, border: '1px solid var(--green-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green-dark)', letterSpacing: '0.06em' }}>ONLINE</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dev' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}>
                <div className="tap-scale" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: active ? 600 : 500, color: active ? 'var(--text)' : 'var(--text-muted)', background: active ? 'var(--surface-2)' : 'transparent', cursor: 'pointer' }}>
                  <Icon name={item.icon} active={active} />{item.label}
                </div>
              </Link>
            )
          })}
        </nav>
        <button onClick={logout} style={{ padding: '8px 10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', borderRadius: 'var(--r-sm)', fontFamily: 'inherit', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 6 }}>↪ Abmelden</button>
      </aside>

      <nav className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', zIndex: 200, justifyContent: 'space-around', alignItems: 'center', padding: '8px 4px', height: 'calc(64px + var(--safe-bottom))' }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dev' && pathname.startsWith(item.href))
          return <Link key={item.href} href={item.href} style={{ flex: 1 }}><div className="tap-scale" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', minHeight: 44 }}><Icon name={item.icon} active={active} /><span style={{ fontSize: 10.5, fontWeight: active ? 600 : 500, color: active ? 'var(--text)' : 'var(--text-muted)' }}>{item.label}</span></div></Link>
        })}
      </nav>

      <main className="main-content" style={{ flex: 1, marginLeft: 240, padding: '36px 44px', minWidth: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  )
}
