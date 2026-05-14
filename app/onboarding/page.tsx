'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setTheme, getTheme, type ThemeMode } from '@/lib/theme'

type StepId = 'design' | 'profile' | 'finish'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'design',  label: 'Design wählen' },
  { id: 'profile', label: 'Profil einrichten' },
  { id: 'finish',  label: 'Konto abschließen' },
]

const THEME_OPTIONS = [
  { id: 'light' as ThemeMode, title: 'Hell',      desc: 'Klar, reduziert und hell für tägliche Arbeit.',     preview: 'light' },
  { id: 'read'  as ThemeMode, title: 'Lesemodus', desc: 'Ruhiger, wärmer und angenehm für lange Berichte.', preview: 'read'  },
  { id: 'dark'  as ThemeMode, title: 'Dunkel',    desc: 'Konzentriert, technisch und kontraststark.',       preview: 'dark'  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [stepIdx, setStepIdx] = useState(0)
  const [theme, setLocalTheme] = useState<ThemeMode>('read')
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLocalTheme(getTheme())
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUserId(data.session.user.id)
    })
  }, [router, supabase])

  function chooseTheme(mode: ThemeMode) {
    setLocalTheme(mode)
    setTheme(mode)
  }

  async function persistDesign(uid: string) {
    await supabase.from('profiles').update({ theme_pref: theme }).eq('id', uid)
    await supabase.from('onboarding_state').upsert({
      user_id: uid,
      current_step: 'profile',
      design_done: true,
      updated_at: new Date().toISOString(),
    })
  }

  async function finishAll(uid: string) {
    await supabase.from('onboarding_state').upsert({
      user_id: uid,
      current_step: 'done',
      profile_done: true,
      workspace_done: true,
      design_done: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  async function next() {
    setError('')
    if (!userId) { router.push('/login'); return }
    setSaving(true)
    try {
      if (stepIdx === 0) await persistDesign(userId)
      if (stepIdx < STEPS.length - 1) {
        setStepIdx(i => i + 1)
      } else {
        await finishAll(userId)
        router.push('/dashboard')
      }
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  const currentStep = STEPS[stepIdx]
  const themeAttr = theme === 'read' ? 'read' : theme === 'dark' ? 'dark' : 'light'

  return (
    <main className="onb-root" data-theme={themeAttr}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .onb-root {
          min-height:100dvh; width:100%;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight:500; letter-spacing:0.01em;
          -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision;
          padding:32px;
          display:flex; align-items:center; justify-content:center;
          transition: background .3s, color .3s;
        }
        .onb-root[data-theme="light"] { background:#EFEFEC; color:#0A0B0A; }
        .onb-root[data-theme="read"]  { background:#E6DFCE; color:#1C1914; }
        .onb-root[data-theme="dark"]  { background:#0A0B0A; color:#E8E8E5; }

        .onb-shell {
          width:100%; max-width:1080px; min-height:640px;
          display:grid; grid-template-columns:280px 1fr;
          border-radius:24px; overflow:hidden;
          transition: background .3s, box-shadow .3s;
        }
        .onb-root[data-theme="light"] .onb-shell { background:#FAFAF9; box-shadow:0 28px 72px -20px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04); }
        .onb-root[data-theme="read"]  .onb-shell { background:#F7F4EC; box-shadow:0 28px 72px -20px rgba(38,33,24,0.12), 0 1px 2px rgba(38,33,24,0.04); }
        .onb-root[data-theme="dark"]  .onb-shell { background:#141517; box-shadow:0 28px 72px -20px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.2); }

        /* SIDEBAR */
        .onb-side { padding:44px 36px; display:flex; flex-direction:column; }
        .onb-logo {
          font-family:'Qurova DEMO', serif;
          font-size:24px; font-weight:500; letter-spacing:-.3px;
          margin-bottom:48px; color:inherit;
        }
        .onb-steps { display:flex; flex-direction:column; gap:18px; }
        .onb-step {
          display:flex; align-items:center; gap:14px;
          font-size:14px; font-weight:500; letter-spacing:0.01em;
          opacity:.38; transition:opacity .2s;
        }
        .onb-step.active { opacity:1; }
        .onb-step.done   { opacity:.6; }
        .onb-step-dot {
          width:8px; height:8px; border-radius:999px;
          background:currentColor; flex-shrink:0;
          box-shadow:0 0 0 0 transparent;
          transition: box-shadow .2s;
        }
        .onb-step.active .onb-step-dot { box-shadow:0 0 0 4px color-mix(in srgb, currentColor 18%, transparent); }
        .onb-step:not(.active):not(.done) .onb-step-dot { background:transparent; box-shadow:inset 0 0 0 1.5px currentColor; }

        .onb-hint {
          margin-top:auto;
          font-size:12px; line-height:1.55; opacity:.45;
          letter-spacing:0.01em; max-width:220px;
        }

        /* MAIN */
        .onb-main { padding:56px 56px 32px; display:flex; flex-direction:column; min-height:0; }
        .onb-eyebrow {
          font-size:11px; font-weight:500;
          letter-spacing:0.2em; text-transform:uppercase;
          opacity:.5; margin-bottom:18px;
        }
        .onb-title {
          font-size:54px; line-height:1.02;
          letter-spacing:-0.02em; font-weight:500;
          margin-bottom:18px; max-width:680px;
        }
        .onb-lede {
          font-size:15px; line-height:1.6; font-weight:500;
          letter-spacing:0.01em; opacity:.62;
          max-width:560px; margin-bottom:48px;
        }

        /* THEME CARDS */
        .onb-cards { display:grid; grid-template-columns:repeat(3, 1fr); gap:18px; max-width:680px; }
        .onb-card {
          background:transparent; border:1.5px solid transparent; border-radius:14px;
          padding:18px; cursor:pointer; text-align:left;
          font-family:inherit; color:inherit;
          transition: border-color .15s, transform .2s, background .15s;
        }
        .onb-root[data-theme="light"] .onb-card { border-color:rgba(10,11,10,0.06); }
        .onb-root[data-theme="read"]  .onb-card { border-color:rgba(28,25,20,0.08); }
        .onb-root[data-theme="dark"]  .onb-card { border-color:rgba(255,255,255,0.06); }
        .onb-card:hover:not(.selected) { transform:translateY(-2px); }
        .onb-card.selected { border-color:currentColor; border-width:2px; padding:17px; }

        .onb-card-preview {
          width:100%; aspect-ratio:1.55/1; border-radius:10px;
          display:flex; flex-direction:column; justify-content:center;
          padding:18px; gap:7px;
          margin-bottom:16px;
        }
        .onb-card-bar { height:6px; border-radius:3px; }
        .onb-card-bar.long  { width:74%; }
        .onb-card-bar.mid   { width:54%; }
        .onb-card-bar.short { width:36%; }

        .preview-light  { background:#FFFFFF; }
        .preview-light  .onb-card-bar.long { background:#1C1914; }
        .preview-light  .onb-card-bar.mid  { background:rgba(28,25,20,0.18); }
        .preview-light  .onb-card-bar.short{ background:rgba(28,25,20,0.10); }

        .preview-read   { background:#EFE7D2; }
        .preview-read   .onb-card-bar.long { background:#6F6248; }
        .preview-read   .onb-card-bar.mid  { background:rgba(111,98,72,0.4); }
        .preview-read   .onb-card-bar.short{ background:rgba(111,98,72,0.22); }

        .preview-dark   { background:#0E0F0F; }
        .preview-dark   .onb-card-bar.long { background:#7B7DFF; }
        .preview-dark   .onb-card-bar.mid  { background:rgba(255,255,255,0.16); }
        .preview-dark   .onb-card-bar.short{ background:rgba(255,255,255,0.08); }

        .onb-card-title { font-size:16px; font-weight:500; letter-spacing:0; margin-bottom:6px; }
        .onb-card-desc  { font-size:13px; line-height:1.5; font-weight:500; letter-spacing:0.01em; opacity:.55; }

        /* FOOTER */
        .onb-footer {
          margin-top:auto; padding-top:40px;
          display:flex; align-items:center; justify-content:flex-end; gap:12px;
        }
        .onb-error { font-size:12.5px; color:#d53939; margin-right:auto; }
        .onb-btn {
          font-family:inherit; font-size:14px; font-weight:500; letter-spacing:0.01em;
          padding:12px 28px; border-radius:999px; border:none; cursor:pointer;
          transition: background .15s, opacity .15s, transform .25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .onb-btn:active:not(:disabled) { transform:scale(0.97); transition: transform 0.08s ease; }
        .onb-btn:disabled { opacity:.5; cursor:not-allowed; }
        .onb-root[data-theme="light"] .onb-btn-primary { background:#0A0B0A; color:#FAFAF9; }
        .onb-root[data-theme="read"]  .onb-btn-primary { background:#1C1914; color:#F7F4EC; }
        .onb-root[data-theme="dark"]  .onb-btn-primary { background:#FAFAF9; color:#0A0B0A; }
        .onb-btn-primary:hover:not(:disabled) { opacity:.88; }

        @media (max-width: 880px) {
          .onb-shell { grid-template-columns:1fr; max-width:560px; min-height:0; }
          .onb-side { padding:32px 28px 20px; }
          .onb-logo { margin-bottom:24px; }
          .onb-steps { flex-direction:row; gap:18px; flex-wrap:wrap; }
          .onb-hint { display:none; }
          .onb-main { padding:8px 28px 28px; }
          .onb-title { font-size:34px; }
          .onb-cards { grid-template-columns:1fr; }
        }
      `}</style>

      <section className="onb-shell" aria-label="Festag Onboarding">
        <aside className="onb-side">
          <div className="onb-logo">festag</div>
          <nav className="onb-steps" aria-label="Fortschritt">
            {STEPS.map((s, i) => {
              const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'
              return (
                <div key={s.id} className={`onb-step ${state}`}>
                  <span className="onb-step-dot" />
                  <span>{s.label}</span>
                </div>
              )
            })}
          </nav>
          <p className="onb-hint">
            Projektanlage kommt danach direkt in Festag über Workspace → Projekte mit Tagro AI.
          </p>
        </aside>

        <div className="onb-main">
          <span className="onb-eyebrow">Schritt {stepIdx + 1}</span>

          {currentStep.id === 'design' && (
            <>
              <h1 className="onb-title">Wähle dein System-Design.</h1>
              <p className="onb-lede">
                Du kannst das später jederzeit in den Einstellungen ändern. Für den Start
                geht es nur darum, dass Festag sich direkt richtig anfühlt.
              </p>
              <div className="onb-cards" role="radiogroup" aria-label="Design wählen">
                {THEME_OPTIONS.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={theme === o.id}
                    className={`onb-card${theme === o.id ? ' selected' : ''}`}
                    onClick={() => chooseTheme(o.id)}
                  >
                    <div className={`onb-card-preview preview-${o.preview}`}>
                      <div className="onb-card-bar long" />
                      <div className="onb-card-bar mid" />
                      <div className="onb-card-bar short" />
                    </div>
                    <div className="onb-card-title">{o.title}</div>
                    <div className="onb-card-desc">{o.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {currentStep.id === 'profile' && (
            <>
              <h1 className="onb-title">Profil einrichten.</h1>
              <p className="onb-lede">
                Dieser Schritt kommt gleich — wir holen erst das Design ab und gehen dann ins Detail.
              </p>
            </>
          )}

          {currentStep.id === 'finish' && (
            <>
              <h1 className="onb-title">Konto abschließen.</h1>
              <p className="onb-lede">Letzter Check, dann gehts ins Dashboard.</p>
            </>
          )}

          <div className="onb-footer">
            {error && <span className="onb-error">{error}</span>}
            <button className="onb-btn onb-btn-primary" type="button" onClick={next} disabled={saving}>
              {saving ? 'Speichere…' : stepIdx === STEPS.length - 1 ? 'Fertig' : 'Weiter'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
