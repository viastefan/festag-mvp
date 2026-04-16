'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const signIn = async () => {
    setLoading(true)
    setStatus('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  const signUp = async () => {
    setLoading(true)
    setStatus('')
    const { error } = await supabase.auth.signUp({ email, password })
    setStatus(error ? error.message : '✅ Bestätigungs-E-Mail wurde gesendet!')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--card)',
        padding: '32px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Festag</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
          Bitte anmelden um fortzufahren
        </p>

        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && signIn()}
          style={inputStyle}
        />

        <button
          onClick={signIn}
          disabled={loading}
          style={{ ...btnStyle, background: 'var(--primary)', color: 'white', marginTop: 16 }}
        >
          {loading ? 'Lädt...' : 'Anmelden'}
        </button>

        <button
          onClick={signUp}
          disabled={loading}
          style={{ ...btnStyle, background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', marginTop: 8 }}
        >
          Registrieren
        </button>

        {status && (
          <p style={{ marginTop: 12, fontSize: 13, color: status.startsWith('✅') ? 'green' : 'red' }}>
            {status}
          </p>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  margin: '6px 0',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 14,
  outline: 'none',
  background: 'var(--background)',
}

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  display: 'block',
}
