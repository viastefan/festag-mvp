'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setTheme, type ThemeMode } from '@/lib/theme'

type Step = 'theme' | 'profile' | 'finish'
type AccountType = 'personal' | 'company' | 'agency'

const THEME_OPTIONS: Array<{
  mode: ThemeMode
  title: string
  description: string
  accent: string
  surface: string
}> = [
  {
    mode: 'light',
    title: 'Hell',
    description: 'Klar, reduziert und hell für tägliche Arbeit.',
    accent: '#111111',
    surface: 'linear-gradient(135deg,#ffffff,#f3f3ef)',
  },
  {
    mode: 'read',
    title: 'Lesemodus',
    description: 'Ruhiger, wärmer und angenehm für lange Berichte.',
    accent: '#6f6658',
    surface: 'linear-gradient(135deg,#f7f3ea,#ebe5d9)',
  },
  {
    mode: 'dark',
    title: 'Dunkel',
    description: 'Konzentriert, technisch und kontraststark.',
    accent: '#7c83ff',
    surface: 'linear-gradient(135deg,#111315,#23272d)',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState<Step>('theme')
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('read')
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('personal')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      setUserId(data.session.user.id)
      setEmail(data.session.user.email ?? '')
      const metaName = data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || ''
      if (metaName) setFullName(metaName)
    })
  }, [router, supabase])

  function chooseTheme(mode: ThemeMode) {
    setSelectedTheme(mode)
    setTheme(mode)
  }

  async function finishProfile() {
    if (!userId) return
    if (!fullName.trim()) {
      setError('Bitte gib deinen Namen ein.')
      return
    }
    if (accountType !== 'personal' && !companyName.trim()) {
      setError('Bitte gib den Unternehmens- oder Agenturnamen ein.')
      return
    }

    setSaving(true)
    setError('')
    setStep('finish')

    const payload: Record<string, any> = {
      id: userId,
      email,
      full_name: fullName.trim(),
      role: 'client',
      onboarding_step: 99,
      company_name: accountType === 'personal' ? null : companyName.trim(),
      company_website: companyWebsite.trim() || null,
    }

    const { error: upsertError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (upsertError) {
      const { error: fallbackError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName.trim(),
        role: 'client',
        onboarding_step: 99,
      }, { onConflict: 'id' })

      if (!fallbackError) {
        window.setTimeout(() => router.replace('/dashboard'), 700)
        return
      }

      setSaving(false)
      setStep('profile')
      setError(fallbackError.message || upsertError.message)
      return
    }

    window.setTimeout(() => router.replace('/dashboard'), 700)
  }

  return (
    <main className="onboarding-shell">
      <style>{`
        .onboarding-shell {
          min-height: 100dvh;
          background:
            radial-gradient(circle at 18% 18%, rgba(255,255,255,.18), transparent 30%),
            linear-gradient(135deg, var(--bg), var(--surface));
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          font-family: var(--font-ui);
          -webkit-font-smoothing: antialiased;
        }
        .onboarding-card {
          width: min(920px, 100%);
          min-height: 580px;
          border: 1px solid var(--border);
          border-radius: 28px;
          background: color-mix(in srgb, var(--card) 88%, transparent);
          box-shadow: 0 34px 110px rgba(0,0,0,.18), 0 1px 0 rgba(255,255,255,.04) inset;
          overflow: hidden;
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          backdrop-filter: blur(18px) saturate(130%);
          -webkit-backdrop-filter: blur(18px) saturate(130%);
          animation: obEnter .32s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes obEnter { from { opacity:0; transform: translateY(14px) scale(.985); } to { opacity:1; transform:none; } }
        .onboarding-rail {
          border-right: 1px solid var(--border);
          padding: 30px 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: color-mix(in srgb, var(--surface) 48%, transparent);
        }
        .onboarding-body { padding: 42px 48px; display:flex; flex-direction:column; }
        .ob-logo { height: 23px; width: auto; display:block; filter: var(--logo-filter, none); }
        .ob-eyebrow { margin:0 0 10px; font-size:12px; font-weight:800; letter-spacing:.12em; color:var(--text-muted); text-transform:uppercase; }
        .ob-title { margin:0; font-size: clamp(34px, 4vw, 52px); line-height:.98; letter-spacing:-.06em; font-weight:800; }
        .ob-sub { margin:16px 0 0; color:var(--text-secondary); font-size:16px; line-height:1.6; max-width:590px; }
        .ob-steps { display:flex; flex-direction:column; gap:10px; margin-top:38px; }
        .ob-step { display:flex; align-items:center; gap:10px; color:var(--text-muted); font-size:13px; font-weight:700; }
        .ob-step-dot { width:8px; height:8px; border-radius:50%; background:var(--border-strong); }
        .ob-step.active { color:var(--text); }
        .ob-step.active .ob-step-dot { background:var(--text); }
        .theme-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; margin-top:34px; }
        .theme-card {
          border:1px solid var(--border);
          background:var(--card);
          color:var(--text);
          border-radius:20px;
          padding:14px;
          text-align:left;
          cursor:pointer;
          font-family:inherit;
          min-height:184px;
          transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .theme-card:hover { transform: translateY(-2px); border-color:var(--border-strong); }
        .theme-card.active { border-color:var(--text); box-shadow:0 0 0 1px var(--text) inset; }
        .theme-preview { height:86px; border-radius:14px; border:1px solid rgba(0,0,0,.08); display:flex; align-items:flex-end; padding:10px; margin-bottom:14px; overflow:hidden; }
        .theme-line { height:5px; border-radius:99px; background:rgba(0,0,0,.18); margin-top:6px; }
        .theme-card h3 { margin:0 0 5px; font-size:15px; letter-spacing:-.02em; }
        .theme-card p { margin:0; font-size:12.5px; line-height:1.45; color:var(--text-muted); }
        .ob-actions { margin-top:auto; display:flex; justify-content:flex-end; gap:10px; padding-top:34px; }
        .ob-btn { height:42px; padding:0 18px; border-radius:12px; border:1px solid var(--border); background:var(--card); color:var(--text); font-family:inherit; font-weight:800; cursor:pointer; }
        .ob-btn.primary { background:var(--btn-prim); color:var(--btn-prim-text); border-color:var(--btn-prim); }
        .profile-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:30px; }
        .profile-field { display:flex; flex-direction:column; gap:7px; }
        .profile-field.full { grid-column:1 / -1; }
        .profile-field label { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--text-muted); }
        .profile-field input {
          height:44px;
          border:1px solid var(--border);
          border-radius:13px;
          background:var(--surface);
          color:var(--text);
          font-family:inherit;
          font-size:14px;
          font-weight:650;
          padding:0 14px;
          outline:none;
        }
        .profile-field input:focus-visible { border-color:var(--text-secondary); box-shadow:0 0 0 3px var(--glow); }
        .account-type-row { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px; margin-top:26px; }
        .account-type {
          border:1px solid var(--border);
          background:var(--surface);
          color:var(--text-secondary);
          border-radius:16px;
          padding:14px;
          text-align:left;
          cursor:pointer;
          font-family:inherit;
        }
        .account-type strong { display:block; color:var(--text); font-size:13px; margin-bottom:4px; }
        .account-type span { font-size:12px; line-height:1.4; color:var(--text-muted); }
        .account-type.active { border-color:var(--text); background:var(--card); }
        .ob-error { margin:18px 0 0; color:#ef4444; font-size:13px; font-weight:700; }
        .finish-wrap { margin:auto; text-align:center; max-width:620px; }
        .finish-spinner { width:32px; height:32px; border-radius:50%; border:2.5px solid var(--border); border-top-color:var(--text); animation:spin .8s linear infinite; margin:0 auto 26px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 820px) {
          .onboarding-card { grid-template-columns:1fr; min-height:auto; }
          .onboarding-rail { border-right:none; border-bottom:1px solid var(--border); gap:28px; }
          .onboarding-body { padding:30px 24px; }
          .theme-grid, .profile-grid, .account-type-row { grid-template-columns:1fr; }
        }
      `}</style>

      <section className="onboarding-card" aria-label="Festag Onboarding">
        <aside className="onboarding-rail">
          <div>
            <img src="/brand/logo.svg" alt="festag" className="ob-logo" />
            <div className="ob-steps">
              <div className={`ob-step ${step === 'theme' ? 'active' : ''}`}><span className="ob-step-dot" /> Design wählen</div>
              <div className={`ob-step ${step === 'profile' ? 'active' : ''}`}><span className="ob-step-dot" /> Profil einrichten</div>
              <div className={`ob-step ${step === 'finish' ? 'active' : ''}`}><span className="ob-step-dot" /> Konto abschließen</div>
            </div>
          </div>
          <p style={{ margin:0, color:'var(--text-muted)', fontSize:12.5, lineHeight:1.55, fontWeight:650 }}>
            Projektanlage kommt danach direkt in Festag über Workspace → Projekte mit Tagro AI.
          </p>
        </aside>

        <div className="onboarding-body">
          {step === 'theme' && (
            <>
              <p className="ob-eyebrow">Schritt 1</p>
              <h1 className="ob-title">Wähle dein System-Design.</h1>
              <p className="ob-sub">Du kannst das später jederzeit in den Einstellungen ändern. Für den Start geht es nur darum, dass Festag sich direkt richtig anfühlt.</p>
              <div className="theme-grid">
                {THEME_OPTIONS.map(option => (
                  <button key={option.mode} type="button" className={`theme-card ${selectedTheme === option.mode ? 'active' : ''}`} onClick={() => chooseTheme(option.mode)}>
                    <div className="theme-preview" style={{ background: option.surface }}>
                      <div style={{ width:'100%' }}>
                        <div className="theme-line" style={{ width:'64%', background: option.accent }} />
                        <div className="theme-line" style={{ width:'88%' }} />
                        <div className="theme-line" style={{ width:'48%' }} />
                      </div>
                    </div>
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                  </button>
                ))}
              </div>
              <div className="ob-actions">
                <button className="ob-btn primary" onClick={() => setStep('profile')}>Weiter</button>
              </div>
            </>
          )}

          {step === 'profile' && (
            <>
              <p className="ob-eyebrow">Schritt 2</p>
              <h1 className="ob-title">Richte deinen Arbeitskontext ein.</h1>
              <p className="ob-sub">Diese Daten werden deinem Account zugeordnet. Kein Projektbriefing, kein Tagro-Chat, kein Scope an dieser Stelle.</p>

              <div className="account-type-row" role="radiogroup" aria-label="Account-Typ">
                {[
                  { id:'personal' as AccountType, title:'Persönlich', desc:'Für einzelne Gründer oder private Projekte.' },
                  { id:'company' as AccountType, title:'Unternehmen', desc:'Für KMU, Startups und interne Teams.' },
                  { id:'agency' as AccountType, title:'Agentur', desc:'Für Kundenprojekte und spätere Team-Strukturen.' },
                ].map(type => (
                  <button key={type.id} type="button" className={`account-type ${accountType === type.id ? 'active' : ''}`} onClick={() => setAccountType(type.id)}>
                    <strong>{type.title}</strong>
                    <span>{type.desc}</span>
                  </button>
                ))}
              </div>

              <div className="profile-grid">
                <div className="profile-field full">
                  <label>Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Stefan Dirnberger" autoFocus />
                </div>
                <div className="profile-field">
                  <label>E-Mail</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.com" />
                </div>
                <div className="profile-field">
                  <label>{accountType === 'agency' ? 'Agentur' : 'Unternehmen'}</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={accountType === 'personal' ? 'Optional' : 'Name'} />
                </div>
                <div className="profile-field full">
                  <label>Website</label>
                  <input value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="https://…" />
                </div>
              </div>

              {error && <p className="ob-error">{error}</p>}

              <div className="ob-actions">
                <button className="ob-btn" onClick={() => setStep('theme')}>Zurück</button>
                <button className="ob-btn primary" onClick={finishProfile} disabled={saving}>{saving ? 'Speichert…' : 'Konto abschließen'}</button>
              </div>
            </>
          )}

          {step === 'finish' && (
            <div className="finish-wrap">
              <div className="finish-spinner" />
              <p className="ob-eyebrow">Kontoeinrichtung</p>
              <h1 className="ob-title">Wir schließen jetzt die Kontoeinrichtung.</h1>
              <p className="ob-sub" style={{ marginInline:'auto' }}>
                Danach landest du in deinem Festag Workspace. Dort kannst du über Projekte dein erstes Projekt mit Tagro AI strukturieren.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
