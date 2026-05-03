'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Warning, Envelope, CalendarBlank, Clock } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type UserProfile = {
  id: string
  email: string
  first_name: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in: string | null
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'

const fmtTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nie'

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    // Load profiles (all visible users)
    const { data: profiles, error } = await sb
      .from('profiles')
      .select('id, first_name, full_name, avatar_url, created_at')
      .order('created_at', { ascending: false })

    if (error || !profiles) {
      setLoading(false)
      return
    }

    setUsers(profiles.map(p => ({
      id: p.id,
      email: '', // Can't access auth.users directly from client
      first_name: (p as any).first_name,
      full_name: (p as any).full_name,
      avatar_url: (p as any).avatar_url,
      created_at: p.created_at,
      last_sign_in: null,
    })))
    setIsAdmin(true) // If they can see profiles, they have access
    setLoading(false)
  }

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div className="page-content">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: [.16, 1, .3, 1] }}
      >
        <div className="page-header">
          <h1>Benutzer</h1>
          <p>Registrierte Benutzer in deiner Organisation.</p>
        </div>

        {/* Info banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10,
          background: 'var(--amber-bg)', border: '1px solid var(--amber)',
          marginBottom: 24,
        }}>
          <Warning size={16} weight="bold" color="var(--amber)" />
          <p style={{ fontSize: 12, color: 'var(--amber-dark)', margin: 0, fontWeight: 500 }}>
            Benutzerverwaltung ist nur mit Administratorrechten vollständig verfügbar. Kontaktiere deinen Admin für erweiterte Funktionen.
          </p>
        </div>

        {/* Users list */}
        {users.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
          }}>
            <Users size={32} weight="duotone" color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Keine Benutzer gefunden</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Es wurden keine Benutzerprofile gefunden.</p>
          </div>
        ) : (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 160px 160px',
              padding: '10px 18px', borderBottom: '1px solid var(--border)',
              gap: 12,
            }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em' }}>BENUTZER</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CalendarBlank size={10} />
                REGISTRIERT
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />
                LETZTER LOGIN
              </span>
            </div>

            {/* User rows */}
            {users.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .2, delay: i * .03 }}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 160px',
                  padding: '12px 18px', gap: 12,
                  borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" style={{
                      width: 32, height: 32, borderRadius: '50%', objectFit: 'cover',
                      border: '1.5px solid var(--border)', flexShrink: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', flexShrink: 0,
                    }}>
                      {(u.full_name || u.first_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.first_name || 'Unbekannt'}
                    </p>
                    {u.email && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </p>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDate(u.created_at)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtTime(u.last_sign_in)}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* User count */}
        <div style={{
          marginTop: 16, padding: '10px 18px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, fontSize: 12, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Users size={13} weight="bold" />
          {users.length} Benutzer registriert
        </div>
      </motion.div>
    </div>
  )
}
