'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DevTeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = localStorage.getItem('festag_dev_session')
    if (!session) { window.location.href = '/login'; return }
    const supabase = createClient()
    supabase.from('profiles').select('id, email, full_name, role, created_at').in('role', ['dev', 'admin']).order('created_at').then(({ data }) => {
      setMembers(data ?? []); setLoading(false)
    })
  }, [])

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Team</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {members.map(m => (
            <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
                {(m.full_name ?? m.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name ?? m.email.split('@')[0]}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{m.role === 'admin' ? 'Admin' : 'Developer'}</p>
              </div>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
