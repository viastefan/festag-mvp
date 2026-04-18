'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/ai',        icon: '✦', label: 'AI Hub' },
  { href: '/tasks',     icon: '✓', label: 'Tasks' },
  { href: '/messages',  icon: '◻', label: 'Messages' },
  { href: '/team',      icon: '◎', label: 'Team' },
  { href: '/settings',  icon: '⚙', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar" style={{
        position: 'fixed', top: 0, left: 0, width: 220, height: '100vh',
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '20px 12px', zIndex: 100,
      }}>
        <div style={{ padding: '2px 8px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>F</div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.4px' }}>festag<span style={{ color: 'var(--accent)' }}>.</span></span>
          </div>
        </div>
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
                  borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  background: active ? 'var(--accent-light)' : 'transparent', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 12 }}>{item.icon}</span>{item.label}
                  {item.href === '/ai' && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', padding: '1px 5px', borderRadius: 4 }}>AI</span>}
                </div>
              </Link>
            )
          })}
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button onClick={logout} style={{ width: '100%', padding: '8px 10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}>
            ↪ Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)', zIndex: 200,
        justifyContent: 'space-around', alignItems: 'center', padding: '0 8px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}>
        {[
          { href: '/dashboard', icon: '⊞', label: 'Home' },
          { href: '/ai',        icon: '✦', label: 'AI' },
          { href: '/tasks',     icon: '✓', label: 'Tasks' },
          { href: '/messages',  icon: '◻', label: 'Chat' },
          { href: '/settings',  icon: '◎', label: 'Profil' },
        ].map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', borderRadius: 10, background: active ? 'var(--accent-light)' : 'transparent', minWidth: 52 }}>
                <span style={{ fontSize: item.href === '/ai' ? 15 : 16, color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
