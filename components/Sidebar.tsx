'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/tasks', icon: '✓', label: 'Tasks' },
  { href: '/messages', icon: '◻', label: 'Messages' },
  { href: '/team', icon: '◎', label: 'Team' },
  { href: '/settings', icon: '⚙', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  const logout = async () => {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, width: 220, height: '100vh',
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '20px 12px', zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '4px 8px', marginBottom: 28 }}>
        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
          festag
        </span>
        <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--accent)' }}>.</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-light)' : 'transparent',
                transition: 'all 0.15s', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 13, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button onClick={logout} style={{
          width: '100%', padding: '8px 10px', textAlign: 'left',
          border: 'none', background: 'transparent', cursor: 'pointer',
          fontSize: 13, color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)',
          transition: 'color 0.15s',
        }}>
          ↪ Abmelden
        </button>
      </div>
    </aside>
  )
}
