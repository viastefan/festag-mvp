'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = { id: string; email: string; full_name: string | null; role: string }

export default function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setCurrentUserId(data.session.user.id)
      
      supabase.from('profiles').select('*').then(({ data: profiles, error: err }) => {
        if (err) setError(err.message)
        else setProfiles(profiles ?? [])
        setLoading(false)
      })
    })
  }, [])

  const roleColor: Record<string, { color: string; bg: string }> = {
    client:  { color: '#1D4ED8', bg: '#DBEAFE' },
    dev:     { color: '#065F46', bg: '#D1FAE5' },
    admin:   { color: '#92400E', bg: '#FEF3C7' },
  }

  if (loading) return <div style={{ color: '#9CA3AF', padding: 40 }}>Lädt...</div>

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Team</h1>
      <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 28 }}>Mitglieder & Rollen</p>

      {error && <div style={{ padding: 16, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, color: '#9f1239', marginBottom: 16 }}>{error}</div>}

      {profiles.length === 0 && !error && (
        <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#fff', borderRadius: 12, border: '1px dashed #E6E8EE' }}>
          Noch keine Teammitglieder.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
        {profiles.map(p => {
          const rc = roleColor[p.role] ?? roleColor.client
          const isMe = p.id === currentUserId
          const displayName = p.full_name ?? p.email.split('@')[0]
          return (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEF3FF', color: '#2F6BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                    {displayName}
                    {isMe && <span style={{ fontSize: 11, background: '#F3F4F6', color: '#9CA3AF', padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>Du</span>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{p.email}</p>
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: rc.color, background: rc.bg }}>
                {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
