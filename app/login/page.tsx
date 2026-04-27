'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

type View = 'home' | 'login' | 'register'

/* ─────────────────────────────
   INPUT (THEME SAFE)
───────────────────────────── */
function FInput({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="inputWrap">
      <label className="inputLabel">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function LoginPage() {
  const [view, setView] = useState<View>('home')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sb = createClient()

  async function login() {
    setLoading(true)
    const { error } = await sb.auth.signInWithPassword({
      email,
      password: pw
    })
    setLoading(false)

    if (error) return setError('Login fehlgeschlagen')
    location.href = '/dashboard'
  }

  async function register() {
    setLoading(true)
    const { error } = await sb.auth.signUp({
      email,
      password: pw
    })
    setLoading(false)

    if (error) return setError(error.message)
    location.href = '/onboarding'
  }

  return (
    <div className="page">

      <ThemeToggle />

      {view === 'home' && (
        <div className="layout">

          {/* LEFT */}
          <div className="leftPanel" />

          {/* RIGHT */}
          <div className="rightPanel">
            <h1>Welcome back</h1>
            <p className="sub">Start or sign in</p>

            <div className="btnRow">
              <button onClick={() => setView('login')}>Login</button>
              <button onClick={() => setView('register')}>Register</button>
            </div>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div className="formWrap">
          <button onClick={() => setView('home')}>← Back</button>

          <h2>Login</h2>

          <FInput label="Email" value={email} onChange={setEmail} />
          <FInput label="Password" value={pw} onChange={setPw} type="password" />

          <button onClick={login} disabled={loading}>
            {loading ? '...' : 'Login'}
          </button>

          {error && <p className="error">{error}</p>}
        </div>
      )}

      {view === 'register' && (
        <div className="formWrap">
          <button onClick={() => setView('home')}>← Back</button>

          <h2>Register</h2>

          <FInput label="Email" value={email} onChange={setEmail} />
          <FInput label="Password" value={pw} onChange={setPw} type="password" />
          <FInput label="Repeat" value={pw2} onChange={setPw2} type="password" />

          <button onClick={register} disabled={loading}>
            {loading ? '...' : 'Create Account'}
          </button>

          {error && <p className="error">{error}</p>}
        </div>
      )}

      {/* CSS INLINE FIX (IMPORTANT) */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          transition: all .2s ease;
        }

        .layout {
          display: flex;
          height: 100vh;
        }

        .leftPanel {
          flex: 1;
          background: linear-gradient(135deg, var(--surface), var(--card));
        }

        .rightPanel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px;
          background: var(--right-bg);
        }

        .sub {
          color: var(--text-secondary);
        }

        .btnRow button {
          margin-right: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }

        .formWrap {
          max-width: 420px;
          margin: 80px auto;
        }

        .inputWrap {
          margin-bottom: 14px;
        }

        .inputLabel {
          font-size: 12px;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 6px;
        }

        .input {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--inp-border);
          background: var(--inp);
          color: var(--text);
          outline: none;
        }

        button {
          padding: 12px 14px;
          border-radius: 10px;
          border: none;
          background: var(--btn-prim);
          color: var(--btn-prim-text);
          cursor: pointer;
        }

        .error {
          color: red;
          margin-top: 10px;
        }
      `}</style>
    </div>
  )
}
