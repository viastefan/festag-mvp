'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!email || !password) {
      setStatus({ type: 'error', message: 'Bitte E-Mail und Passwort eingeben.' })
      return
    }
    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Passwort muss mindestens 6 Zeichen haben.' })
      return
    }

    setLoading(true)
    setStatus(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setStatus({ type: 'error', message: 'E-Mail oder Passwort falsch.' })
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setStatus({ type: 'error', message: error.message })
      } else {
        setStatus({
          type: 'success',
          message: '✅ Registrierung erfolgreich! Bitte E-Mail bestätigen.'
        })
        setMode('login')
      }
    }

    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoText}>Festag</span>
          <span style={styles.logoDot}>.</span>
        </div>
        <p style={styles.subtitle}>
          {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
        </p>

        {/* Tab Toggle */}
        <div style={styles.tabs}>
          <button
            onClick={() => { setMode('login'); setStatus(null) }}
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
          >
            Anmelden
          </button>
          <button
            onClick={() => { setMode('register'); setStatus(null) }}
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
          >
            Registrieren
          </button>
        </div>

        {/* Form */}
        <div style={styles.form}>
          <label style={styles.label}>E-Mail</label>
          <input
            type="email"
            placeholder="name@beispiel.de"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="email"
          />

          <label style={{ ...styles.label, marginTop: 14 }}>Passwort</label>
          <input
            type="password"
            placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={styles.input}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {/* Status Message */}
          {status && (
            <div style={{
              ...styles.statusBox,
              background: status.type === 'success' ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${status.type === 'success' ? '#86efac' : '#fecdd3'}`,
              color: status.type === 'success' ? '#166534' : '#9f1239',
            }}>
              {status.message}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? 'Bitte warten...'
              : mode === 'login' ? 'Anmelden' : 'Konto erstellen'
            }
          </button>
        </div>

        <p style={styles.footer}>
          {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
          <span
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStatus(null) }}
            style={styles.link}
          >
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </span>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%)',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'white',
    padding: '36px 32px 28px',
    borderRadius: 16,
    border: '1px solid #E6E8EE',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
  },
  logo: {
    marginBottom: 4,
  },
  logoText: {
    fontSize: 26,
    fontWeight: 800,
    color: '#111',
    letterSpacing: '-0.5px',
  },
  logoDot: {
    fontSize: 26,
    fontWeight: 800,
    color: '#2F6BFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    marginTop: 2,
  },
  tabs: {
    display: 'flex',
    background: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#6B7280',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'white',
    color: '#111',
    fontWeight: 600,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 14,
    outline: 'none',
    background: '#FAFAFA',
    color: '#111',
    boxSizing: 'border-box',
  },
  statusBox: {
    marginTop: 14,
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.5,
  },
  btn: {
    marginTop: 20,
    width: '100%',
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: '#2F6BFF',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
  },
  link: {
    color: '#2F6BFF',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
