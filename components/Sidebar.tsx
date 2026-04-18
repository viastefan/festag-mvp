'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard', icon: 'home',     label: 'Home' },
  { href: '/ai',        icon: 'sparkle',  label: 'AI' },
  { href: '/addons',    icon: 'grid',     label: 'Add-ons' },
  { href: '/messages',  icon: 'chat',     label: 'Messages' },
  { href: '/documents', icon: 'doc',      label: 'Dokumente' },
  { href: '/settings',  icon: 'user',     label: 'Profil' },
]

const MOBILE_NAV = [
  { href: '/dashboard', icon: 'home',    label: 'Home' },
  { href: '/ai',        icon: 'sparkle', label: 'AI' },
  { href: '/addons',    icon: 'grid',    label: 'Add-ons' },
  { href: '/messages',  icon: 'chat',    label: 'Chat' },
  { href: '/settings',  icon: 'user',    label: 'Profil' },
]

function Icon({ name, size = 18, active = false }: { name: string; size?: number; active?: boolean }) {
  const s = size
  const c = active ? '#0F172A' : '#94A3B8'
  const sw = active ? 1.8 : 1.6
  switch (name) {
    case 'home': return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
    case 'sparkle': return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
    case 'grid': return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    case 'chat': return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>
    case 'doc': return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>
    case 'user': return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
    default: return null
  }
}

export default function Sidebar() {
  const pathname = usePathname()
  const [email, setEmail] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }
  const initial = (email.charAt(0) || 'U').toUpperCase()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar" style={{
        position: 'fixed', top: 0, left: 0, width: 240, height: '100vh',
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '24px 14px', zIndex: 100,
      }}>
        <Link href="/dashboard">
          <div style={{ padding: '0 8px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height: 20, display: 'block' }} />
          </div>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}>
                <div className="tap-scale" style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px',
                  borderRadius: 'var(--r-sm)', fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--text)' : 'var(--text-secondary)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  <Icon name={item.icon} size={17} active={active} />
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User block */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 12 }}>
          <Link href="/settings">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer', borderRadius: 'var(--r-sm)' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email || 'Konto'}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Client</p>
              </div>
            </div>
          </Link>
          <button onClick={logout} style={{
            width: '100%', padding: '7px 10px', textAlign: 'left', border: 'none',
            background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)',
            borderRadius: 'var(--r-sm)', marginTop: 4,
          }}>
            Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        paddingBottom: 'var(--safe-bottom)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid var(--border)', zIndex: 200,
        justifyContent: 'space-around', alignItems: 'center', padding: '8px 4px',
        height: 'calc(64px + var(--safe-bottom))',
      }}>
        {MOBILE_NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{ flex: 1 }}>
              <div className="tap-scale" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 4px', minHeight: 44,
              }}>
                <Icon name={item.icon} size={22} active={active} />
                <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 500, color: active ? 'var(--text)' : 'var(--text-muted)', letterSpacing: '-0.1px' }}>
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
