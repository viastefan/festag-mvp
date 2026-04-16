'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = { id: string; email: string; full_name: string | null; role: string }

export default function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setCurrentUserId(data.session.user.id)
      supabase.from('profiles').select('*').then(({ data: profs }) => {
        setProfiles((profs ?? []).filter(p => p && p.email))
        setLoading(false)
      })
    })
  }, [])

  const roleColors: Record<string, { color: string; bg: string }> = {
    client: { color: '#1D4ED8', bg: '#DBEAFE' },
    dev:    { color: '#065F46', bg: '#D1FAE5' },
    admin:  { color: '#92400E', bg: '#FEF3C7' },
  }

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Lädt...</div>

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Team</h1>
      <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 28 }}>Mitglieder & Rollen</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
        {profiles.map(p => {
          const rc = roleColors[p.role] ?? roleColors.client
          const name = (p.full_name || p.email || '?').charAt(0).toUpperCase()
          const displayName = p.full_name || p.email?.split('@')[0] || 'Unbekannt'
          return (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEF3FF', color: '#2F6BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                  {name}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                    {displayName}
                    {p.id === currentUserId && <span style={{ fontSize: 11, background: '#F3F4F6', color: '#9CA3AF', padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>Du</span>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{p.email}</p>
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: rc.color, background: rc.bg }}>
                {(p.role || 'client').charAt(0).toUpperCase() + (p.role || 'client').slice(1)}
              </span>
            </div>
          )
        })}
        {profiles.length === 0 && (
          <div style={{ padding: 40, color: '#9CA3AF', textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px dashed #E6E8EE', gridColumn: '1/-1' }}>
            Noch keine Teammitglieder.
          </div>
        )}
      </div>
    </div>
  )
}
