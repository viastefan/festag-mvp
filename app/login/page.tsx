'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setTheme, type ThemeMode } from '@/lib/theme'

type LoginTheme = 'light' | 'dark' | 'read'
type PanelMode = 'login' | 'workspace'
type IntakeStep = {
  key: string
  label: string
  question: string
  placeholder: string
}

const intakeSteps: IntakeStep[] = [
  { key: 'goal', label: 'Ziel', question: 'Was möchtest du bauen?', placeholder: 'Beschreibe kurz das Produkt, die Website, App oder Automatisierung...' },
  { key: 'platform', label: 'Plattform', question: 'Wo soll dein Produkt laufen?', placeholder: 'Website, Webapp, Dashboard, Mobile App, interne Automatisierung...' },
  { key: 'scope', label: 'Umfang', question: 'Welche Funktionen sind wichtig?', placeholder: 'Login, Zahlungen, Buchung, Adminbereich, Inhalte, Integrationen...' },
  { key: 'priority', label: 'Priorität', question: 'Was muss zuerst funktionieren?', placeholder: 'Was ist kritisch für den Start, was kann später kommen?' },
  { key: 'budget', label: 'Budget', question: 'Gibt es Budget oder Zeitrahmen?', placeholder: 'MVP schnell starten, hochwertig ausarbeiten, feste Deadline...' },
  { key: 'team', label: 'Setup', question: 'Arbeitest du alleine oder mit Team?', placeholder: 'Solo, Gründerteam, Agentur, bestehende Developer, Enterprise-Team...' },
]

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const APPLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
)

function SystemIcon({ type }: { type: 'mail' | 'shield' | 'server' | 'card' | 'arrow' | 'tagro' }) {
  const paths: Record<typeof type, string[]> = {
    mail: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
    shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-5'],
    server: ['M3 5h18v6H3z', 'M3 13h18v6H3z', 'M7 8h.01M7 16h.01'],
    card: ['M2 5h20v14H2z', 'M2 10h20'],
    arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
    tagro: ['M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z', 'M8 9.5l4-2.2 4 2.2v5l-4 2.2-4-2.2v-5z'],
  }
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}

function ThemeSwitcher({ theme, onChange }: { theme: LoginTheme; onChange: (theme: LoginTheme) => void }) {
  return (
    <div className="login-theme-switch" aria-label="Design wählen">
      {(['light', 'dark', 'read'] as const).map((item) => (
        <button key={item} type="button" className={theme === item ? 'active' : ''} onClick={() => onChange(item)}>
          {item === 'light' ? 'Hell' : item === 'dark' ? 'Dunkel' : 'Read'}
        </button>
      ))}
    </div>
  )
}

function AuthButton({ children, icon, onClick, variant = 'default', loading = false }: {
  children: string
  icon: ReactNode
  onClick: () => void
  variant?: 'default' | 'primary'
  loading?: boolean
}) {
  return (
    <button className={`login-auth-button ${variant === 'primary' ? 'primary' : ''}`} type="button" onClick={onClick} disabled={loading}>
      <span className="login-auth-icon">{loading ? <span className="login-mini-loader" /> : icon}</span>
      <span>{children}</span>
    </button>
  )
}

function TextInput({ label, value, onChange, type = 'text', placeholder, onEnter }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder: string
  onEnter?: () => void
}) {
  return (
    <label className="login-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEnter) {
            event.preventDefault()
            onEnter()
          }
        }}
      />
    </label>
  )
}

function FooterSignals() {
  return (
    <div className="login-footer-signals">
      <span><SystemIcon type="shield" />Datenschutzkonform</span>
      <i />
      <span><SystemIcon type="server" />Server in Deutschland</span>
      <i />
      <span><SystemIcon type="card" />Keine Kreditkarte erforderlich</span>
      <em>BETA</em>
      <small>v0.9</small>
    </div>
  )
}

