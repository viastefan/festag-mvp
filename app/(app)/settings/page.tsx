'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = { id: string; email: string; full_name: string | null; role: string }

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      supabase.from('profiles').select('*').eq('id', data.session.user.id).single().then(({ data: prof }) => {
        if (prof) { setProfile(prof); setFullName(prof.full_name ?? '') }
      })
    })
  }, [])

  const save = async () => {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const logout = () => {
    const supabase = createClient()
    supabase.auth.signOut().then(() => { window.location.href = '/login' })
  }

  if (!profile) return <div style={{ color: '#9CA3AF', padding: 40 }}>Lädt...</div>

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Settings</h1>
      <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 32 }}>Dein Konto & Profil</p>

      <div style={{ background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>Profil</h2>
        <label style={s.label}>Name</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Vollständiger Name" style={s.input} />
        <label style={{ ...s.label, marginTop: 14 }}>E-Mail</label>
        <input value={profile.email} disabled style={{ ...s.input, background: '#F3F4F6', color: '#9CA3AF' }} />
        <label style={{ ...s.label, marginTop: 14 }}>Rolle</label>
        <div style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 8, fontSize: 14, display: 'inline-block' }}>
          {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
        </div>
        <div style={{ marginTop: 20 }}>
          <button onClick={save} disabled={saving} style={s.btnPrimary}>
            {saving ? 'Speichert...' : saved ? '✓ Gespeichert' : 'Speichern'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Abmelden</h2>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Von deinem Konto abmelden.</p>
        <button onClick={logout} style={s.btnDanger}>Abmelden</button>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  btnPrimary: { padding: '9px 20px', background: '#2F6BFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { padding: '9px 20px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
