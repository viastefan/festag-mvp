'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Envelope } from '@phosphor-icons/react'
import Modal from '@/components/Modal'

type SeatRow = {
  id:           string
  user_id:      string | null
  role:         string
  status:       'reserved' | 'active' | 'suspended' | 'revoked'
  activated_at: string | null
  invite_id:    string | null
  email?:       string | null
  invited_name?: string | null
}

export default function TeamsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<'collaborator'|'dev'>('collaborator')
  const [sent,    setSent]    = useState(false)
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState<string|null>(null)
  const [seats,   setSeats]   = useState<SeatRow[]>([])
  const [seatsLoading, setSeatsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setSeatsLoading(true)
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user || cancelled) { setSeatsLoading(false); return }
        const { data } = await (sb as any)
          .from('seats')
          .select('id, user_id, role, status, activated_at, invite_id, team_invites(email, invited_name)')
          .eq('tenant_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (cancelled) return
        setSeats(((data as any[]) ?? []).map((s: any) => ({
          id: s.id, user_id: s.user_id, role: s.role,
          status: s.status, activated_at: s.activated_at,
          invite_id: s.invite_id,
          email: s.team_invites?.email ?? null,
          invited_name: s.team_invites?.invited_name ?? null,
        })))
      } catch { /* Tabelle könnte noch nicht migriert sein */ }
      setSeatsLoading(false)
    })()
    return () => { cancelled = true }
  }, [open, sent])

  async function send() {
    if (!email.includes('@')) return
    setError(null)
    setSending(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      const res = await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          fromUserId: user?.id ?? null,
          fromUserEmail: user?.email ?? null,
          accessMode: 'team',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? 'Einladung konnte nicht gesendet werden.')
      } else {
        setSent(true); setEmail('')
        setTimeout(() => setSent(false), 2800)
      }
    } catch (e: any) { setError(e?.message ?? 'Netzwerkfehler.') }
    setSending(false)
  }

  const allSeats = seats.filter(s => s.status !== 'revoked')

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Team einladen">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Invite row — minimal, notizblock-style */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', gap:6, marginBottom:6 }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            type="email"
            placeholder="name@firma.com"
            autoFocus
            style={{
              flex:1, padding:'9px 12px',
              background:'var(--bg)',
              border:'1px solid var(--border)',
              borderRadius:6, fontSize:13.5,
              color:'var(--text)', fontFamily:'inherit',
              outline:'none',
              transition:'border-color .12s',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={send}
            disabled={!email.includes('@') || sending}
            style={{
              padding:'9px 14px',
              borderRadius:6, border:'none',
              background: email.includes('@') ? 'var(--btn-prim)' : 'var(--surface-2)',
              color: email.includes('@') ? 'var(--btn-prim-text)' : 'var(--text-muted)',
              fontSize:13, fontWeight:600,
              cursor: email.includes('@') ? 'pointer' : 'default',
              fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:5,
              whiteSpace:'nowrap',
              transition:'background .1s, color .1s',
            }}
          >
            {sending
              ? <span style={{ width:12, height:12, border:'1.5px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/>
              : <Envelope size={12} weight="bold" />
            }
            Senden
          </button>
        </div>

        {/* Role toggle */}
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <span style={{ fontSize:11.5, color:'var(--text-muted)', marginRight:4 }}>Rolle:</span>
          {(['collaborator', 'dev'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                padding:'3px 10px',
                borderRadius:999,
                border: `1px solid ${role === r ? 'var(--text)' : 'var(--border)'}`,
                background: role === r ? 'var(--text)' : 'transparent',
                color: role === r ? 'var(--bg)' : 'var(--text-secondary)',
                fontSize:11.5, fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
                transition:'all .1s',
              }}
            >
              {r === 'collaborator' ? 'Client' : 'Developer'}
            </button>
          ))}
          {sent && (
            <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:11.5, fontWeight:600, color:'var(--green)' }}>
              <Check size={11} weight="bold" /> Einladung gesendet
            </span>
          )}
        </div>

        {error && (
          <p style={{ fontSize:11.5, color:'var(--red)', margin:'8px 0 0' }}>{error}</p>
        )}

        <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'10px 0 0', lineHeight:1.5 }}>
          Der Eingeladene erhält einen Acceptance-Link per Mail. Der Zugangs-PIN folgt automatisch nach Annahme.
        </p>
      </div>

      {/* Divider */}
      <div style={{ height:1, background:'var(--border)', margin:'0 0 16px' }} />

      {/* Seats list — notizblock rows, no card boxes */}
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 8px' }}>
          Mitglieder
        </p>

        {seatsLoading && allSeats.length === 0 && (
          <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Lade…</p>
        )}

        {!seatsLoading && allSeats.length === 0 && (
          <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>
            Noch keine Mitglieder. Lade jemanden ein.
          </p>
        )}

        {allSeats.map((s, i) => (
          <div key={s.id} style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'8px 0',
            borderBottom: i < allSeats.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            {/* Avatar dot */}
            <div style={{
              width:28, height:28, borderRadius:'50%', flexShrink:0,
              background: s.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, color: s.status === 'active' ? 'var(--green)' : 'var(--text-muted)',
            }}>
              {s.status === 'active'
                ? <Check size={12} weight="bold" color="var(--green)" />
                : <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', opacity:.4 }} />
              }
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {s.invited_name || s.email || 'Unbekannt'}
              </p>
              {s.email && s.invited_name && (
                <p style={{ margin:0, fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.email}</p>
              )}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <span style={{
                fontSize:10.5, fontWeight:600,
                color: s.role === 'dev' ? 'var(--text-secondary)' : 'var(--text-muted)',
                background:'var(--surface-2)',
                border:'1px solid var(--border)',
                borderRadius:4, padding:'1px 6px',
              }}>
                {s.role === 'dev' ? 'Dev' : s.role === 'admin' ? 'Admin' : 'Client'}
              </span>
              <span style={{
                fontSize:10.5, fontWeight:600,
                color: s.status === 'active' ? 'var(--green)' : 'var(--text-muted)',
              }}>
                {s.status === 'active' ? 'aktiv' : s.status === 'reserved' ? 'ausstehend' : s.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
