'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Theme = 'light' | 'dark'
const THEME_KEY = 'festag_theme'

function mapError(msg: string): string {
  if (msg.includes('rate') || msg.includes('too many')) return 'Zu viele Versuche. Bitte warte einen Moment.'
  return 'Benutzername oder PIN ist nicht korrekt.'
}

export default function DevLoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageExiting, setPageExiting] = useState(false)
  const [theme, setThemeState] = useState<Theme>('dark')

  const userRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') setThemeState(stored as Theme)
    else if (stored === 'read') setThemeState('light')
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => userRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    try {
      localStorage.setItem(THEME_KEY, t)
      document.documentElement.setAttribute('data-theme', t)
      document.documentElement.style.backgroundColor = t === 'dark' ? '#0A0D14' : '#fcfcfd'
      document.documentElement.style.colorScheme = t
    } catch {}
  }

  function navigateWithFade(href: string) {
    router.prefetch(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), 200)
  }

  async function submit() {
    setError('')
    const u = username.trim().toLowerCase()
    const p = pin.trim()
    if (!u || !p) { setError('Bitte Benutzername und PIN eingeben.'); return }
    setLoading(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('verify_dev_pin', {
        username_input: u,
        pin_input: p,
      })
      if (rpcErr) { setError(mapError(rpcErr.message)); setLoading(false); return }
      const row: any = Array.isArray(data) ? data[0] : data
      if (!row?.user_id) { setError('Benutzername oder PIN ist nicht korrekt.'); setLoading(false); return }

      const session = {
        user_id: row.user_id,
        user_email: row.user_email,
        user_role: row.user_role,
        expires: Date.now() + 1000 * 60 * 60 * 12, // 12h
      }
      localStorage.setItem('festag_dev_session', JSON.stringify(session))
      window.location.href = '/dev'
    } catch (e: any) {
      setError(mapError(e?.message || ''))
      setLoading(false)
    }
  }

  return (
    <main className={`dl-root${pageExiting ? ' exiting' : ''}`} data-theme={theme}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .dl-root {
          min-height:100dvh; width:100%;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision;
          transition: opacity 0.22s cubic-bezier(0.4,0,0.2,1);
          font-weight:500; letter-spacing:0.01em;
        }
        .dl-root.exiting { opacity:0; pointer-events:none; }
        @keyframes dlEnter { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .dl-root:not(.exiting) { animation: dlEnter 0.28s cubic-bezier(0.4,0,0.2,1) both; }

        .dl-btn:active:not(:disabled) { transform:scale(0.97); transition: transform 0.08s ease !important; }

        .dl-theme-switcher { display:flex; gap:6px; align-items:center; position:absolute; right:28px; top:24px; z-index:20; }
        .dl-theme-pill { min-width:34px; display:flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:6px; border:0.4px solid #c7cdd6; background:transparent; font-family:inherit; font-size:12px; font-weight:500; color:#5b647d; letter-spacing:0.24px; cursor:pointer; transition:background .15s, border-color .15s, color .15s; }
        .dl-theme-pill.active { background:#f1f3f5; border-color:#fcfcfc; color:#2e2f33; }

        .dl-frame {
          display:flex; min-height:100dvh;
          background:#fcfcfd;
          align-items:center; justify-content:center;
          position:relative;
          transition:background .3s;
        }
        .dl-shell {
          width:271px; display:flex; flex-direction:column; gap:32px; align-items:center;
        }
        .dl-header { width:100%; display:flex; flex-direction:column; gap:18px; align-items:center; }
        .dl-logo { font-family:'Qurova DEMO', serif; font-size:24px; font-weight:500; color:#202532; text-align:center; line-height:normal; transition:color .3s; letter-spacing:-0.2px; }
        .dl-title { font-size:21px; font-weight:500; color:#202532; line-height:normal; text-align:center; letter-spacing:0.01em; transition:color .3s; }
        .dl-eyebrow { font-size:11px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase; color:#7B8294; }

        .dl-form { width:271px; display:flex; flex-direction:column; gap:16px; }
        .dl-error { width:100%; background:rgba(239,68,68,.06); color:#c0362e; border-radius:10px; padding:9px 12px; font-size:12.5px; font-weight:500; text-align:left; letter-spacing:0.01em; line-height:1.45; }

        .dl-input {
          width:100%; height:47px; border-radius:8px;
          border:1px solid #e7ebf0;
          background:#fff; color:#202532;
          font-family:inherit; font-size:14px; font-weight:400;
          letter-spacing:0.01em;
          padding:0 16px; outline:none;
          caret-color:#5b647d;
          box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03);
          transition:border-color .15s, box-shadow .15s, background .3s, color .3s;
        }
        .dl-input::placeholder { color:#bcbfc2; }
        .dl-input:focus { border-color:#5b647d; box-shadow:0 0 0 3px rgba(91,100,125,0.12); }
        .dl-input.pin { text-align:center; letter-spacing:0.45em; font-size:15px; }

        .dl-cta {
          width:100%; height:47px; border-radius:32px; border:0.7px solid #e7ebf0;
          display:flex; align-items:center; justify-content:center; gap:8px;
          font-family:inherit; font-size:14px; font-weight:500; letter-spacing:0.14px;
          padding:12px 45px; white-space:nowrap; overflow:hidden;
          background:#fff; color:#202532;
          cursor:pointer;
          box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03);
          transition: background .15s, opacity .15s, border-color .15s, color .15s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
          transform-origin:center;
        }
        .dl-cta:hover:not(:disabled) { background:#F7F8FB; border-color:#DCE1EA; }
        .dl-cta:disabled { opacity:.5; cursor:not-allowed; }

        .dl-footer { display:flex; flex-direction:column; gap:8px; align-items:center; }
        .dl-link {
          font-size:13px; font-weight:500; letter-spacing:0.01em;
          color:#7B8294; text-decoration:none;
          background:none; border:none; cursor:pointer;
          padding:4px; transition:color .15s;
        }
        .dl-link:hover { color:#202532; }

        /* SSL badge */
        .dl-ssl { position:fixed; left:20px; bottom:18px; display:flex; align-items:center; gap:6px; font-size:11px; font-weight:500; letter-spacing:0.02em; color:#98A2B3; z-index:30; transition:color .3s; user-select:none; }
        .dl-ssl svg { width:11px; height:13px; flex-shrink:0; }
        .dl-region-note { position:fixed; right:20px; bottom:18px; max-width:260px; text-align:right; color:#A7AFBF; font-size:10.5px; line-height:1.35; letter-spacing:.02em; font-weight:400 !important; z-index:30; white-space:nowrap; }

        /* DARK MODE */
        .dl-root[data-theme="dark"] .dl-frame { background:#0A0D14; }
        .dl-root[data-theme="dark"] .dl-logo,
        .dl-root[data-theme="dark"] .dl-title { color:#E8E8E5; }
        .dl-root[data-theme="dark"] .dl-eyebrow { color:#7B8294; }
        .dl-root[data-theme="dark"] .dl-input { background:rgba(243,245,247,0.035); color:#E8E8E5; border:1px solid rgba(102,112,143,0.10); caret-color:#66708F; }
        .dl-root[data-theme="dark"] .dl-input::placeholder { color:rgba(102,112,143,0.5); }
        .dl-root[data-theme="dark"] .dl-input:focus { border-color:rgba(102,112,143,0.5); box-shadow:0 0 0 3px rgba(102,112,143,0.10); }
        .dl-root[data-theme="dark"] .dl-cta { background:rgba(243,245,247,0.035); color:#E8E8E5; border:0.7px solid rgba(243,245,247,0.08); box-shadow:none; }
        .dl-root[data-theme="dark"] .dl-cta:hover:not(:disabled) { background:rgba(243,245,247,0.06); border-color:rgba(243,245,247,0.14); }
        .dl-root[data-theme="dark"] .dl-link { color:#7B8294; }
        .dl-root[data-theme="dark"] .dl-link:hover { color:#E8E8E5; }
        .dl-root[data-theme="dark"] .dl-ssl { color:rgba(232,232,229,0.5); }
        .dl-root[data-theme="dark"] .dl-region-note { color:rgba(243,245,247,0.50); }
        .dl-root[data-theme="dark"] .dl-error { background:rgba(213,57,57,0.08); color:#ef8377; }
        .dl-root[data-theme="dark"] .dl-theme-pill { border-color:rgba(243,245,247,0.18); color:rgba(243,245,247,0.45); background:transparent; }
        .dl-root[data-theme="dark"] .dl-theme-pill.active { background:#F3F5F7; border-color:#F3F5F7; color:#2e2f33; }
      `}</style>

      <div className="dl-frame">
        <div className="dl-theme-switcher">
          <button className={`dl-theme-pill${theme === 'light' ? ' active' : ''}`} type="button" onClick={() => setTheme('light')} aria-label="Heller Modus">Aa</button>
          <button className={`dl-theme-pill${theme === 'dark' ? ' active' : ''}`} type="button" onClick={() => setTheme('dark')} aria-label="Dunkler Modus">Aa</button>
        </div>

        <section className="dl-shell" aria-label="Developer Login">
          <div className="dl-header">
            <p className="dl-logo">festag</p>
            <span className="dl-eyebrow">Dev Zugang</span>
            <h1 className="dl-title">Anmeldung für Developer</h1>
          </div>

          <form className="dl-form" onSubmit={e => { e.preventDefault(); submit() }}>
            {error && <p className="dl-error">{error}</p>}
            <input
              ref={userRef}
              className="dl-input"
              type="text"
              autoComplete="username"
              placeholder="Benutzername"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              spellCheck={false}
              autoCapitalize="none"
            />
            <input
              ref={pinRef}
              className="dl-input pin"
              type="password"
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\s/g, ''))}
            />
            <button className="dl-cta dl-btn" type="submit" disabled={loading}>
              <span>{loading ? 'Wird geprüft…' : 'Anmelden'}</span>
            </button>
          </form>

          <div className="dl-footer">
            <button
              type="button"
              className="dl-link"
              onClick={() => navigateWithFade('/login')}
            >
              Stattdessen als Client anmelden
            </button>
          </div>
        </section>

        <div className="dl-ssl" aria-label="SSL verschlüsselt">
          <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
          </svg>
          <span>SSL · End-to-End verschlüsselt</span>
        </div>
        <p className="dl-region-note">Aktuell nur in der DACH-Region verfügbar</p>
      </div>
    </main>
  )
}
