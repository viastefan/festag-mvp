'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/tasks',     icon: '✓', label: 'Tasks' },
  { href: '/messages',  icon: '◻', label: 'Messages' },
  { href: '/team',      icon: '◎', label: 'Team' },
  { href: '/settings',  icon: '⚙', label: 'Settings' },
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
      <div style={{ padding: '2px 8px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>F</div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.4px' }}>
            festag<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        </div>
      </div>

      {/* System status */}
      <div style={{ margin: '0 0 16px', padding: '8px 10px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>SYSTEM AKTIV</span>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Tagro AI · Online</p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                borderRadius: 'var(--radius-sm)', fontSize: 13.5,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-light)' : 'transparent',
                transition: 'all 0.12s', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button onClick={logout} style={{ width: '100%', padding: '8px 10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', letterSpacing: '0.02em' }}>
          ↪ Abmelden
        </button>
      </div>
    </aside>
  )
}
