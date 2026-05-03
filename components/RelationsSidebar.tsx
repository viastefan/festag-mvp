'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  House,
  Briefcase,
  FileText,
  ChatCircle,
  Tag,
  Brain,
  SignOut,
  Gear,
  List,
  X,
} from '@phosphor-icons/react'
import ViewSwitch from '@/components/ViewSwitch'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<any>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/relations',          label: 'Übersicht',    icon: House },
  { href: '/relations/projects', label: 'Projekte',     icon: Briefcase },
  { href: '/relations/documents',label: 'Dokumente',    icon: FileText },
  { href: '/relations/messages', label: 'Nachrichten',  icon: ChatCircle },
  { href: '/relations/offers',   label: 'Angebote',     icon: Tag },
  { href: '/relations/ai',       label: 'Tagro AI',     icon: Brain },
]

export default function RelationsSidebar() {
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const { data: p } = await sb
        .from('profiles')
        .select('first_name,full_name,avatar_url')
        .eq('id', data.user.id)
        .single()
      if (p) {
        setName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setAvatar((p as any).avatar_url ?? null)
      }
    })
  }, [pathname])

  const logout = async () => {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const isOn = (href: string) => {
    if (href === '/relations') return pathname === '/relations'
    return pathname.startsWith(href)
  }

  const displayName = name || email.split('@')[0] || 'Konto'
  const init = (name || email || 'U').charAt(0).toUpperCase()

  const sidebarContent = (
    <>
      {/* Logo + ViewSwitch */}
      <div style={{ padding: '0 8px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Link href="/relations" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img src="/brand/logo.svg" alt="festag" style={{ height: 18, display: 'block', filter: 'var(--logo-filter,none)' }} />
          </Link>
        </div>
        <ViewSwitch />
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ marginBottom: 4 }}>
          <p style={{
            fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: '.09em', textTransform: 'uppercase',
            padding: '6px 11px 3px', margin: 0, opacity: .6,
          }}>
            Relations
          </p>
          {NAV_ITEMS.map(item => {
            const on = isOn(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`ni ${on ? 'ni-on' : 'ni-off'}`}
              >
                <Icon
                  size={15}
                  weight={on ? 'bold' : 'regular'}
                  color={on ? 'var(--text)' : 'var(--text-muted)'}
                />
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* User block */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '9px 10px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Link href="/settings" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
            {avatar ? (
              <img src={avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', flexShrink: 0 }}>{init}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{displayName}</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', margin: '2px 0 0', letterSpacing: '.04em', textTransform: 'uppercase' }}>Relations</p>
            </div>
          </Link>
          <button onClick={logout} title="Abmelden" aria-label="Abmelden"
            style={{
              width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', flexShrink: 0, transition: 'color .12s, background .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--surface)' }}>
            <SignOut size={13} weight="bold" />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar" style={{ pointerEvents: 'none' }}>
        <div className="sidebar-inner" style={{ pointerEvents: 'all', padding: '16px 10px 18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile: top bar with hamburger */}
      <div className="relations-mobile-header show-mobile" style={{
        position: 'sticky', top: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
          }}
        >
          {mobileOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
        </button>
        <Link href="/relations" style={{ textDecoration: 'none' }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 16, display: 'block', filter: 'var(--logo-filter,none)' }} />
        </Link>
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 250,
              background: 'rgba(0,0,0,.4)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: 280, maxWidth: '85vw',
            zIndex: 251,
            background: 'var(--sidebar-bg)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: 'none',
            borderRight: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            padding: '16px 10px 18px',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInLeft .2s cubic-bezier(.16,1,.3,1) both',
          }}>
            {sidebarContent}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (min-width: 769px) {
          .relations-mobile-header { display: none !important; }
        }
      `}</style>
    </>
  )
}