function SystemLoadingOverlay() {
  const lines = [
    ['Projektstruktur wird vorbereitet.', 'AI orchestration active'],
    ['Tagro analysiert Kontext.', 'Execution layer initializing'],
    ['Kommunikationsschicht wird aufgebaut.', 'Visibility layer enabled'],
    ['Workspace wird initialisiert.', 'Production context loading'],
  ]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % lines.length), 900)
    return () => window.clearInterval(timer)
  }, [lines.length])

  return (
    <div className="login-system-loader" aria-live="polite">
      <img src="/brand/logo.svg" alt="festag" />
      <div key={index} className="login-system-loader-copy">
        <h2>{lines[index][0]}</h2>
        <p>{lines[index][1]}</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const sb = createClient()
  const [theme, setThemeState] = useState<LoginTheme>('light')
  const [mode, setMode] = useState<PanelMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [workspaceEmail, setWorkspaceEmail] = useState('')
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [emailLoginOpen, setEmailLoginOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (window.localStorage.getItem('festag_theme') as ThemeMode | null) : null
    const normalized: LoginTheme = saved === 'dark' || saved === 'classic-dark' || saved === 'magic-blue' ? 'dark' : saved === 'read' ? 'read' : 'light'
    setThemeState(normalized)
    setTheme(normalized)
  }, [])

  function changeTheme(next: LoginTheme) {
    setThemeState(next)
    setTheme(next)
  }

  async function doLogin() {
    setError('')
    if (!email || !password) {
      setError('Bitte E-Mail und Passwort eingeben.')
      return
    }
    setLoading(true)
    const { error: loginError } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (loginError) {
      setError('E-Mail oder Passwort ist nicht korrekt.')
      return
    }
    window.location.href = '/dashboard'
  }

  async function doSocial(provider: 'google' | 'apple') {
    setError('')
    setSocialLoading(provider)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error: oauthError } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (oauthError) {
      setError(oauthError.message)
      setSocialLoading(null)
    }
  }

  function startWorkspaceFlow() {
    setError('')
    setMode('workspace')
    setEmailLoginOpen(false)
    setStep(0)
    setAnswer('')
  }

  function submitIntakeStep() {
    const current = intakeSteps[step]
    const trimmed = answer.trim()
    if (!name.trim()) {
      setError('Bitte gib zuerst deinen Namen ein.')
      return
    }
    if (!workspaceEmail.trim()) {
      setError('Bitte gib deine E-Mail ein.')
      return
    }
    if (!trimmed) {
      setError('Tagro braucht hier eine kurze Antwort, damit der Workspace sinnvoll vorbereitet werden kann.')
      return
    }
    setError('')
    const nextAnswers = { ...answers, [current.key]: trimmed }
    setAnswers(nextAnswers)
    setAnswer('')
    if (step < intakeSteps.length - 1) {
      setStep(step + 1)
      return
    }
    setLoading(true)
    window.setTimeout(() => {
      try {
        window.localStorage.setItem('festag_pending_workspace', JSON.stringify({
          name,
          email: workspaceEmail,
          answers: nextAnswers,
          createdAt: new Date().toISOString(),
        }))
      } catch {}
      window.location.href = '/dashboard'
    }, 1900)
  }

  const activeStep = intakeSteps[step]
  const progress = useMemo(() => ((step + 1) / intakeSteps.length) * 100, [step])

  return (
    <main className={`login-os login-os-${theme}`}>
      <style>{`
        .login-os {
          --login-bg:#f7f7f4;
          --login-text:#101214;
          --login-muted:rgba(16,18,20,.58);
          --login-soft:rgba(16,18,20,.38);
          --login-surface:rgba(255,255,255,.66);
          --login-surface-strong:rgba(255,255,255,.88);
          --login-border:rgba(18,22,26,.11);
          --login-border-strong:rgba(18,22,26,.18);
          --login-shadow:0 28px 90px rgba(22,24,28,.12), 0 2px 8px rgba(22,24,28,.05);
          min-height:100dvh;
          position:relative;
          overflow:hidden;
          font-family:var(--font-aeonik), Aeonik, Inter, sans-serif;
          color:var(--login-text);
          background:var(--login-bg);
          isolation:isolate;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
        }
        .login-os-dark {
          --login-bg:#05070a;
          --login-text:#f6f7f6;
          --login-muted:rgba(246,247,246,.62);
          --login-soft:rgba(246,247,246,.42);
          --login-surface:rgba(14,18,23,.62);
          --login-surface-strong:rgba(18,23,29,.78);
          --login-border:rgba(255,255,255,.105);
          --login-border-strong:rgba(255,255,255,.17);
          --login-shadow:0 34px 110px rgba(0,0,0,.44), 0 2px 12px rgba(0,0,0,.34);
        }
        .login-os-read {
          --login-bg:#f4f1ea;
          --login-text:#181714;
          --login-muted:rgba(24,23,20,.58);
          --login-soft:rgba(24,23,20,.38);
          --login-surface:rgba(255,252,245,.66);
          --login-surface-strong:rgba(255,252,245,.9);
          --login-border:rgba(43,37,27,.12);
          --login-border-strong:rgba(43,37,27,.2);
          --login-shadow:0 28px 90px rgba(61,50,34,.13), 0 2px 8px rgba(61,50,34,.06);
        }
        .login-os-bg {
          position:absolute;
          inset:0;
          z-index:-3;
          background:
            linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.72) 45%, rgba(255,255,255,.26) 100%),
            url('/brand/login-bg-light.png') center bottom / cover no-repeat;
        }
        .login-os-dark .login-os-bg {
          background:
            linear-gradient(180deg, rgba(5,7,10,.24) 0%, rgba(5,7,10,.46) 48%, rgba(5,7,10,.93) 100%),
            url('/brand/login-bg-dark.png') center bottom / cover no-repeat;
        }
        .login-os-read .login-os-bg {
          background:
            linear-gradient(180deg, rgba(246,243,236,.96) 0%, rgba(246,243,236,.78) 48%, rgba(246,243,236,.34) 100%),
            url('/brand/login-bg-light.png') center bottom / cover no-repeat;
          filter:saturate(.8);
        }
        .login-os::before {
          content:'';
          position:absolute;
          inset:0;
          z-index:-2;
          background:
            radial-gradient(circle at 50% 18%, rgba(255,255,255,.56), transparent 34%),
            linear-gradient(90deg, rgba(255,255,255,.16), transparent 24%, transparent 76%, rgba(255,255,255,.16));
          pointer-events:none;
        }
        .login-os-dark::before {
          background:
            radial-gradient(circle at 50% 18%, rgba(255,255,255,.105), transparent 32%),
            linear-gradient(90deg, rgba(0,0,0,.32), transparent 24%, transparent 76%, rgba(0,0,0,.32));
        }
        .login-os-top {
          position:absolute;
          top:32px;
          left:40px;
          right:40px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          z-index:3;
        }
        .login-logo {
          height:23px;
          display:block;
          opacity:.93;
          filter:none;
        }
        .login-os-dark .login-logo { filter:brightness(0) invert(1); }
        .login-theme-switch { display:flex; align-items:center; gap:22px; }
        .login-theme-switch button {
          border:0;
          background:transparent;
          color:var(--login-muted);
          font:inherit;
          font-size:13px;
          font-weight:620;
          padding:6px 0 9px;
          position:relative;
          cursor:pointer;
          transition:color .18s cubic-bezier(.16,1,.3,1);
        }
        .login-theme-switch button:hover,
        .login-theme-switch button.active { color:var(--login-text); }
        .login-theme-switch button.active::after {
          content:'';
          position:absolute;
          left:50%;
          bottom:0;
          width:5px;
          height:5px;
          border-radius:999px;
          transform:translateX(-50%);
          background:var(--login-text);
        }
        .login-stage {
          min-height:100dvh;
          display:grid;
          grid-template-rows:1fr auto;
          padding:112px 28px 34px;
        }
        .login-center {
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          width:100%;
          transform:translateY(-1.8vh);
        }
        .login-eyebrow {
          display:inline-flex;
          align-items:center;
          gap:10px;
          margin:0 0 18px;
          height:28px;
          padding:0 13px;
          border-radius:999px;
          border:1px solid var(--login-border);
          background:color-mix(in srgb, var(--login-surface) 76%, transparent);
          color:var(--login-muted);
          font-size:10.5px;
          font-weight:760;
          letter-spacing:.22em;
          text-transform:uppercase;
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
        }
        .login-eyebrow span {
          width:5px;
          height:5px;
          border-radius:999px;
          background:var(--login-text);
          opacity:.72;
          box-shadow:0 0 20px color-mix(in srgb, var(--login-text) 28%, transparent);
        }
        .login-headline {
          margin:0;
          max-width:820px;
          color:var(--login-text);
          text-align:center;
          font-size:clamp(42px, 5.45vw, 76px);
          line-height:.98;
          letter-spacing:-.075em;
          font-weight:760;
        }
        .login-subline {
          margin:20px 0 34px;
          color:var(--login-muted);
          text-align:center;
          font-size:clamp(15px, 1.45vw, 18px);
          line-height:1.5;
          font-weight:560;
        }
        .login-panel {
          width:min(482px, calc(100vw - 42px));
          min-height:354px;
          border-radius:24px;
          border:1px solid var(--login-border-strong);
          background:linear-gradient(180deg, color-mix(in srgb, var(--login-surface-strong) 92%, transparent), color-mix(in srgb, var(--login-surface) 82%, transparent));
          box-shadow:var(--login-shadow);
          backdrop-filter:blur(30px) saturate(145%);
          -webkit-backdrop-filter:blur(30px) saturate(145%);
          overflow:hidden;
          transition:min-height .42s cubic-bezier(.16,1,.3,1), transform .42s cubic-bezier(.16,1,.3,1);
        }
        .login-panel.workspace { width:min(760px, calc(100vw - 42px)); min-height:500px; }
        .login-panel.email-open { min-height:560px; }
        .login-tabs {
          display:flex;
          justify-content:center;
          gap:66px;
          padding:28px 34px 18px;
        }
        .login-tabs button {
          background:transparent;
          border:0;
          color:var(--login-muted);
          font:inherit;
          font-size:14px;
          font-weight:670;
          padding:0 0 13px;
          cursor:pointer;
          position:relative;
        }
        .login-tabs button.active { color:var(--login-text); }
        .login-tabs button.active::after {
          content:'';
          position:absolute;
          left:0;
          right:0;
          bottom:0;
          height:1.5px;
          border-radius:999px;
          background:var(--login-text);
        }
        .login-panel-body {
          padding:8px 34px 34px;
          animation:loginFade .36s cubic-bezier(.16,1,.3,1) both;
        }
        .login-email-region {
          display:grid;
          grid-template-rows:0fr;
          opacity:0;
          transform:translateY(-4px);
          transition:grid-template-rows .36s cubic-bezier(.16,1,.3,1), opacity .26s cubic-bezier(.16,1,.3,1), transform .26s cubic-bezier(.16,1,.3,1);
        }
        .login-email-region.open {
          grid-template-rows:1fr;
          opacity:1;
          transform:none;
        }
        .login-email-region > div {
          overflow:hidden;
          min-height:0;
        }
        .login-email-form {
          padding-top:2px;
        }
        .login-button-stack { display:flex; flex-direction:column; gap:14px; }
        .login-auth-button {
          width:100%;
          min-height:58px;
          border-radius:13px;
          border:1px solid var(--login-border);
          background:color-mix(in srgb, var(--login-surface-strong) 72%, transparent);
          color:var(--login-text);
          display:grid;
          grid-template-columns:48px 1fr 48px;
          align-items:center;
          font:inherit;
          font-size:14.5px;
          font-weight:690;
          cursor:pointer;
          transition:background .18s cubic-bezier(.16,1,.3,1), border-color .18s cubic-bezier(.16,1,.3,1), transform .18s cubic-bezier(.16,1,.3,1);
        }
        .login-auth-button:hover {
          background:color-mix(in srgb, var(--login-surface-strong) 92%, transparent);
          border-color:var(--login-border-strong);
          transform:translateY(-1px);
        }
        .login-auth-button:focus { outline:0; }
        .login-auth-button:focus-visible,
        .login-email-submit:focus-visible,
        .workspace-next:focus-visible,
        .workspace-close:focus-visible,
        .login-theme-switch button:focus-visible {
          outline:2px solid color-mix(in srgb, var(--login-text) 26%, transparent);
          outline-offset:3px;
        }
        .login-os-dark .login-auth-button.primary {
          background:rgba(255,255,255,.94);
          color:#080a0d;
        }
        .login-auth-icon { display:flex; align-items:center; justify-content:center; color:currentColor; }
        .login-mini-loader {
          width:16px;
          height:16px;
          border-radius:999px;
          border:2px solid color-mix(in srgb, currentColor 24%, transparent);
          border-top-color:currentColor;
          animation:loginSpin .75s linear infinite;
        }
        .login-divider {
          display:flex;
          align-items:center;
          gap:18px;
          margin:26px 0;
          color:var(--login-muted);
          font-size:12px;
          font-weight:620;
        }
        .login-divider::before,
        .login-divider::after {
          content:'';
          flex:1;
          height:1px;
          background:var(--login-border);
        }
        .login-subtle-action {
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:12px;
          color:var(--login-muted);
          font-size:13px;
          font-weight:580;
        }
        .login-subtle-action button,
        .login-subtle-action a {
          color:var(--login-text);
          background:transparent;
          border:0;
          font:inherit;
          font-weight:720;
          cursor:pointer;
          text-decoration:none;
        }
        .login-field {
          display:flex;
          flex-direction:column;
          gap:7px;
          margin-bottom:12px;
        }
        .login-field span {
          color:var(--login-muted);
          font-size:10.5px;
          font-weight:760;
          letter-spacing:.13em;
          text-transform:uppercase;
        }
        .login-field input {
          height:52px;
          border-radius:13px;
          border:1px solid var(--login-border);
          background:color-mix(in srgb, var(--login-surface-strong) 76%, transparent);
          color:var(--login-text);
          padding:0 15px;
          font:inherit;
          font-size:14.5px;
          font-weight:620;
          outline:0;
          transition:border-color .16s, background .16s, box-shadow .16s;
        }
        .login-field input:focus-visible {
          border-color:var(--login-border-strong);
          box-shadow:0 0 0 3px color-mix(in srgb, var(--login-text) 9%, transparent);
        }
        .login-field input:focus { outline:0; }
        .login-field input::placeholder { color:var(--login-muted); opacity:.62; }
        .login-error {
          margin:0 0 14px;
          border:1px solid rgba(239,68,68,.24);
          background:rgba(239,68,68,.08);
          color:#ef4444;
          border-radius:13px;
          padding:10px 12px;
          font-size:12.5px;
          font-weight:650;
          line-height:1.45;
        }
        .login-email-submit {
          width:100%;
          height:54px;
          margin-top:4px;
          border:0;
          border-radius:13px;
          background:var(--login-text);
          color:var(--login-bg);
          font:inherit;
          font-size:14px;
          font-weight:760;
          cursor:pointer;
          transition:opacity .16s, transform .16s;
        }
        .login-email-submit:hover { opacity:.9; transform:translateY(-1px); }
        .workspace-intake-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:24px 28px;
          border-bottom:1px solid var(--login-border);
        }
        .workspace-brand { display:flex; align-items:center; gap:12px; min-width:0; }
        .workspace-brand-mark {
          width:36px;
          height:36px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid var(--login-border);
          color:var(--login-muted);
          background:color-mix(in srgb, var(--login-surface-strong) 68%, transparent);
        }
        .workspace-title { margin:0; color:var(--login-text); font-size:17px; font-weight:780; letter-spacing:-.025em; }
        .workspace-meta { margin:2px 0 0; color:var(--login-muted); font-size:12px; font-weight:620; }
        .workspace-close {
          width:34px;
          height:34px;
          border-radius:999px;
          border:1px solid var(--login-border);
          background:transparent;
          color:var(--login-muted);
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .workspace-intake-body {
          padding:28px;
        }
        .workspace-progress {
          height:3px;
          border-radius:999px;
          overflow:hidden;
          background:color-mix(in srgb, var(--login-border) 70%, transparent);
          margin-bottom:28px;
        }
        .workspace-progress span {
          display:block;
          height:100%;
          width:var(--progress);
          background:var(--login-text);
          border-radius:inherit;
          transition:width .38s cubic-bezier(.16,1,.3,1);
        }
        .workspace-grid {
          display:grid;
          grid-template-columns:230px minmax(0, 1fr);
          gap:28px;
        }
        .workspace-fields { display:flex; flex-direction:column; gap:12px; }
        .workspace-question { min-width:0; }
        .workspace-question-kicker { margin:0 0 9px; color:var(--login-muted); font-size:11px; font-weight:780; letter-spacing:.12em; text-transform:uppercase; }
        .workspace-question h2 {
          margin:0 0 18px;
          color:var(--login-text);
          font-size:clamp(28px, 4vw, 42px);
          line-height:1.07;
          letter-spacing:-.065em;
          font-weight:760;
        }
        .workspace-question textarea {
          width:100%;
          min-height:150px;
          border:1px solid var(--login-border);
          border-radius:18px;
          background:color-mix(in srgb, var(--login-surface-strong) 70%, transparent);
          color:var(--login-text);
          padding:18px;
          resize:none;
          outline:0;
          font:inherit;
          font-size:15px;
          font-weight:610;
          line-height:1.55;
        }
        .workspace-question textarea:focus-visible {
          border-color:var(--login-border-strong);
          box-shadow:0 0 0 3px color-mix(in srgb, var(--login-text) 8%, transparent);
        }
        .workspace-question textarea:focus { outline:0; }
        .workspace-actions {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:16px;
          margin-top:18px;
        }
        .workspace-dots { display:flex; gap:9px; }
        .workspace-dots span {
          width:6px;
          height:6px;
          border-radius:999px;
          background:var(--login-muted);
          opacity:.34;
        }
        .workspace-dots span.active { opacity:1; background:var(--login-text); }
        .workspace-next {
          height:48px;
          min-width:142px;
          border-radius:13px;
          border:0;
          background:var(--login-text);
          color:var(--login-bg);
          font:inherit;
          font-size:13.5px;
          font-weight:760;
          cursor:pointer;
          transition:opacity .16s, transform .16s;
        }
        .workspace-next:hover { opacity:.9; transform:translateY(-1px); }
        .login-footer-signals {
          display:flex;
          align-items:center;
          justify-content:center;
          flex-wrap:wrap;
          gap:18px;
          color:var(--login-muted);
          font-size:12px;
          font-weight:620;
        }
        .login-footer-signals span {
          display:inline-flex;
          align-items:center;
          gap:8px;
        }
        .login-footer-signals i {
          width:3px;
          height:3px;
          border-radius:999px;
          background:currentColor;
          opacity:.42;
        }
        .login-footer-signals em {
          font-style:normal;
          border:1px solid var(--login-border);
          border-radius:7px;
          padding:4px 10px;
          color:var(--login-muted);
        }
        .login-footer-signals small { font:inherit; color:var(--login-muted); }
        .login-system-loader {
          position:fixed;
          inset:0;
          z-index:100;
          background:#05070a;
          color:#fff;
          display:flex;
          align-items:center;
          padding:clamp(34px, 8vw, 108px);
          overflow:hidden;
        }
        .login-system-loader::before {
          content:'';
          position:absolute;
          inset:0;
          background:
            linear-gradient(180deg, rgba(5,7,10,.08), rgba(5,7,10,.46) 56%, rgba(5,7,10,.96)),
            url('/brand/login-bg-dark.png') center bottom / cover no-repeat;
          opacity:.86;
          z-index:-2;
        }
        .login-system-loader::after {
          content:'';
          position:absolute;
          inset:0;
          background:linear-gradient(90deg, rgba(5,7,10,.1), rgba(5,7,10,.72));
          z-index:-1;
        }
        .login-system-loader img {
          position:absolute;
          top:clamp(30px, 4vw, 50px);
          left:clamp(34px, 8vw, 108px);
          height:22px;
          filter:brightness(0) invert(1);
          opacity:.9;
        }
        .login-system-loader-copy {
          max-width:920px;
          animation:loaderCopy .78s cubic-bezier(.16,1,.3,1) both;
        }
        .login-system-loader h2 {
          margin:0;
          color:#f8f8f8;
          font-size:clamp(46px, 8vw, 108px);
          line-height:.96;
          letter-spacing:-.075em;
          font-weight:760;
        }
        .login-system-loader p {
          margin:24px 0 0;
          color:rgba(255,255,255,.48);
          font-size:14px;
          font-weight:650;
          letter-spacing:.055em;
        }
        @keyframes loaderCopy {
          from { opacity:0; transform:translateY(12px); filter:blur(7px); }
          to { opacity:1; transform:none; filter:blur(0); }
        }
        @keyframes loginSpin { to { transform:rotate(360deg); } }
        @keyframes loginFade {
          from { opacity:0; transform:translateY(8px); filter:blur(5px); }
          to { opacity:1; transform:none; filter:blur(0); }
        }
        @media (max-width:900px) {
          .login-os-top { top:24px; left:24px; right:24px; }
          .login-stage { padding-top:94px; }
          .login-theme-switch { gap:14px; }
          .login-center { transform:none; }
          .login-panel.workspace { width:min(640px, calc(100vw - 28px)); }
          .workspace-grid { grid-template-columns:1fr; gap:16px; }
          .workspace-fields { display:grid; grid-template-columns:1fr 1fr; }
        }
        @media (max-width:640px) {
          .login-stage { padding:86px 14px 24px; }
          .login-theme-switch button { font-size:12px; }
          .login-logo { height:21px; }
          .login-headline { font-size:clamp(36px, 11vw, 54px); }
          .login-panel { width:100%; border-radius:22px; min-height:auto; }
          .login-tabs { gap:36px; padding:24px 22px 16px; }
          .login-panel-body { padding:6px 22px 26px; }
          .workspace-intake-head { padding:20px; }
          .workspace-intake-body { padding:20px; }
          .workspace-fields { grid-template-columns:1fr; }
          .workspace-actions { align-items:flex-start; flex-direction:column; }
          .workspace-next { width:100%; }
          .login-footer-signals { gap:10px 14px; font-size:11px; }
          .login-footer-signals i { display:none; }
        }
      `}</style>

      <div className="login-os-bg" />
      {loading && mode === 'workspace' ? <SystemLoadingOverlay /> : null}

      <header className="login-os-top">
        <img className="login-logo" src="/brand/logo.svg" alt="festag" />
        <ThemeSwitcher theme={theme} onChange={changeTheme} />
      </header>

      <section className="login-stage">
        <div className="login-center">
          {mode === 'login' ? (
            <>
              <p className="login-eyebrow"><span />AI-orchestriert</p>
              <h1 className="login-headline">Softwareproduktion ohne Chaos.</h1>
              <p className="login-subline">AI-orchestrierte Struktur für moderne Projekte.</p>

              <div className={`login-panel ${emailLoginOpen ? 'email-open' : ''}`}>
                <div className="login-tabs">
                  <button type="button" className="active">Anmelden</button>
                  <button type="button" onClick={startWorkspaceFlow}>Workspace erstellen</button>
                </div>
                <div className="login-panel-body">
                  {error ? <p className="login-error">{error}</p> : null}
                  <div className="login-button-stack">
                    <AuthButton icon={GOOGLE_ICON} onClick={() => doSocial('google')} loading={socialLoading === 'google'} variant={theme === 'dark' ? 'primary' : 'default'}>Mit Google anmelden</AuthButton>
                    <AuthButton icon={APPLE_ICON} onClick={() => doSocial('apple')} loading={socialLoading === 'apple'}>Mit Apple anmelden</AuthButton>
                    <AuthButton icon={<SystemIcon type="mail" />} onClick={() => setEmailLoginOpen((open) => !open)}>Mit E-Mail anmelden</AuthButton>
                  </div>
                  <div className={`login-email-region ${emailLoginOpen ? 'open' : ''}`} aria-hidden={!emailLoginOpen}>
                    <div>
                      <div className="login-divider">E-Mail Zugang</div>
                      <div className="login-email-form" id="festag-email-login">
                        <TextInput label="E-Mail" value={email} onChange={setEmail} type="email" placeholder="deine@email.com" onEnter={doLogin} />
                        <TextInput label="Passwort" value={password} onChange={setPassword} type="password" placeholder="Dein Passwort" onEnter={doLogin} />
                        <button className="login-email-submit" type="button" onClick={doLogin} disabled={loading}>
                          {loading ? 'Anmeldung läuft…' : 'Anmelden'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="login-divider">neu bei Festag?</div>
                  <div className="login-subtle-action">
                    <button type="button" onClick={startWorkspaceFlow}>Workspace erstellen</button>
                    <a href="/redeem">Einladungspin einlösen</a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="login-eyebrow"><span />Workspace Setup</p>
              <h1 className="login-headline">Erstelle deinen Workspace.</h1>
              <p className="login-subline">Erzähl Tagro, was du bauen möchtest. Das System bereitet daraus Struktur, Phasen und erste Vorschläge vor.</p>

              <div className="login-panel workspace">
                <div className="workspace-intake-head">
                  <div className="workspace-brand">
                    <div className="workspace-brand-mark"><SystemIcon type="tagro" /></div>
                    <div>
                      <p className="workspace-title">Tagro Project Intake</p>
                      <p className="workspace-meta">{activeStep.label} · Schritt {step + 1} von {intakeSteps.length}</p>
                    </div>
                  </div>
                  <button className="workspace-close" type="button" onClick={() => setMode('login')} aria-label="Workspace Setup schließen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="workspace-intake-body">
                  <div className="workspace-progress" style={{ '--progress': `${progress}%` } as CSSProperties}><span /></div>
                  {error ? <p className="login-error">{error}</p> : null}
                  <div className="workspace-grid">
                    <div className="workspace-fields">
                      <TextInput label="Name" value={name} onChange={setName} placeholder="Dein Name" />
                      <TextInput label="E-Mail" value={workspaceEmail} onChange={setWorkspaceEmail} type="email" placeholder="deine@email.com" />
                    </div>
                    <div className="workspace-question">
                      <p className="workspace-question-kicker">{activeStep.label}</p>
                      <h2>{activeStep.question}</h2>
                      <textarea
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        placeholder={activeStep.placeholder}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault()
                            submitIntakeStep()
                          }
                        }}
                      />
                      <div className="workspace-actions">
                        <div className="workspace-dots">
                          {intakeSteps.map((item, index) => <span key={item.key} className={index === step ? 'active' : ''} />)}
                        </div>
                        <button className="workspace-next" type="button" onClick={submitIntakeStep}>
                          {step === intakeSteps.length - 1 ? 'Workspace vorbereiten' : 'Weiter'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <FooterSignals />
      </section>
    </main>
  )
}
