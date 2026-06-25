'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import AuthBrandLogo from '@/components/AuthBrandLogo'
import AuthThemeSwitcher from '@/components/AuthThemeSwitcher'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import AuthLandingMobileMenu from '@/components/auth/AuthLandingMobileMenu'
import { useAuthTheme } from '@/lib/auth-theme'

type EmailStep = 'main' | 'codeEntry'

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

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailStep, setEmailStep] = useState<EmailStep>('main')
  const [animating, setAnimating] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const subFlow = emailStep !== 'main'

  const inviteToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('invite')
      : null
  const postAuthNext = inviteToken ? `/invite/${inviteToken}` : '/onboarding'

  function navigateWithFade(href: string) {
    router.prefetch(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), 160)
  }

  useEffect(() => {
    if (emailStep !== 'main') return
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

  function goTo(step: EmailStep) {
    setError('')
    setAnimating(true)
    setTimeout(() => { setEmailStep(step); setAnimating(false) }, 180)
  }

  function switchBack() {
    setCode('')
    goTo('main')
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

  async function handleEmailSubmit() {
    setError('')
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Bitte gültige E-Mail-Adresse eingeben.')
      return
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

  const resendDisabled = resending || resendCooldown > 0
  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Neuen Code anfordern in ${resendCooldown}s`
      : 'Neuen Code anfordern'

  const themeSwitcher = (
    <AuthThemeSwitcher mode={theme} onChange={setTheme} includeRead={false} variant="log" />
  )

  const mainSignUp = (
    <div className="al-signin-stack">
      {error && <p className="al-error">{error}</p>}

      <div className="al-method-group">
        <button className="al-btn al-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
          {oauthLoading ? <span className="al-loader" /> : <GoogleBrandIcon />}
          <span>Mit Google registrieren</span>
        </button>
      </div>

      <div className="al-divider" aria-hidden="true">
        <span>oder</span>
      </div>

      <div className="al-method-group">
        <input
          ref={emailRef}
          className="al-input"
          type="email"
          autoComplete="email"
          placeholder="Arbeits-E-Mail eingeben"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleEmailSubmit() }}
        />
        <button className="al-btn al-btn-primary" type="button" onClick={handleEmailSubmit} disabled={loading}>
          {loading ? 'Link wird gesendet…' : 'Weiter mit E-Mail'}
        </button>
      </div>
    </div>
  )

  const codeEntryScreen = (
    <div className="al-signin-stack">
      {error && <p className="al-error">{error}</p>}
      <p className="al-flow-info">
        Anmeldelink wurde geschickt an<br />
        <strong>{email}</strong>
      </p>
      <input
        ref={codeRef}
        className="al-input al-code-input"
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
      <button className="al-btn al-btn-primary" type="button" onClick={handleVerifyCode} disabled={loading}>
        {loading ? 'Wird geprüft…' : 'Konto erstellen'}
      </button>
      <button className="al-link" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      <button className="al-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const legal = (
    <div className="al-agreements">
      <p className="al-agreements-text">
        Mit Ihrer Registrierung zu einem kostenlosen Festag-Konto stimmen Sie unseren{' '}
        <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>,{' '}
        <a href="/nutzungsbedingungen" onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}>Nutzungsbedingungen</a>,{' '}
        <a href="/datenschutz" onClick={e => { e.preventDefault(); navigateWithFade('/datenschutz') }}>Datenschutzerklärung</a> und{' '}
        <a href="/datenschutz" onClick={e => { e.preventDefault(); navigateWithFade('/datenschutz') }}>Cookie-Hinweisen</a> zu.
      </p>
      <p className="al-signup-alt">
        Schon Zugang?{' '}
        <a href="/login" onClick={e => { e.preventDefault(); navigateWithFade('/login') }}>Anmelden</a>
      </p>
    </div>
  )

  return (
    <main className={`al-root${pageExiting ? ' exiting' : ''}`} data-theme={theme}>
      <style>{AUTH_LANDING_STYLES}</style>

      <div className="al-container">
        <header className="al-header">
          <div className="al-header-brand">
            <AuthBrandLogo size="compact" />
          </div>
          <nav className="al-header-nav" aria-label="Festag">
            <a href="/blog" onClick={e => { e.preventDefault(); navigateWithFade('/blog') }}>Blog</a>
            <a href="/privacy" onClick={e => { e.preventDefault(); navigateWithFade('/privacy') }}>Datenschutz</a>
            <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>
          </nav>
          <div className="al-header-actions">
            {themeSwitcher}
            <AuthLandingMobileMenu onNavigate={navigateWithFade} />
          </div>
        </header>

        <main className="al-main">
          <div className="al-mobile-sheet">
            <div className="al-sheet-body">
              <section className="al-signin" aria-label="Festag Registrierung">
            <div className="al-signin-head">
              {!subFlow ? (
                <>
                  <div className="al-hero-copy">
                    <h1 className="al-title al-title-display">
                      <span className="al-title-nowrap">Einen Schritt voraus</span>
                    </h1>
                  </div>
                  <p className="al-t1">Erstellen Sie ein kostenloses Konto mit Ihrer Arbeits-E-Mail.</p>
                </>
              ) : (
                <>
                  <p className="al-kicker">Registrierung</p>
                  <h1 className="al-title">Prüfen Sie Ihre E-Mails</h1>
                  <p className="al-subtitle">
                    <span className="al-subtitle-strong">Geben Sie den 6-stelligen Code aus Ihrer E-Mail ein,</span>
                    <span className="al-subtitle-muted"> oder öffnen Sie den Anmeldelink.</span>
                  </p>
                </>
              )}
            </div>

            <div className={`al-content${animating ? ' animating' : ''}`}>
              {!subFlow ? mainSignUp : codeEntryScreen}
            </div>

            {!subFlow && legal}
              </section>

              <footer className="al-footer-meta">
                <div className="al-ssl-badge" aria-label="SSL verschlüsselt">
                  <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
                  </svg>
                  <span>SSL, End-to-End verschlüsselt</span>
                </div>
                <div className="al-footer-end">
                  <p className="al-region-note">Aktuell nur in der DACH-Region verfügbar</p>
                  <a className="al-dev-link" href="/dev/login" onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}>Dev Zugang</a>
                </div>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </main>
  )
}
