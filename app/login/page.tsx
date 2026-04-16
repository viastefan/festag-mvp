'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) return setError('Bitte E-Mail und Passwort eingeben.')
    if (password.length < 6) return setError('Passwort mind. 6 Zeichen.')
    setLoading(true)

    try {
      const supabase = createClient()

      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); setLoading(false); return }
        // After signup, immediately sign in
        const { error: err2 } = await supabase.auth.signInWithPassword({ email, password })
        if (err2) { setError(err2.message); setLoading(false); return }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError('E-Mail oder Passwort falsch.'); setLoading(false); return }
      }

      // Hard redirect - bypasses Next.js router which may fail before session cookie is set
      window.location.href = '/dashboard'
    } catch (e: any) {
      setError('Fehler: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div>
          <span style={s.logo}>Festag</span>
          <span style={{ color: '#2F6BFF', fontSize: 26, fontWeight: 800 }}>.</span>
        </div>
        <p style={s.sub}>{mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</p>

        <div style={s.tabs}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{ ...s.tab, ...(mode === m ? s.tabOn : {}) }}>
              {m === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          ))}
        </div>

        <label style={s.label}>E-Mail</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="name@beispiel.de" style={s.input} autoComplete="email"
        />

        <label style={{ ...s.label, marginTop: 14 }}>Passwort</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={s.input} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && <div style={s.err}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Bitte warten...' : mode === 'login' ? 'Anmelden' : 'Registrieren & einloggen'}
        </button>

        <p style={s.foot}>
          {mode === 'login' ? 'Kein Konto? ' : 'Schon registriert? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={s.link}>
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </span>
        </p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f5f7fa,#e8edf5)', padding: 20 },
  card: { width: '100%', maxWidth: 420, background: '#fff', padding: '36px 32px 28px', borderRadius: 16, border: '1px solid #E6E8EE', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' },
  logo: { fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' },
  sub: { fontSize: 14, color: '#6B7280', margin: '4px 0 24px' },
  tabs: { display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 },
  tab: { flex: 1, padding: '8px 0', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6B7280' },
  tabOn: { background: '#fff', color: '#111', fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', background: '#FAFAFA', color: '#111', boxSizing: 'border-box' as const },
  err: { marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' },
  btn: { marginTop: 20, width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#2F6BFF', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  foot: { marginTop: 20, textAlign: 'center' as const, fontSize: 13, color: '#6B7280' },
  link: { color: '#2F6BFF', fontWeight: 600, cursor: 'pointer' },
}
