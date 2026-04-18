'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
      if (profile?.role === 'dev' || profile?.role === 'admin') {
        setAuthed(true); setEmail(data.session.user.email ?? '')
      } else {
        window.location.href = '/dashboard'
      }
      setChecking(false)
    })
  }, [])

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#30D158', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
  if (!authed) return null

  const nav = [
    { href: '/dev', label: 'Übersicht', icon: '⊞' },
    { href: '/dev/jobs', label: 'Jobs', icon: '◐' },
    { href: '/dev/tasks', label: 'Meine Tasks', icon: '✓' },
    { href: '/dev/team', label: 'Team', icon: '◎' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0B0F1A', color: '#fff' }}>
      <aside style={{ width: 220, background: '#0F1523', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 12px', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh' }}>
        <div style={{ padding: '2px 8px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #30D158, #32D74B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>F</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' }}>festag<span style={{ color: '#30D158' }}>.dev</span></p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>EXECUTION PANEL</p>
          </div>
        </div>

        <div style={{ margin: '0 0 16px', padding: '8px 10px', background: 'rgba(48,209,88,0.08)', borderRadius: 8, border: '1px solid rgba(48,209,88,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#30D158', letterSpacing: '0.06em' }}>DEV AKTIV</span>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{email}</p>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? '#30D158' : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(48,209,88,0.08)' : 'transparent', cursor: 'pointer',
                }}>
                  <span>{item.icon}</span>{item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <button onClick={logout} style={{ padding: '8px 10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.3)', borderRadius: 8, fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          ↪ Abmelden
        </button>
      </aside>

      <main style={{ flex: 1, marginLeft: 220, padding: '32px 40px' }}>
        {children}
      </main>
    </div>
  )
}
