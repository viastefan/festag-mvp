'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setEmail(data.session.user.email ?? '')
      const { data: p } = await supabase.from('profiles').select('full_name,role').eq('id', data.session.user.id).single()
      setFullName(p?.full_name ?? '')
      setRole(p?.role ?? 'client')
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Profil & Einstellungen</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Verwalte deine Kontodaten</p>
      </div>

      <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>ACCOUNT</p>
        </div>
        <div style={{ padding: 20 }}>
          <label style={lbl}>Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Dein Name" style={inp} />
          <label style={{ ...lbl, marginTop: 14 }}>E-Mail</label>
          <input value={email} disabled style={{ ...inp, background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
          <label style={{ ...lbl, marginTop: 14 }}>Rolle</label>
          <input value={role} disabled style={{ ...inp, background: 'var(--surface-2)', color: 'var(--text-muted)', textTransform: 'capitalize' }} />

          <button onClick={save} disabled={saving} className="tap-scale" style={{
            marginTop: 18, padding: '10px 18px', background: saved ? 'var(--green-bg)' : 'var(--text)',
            color: saved ? 'var(--green-dark)' : '#fff',
            border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
            cursor: saving ? 'default' : 'pointer', minHeight: 40,
          }}>
            {saving ? 'Speichert…' : saved ? '✓ Gespeichert' : 'Änderungen speichern'}
          </button>
        </div>
      </div>

      <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>BENACHRICHTIGUNGEN</p>
        </div>
        <div style={{ padding: 20 }}>
          {['AI Updates zu meinen Projekten', 'Developer-Aktivität', 'Rechnungen & Zahlungen'].map(n => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>{n}</span>
              <div style={{ width: 36, height: 20, borderRadius: 20, background: 'var(--green)', position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-xs)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={logout} className="tap-scale" style={{
        width: '100%', padding: '13px', background: 'var(--surface)', color: 'var(--red)',
        border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 500,
        cursor: 'pointer', minHeight: 44,
      }}>
        Abmelden
      </button>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none', color: 'var(--text)', boxSizing: 'border-box' as const, minHeight: 42 }
