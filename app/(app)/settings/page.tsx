'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('client')
  const [createdAt, setCreatedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifs, setNotifs] = useState({ ai: true, dev: true, billing: false })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setEmail(data.session.user.email ?? '')

      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, role, created_at')
        .eq('id', uid)
        .single()

      setFullName(p?.full_name ?? '')
      setRole(p?.role ?? 'client')
      setCreatedAt(p?.created_at ?? '')
      setLoading(false)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName || null })
        .eq('id', user.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const logout = async () => {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const initial = (fullName || email || 'U').charAt(0).toUpperCase()

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 580 }}>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Profil & Einstellungen</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Verwalte deine Kontodaten</p>
      </div>

      {/* Avatar row */}
      <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 22px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
          {initial}
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>
            {fullName || email.split('@')[0] || 'Kein Name'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>
            {role} · {createdAt ? `Seit ${new Date(createdAt).toLocaleDateString('de', { month: 'long', year: 'numeric' })}` : ''}
          </p>
        </div>
      </div>

      {/* Profile form */}
      <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', margin: 0 }}>KONTO</p>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Dein Name"
              style={inp}
              onKeyDown={e => e.key === 'Enter' && save()}
            />
          </div>
          <div>
            <label style={lbl}>E-Mail</label>
            <input value={email} disabled style={{ ...inp, background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>E-Mail kann nicht geändert werden.</p>
          </div>
          <div>
            <label style={lbl}>Rolle</label>
            <input value={role} disabled style={{ ...inp, background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'not-allowed', textTransform: 'capitalize' }} />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="tap-scale"
            style={{
              padding: '11px 18px', alignSelf: 'flex-start',
              background: saved ? 'var(--green-bg)' : 'var(--text)',
              color: saved ? 'var(--green-dark)' : '#fff',
              border: saved ? '1px solid var(--green-border)' : 'none',
              borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              minHeight: 40, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            {saving ? (
              <>
                <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Speichert…
              </>
            ) : saved ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                Gespeichert
              </>
            ) : 'Änderungen speichern'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="animate-fade-up-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', margin: 0 }}>BENACHRICHTIGUNGEN</p>
        </div>
        <div style={{ padding: '8px 22px' }}>
          {[
            { key: 'ai', label: 'AI Updates & Tagesberichte' },
            { key: 'dev', label: 'Developer-Aktivität' },
            { key: 'billing', label: 'Rechnungen & Zahlungen' },
          ].map((n, i) => {
            const on = notifs[n.key as keyof typeof notifs]
            return (
              <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>{n.label}</span>
                <button
                  onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof notifs] }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: on ? 'var(--green)' : 'var(--border)',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3,
                    left: on ? 22 : 3,
                    width: 18, height: 18,
                    borderRadius: '50%', background: '#fff',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div className="animate-fade-up-4">
        <button
          onClick={logout}
          className="tap-scale"
          style={{
            width: '100%', padding: '13px',
            background: 'var(--surface)', color: 'var(--red)',
            border: '1px solid var(--border)', borderRadius: 'var(--r)',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Abmelden
        </button>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 6,
}
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: '#FFFFFF', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none',
  color: 'var(--text)', boxSizing: 'border-box' as const, minHeight: 42,
}
