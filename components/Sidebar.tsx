'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/tasks', label: 'Tasks', icon: '✓' },
  { href: '/messages', label: 'Messages', icon: '◻' },
  { href: '/team', label: 'Team', icon: '◎' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logo}>
        <span style={s.logoText}>Festag</span>
        <span style={s.logoDot}>.</span>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={s.footer}>
        <button onClick={logout} style={s.logoutBtn}>
          ↪ Abmelden
        </button>
      </div>
    </aside>
  )
}

const s: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'fixed',
    top: 0, left: 0,
    width: 240,
    height: '100vh',
    background: '#fff',
    borderRight: '1px solid #E6E8EE',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 100,
  },
  logo: { padding: '0 8px', marginBottom: 32 },
  logoText: { fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' },
  logoDot: { fontSize: 20, fontWeight: 800, color: '#2F6BFF' },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    fontSize: 14, fontWeight: 500, color: '#6B7280',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  navActive: { background: '#EEF3FF', color: '#2F6BFF', fontWeight: 600 },
  navIcon: { fontSize: 15, width: 18, textAlign: 'center' },
  footer: { borderTop: '1px solid #E6E8EE', paddingTop: 16 },
  logoutBtn: {
    width: '100%', padding: '8px 12px', textAlign: 'left',
    border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 13, color: '#9CA3AF', borderRadius: 8,
  },
}
