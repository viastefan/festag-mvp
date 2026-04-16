'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Bitte E-Mail und Passwort eingeben.'); return }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('E-Mail oder Passwort falsch.')
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // If Supabase returns a session directly → autoconfirm is ON → redirect
      if (data.session) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      // If no session but user exists → try to sign in directly
      if (data.user) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (!loginError) {
          router.push('/dashboard')
          router.refresh()
          return
        }
      }

      // Fallback: confirm email still required
      setError('Bitte bestätige deine E-Mail und logge dich dann ein.')
      setMode('login')
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoText}>Festag</span>
          <span style={s.logoDot}>.</span>
        </div>
        <p style={s.subtitle}>{mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</p>

        {/* Tab Toggle */}
        <div style={s.tabs}>
          {(['login', 'register'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}>
              {m === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          ))}
        </div>

        {/* Form */}
        <label style={s.label}>E-Mail</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="name@beispiel.de" style={s.input} autoComplete="email" />

        <label style={{ ...s.label, marginTop: 14 }}>Passwort</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={s.input} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

        {error && <div style={s.error}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
          {loading ? '...' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </button>

        <p style={s.footer}>
          {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={s.link}>
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </span>
        </p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%)', padding: 20 },
  card: { width: '100%', maxWidth: 420, background: 'white', padding: '36px 32px 28px', borderRadius: 16, border: '1px solid #E6E8EE', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' },
  logo: { marginBottom: 4 },
  logoText: { fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' },
  logoDot: { fontSize: 26, fontWeight: 800, color: '#2F6BFF' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, marginTop: 2 },
  tabs: { display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 },
  tab: { flex: 1, padding: '8px 0', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6B7280' },
  tabActive: { background: 'white', color: '#111', fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', background: '#FAFAFA', color: '#111', boxSizing: 'border-box' as const, marginBottom: 0 },
  error: { marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' },
  btn: { marginTop: 20, width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#2F6BFF', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  footer: { marginTop: 20, textAlign: 'center' as const, fontSize: 13, color: '#6B7280' },
  link: { color: '#2F6BFF', fontWeight: 600, cursor: 'pointer' },
}
