/**
 * LEGACY REGISTER — preserved for rollback.
 *
 * To restore: export { default } from '@/components/auth/RegisterPageLegacy'
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import AuthBrandLogo from '@/components/AuthBrandLogo'
import AuthThemeSwitcher from '@/components/AuthThemeSwitcher'
import { useAuthTheme } from '@/lib/auth-theme'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'

const googleLogoDesktop = "/google-symbol.svg"
const googleLogoMobile  = "/google-symbol.svg"

type EmailStep = 'none' | 'email' | 'emailSent' | 'codeEntry'

function mapAuthError(raw: string): string {
  const msg = String(raw || '').toLowerCase()
  if (raw && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('[festag/register] auth error:', raw)
  }
  if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many') || msg.includes('email rate'))
    return 'Zu viele Versuche. Bitte warte einen Moment.'
  if (msg.includes('security purposes') || msg.includes('can only request this after'))
    return 'Bitte warte kurz, bevor du einen neuen Code anforderst.'
  if (msg.includes('user already registered') || msg.includes('already registered'))
    return 'Diese E-Mail ist bereits registriert. Wechsle zur Anmeldung.'
  if (msg.includes('expired') || msg.includes('token has expired'))
    return 'Der Anmeldelink ist nicht mehr gültig. Fordere einen neuen Code an, um fortzufahren.'
  if (msg.includes('invalid token') || msg.includes('invalid otp') || msg.includes('invalid code') || msg.includes('otp_expired'))
    return 'Ungültiger oder abgelaufener Code. Fordere einen neuen an.'
  if (msg.includes('invalid email') || msg.includes('email_address_invalid'))
    return 'Bitte eine gültige E-Mail-Adresse verwenden.'
  if (msg.includes('network') || msg.includes('failed to fetch'))
    return 'Netzwerkproblem. Prüfe deine Verbindung und versuche es erneut.'
  if (msg.includes('captcha'))
    return 'Sicherheitsprüfung fehlgeschlagen. Lade die Seite neu und versuche es erneut.'
  if (msg.includes('sending') || msg.includes('mailer') || msg.includes('unexpected'))
    return 'E-Mail-Versand vorübergehend nicht möglich. Versuche es gleich erneut oder kontaktiere uns.'
  return 'Registrierung gerade nicht möglich. Bitte versuche es gleich erneut.'
}

export default function RegisterPageLegacy() {
  const supabase = createClient()
  const router = useRouter()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailStep, setEmailStep] = useState<EmailStep>('none')
  const [animating, setAnimating] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const { mode: theme, setMode: setTheme, canvas } = useAuthTheme('client')
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  function navigateWithFade(href: string) {
    router.prefetch(href)
    try {
      const path = new URL(href, window.location.origin).pathname
      if (isLegalPath(path)) rememberLegalReturn()
    } catch { /* noop */ }
    setPageExiting(true)
    setTimeout(() => router.push(href), 160)
  }

  useEffect(() => {
    if (emailStep !== 'email') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => emailRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [emailStep])

  useEffect(() => {
    if (emailStep !== 'codeEntry') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => codeRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [emailStep])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  // Invite passthrough — carry festag.app/invite/<token> through signup so the
  // new account lands back on the join screen (project pre-assigned there).
  const inviteToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('invite')
      : null
  const postAuthNext = inviteToken ? `/invite/${inviteToken}` : '/onboarding'

  function goTo(step: EmailStep) {
    setError('')
    setAnimating(true)
    setTimeout(() => { setEmailStep(step); setAnimating(false) }, 180)
  }

  function goBack() {
    if (emailStep === 'codeEntry' || emailStep === 'emailSent') { setCode(''); goTo('email'); return }
    setEmail(''); setCode('')
    goTo('none')
  }

  async function handleGoogle() {
    setError('')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${postAuthNext}`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (oauthError) { setError(mapAuthError(oauthError.message)); setOauthLoading(false) }
  }

  async function sendMagicLink(): Promise<boolean> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${postAuthNext}`,
        shouldCreateUser: true,
      },
    })
    if (otpError) { setError(mapAuthError(otpError.message)); return false }
    return true
  }

  async function handleEmailNext() {
    setError('')
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Bitte gültige E-Mail-Adresse eingeben.'); return
    }
    setLoading(true)
    const ok = await sendMagicLink()
    setLoading(false)
    if (ok) { setResendCooldown(60); goTo('codeEntry') }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return
    setError('')
    setResending(true)
    const ok = await sendMagicLink()
    setResending(false)
    if (ok) setResendCooldown(60)
  }

  async function handleVerifyCode() {
    setError('')
    const trimmed = code.trim()
    if (!trimmed || trimmed.length < 6) { setError('Bitte vollständigen Code eingeben.'); return }
    setLoading(true)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: 'email',
    })
    setLoading(false)
    if (verifyError) { setError(mapAuthError(verifyError.message)); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase
        .from('onboarding_state')
        .upsert({ user_id: session.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
    // /register is always client-side. Even if the email is mapped to an
    // admin/dev role, the new sign-up always begins in the client workspace.
    const target = inviteToken
      ? `/invite/${inviteToken}`
      : (session ? await resolvePostAuthTarget(supabase, session.user.id, '/dashboard') : '/onboarding')
    try {
      if (session) {
        rememberFestagAccount({
          userId: session.user.id,
          email: email.trim(),
          method: 'email',
          onboardingCompleted: target === '/dashboard',
        })
      } else {
        localStorage.setItem('festag_last_email', email.trim())
        localStorage.setItem('festag_last_method', 'email')
      }
    } catch {}
    window.location.href = target
  }

  const desktopTitle =
    emailStep === 'email'      ? 'Wie lautet Ihre E-Mail?' :
    emailStep === 'emailSent'  ? 'Prüfen Sie Ihre E-Mails' :
    emailStep === 'codeEntry'  ? 'Prüfen Sie Ihre E-Mails' :
    'Einen Schritt voraus'
  const mobileTitle =
    emailStep === 'email'      ? 'Wie lautet Ihre\nE-Mail-Adresse?' :
    emailStep === 'emailSent'  ? 'Prüfen Sie Ihre\nE-Mails' :
    emailStep === 'codeEntry'  ? 'Prüfen Sie Ihre\nE-Mails' :
    'Einen Schritt voraus'

  // ── render helpers (not React components — avoids remount on re-render) ──

  const themeSwitcher = (
    <AuthThemeSwitcher mode={theme} onChange={setTheme} />
  )

  const mainButtons = (
    <div className="reg-btn-stack">
      <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
        {oauthLoading ? <span className="reg-loader" /> : (
          <svg className="reg-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21.35 11.1H12.18v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44-3.83 0-7.19-3.02-7.19-7.27 0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97l1.9-1.98S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" fill="currentColor"/>
          </svg>
        )}
        <span className="reg-btn-label">Mit Google verbinden</span>
      </button>
      <button className="reg-btn reg-btn-outline" type="button" onClick={() => goTo('email')}>E-Mail verwenden</button>
    </div>
  )

  const mainButtonsMobile = (
    <div className="reg-btn-stack">
      <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
        {oauthLoading ? <span className="reg-loader" /> : (
          <svg className="reg-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21.35 11.1H12.18v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44-3.83 0-7.19-3.02-7.19-7.27 0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97l1.9-1.98S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" fill="currentColor"/>
          </svg>
        )}
        <span className="reg-btn-label">Mit Google verbinden</span>
      </button>
      <button className="reg-btn reg-btn-outline" type="button" onClick={() => goTo('email')}>E-Mail verwenden</button>
    </div>
  )

  const emailScreen = (
    <div className="reg-email-form">
      {error && <p className="reg-error">{error}</p>}
      <input
        ref={emailRef}
        className="reg-email-input"
        type="email"
        autoComplete="email"
        autoFocus
        placeholder="E-Mail-Adresse eingeben..."
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleEmailNext() }}
      />
      <button className="reg-btn reg-btn-outline" type="button" onClick={handleEmailNext} disabled={loading}>
        {loading ? 'Link wird gesendet…' : 'Magic Link senden'}
      </button>
      <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
    </div>
  )

  const resendDisabled = resending || resendCooldown > 0
  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Neuen Code anfordern in ${resendCooldown}s`
      : 'Neuen Code anfordern'

  const newestWarning = (
    <p className="reg-newest-hint">
      Nutze den jüngsten Code aus deiner E-Mail. Eine neue Anfrage entwertet alle vorherigen.
    </p>
  )

  const emailSentScreen = (
    <div className="reg-email-form">
      {error && <p className="reg-error">{error}</p>}
      <p className="reg-sent-info">
        Wir haben einen sicheren<br />Anmeldelink geschickt an<br />
        <strong>{email}</strong>
      </p>
      <button className="reg-btn reg-btn-outline" type="button" onClick={() => goTo('codeEntry')}>Code manuell eintippen</button>
      <button className="reg-link-action" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
    </div>
  )

  const codeEntryScreen = (
    <div className="reg-email-form">
      {error && <p className="reg-error">{error}</p>}
      <p className="reg-sent-info">
        Anmeldelink wurde geschickt an<br />
        <strong>{email}</strong>
      </p>
      <input
        ref={codeRef}
        className="reg-email-input reg-code-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        placeholder="6-stelliger Code"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\s/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') handleVerifyCode() }}
      />
      <button className="reg-btn reg-btn-confirm" type="button" onClick={handleVerifyCode} disabled={loading}>
        {loading ? <span className="reg-loader" /> : <span>Konto erstellen</span>}
      </button>
      <button className="reg-link-action" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
    </div>
  )

  const legal = (
    <div className="reg-legal">
      <p className="reg-legal-text">
        <span className="reg-legal-muted">Secure, AI-orchestrated software Delivery. Mit Ihrer Anmeldung bestätigen Sie unsere{' '}</span>
        <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>
        <span className="reg-legal-muted">{' '}und{' '}</span>
        <a href="/nutzungsbedingungen" onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}>Nutzungsbestimmungen</a>
        <span className="reg-legal-muted">.</span>
      </p>
      <p className="reg-login-link">
        Schon Zugang erstellt?{' '}
        <a href="/login" onClick={e => { e.preventDefault(); navigateWithFade('/login') }}>Hier&nbsp;anmelden</a>
      </p>
      <a className="reg-dev" href="/dev" onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}>Dev Zugang</a>
    </div>
  )

  return (
    <main className={`reg-root${pageExiting ? ' exiting' : ''}`} data-theme={theme}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .reg-root { min-height:100dvh; width:100%; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision; transition: opacity 0.16s linear; }
        .reg-root.exiting { opacity:0; pointer-events:none; }
        @keyframes regPageEnter { from { opacity:0; } to { opacity:1; } }
        .reg-root:not(.exiting) { animation: regPageEnter 0.18s linear both; }
        .reg-btn:active:not(:disabled) { transform:scale(0.97); transition:transform 0.08s ease !important; }
        .reg-content { width:100%; display:flex; flex-direction:column; gap:20px; transition:opacity 0.18s ease, transform 0.18s ease; }
        .reg-content.animating { opacity:0; transform:translateY(6px); }

        .reg-theme-switcher { display:flex; gap:8px; align-items:center; }
        .reg-theme-pill { min-width:40px; height:32px; display:flex; align-items:center; justify-content:center; padding:0 12px; border-radius:14px; border:0; outline:0; background:#fff; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:12px; font-weight:500; color:#5b647d; letter-spacing:0.24px; cursor:pointer; box-shadow:0 10px 24px rgba(15,23,42,0.10), 0 2px 5px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.9) inset; transition:background .15s, color .15s, box-shadow .15s, transform .15s; -webkit-tap-highlight-color:transparent; }
        .reg-theme-pill:hover { background:#FAFBFC; transform:translateY(-1px); }
        .reg-theme-pill.active { background:#EEF2F6; color:#202532; box-shadow:0 8px 18px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.78) inset; }
        .reg-theme-pill:focus,
        .reg-theme-pill:focus-visible { outline:0; box-shadow:0 10px 24px rgba(15,23,42,0.10), 0 2px 5px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.9) inset; }
        .reg-theme-desktop { position:absolute; right:28px; top:24px; z-index:20; }
        .reg-theme-mobile  { position:absolute; right:20px; top:48px; z-index:20; }

        .reg-desktop { display:flex; min-height:100dvh; background:#F5F5F7; align-items:center; justify-content:center; position:relative; transition:background .3s; }
        .reg-desktop-shell { width:271px; display:flex; flex-direction:column; gap:24px; align-items:center; min-height:auto; justify-content:center; padding-top:0; }
        .reg-desktop-header { width:100%; display:flex; flex-direction:column; gap:24px; align-items:center; }
        .reg-logo-desktop { display:flex; align-items:center; justify-content:center; width:100%; }
        .reg-desktop-title { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:21px; font-weight:500; color:#202532; line-height:normal; text-align:center; letter-spacing:0.21px; width:100%; transition:color .3s; }
        .reg-dev { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.002em; color:#8e8e93; text-decoration:none; text-align:center; display:block; transition:color .3s; }
        .reg-dev:hover { color:#202532; }

        /* Mobile: flex-center auth content vertically + horizontally with
           safe-area padding. Was position:absolute; top:175px (hardcoded),
           which made the layout hang off-centre on smaller phones. */
        .reg-mobile {
          display:none; min-height:100dvh; background:#edf1f6; position:relative;
          overflow-x:hidden; overflow-y:auto; transition:background .3s;
          align-items:center; justify-content:center;
          padding: max(28px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom));
          box-sizing:border-box;
        }
        .reg-mobile-card {
          position:relative; left:auto; right:auto; bottom:auto; top:auto;
          width:100%; max-width:360px; margin:0 auto;
          padding: 28px 22px 32px;
          background:#fff; border:1px solid rgba(99,111,132,.16); border-radius:32px;
          box-shadow:0 22px 70px rgba(46,58,82,0.15), 0 4px 18px rgba(46,58,82,0.08), 0 1px 0 rgba(255,255,255,0.85) inset;
          transition:background .3s, border-color .3s, box-shadow .3s;
          box-sizing:border-box;
        }
        .reg-mobile-shell {
          position:relative; left:auto; top:auto; transform:none;
          width:100%; max-width:none;
          display:flex; flex-direction:column; gap:24px; align-items:center;
        }
        .reg-mobile-logo-title { width:100%; display:flex; flex-direction:column; gap:9px; align-items:center; }
        .reg-logo-mobile { display:flex; align-items:center; justify-content:center; width:100%; min-height:62px; }
        .reg-mobile-inner { width:100%; display:flex; flex-direction:column; gap:32px; align-items:center; }
        .reg-mobile-title { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:28px; font-weight:500; color:#202532; white-space:nowrap; line-height:47px; text-align:center; letter-spacing:0.28px; height:35px; transition:color .3s; }
        .reg-mobile-title-email { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:20px; font-weight:500; color:#2e2f33; line-height:26px; text-align:center; letter-spacing:0.2px; white-space:pre-line; transition:color .3s; }

        .reg-btn-stack { width:271px; display:flex; flex-direction:column; gap:20px; }
        .reg-btn { width:100%; height:47px; border-radius:32px; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:14px; font-weight:500; letter-spacing:0.14px; cursor:pointer; padding:12px 45px; white-space:nowrap; overflow:hidden; transition:background .15s, opacity .15s, border-color .15s, color .15s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1); transform-origin:center; }
        .reg-btn-label { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-weight:500; }
        .reg-btn:disabled { opacity:.5; cursor:not-allowed; }
        .reg-btn-google { background:#5b647d; color:#fff; box-shadow:0px 8px 24px 0px rgba(200,169,91,0.14); }
        .reg-btn-google:hover:not(:disabled) { background:#505870; }
        .reg-btn-github { background:#fff; color:#202532; border:0.7px solid #e7ebf0; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); }
        .reg-btn-github:hover:not(:disabled) { background:#F7F8FB; border-color:#DCE1EA; }
        .reg-dev-divider {
          width:100%; display:flex; align-items:center; gap:10px;
          margin:2px 0 -8px;
          color:#9aa1ad; font-size:11px; font-weight:500;
          letter-spacing:0.16em; text-transform:uppercase;
        }
        .reg-dev-divider::before, .reg-dev-divider::after { content:''; flex:1; height:1px; background:#E7EBF0; }
        .reg-root[data-theme="dark"] .reg-dev-divider { color:#5b647d; }
        .reg-root[data-theme="dark"] .reg-dev-divider::before,
        .reg-root[data-theme="dark"] .reg-dev-divider::after { background:rgba(255,255,255,0.06); }
        .reg-root[data-theme="dark"] .reg-btn-github { background:#111720; color:#e8ebf1; border:1px solid rgba(210,225,255,0.085); box-shadow:none; }
        .reg-root[data-theme="dark"] .reg-btn-github:hover:not(:disabled) { background:#171e28; border-color:rgba(210,225,255,0.13); }
        .reg-btn-outline { background:#fff; color:#202532; border:0.7px solid #e7ebf0; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); }
        .reg-btn-outline:hover:not(:disabled) { background:#F7F8FB; border:1px solid #DCE1EA; }
        .reg-btn-confirm { background:#fff; color:#202532; border:0.7px solid #e7ebf0; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); }
        .reg-btn-confirm:hover:not(:disabled) { background:#F7F8FB; border-color:#DCE1EA; }
        .reg-google-icon { width:18px; height:18px; display:block; flex-shrink:0; color:#fff; }

        .reg-email-form { width:271px; display:flex; flex-direction:column; gap:16px; }
        .reg-email-input {
          width:100%; height:47px; border-radius:8px; border:1px solid #5b647d;
          background:#fff; color:#202532;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-size:14px; font-weight:400 !important;
          letter-spacing:0.01em;
          padding:0 16px; outline:none; caret-color:#5b647d;
          box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03);
          transition:border-color .15s, box-shadow .15s, background .3s, color .3s;
        }
        .reg-email-input::placeholder { color:#bcbfc2; }
        .reg-email-input:focus { border-color:#5b647d; box-shadow:0 0 0 3px rgba(91,100,125,0.12); }
        .reg-back { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; color:#8e8e93; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .reg-back:hover { color:#202532; }
        .reg-link-action { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; color:#8e8e93; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .reg-link-action:hover { color:#202532; }
        .reg-link-action:disabled { opacity:.5; cursor:not-allowed; }
        .reg-sent-info { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:14px; font-weight:400 !important; line-height:20px; letter-spacing:0.14px; text-align:center; color:#8e8e93; margin:8px 0 16px; }
        .reg-sent-info strong { color:#202532; font-weight:500; }
        .reg-code-input { text-align:center; letter-spacing:0.4em; font-size:15px; }
        .reg-newest-hint { margin:-4px 0 -2px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:12px; line-height:1.5; font-weight:400 !important; color:#8e8e93; text-align:center; letter-spacing:0.01em; padding:8px 12px; background:rgba(91,100,125,0.05); border:1px solid rgba(91,100,125,0.10); border-radius:10px; }
        .reg-root[data-theme="dark"] .reg-newest-hint { color:rgba(235,235,245,0.6); background:rgba(243,245,247,0.04); border-color:rgba(243,245,247,0.08); }
        .reg-loader-dark { width:16px; height:16px; border-radius:999px; border:2px solid rgba(32,37,50,0.25); border-top-color:#202532; animation:regSpin .75s linear infinite; flex-shrink:0; }

        .reg-legal { width:271px; display:flex; flex-direction:column; gap:16px; text-align:center; }
        .reg-legal-text { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.002em; color:#8e8e93; }
        .reg-legal-text span, .reg-legal-text a { font-weight:400 !important; }
        .reg-legal-muted { color:#8e8e93; font-weight:400 !important; }
        .reg-legal-text a { color:#202532; text-decoration:underline; text-underline-offset:3px; transition:color .3s; }
        .reg-legal-text a:hover { opacity:.75; }
        .reg-login-link { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.002em; color:#8e8e93; }
        .reg-login-link a { color:#202532; text-decoration:underline; font-weight:400 !important; transition:color .3s; }

        .reg-ssl-badge { position:fixed; left:20px; bottom:18px; display:flex; align-items:center; gap:6px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:11px; font-weight:400 !important; letter-spacing:0.22px; color:#8e8e93; user-select:none; z-index:30; transition:color .3s; }
        .reg-ssl-badge svg { width:11px; height:13px; flex-shrink:0; }
        .reg-region-note { position:fixed; right:20px; bottom:18px; width:auto; max-width:260px; text-align:right; color:#aeaeb2; font-size:10.5px; line-height:1.35; letter-spacing:.02em; font-weight:400 !important; z-index:30; white-space:nowrap; }

        .reg-error { width:271px; background:transparent; color:var(--text-secondary); border:1px solid var(--border); border-radius:10px; padding:10px 12px; font-size:12.5px; font-weight:500 !important; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); text-align:left; letter-spacing:0.01em; line-height:1.5; display:flex; align-items:flex-start; gap:8px; }
        .reg-error::before { content:''; display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--accent); margin-top:6px; flex-shrink:0; }
        .reg-success { width:271px; background:rgba(34,197,94,.08); color:#16a34a; border-radius:10px; padding:10px 12px; font-size:12.5px; font-weight:500; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); }
        .reg-loader { width:16px; height:16px; border-radius:999px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation:regSpin .75s linear infinite; flex-shrink:0; }
        @keyframes regSpin { to { transform:rotate(360deg); } }
        @media (max-width: 640px) { .reg-desktop { display:none; } .reg-mobile { display:flex; } }

        /* ═══ DARK MODE ═══ */
        .reg-root[data-theme="dark"] .reg-desktop { background:#000000; }
        .reg-root[data-theme="dark"] .reg-mobile  { background:#000000; }
        .reg-root[data-theme="read"] .reg-desktop,
        .reg-root[data-theme="read"] .reg-mobile { background:#F7F4EC; }
        .reg-root[data-theme="dark"] .reg-mobile-card { background:#10141a; border-color:rgba(210,225,255,0.09); box-shadow:0px 26px 80px rgba(0,0,0,0.55),0px 6px 22px rgba(0,0,0,0.34),0px 1px 0px rgba(255,255,255,0.04) inset; }
        .reg-root[data-theme="dark"] .reg-desktop-title,
        .reg-root[data-theme="dark"] .reg-mobile-title,
        .reg-root[data-theme="dark"] .reg-mobile-title-email { color:#e8ebf1; }
        .reg-root[data-theme="dark"] .reg-btn-google { background:#69748d; color:#f1f3f7; border:1px solid rgba(210,225,255,0.10); box-shadow:inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 10px rgba(0,0,0,0.32) !important; }
        .reg-root[data-theme="dark"] .reg-btn-google:hover:not(:disabled) { background:#727e98; transform:translateY(-1px); box-shadow:inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 22px -6px rgba(0,0,0,0.5) !important; }
        .reg-root[data-theme="dark"] .reg-btn-google:active:not(:disabled) { background:#5f697f; transform:translateY(0); }
        .reg-root[data-theme="dark"] .reg-btn-outline, .reg-root[data-theme="dark"] .reg-btn-confirm { background:#111720; color:#e8ebf1; border:1px solid rgba(210,225,255,0.085); box-shadow:none; }
        .reg-root[data-theme="dark"] .reg-btn-outline:hover:not(:disabled), .reg-root[data-theme="dark"] .reg-btn-confirm:hover:not(:disabled) { background:#171e28; border-color:rgba(210,225,255,0.13); transform:translateY(-1px); }
        .reg-root[data-theme="dark"] .reg-btn-outline:active:not(:disabled), .reg-root[data-theme="dark"] .reg-btn-confirm:active:not(:disabled) { background:#1c2430; transform:translateY(0); }
        .reg-root[data-theme="dark"] .reg-email-input { background:#111720; color:#e8ebf1; border:1px solid rgba(210,225,255,0.085); caret-color:#6a738c; }
        .reg-root[data-theme="dark"] .reg-email-input::placeholder { color:#606a77; }
        .reg-root[data-theme="dark"] .reg-email-input:focus { border-color:rgba(106,115,140,0.45); box-shadow:0 0 0 3px rgba(106,115,140,0.12); }
        .reg-root[data-theme="dark"] .reg-legal-text, .reg-root[data-theme="dark"] .reg-legal-muted { color:#7B8294; }
        .reg-root[data-theme="dark"] .reg-legal-text a, .reg-root[data-theme="dark"] .reg-login-link a { color:#E8E8E5; }
        .reg-root[data-theme="dark"] .reg-login-link { color:#7B8294; }
        .reg-root[data-theme="dark"] .reg-back { color:#7B8294; }
        .reg-root[data-theme="dark"] .reg-back:hover { color:#E8E8E5; }
        .reg-root[data-theme="dark"] .reg-link-action { color:rgba(235,235,245,0.6); }
        .reg-root[data-theme="dark"] .reg-link-action:hover { color:#F3F5F7; }
        .reg-root[data-theme="dark"] .reg-sent-info { color:rgba(235,235,245,0.6); }
        .reg-root[data-theme="dark"] .reg-sent-info strong { color:#F3F5F7; }
        .reg-root[data-theme="dark"] .reg-dev { color:rgba(235,235,245,0.6); }
        .reg-root[data-theme="dark"] .reg-dev:hover { color:#F3F5F7; }
        .reg-root[data-theme="dark"] .reg-theme-pill { background:#141820; color:rgba(243,245,247,0.58); box-shadow:0 12px 30px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.05) inset; }
        .reg-root[data-theme="dark"] .reg-theme-pill:hover { background:#18202B; }
        .reg-root[data-theme="dark"] .reg-theme-pill.active { background:#202938; color:#F3F5F7; box-shadow:0 10px 24px rgba(0,0,0,0.26), 0 1px 0 rgba(255,255,255,0.07) inset; }
        .reg-root[data-theme="dark"] .reg-theme-pill:focus,
        .reg-root[data-theme="dark"] .reg-theme-pill:focus-visible { outline:0; box-shadow:0 12px 30px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.05) inset; }
        .reg-root[data-theme="dark"] .reg-ssl-badge { color:rgba(243,245,247,0.55); }
        .reg-root[data-theme="dark"] .reg-region-note { color:rgba(243,245,247,0.50); }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="reg-desktop">
        <div className="reg-theme-desktop">{themeSwitcher}</div>
        <section className="reg-desktop-shell" aria-label="Festag Registrierung">
          <div className="reg-desktop-header">
            <div className="reg-logo-desktop"><AuthBrandLogo size="desktop" /></div>
            <h1 className="reg-desktop-title">{desktopTitle}</h1>
          </div>
          <div className={`reg-content${animating ? ' animating' : ''}`}>
            {emailStep === 'none' && error && <p className="reg-error">{error}</p>}
            {emailStep === 'none' && mainButtons}
            {emailStep === 'email' && emailScreen}
            {emailStep === 'emailSent' && emailSentScreen}
            {emailStep === 'codeEntry' && codeEntryScreen}
          </div>
          {emailStep === 'none' && legal}
        </section>
      </div>

      {/* ── MOBILE ── */}
      <div className="reg-mobile" aria-label="Festag Registrierung">
        <div className="reg-mobile-card" />
        <div className="reg-theme-mobile">{themeSwitcher}</div>
        <div className="reg-mobile-shell">
          <div className="reg-mobile-logo-title">
            <div className="reg-logo-mobile"><AuthBrandLogo size="mobile" /></div>
            <div className="reg-mobile-inner">
              {emailStep === 'none'
                ? <h1 className="reg-mobile-title">Einen Schritt voraus</h1>
                : <h1 className="reg-mobile-title-email">{mobileTitle}</h1>}
              <div className={`reg-content${animating ? ' animating' : ''}`}>
                {emailStep === 'none' && error && <p className="reg-error">{error}</p>}
                {emailStep === 'none' && mainButtonsMobile}
                {emailStep === 'email' && emailScreen}
                {emailStep === 'emailSent' && emailSentScreen}
            {emailStep === 'codeEntry' && codeEntryScreen}
              </div>
              {emailStep === 'none' && legal}
            </div>
          </div>
        </div>
      </div>

      <div className="reg-ssl-badge" aria-label="SSL verschlüsselt">
        <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
        </svg>
        <span>SSL · End-to-End verschlüsselt</span>
      </div>
      <p className="reg-region-note">Aktuell nur in der DACH-Region verfügbar</p>
    </main>
  )
}
