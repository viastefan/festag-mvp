'use client'

import { useState, useEffect, useLayoutEffect, useRef, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from '@phosphor-icons/react'
import UsernameCheckBadge from '@/components/auth/UsernameCheckBadge'
import { createClient } from '@/lib/supabase/client'
import { getLastFestagAccount, getLastFestagEmail, getLastFestagMethod, getLastWorkspaceName, hasFestagDeviceAccount, rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import AppleBrandIcon from '@/components/auth/AppleBrandIcon'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthRecoveryModal from '@/components/auth/AuthRecoveryModal'
import AuthWorkspacePath from '@/components/auth/AuthWorkspacePath'
import AuthExpandableTextField from '@/components/auth/AuthExpandableTextField'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { AUTH_OS_STYLES } from '@/components/auth/auth-os-styles'
import AuthGlassyHero, { AUTH_GLASSY_HERO_CSS } from '@/components/auth/AuthGlassyHero'
import AuthEnterGlyph, { AUTH_ENTER_GLYPH_CSS } from '@/components/auth/AuthEnterGlyph'
import AuthOtpInput from '@/components/auth/AuthOtpInput'
import AuthHelpAccordion from '@/components/auth/AuthHelpAccordion'
import { useAuthEnterSubmit } from '@/components/auth/useAuthEnterSubmit'
import { prepareAuthRouteTransition, consumePanelEnter, isCrossPanelAuthNav, navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { applyTheme } from '@/lib/theme'
import { prefersReducedMotion } from '@/lib/festag-sheet-motion'
import { checkSsoDomain, extractSsoDomain, peekSsoDomain, startSsoLogin, type SsoDomainCheck } from '@/lib/auth-sso'
import {
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
  normalizeWorkspaceName,
  rememberWorkspaceName,
  setPendingWorkspaceName,
} from '@/lib/pending-workspace'
import { bootstrapPersonalWorkspace } from '@/lib/workspace-bootstrap-client'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'
import FestagWorkingDots from '@/components/FestagWorkingDots'

export type AuthLandingMode = 'login' | 'signup'

type Method = 'google' | 'apple' | 'email' | 'sso' | 'passkey' | 'github'
const METHOD_KEY = 'festag_last_method'
/** Soft login ↔ register handoff — skip boot spinner, content fade only. */
const AUTH_SOFT_MODE_KEY = 'festag_auth_soft_mode'

const AUTH_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

function isValidAuthEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!AUTH_EMAIL_RE.test(trimmed)) return false
  const domain = trimmed.split('@')[1]?.toLowerCase() || ''
  // Reject incomplete / placeholder-looking hosts (no real TLD segment).
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false
  return true
}

const EMAIL_EMPTY_ERROR = 'Bitte E-Mail-Adresse eingeben.'
const EMAIL_INVALID_ERROR = 'Bitte eine gültige E-Mail-Adresse eingeben.'
const EMAIL_ALREADY_USED_ERROR =
  'Diese E-Mail wird bereits verwendet. Melde dich an oder nutze eine andere Adresse.'
const EMAIL_ALREADY_USED_TITLE = 'Für diese E-Mail gibt es schon ein Konto.'
const IDENTITY_MISMATCH_ERROR = 'Benutzer und E-Mail passen nicht zusammen.'

function isEmailFieldError(msg: string): boolean {
  return msg === EMAIL_EMPTY_ERROR || msg === EMAIL_INVALID_ERROR
}

function consumeSoftAuthModeSwitch(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (sessionStorage.getItem(AUTH_SOFT_MODE_KEY) === '1') {
      sessionStorage.removeItem(AUTH_SOFT_MODE_KEY)
      return true
    }
  } catch { /* noop */ }
  return false
}

type AuthStep = 'main' | 'codeEntry' | 'sso'

function mapAuthError(raw: string, mode: AuthLandingMode = 'login'): string {
  const msg = String(raw || '').toLowerCase()
  if (raw && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(`[festag/${mode}] auth error:`, raw)
  }
  // Rate limits are handled silently — previous OTP stays valid.
  if (
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many') ||
    msg.includes('email rate') ||
    msg.includes('security purposes') ||
    msg.includes('can only request this after')
  ) {
    return ''
  }
  if (msg.includes('signups not allowed'))
    return 'Neue Konten sind derzeit nicht freigeschaltet. Bitte kontaktiere uns.'
  // Must run before the generic "email address" branch — Supabase often returns
  // "A user with this email address has already been registered".
  if (
    msg.includes('already_registered') ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('user already exists') ||
    msg.includes('email address already') ||
    (msg.includes('already') && msg.includes('registered'))
  ) {
    return EMAIL_ALREADY_USED_ERROR
  }
  if (msg.includes('user not found') || msg.includes('user_not_found'))
    return mode === 'login'
      ? 'Kein Account mit dieser E-Mail. Registriere dich zuerst.'
      : 'Anmeldung gerade nicht möglich. Bitte versuche es gleich erneut.'
  if (
    msg.includes('identity_mismatch') ||
    msg.includes('workspace_unknown') ||
    (msg.includes('benutzer') && msg.includes('e-mail') && msg.includes('passen'))
  ) {
    return IDENTITY_MISMATCH_ERROR
  }
  if (msg.includes('expired') || msg.includes('token has expired'))
    return 'Der Anmeldelink ist nicht mehr gültig. Fordere einen neuen Code an, um fortzufahren.'
  if (msg.includes('invalid token') || msg.includes('invalid otp') || msg.includes('invalid code') || msg.includes('token_hash') || msg.includes('otp_expired'))
    return 'Ungültiger oder abgelaufener Code. Fordere einen neuen an.'
  // Format / domain rejects only — never "already used" (handled above).
  if (
    msg.includes('invalid_email') ||
    msg.includes('email_address_invalid') ||
    (msg.includes('invalid email') && !msg.includes('already')) ||
    (msg.includes('unable to validate email') && !msg.includes('already'))
  ) {
    return 'Bitte eine gültige E-Mail-Adresse verwenden.'
  }
  if (msg.includes('network') || msg.includes('failed to fetch'))
    return 'Netzwerkproblem. Prüfe deine Verbindung und versuche es erneut.'
  if (msg.includes('captcha'))
    return 'Sicherheitsprüfung fehlgeschlagen. Lade die Seite neu und versuche es erneut.'
  // Mail / send infra — never surface (reads as broken product). Stay silent.
  if (
    msg.includes('sending') ||
    msg.includes('mailer') ||
    msg.includes('mail_failed') ||
    msg.includes('e-mail-versand') ||
    msg.includes('email-versand') ||
    msg.includes('unexpected')
  ) {
    return ''
  }
  if (msg.includes('otp_failed') || msg.includes('service_unavailable'))
    return ''
  return mode === 'signup'
    ? 'Registrierung gerade nicht möglich. Bitte versuche es gleich erneut.'
    : 'Anmeldung gerade nicht möglich. Bitte versuche es gleich erneut.'
}

/** Wrong credential / OTP — not rate-limit or infra. Used to gate „Passwort vergessen“. */
function isWrongCredentialAttempt(raw: string): boolean {
  const msg = String(raw || '').toLowerCase()
  if (
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many') ||
    msg.includes('email rate') ||
    msg.includes('security purposes') ||
    msg.includes('can only request this after') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('captcha') ||
    msg.includes('mailer') ||
    msg.includes('mail_failed') ||
    msg.includes('service_unavailable')
  ) {
    return false
  }
  return (
    msg.includes('invalid token') ||
    msg.includes('invalid otp') ||
    msg.includes('invalid code') ||
    msg.includes('token_hash') ||
    msg.includes('otp_expired') ||
    msg.includes('expired') ||
    msg.includes('token has expired') ||
    msg.includes('invalid login') ||
    msg.includes('invalid credentials') ||
    msg.includes('wrong password') ||
    msg.includes('incorrect password') ||
    msg.includes('invalid password')
  )
}

function inferSessionMethod(user: any): Method {
  return user?.app_metadata?.provider === 'google' ? 'google' : 'email'
}

export default function AuthLandingPage({ mode }: { mode: AuthLandingMode }) {
  /** Instant login↔register flip before App Router pathname catches up (canvas parity). */
  const [optimisticMode, setOptimisticMode] = useState<AuthLandingMode | null>(null)
  const activeMode = optimisticMode ?? mode
  const isSignup = activeMode === 'signup'
  const supabase = createClient()
  const router = useRouter()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('main')
  const [animating, setAnimating] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)
  const [email, setEmail] = useState('')
  const [ssoInput, setSsoInput] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  /** Signup: normalized email that already has an account — drives H1 status (not the red box). */
  const [accountExistsFor, setAccountExistsFor] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  // Login/Register always light (soft read whisper). Visual only on this route —
  // do not call useAuthTheme (it would re-apply stored portal dark onto .al-root).
  const rootRef = (el: HTMLElement | null) => {
    if (el) el.setAttribute('data-theme', 'light')
  }
  useLayoutEffect(() => {
    applyTheme('light', 'client')
    document.querySelectorAll('.al-root, .dl-root').forEach((el) => {
      el.setAttribute('data-theme', 'light')
    })
  }, [])
  const [softModeEnter] = useState(() => consumeSoftAuthModeSwitch())
  /** After first soft login↔register flip, stay locked so gate/glassy never re-fire. */
  const [softModeLocked, setSoftModeLocked] = useState(softModeEnter)
  const [softEnterPulse, setSoftEnterPulse] = useState(softModeEnter)
  const [booting, setBooting] = useState(() => !softModeEnter)
  const [supportOpen, setSupportOpen] = useState(false)
  const [lastMethod, setLastMethod] = useState<Method | null>(null)
  const [returningUser, setReturningUser] = useState(false)
  /** Login only: reveal „Passwort vergessen“ after 2 wrong code/credential attempts. */
  const [failedAuthAttempts, setFailedAuthAttempts] = useState(0)
  const showForgotPassword = !isSignup && failedAuthAttempts >= 2
  const emailRef = useRef<HTMLInputElement>(null)
  const ssoRef = useRef<HTMLInputElement>(null)
  const wsNameRef = useRef<HTMLInputElement>(null)
  const mainAutoFocused = useRef(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [wsHydrated, setWsHydrated] = useState(false)
  const [wsAvailability, setWsAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [wsAvailabilityMsg, setWsAvailabilityMsg] = useState('')
  const [wsNameEditing, setWsNameEditing] = useState(true)
  /** Login: live confirm remembered `/username` — spinner then green check. */
  const [loginPathStatus, setLoginPathStatus] = useState<'idle' | 'checking' | 'confirmed'>('idle')
  const loginPathSeq = useRef(0)
  const [mobileRegisterCaret, setMobileRegisterCaret] = useState(false)
  /** Mobile register: collapse sign-in options while the workspace field is focused —
   *  keeps SSO/email reachable instead of being pushed under the keyboard. */
  const [wsFieldFocusedMobile, setWsFieldFocusedMobile] = useState(false)
  /** Mobile register: green „Benutzer frei“ hint — auto-hides after 5s or on blur. */
  const [showWsOkHint, setShowWsOkHint] = useState(false)
  const wsCheckSeq = useRef(0)
  const wsAvailabilityRef = useRef(wsAvailability)
  const displayWorkspaceNameRef = useRef('')
  const wsOkHideTimerRef = useRef<number | null>(null)
  wsAvailabilityRef.current = wsAvailability
  const subFlow = authStep !== 'main'
  const emailReady = isValidAuthEmail(email)
  const [emailTouched, setEmailTouched] = useState(false)
  const [hadValidEmail, setHadValidEmail] = useState(false)
  const [isMobileAuth, setIsMobileAuth] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  )
  const emailFormatErrorActive = isEmailFieldError(error)
  const showEmailInvalid =
    isMobileAuth &&
    !emailReady &&
    Boolean(email.trim()) &&
    (emailFormatErrorActive || emailTouched || hadValidEmail)
  const loginMainTitle = 'Willkommen zurück.'

  /** Mobile under-email slot — validation error only. */
  const showMobileEmailError = showEmailInvalid
  const emailNorm = email.trim().toLowerCase()
  const emailTakenActive =
    isSignup && !subFlow && Boolean(accountExistsFor) && accountExistsFor === emailNorm
  const showTopError =
    Boolean(error) &&
    !emailTakenActive &&
    !(isMobileAuth && emailFormatErrorActive)
  const emailInvalidLabel =
    error === EMAIL_EMPTY_ERROR ? 'E-Mail-Adresse eingeben' : 'E-Mail-Adresse ungültig'
  const ssoDomainPreview = peekSsoDomain(ssoInput)
  const ssoReady = Boolean(ssoDomainPreview)
  const [ssoDomainCheck, setSsoDomainCheck] = useState<SsoDomainCheck | null>(null)
  const [ssoChecking, setSsoChecking] = useState(false)

  const inviteToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('invite')
      : null
  const devInviteToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('devInvite')
      : null
  const hasInvite = Boolean(inviteToken || devInviteToken)
  const postAuthNext = inviteToken
    ? `/join?token=${encodeURIComponent(inviteToken)}`
    : devInviteToken
      ? `/join?token=${encodeURIComponent(devInviteToken)}&source=developer`
      : (isSignup ? '/onboarding' : '/dashboard')

  const displayWorkspaceName = normalizeWorkspaceName(workspaceName)
  displayWorkspaceNameRef.current = displayWorkspaceName
  const wsReadyForSignup =
    !isSignup ||
    hasInvite ||
    (wsAvailability === 'available' && !!displayWorkspaceName)
  /** Always show the full form — do not collapse OAuth/email buttons on workspace name focus. */
  const mobileWsCollapse = false
  /** Inline status next to the workspace name — never below (no layout shift). */
  const wsBadgeStatus: 'checking' | 'available' | 'taken' | null =
    !displayWorkspaceName
      ? null
      : wsAvailability === 'checking'
        ? 'checking'
        : wsAvailability === 'available'
          ? 'available'
          : wsAvailability === 'taken' || wsAvailability === 'invalid'
            ? 'taken'
            : null

  const wsBadgeTitle =
    wsBadgeStatus === 'checking'
      ? 'Wird geprüft…'
      : wsBadgeStatus === 'available'
        ? 'Verfügbar'
        : wsBadgeStatus === 'taken'
          ? (wsAvailabilityMsg || 'Bereits vergeben')
          : undefined

  async function checkWorkspaceNameAvailability(raw: string): Promise<{ ok: boolean; reason?: string }> {
    const trimmed = normalizeWorkspaceName(raw)
    const seq = ++wsCheckSeq.current
    if (!trimmed) {
      setWsAvailability('idle')
      setWsAvailabilityMsg('')
      return { ok: false, reason: 'Bitte einen Workspace-Namen eingeben.' }
    }
    setWsAvailability('checking')
    setWsAvailabilityMsg('')
    try {
      const res = await fetch(`/api/workspaces/check-name?name=${encodeURIComponent(trimmed)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (seq !== wsCheckSeq.current) return { ok: false }
      if (!data?.ok) {
        const reason = 'Prüfung nicht möglich.'
        setWsAvailability('invalid')
        setWsAvailabilityMsg(reason)
        return { ok: false, reason }
      }
      if (data.available) {
        setWsAvailability('available')
        setWsAvailabilityMsg('')
        // Persist immediately so the header/wordmark and later login greeting stay in sync
        // without requiring Enter or continuing the signup form.
        setPendingWorkspaceName(trimmed)
        rememberWorkspaceName(trimmed)
        // Persist for later steps — but never swap to `/name` path chip on mobile.
        if (
          document.activeElement !== wsNameRef.current &&
          !window.matchMedia('(max-width: 768px)').matches
        ) {
          setWsNameEditing(false)
        } else if (window.matchMedia('(max-width: 768px)').matches) {
          setWsNameEditing(true)
        }
        return { ok: true }
      }
      const reason = 'Bereits vergeben'
      setWsAvailability('taken')
      setWsAvailabilityMsg(reason)
      return { ok: false, reason: 'Dieser Workspace-Name ist bereits vergeben.' }
    } catch {
      if (seq !== wsCheckSeq.current) return { ok: false }
      const reason = 'Prüfung nicht möglich.'
      setWsAvailability('invalid')
      setWsAvailabilityMsg(reason)
      return { ok: false, reason }
    }
  }

  function updateWorkspaceName(nextRaw: string) {
    const next = normalizeWorkspaceName(nextRaw)
    setWorkspaceName(next)
    setWsNameEditing(true)
    const trimmed = next
    if (trimmed) {
      setPendingWorkspaceName(trimmed)
      setWsAvailability('checking')
      setWsAvailabilityMsg('')
    } else {
      setPendingWorkspaceName('')
      setWsAvailability('idle')
      setWsAvailabilityMsg('')
    }
    setError('')
  }

  function startEditingWorkspaceName() {
    setWsNameEditing(true)
    window.setTimeout(() => {
      wsNameRef.current?.focus()
      const len = wsNameRef.current?.value.length ?? 0
      try { wsNameRef.current?.setSelectionRange(len, len) } catch { /* noop */ }
    }, 30)
  }

  function clearWsOkHint() {
    setShowWsOkHint(false)
    if (wsOkHideTimerRef.current != null) {
      window.clearTimeout(wsOkHideTimerRef.current)
      wsOkHideTimerRef.current = null
    }
  }

  function armWsOkHint() {
    setShowWsOkHint(true)
    if (wsOkHideTimerRef.current != null) {
      window.clearTimeout(wsOkHideTimerRef.current)
    }
    wsOkHideTimerRef.current = window.setTimeout(() => {
      setShowWsOkHint(false)
      wsOkHideTimerRef.current = null
    }, 5000)
  }

  /** Blur: settle available name to muted `/name` path (desktop + mobile). */
  function handleWorkspaceNameBlur() {
    clearWsOkHint()
    setWsFieldFocusedMobile(false)
    window.setTimeout(() => {
      if (wsNameRef.current && document.activeElement === wsNameRef.current) return
      if (
        wsAvailabilityRef.current === 'available' &&
        displayWorkspaceNameRef.current
      ) {
        setWsNameEditing(false)
      }
    }, 0)
  }

  useEffect(() => {
    if (!isSignup) {
      setMobileRegisterCaret(false)
      return
    }
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setMobileRegisterCaret(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [isSignup])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobileAuth(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (emailReady) setHadValidEmail(true)
    if (!email.trim()) setHadValidEmail(false)
  }, [emailReady, email])

  /* Mobile: keep focused auth field above the keyboard (iOS fixed + visualViewport). */
  useEffect(() => {
    if (!isMobileAuth || typeof window === 'undefined') return
    const root = document.querySelector('.al-root') as HTMLElement | null
    let shiftRaf = 0
    let focusTimers: number[] = []

    const clearShift = () => {
      if (!root) return
      root.style.setProperty('--al-kb-shift', '0px')
      root.removeAttribute('data-kb-open')
    }

    const syncKeyboardShift = () => {
      const vv = window.visualViewport
      if (!vv || !root) {
        clearShift()
        return
      }
      const active = document.activeElement
      const isAuthField =
        active instanceof HTMLElement &&
        root.contains(active) &&
        (
          active.classList.contains('al-input') ||
          active.classList.contains('al-ws-name-input') ||
          active.classList.contains('auth-expand-compact')
        )
      if (!isAuthField) {
        clearShift()
        return
      }

      /*
       * iOS pans visualViewport.offsetTop for focused inputs, but position:fixed
       * chrome does not move with it — so the field appears stuck under the keyboard.
       * Shift the auth container by enough that the field's bottom sits in the
       * visible visual viewport (above the keyboard band).
       */
      const current =
        parseFloat(root.style.getPropertyValue('--al-kb-shift') || '0') || 0
      const rect = active.getBoundingClientRect()
      const visibleBottom = vv.offsetTop + vv.height
      // Absolute shift: undo current transform in the measurement, then recompute.
      const naturalBottom = rect.bottom + current
      const overlap = naturalBottom + 16 - visibleBottom
      // Also track vv.offsetTop so fixed chrome stays glued to what the user sees.
      const shift = Math.max(0, Math.ceil(Math.max(vv.offsetTop, overlap)))
      const keyboardBand = Math.max(0, window.innerHeight - vv.height)
      const capped = Math.min(shift, Math.max(keyboardBand + vv.offsetTop, keyboardBand) + 48)

      root.style.setProperty('--al-kb-shift', `${capped}px`)
      if (capped > 0) root.setAttribute('data-kb-open', '')
      else root.removeAttribute('data-kb-open')
    }

    const scheduleSync = () => {
      if (shiftRaf) cancelAnimationFrame(shiftRaf)
      shiftRaf = requestAnimationFrame(() => {
        syncKeyboardShift()
        focusTimers.forEach(id => window.clearTimeout(id))
        // iOS keyboard + visualViewport settle across a few frames.
        focusTimers = [50, 150, 320, 520].map(ms =>
          window.setTimeout(syncKeyboardShift, ms),
        )
      })
    }

    const onFocusOut = () => {
      focusTimers.forEach(id => window.clearTimeout(id))
      focusTimers = []
      window.setTimeout(() => {
        const active = document.activeElement
        const stillAuth =
          active instanceof HTMLElement &&
          root?.contains(active) &&
          (
            active.classList.contains('al-input') ||
            active.classList.contains('al-ws-name-input') ||
            active.classList.contains('auth-expand-compact')
          )
        if (!stillAuth) {
          clearShift()
          window.scrollTo(0, 0)
          document.documentElement.scrollTop = 0
          document.body.scrollTop = 0
        }
      }, 60)
    }

    const vv = window.visualViewport
    vv?.addEventListener('resize', scheduleSync)
    vv?.addEventListener('scroll', scheduleSync)
    window.addEventListener('focusin', scheduleSync)
    window.addEventListener('focusout', onFocusOut)
    return () => {
      if (shiftRaf) cancelAnimationFrame(shiftRaf)
      focusTimers.forEach(id => window.clearTimeout(id))
      vv?.removeEventListener('resize', scheduleSync)
      vv?.removeEventListener('scroll', scheduleSync)
      window.removeEventListener('focusin', scheduleSync)
      window.removeEventListener('focusout', onFocusOut)
      clearShift()
    }
  }, [isMobileAuth])

  useEffect(() => {
    if (
      wsAvailability === 'available' &&
      displayWorkspaceName &&
      (wsNameEditing || mobileRegisterCaret)
    ) {
      armWsOkHint()
      return
    }
    if (wsAvailability !== 'available') clearWsOkHint()
  }, [wsAvailability, displayWorkspaceName, wsNameEditing, mobileRegisterCaret])

  useEffect(() => () => {
    if (wsOkHideTimerRef.current != null) {
      window.clearTimeout(wsOkHideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isSignup || hasInvite) return
    const trimmed = normalizeWorkspaceName(workspaceName)
    if (!trimmed) return
    const t = window.setTimeout(() => {
      void checkWorkspaceNameAvailability(trimmed)
    }, 280)
    return () => window.clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceName, isSignup, hasInvite])

  async function bootstrapWorkspaceIfNeeded(name: string): Promise<'ok' | 'fail' | 'defer'> {
    const trimmed = normalizeWorkspaceName(name)
    if (!trimmed || hasInvite) return 'ok'
    const result = await bootstrapPersonalWorkspace(trimmed)
    if (result.ok) return 'ok'
    if (result.reason === 'network' || result.status === 0) {
      // Session is valid — finish naming on the dedicated setup screen.
      setPendingWorkspaceName(trimmed)
      return 'defer'
    }
    setError(result.message)
    setWsAvailability('taken')
    setWsAvailabilityMsg(result.message)
    return 'fail'
  }

  async function requireWorkspaceName(): Promise<string | null> {
    if (!isSignup || hasInvite) return normalizeWorkspaceName(workspaceName) || getPendingWorkspaceName()
    const trimmed = normalizeWorkspaceName(workspaceName)
    if (!trimmed) {
      setError('Bitte gib zuerst deinem Workspace einen Namen.')
      wsNameRef.current?.focus()
      return null
    }
    // Reuse the live debounce result — avoid a second /check-name round-trip on CTA.
    if (wsAvailability === 'available') {
      setPendingWorkspaceName(trimmed)
      rememberWorkspaceName(trimmed)
      return trimmed
    }
    if (wsAvailability === 'taken' || wsAvailability === 'invalid') {
      setError(wsAvailabilityMsg || 'Dieser Workspace-Name ist bereits vergeben.')
      wsNameRef.current?.focus()
      return null
    }
    const check = await checkWorkspaceNameAvailability(trimmed)
    if (!check.ok) {
      setError(check.reason || 'Dieser Workspace-Name ist bereits vergeben.')
      wsNameRef.current?.focus()
      return null
    }
    setPendingWorkspaceName(trimmed)
    rememberWorkspaceName(trimmed)
    return trimmed
  }

  function switchAuthMode(targetPath: '/login' | '/register') {
    const nextMode = targetPath === '/register' ? 'signup' : 'login'
    // Gate on the visible mode — not pathname. Optimistic flip can leave URL
    // lagging behind on mobile Safari so pathname-only checks stuck the switch.
    if (activeMode === nextMode) return
    const url = new URL(targetPath, window.location.origin)
    if (inviteToken) url.searchParams.set('invite', inviteToken)
    if (devInviteToken) url.searchParams.set('devInvite', devInviteToken)
    if (email.trim()) url.searchParams.set('email', email.trim())
    const ws = normalizeWorkspaceName(workspaceName)
    if (ws) url.searchParams.set('ws', ws)
    const href = `${url.pathname}${url.search}`
    // Instant UI flip — no fade, no remount. URL catches up in the background.
    setOptimisticMode(nextMode)
    setSoftModeLocked(true)
    setAuthStep('main')
    setError('')
    setAccountExistsFor(null)
    setAnimating(false)
    setPageExiting(false)
    try { sessionStorage.setItem(AUTH_SOFT_MODE_KEY, '1') } catch { /* noop */ }
    try { router.prefetch(href) } catch { /* noop */ }
    // Soft URL sync — never hard-assign (full reload = stutter).
    try { window.history.replaceState(window.history.state, '', href) } catch { /* noop */ }
    startTransition(() => {
      try {
        router.replace(href, { scroll: false })
      } catch { /* noop — history already mirrored */ }
    })
  }

  function navigateWithFade(href: string) {
    try {
      const path = new URL(href, window.location.origin).pathname
      // Legal pages leave auth chrome — hard assign like Docs (no soft-nav flash / stuck exit).
      if (isLegalPath(path)) {
        rememberLegalReturn()
        navigateLeavingAuthChrome(path)
        return
      }
    } catch { /* noop */ }
    router.prefetch(href)
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    const crossPanel = isCrossPanelAuthNav(href)
    const delay = prefersReducedMotion() ? 0 : (crossPanel ? 180 : 120)
    window.setTimeout(() => {
      try {
        router.push(href)
      } catch {
        window.location.assign(href)
        return
      }
      // Failsafe: never leave .exiting { pointer-events:none } stuck on localhost.
      window.setTimeout(() => {
        try {
          const want = new URL(href, window.location.origin).pathname
          const here = window.location.pathname
          if (here === want || here.startsWith(`${want}/`)) return
        } catch { /* noop */ }
        setPageExiting(false)
        window.location.assign(href)
      }, 1400)
    }, delay)
  }

  function prefetchAuthHref(href: string) {
    try { router.prefetch(href) } catch { /* noop */ }
  }

  async function routeSessionIfPresent() {
    let user: { id: string; email?: string | null } | null = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user ?? null
    } catch { user = null }
    if (!user) { setBooting(false); return false }

    // Prefer middleware bounce target when present. One retry only — if we
    // land back on the same returnTo, stay on login (avoids hard reload loop).
    try {
      const returnTo = new URLSearchParams(window.location.search).get('returnTo') || ''
      if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
        let bounced = ''
        try { bounced = sessionStorage.getItem('festag_auth_dash_bounce') || '' } catch { /* noop */ }
        if (bounced === returnTo) {
          setBooting(false)
          return false
        }
        try { sessionStorage.setItem('festag_auth_dash_bounce', returnTo) } catch { /* noop */ }
        window.location.replace(returnTo)
        return true
      }
    } catch { /* noop */ }

    const target = await resolvePostAuthTarget(supabase, user.id, '/dashboard')
    rememberFestagAccount({
      userId: user.id,
      email: user.email ?? null,
      method: lastMethod ?? inferSessionMethod(user),
      onboardingCompleted: target === '/dashboard',
      workspaceName: normalizeWorkspaceName(workspaceName) || getRememberedWorkspaceName(),
    })
    window.location.replace(
      inviteToken
        ? `/join?token=${encodeURIComponent(inviteToken)}`
        : devInviteToken
          ? `/join?token=${encodeURIComponent(devInviteToken)}&source=developer`
          : target,
    )
    return true
  }

  useLayoutEffect(() => {
    if (wsHydrated) return
    try {
      const params = new URLSearchParams(window.location.search)
      const wsParam = normalizeWorkspaceName(params.get('ws') || '')
      const seed =
        wsParam ||
        getPendingWorkspaceName() ||
        getLastWorkspaceName() ||
        getRememberedWorkspaceName() ||
        ''
      if (seed) {
        setWorkspaceName(seed)
        rememberWorkspaceName(seed)
      }
    } catch {}
    setWsHydrated(true)
  }, [wsHydrated])

  /* Auth OS dusk continuity removed — login/register stay light full-page. */

  // Login: when a remembered `/username` is present, live-check then animate green ✓
  // (same trust signal as „Benutzer frei“ on register).
  useEffect(() => {
    if (isSignup || !wsHydrated) {
      setLoginPathStatus('idle')
      return
    }
    const name = normalizeWorkspaceName(workspaceName)
    if (!name) {
      setLoginPathStatus('idle')
      return
    }
    const seq = ++loginPathSeq.current
    setLoginPathStatus('checking')
    let cancelled = false
    const run = async () => {
      try {
        await fetch(`/api/workspaces/check-name?name=${encodeURIComponent(name)}`, {
          credentials: 'include',
        })
      } catch {
        /* still confirm from device memory — trust gesture, not a hard gate */
      }
      if (cancelled || seq !== loginPathSeq.current) return
      setLoginPathStatus('confirmed')
    }
    // Brief pause so the spinner is readable before the check pops in.
    const t = window.setTimeout(() => { void run() }, 320)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [isSignup, wsHydrated, workspaceName])

  useLayoutEffect(() => {
    if (consumePanelEnter() !== 'client') return
    setPanelEnter(true)
    const t = window.setTimeout(() => setPanelEnter(false), 220)
    return () => window.clearTimeout(t)
  }, [])

  // Mount once — never re-arm boot spinner when login ↔ register mode flips in-shell.
  useEffect(() => {
    void routeSessionIfPresent()
    const params = new URLSearchParams(window.location.search)
    const known = hasFestagDeviceAccount()
    setReturningUser(known && !isSignup)
    const stored = known && !isSignup
      ? ((getLastFestagAccount()?.method ?? getLastFestagMethod()) as Method | null)
      : null
    setLastMethod(stored)
    try {
      const emailParam = params.get('email')
      if (emailParam && /\S+@\S+\.\S+/.test(emailParam)) {
        setEmail(emailParam)
      } else if (known && !isSignup) {
        const e = getLastFestagEmail()
        if (e && /\S+@\S+\.\S+/.test(e)) setEmail(e)
      }
    } catch { /* noop */ }
    if (softModeEnter) {
      setBooting(false)
      return
    }
    // Keep the session lookup non-blocking so register/login paint promptly.
    // A resolved authenticated session still redirects through the async check.
    const bootTimer = window.setTimeout(() => setBooting(false), 280)
    return () => window.clearTimeout(bootTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // In-shell mode flips (link + browser back) — instant, no remount / no boot.
  // softModeLocked stays for the shell lifetime so gate/glassy CSS never re-fires
  // when the brief al-soft-enter pulse ends.
  const modeMountedRef = useRef(false)
  useEffect(() => {
    if (!modeMountedRef.current) {
      modeMountedRef.current = true
      return
    }
    setBooting(false)
    setPageExiting(false)
    setAnimating(false)
    setAuthStep('main')
    setError('')
    setAccountExistsFor(null)
    setCode('')
    mainAutoFocused.current = false
    const known = hasFestagDeviceAccount()
    setReturningUser(known && !isSignup)
    setLastMethod(
      known && !isSignup
        ? ((getLastFestagAccount()?.method ?? getLastFestagMethod()) as Method | null)
        : null,
    )
    try {
      const params = new URLSearchParams(window.location.search)
      const emailParam = params.get('email')
      if (emailParam && /\S+@\S+\.\S+/.test(emailParam)) {
        setEmail(emailParam)
      }
      const wsParam = normalizeWorkspaceName(params.get('ws') || '')
      if (wsParam) {
        setWorkspaceName(wsParam)
        setWsNameEditing(true)
      }
    } catch { /* noop */ }
    setSoftModeLocked(true)
    // Do not pulse softEnter — opacity 0→1 was the visible stutter.
  }, [mode, isSignup])

  useEffect(() => {
    if (optimisticMode && mode === optimisticMode) setOptimisticMode(null)
  }, [mode, optimisticMode])

  useEffect(() => {
    if (!softEnterPulse) return
    const t = window.setTimeout(() => setSoftEnterPulse(false), 220)
    return () => window.clearTimeout(t)
  }, [softEnterPulse, mode])

  // Focus after boot so the email/workspace inputs are mounted (spinner unmounts them).
  // Returning users with a remembered Arbeits-E-Mail get stroke + blinking caret immediately.
  // Only auto-focus once per main-step entry — wsHydrated flipping must not re-steal focus.
  // Register mobile: best-effort open soft keyboard on the workspace name field.
  // iOS/Android may still block keyboard without a user gesture — we still try after paint.
  useEffect(() => {
    if (booting) return
    if (authStep !== 'main') {
      mainAutoFocused.current = false
      return
    }
    if (!wsHydrated) return
    if (mainAutoFocused.current) return
    mainAutoFocused.current = true

    if (isSignup && !hasInvite) {
      // Soft keyboard only matters on mobile — never force focus on desktop register.
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches
      if (!isMobileViewport) return

      const focusWorkspaceName = () => {
        const active = document.activeElement as HTMLElement | null
        if (
          active &&
          active !== document.body &&
          active !== wsNameRef.current &&
          active.closest?.('.al-signin') &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        ) {
          return
        }
        // Ensure AuthExpandableTextField is mounted (not the settled AuthWorkspacePath chip).
        setWsNameEditing(true)
        const el = wsNameRef.current
        if (!el) return
        el.focus({ preventScroll: true })
        const len = el.value.length
        try {
          el.setSelectionRange(len, len)
        } catch {
          /* noop */
        }
      }

      let rafOuter = 0
      let rafInner = 0
      const timers: number[] = []
      rafOuter = requestAnimationFrame(() => {
        rafInner = requestAnimationFrame(() => {
          focusWorkspaceName()
          // Short retries after paint — field may mount one frame late after path→input swap.
          ;[40, 120, 280].forEach(ms => {
            timers.push(window.setTimeout(focusWorkspaceName, ms))
          })
        })
      })
      return () => {
        cancelAnimationFrame(rafOuter)
        cancelAnimationFrame(rafInner)
        timers.forEach(clearTimeout)
      }
    }

    // Login / invite-signup: focus emailRef (prefilled remembered address or empty field).
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => {
      const active = document.activeElement as HTMLElement | null
      if (active && active !== document.body && active.closest?.('.al-signin')) return
      emailRef.current?.focus()
    }, ms))
    return () => timers.forEach(clearTimeout)
  }, [authStep, isSignup, hasInvite, wsHydrated, booting])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useEffect(() => {
    if (authStep !== 'sso') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => ssoRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [authStep])

  useEffect(() => {
    if (authStep !== 'sso') {
      setSsoDomainCheck(null)
      return
    }
    const domain = peekSsoDomain(ssoInput)
    if (!domain) {
      setSsoDomainCheck(null)
      setSsoChecking(false)
      return
    }
    let cancelled = false
    setSsoChecking(true)
    const t = setTimeout(() => {
      checkSsoDomain(domain).then(status => {
        if (!cancelled) {
          setSsoDomainCheck(status)
          setSsoChecking(false)
        }
      }).catch(() => {
        if (!cancelled) {
          setSsoDomainCheck({ configured: false, domain, lookupOk: false })
          setSsoChecking(false)
        }
      })
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [authStep, ssoInput])

  async function preferSsoIfEnforced(sourceEmail: string): Promise<boolean> {
    const domain = extractSsoDomain(sourceEmail)
    if (!domain) return false
    const status = await checkSsoDomain(domain)
    if (!status.configured || !status.enforceSso) return false
    setSsoInput(sourceEmail.trim())
    setError(`Für ${status.displayName || domain} bitte Firmen-SSO nutzen.`)
    goTo('sso')
    return true
  }

  function saveMethod(method: Method) {
    localStorage.setItem(METHOD_KEY, method)
    setLastMethod(method)
  }

  function goTo(step: AuthStep) {
    setError('')
    if (prefersReducedMotion()) {
      setAuthStep(step)
      setAnimating(false)
      return
    }
    setAnimating(true)
    // Match snappy .al-content exit — swap as soon as fade-out paints.
    setTimeout(() => { setAuthStep(step); setAnimating(false) }, 55)
  }

  function switchBack() {
    setCode('')
    goTo('main')
  }

  async function openSsoFlow() {
    setError('')
    const ws = await requireWorkspaceName()
    if (isSignup && !hasInvite && !ws) return
    if (ws) setPendingWorkspaceName(ws)
    setSsoInput(ssoInput.trim() || email.trim())
    goTo('sso')
  }

  async function handleGoogle() {
    setError('')
    setOauthLoading(true)
    if (!isSignup && email.trim() && await preferSsoIfEnforced(email)) {
      setOauthLoading(false)
      return
    }
    const ws = await requireWorkspaceName()
    if (isSignup && !hasInvite && !ws) {
      setOauthLoading(false)
      return
    }
    if (ws) setPendingWorkspaceName(ws)
    saveMethod('google')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (oauthError) { setError(mapAuthError(oauthError.message, mode)); setOauthLoading(false) }
  }

  async function handleApple() {
    setError('')
    setOauthLoading(true)
    const ws = await requireWorkspaceName()
    if (isSignup && !hasInvite && !ws) {
      setOauthLoading(false)
      return
    }
    if (ws) setPendingWorkspaceName(ws)
    saveMethod('apple')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
      },
    })
    if (oauthError) {
      setError('Apple-Anmeldung gerade nicht verfügbar.')
      setOauthLoading(false)
    }
  }

  async function handleSsoSubmit() {
    setError('')
    const domain = extractSsoDomain(ssoInput)
    if (!domain) {
      setError('Bitte eine Arbeits-E-Mail oder Firmen-Domain eingeben (z. B. name@firma.de).')
      return
    }
    if (isSignup && !hasInvite) {
      const ws = await requireWorkspaceName()
      if (!ws) return
      setPendingWorkspaceName(ws)
    }
    saveMethod('sso')
    setOauthLoading(true)
    const result = await startSsoLogin({
      supabase,
      domain,
      email: ssoInput.includes('@') ? ssoInput.trim() : email.trim() || null,
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
    })
    if (!result.ok) {
      setError(result.error)
      setOauthLoading(false)
      return
    }
    window.location.href = result.url
  }

  async function sendMagicLink(): Promise<'ok' | 'rate_limited' | 'error' | 'already_registered' | 'identity_mismatch'> {
    const signupWs = isSignup ? (normalizeWorkspaceName(workspaceName) || getPendingWorkspaceName()) : null
    const loginWs = !isSignup ? (normalizeWorkspaceName(workspaceName) || getRememberedWorkspaceName()) : null
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          kind: isSignup ? 'signup' : 'login',
          next: postAuthNext,
          pendingWorkspaceName: signupWs || undefined,
          loginWorkspaceName: loginWs || undefined,
        }),
      })
      if (res.status === 429) return 'rate_limited'
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const raw = [data?.error, data?.message].filter(Boolean).join(' ') || 'otp_failed'
        const mapped = mapAuthError(raw, mode)
        if (
          data?.error === 'already_registered' ||
          res.status === 409 ||
          mapped === EMAIL_ALREADY_USED_ERROR
        ) {
          return 'already_registered'
        }
        if (
          data?.error === 'identity_mismatch' ||
          mapped === IDENTITY_MISMATCH_ERROR
        ) {
          setError(IDENTITY_MISMATCH_ERROR)
          return 'identity_mismatch'
        }
        if (mapped) setError(mapped)
        return 'error'
      }
      return 'ok'
    } catch {
      // Silent — never advertise mail delivery failure in the UI.
      return 'error'
    }
  }

  async function handleEmailSubmit() {
    setError('')
    setEmailTouched(true)
    if (!email.trim()) { setError(EMAIL_EMPTY_ERROR); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError(EMAIL_INVALID_ERROR); return }
    setLoading(true)
    if (!isSignup && await preferSsoIfEnforced(email)) {
      setLoading(false)
      return
    }
    const ws = await requireWorkspaceName()
    if (isSignup && !hasInvite && !ws) {
      setLoading(false)
      return
    }
    const result = await sendMagicLink()
    setLoading(false)
    if (result === 'already_registered') {
      setAccountExistsFor(email.trim().toLowerCase())
      return
    }
    // Rate-limit = still continue — the earlier code remains valid.
    // Always land on the shared 6-digit code window (login + register).
    if (result === 'ok' || result === 'rate_limited') {
      setAccountExistsFor(null)
      setError('')
      setCode('')
      saveMethod('email')
      setResendCooldown(result === 'ok' ? 60 : 30)
      goTo('codeEntry')
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return
    setError('')
    setResending(true)
    const result = await sendMagicLink()
    setResending(false)
    if (result === 'ok') setResendCooldown(60)
    else if (result === 'rate_limited') {
      setError('')
      setResendCooldown(30)
    }
  }

  async function handleVerifyCode(nextCode?: string) {
    setError('')
    const trimmed = String(nextCode ?? code).trim()
    if (!trimmed || trimmed.length < 6) { setError('Bitte vollständigen Code eingeben.'); return }
    setLoading(true)
    // Login OTP uses Magic Link (`email`). Confirm-signup mails use `signup`.
    // Try both on register so the same 6-digit UI works either way.
    const otpTypes = isSignup
      ? (['email', 'signup', 'magiclink'] as const)
      : (['email', 'magiclink'] as const)
    let verifyError: { message: string } | null = null
    for (const otpType of otpTypes) {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: trimmed,
        type: otpType,
      })
      if (!error) {
        verifyError = null
        break
      }
      verifyError = error
      // Wrong OTP type often surfaces as "invalid" — keep trying the next type.
      // Only abort early on rate limits / lockouts.
      const msg = String(error.message || '').toLowerCase()
      if (
        msg.includes('rate limit') ||
        msg.includes('rate_limit') ||
        msg.includes('too many') ||
        msg.includes('security purposes') ||
        msg.includes('can only request this after')
      ) {
        break
      }
    }
    if (verifyError) {
      setLoading(false)
      setError(mapAuthError(verifyError.message, mode))
      // Login uses e-mail codes today — gate recovery after 2 wrong attempts.
      if (!isSignup && isWrongCredentialAttempt(verifyError.message)) {
        setFailedAuthAttempts(n => n + 1)
      }
      return
    }
    if (!isSignup) setFailedAuthAttempts(0)
    // Keep loading until hard navigation — avoids a brief re-enabled CTA.
    saveMethod('email')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Fire-and-forget — must not block redirect after a valid OTP.
      void supabase
        .from('onboarding_state')
        .upsert({ user_id: session.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
    let target = session
      ? await resolvePostAuthTarget(supabase, session.user.id, isSignup ? '/onboarding' : '/dashboard')
      : (isSignup ? '/onboarding' : '/dashboard')
    if (session) {
      const ws =
        normalizeWorkspaceName(workspaceName) ||
        getPendingWorkspaceName() ||
        (typeof session.user.user_metadata?.pending_workspace_name === 'string'
          ? session.user.user_metadata.pending_workspace_name
          : '')
      if (isSignup && !hasInvite) {
        if (ws) {
          const boot = await bootstrapWorkspaceIfNeeded(ws)
          if (boot === 'fail') {
            setLoading(false)
            return
          }
          if (boot === 'defer') target = '/create-workspace'
          else {
            target = await resolvePostAuthTarget(supabase, session.user.id, '/onboarding')
          }
        } else {
          target = '/onboarding'
        }
      }
      rememberFestagAccount({
        userId: session.user.id,
        email: email.trim(),
        method: 'email',
        onboardingCompleted: target === '/dashboard' || target === '/dev',
        workspaceName: normalizeWorkspaceName(ws) || getRememberedWorkspaceName(),
      })
    } else {
      try { localStorage.setItem('festag_last_email', email.trim()) } catch {}
    }
    window.location.href = inviteToken
      ? `/join?token=${encodeURIComponent(inviteToken)}`
      : devInviteToken
        ? `/join?token=${encodeURIComponent(devInviteToken)}&source=developer`
        : target
  }

  function openSupportModal() {
    setSupportOpen(true)
  }

  const resendDisabled = resending || resendCooldown > 0

  const emailCtaReady = emailReady && (!isSignup || hasInvite || wsReadyForSignup)
  const emailCtaEnabled = !loading && (!isSignup || hasInvite || wsReadyForSignup)
  const codeCtaEnabled = !loading

  useAuthEnterSubmit({
    enabled: authStep === 'main' && emailCtaEnabled,
    onSubmit: () => { void handleEmailSubmit() },
  })
  useAuthEnterSubmit({
    enabled: authStep === 'sso' && !oauthLoading,
    onSubmit: () => { void handleSsoSubmit() },
  })
  useAuthEnterSubmit({
    enabled: authStep === 'codeEntry' && codeCtaEnabled,
    onSubmit: () => { void handleVerifyCode() },
  })

  const googleLabelFull = isSignup ? 'Mit Google registrieren' : 'Mit Google fortfahren'
  const appleLabelFull = isSignup ? 'Mit Apple registrieren' : 'Mit Apple fortfahren'

  const googleButton = (
    <button
      className="al-btn al-btn-google"
      type="button"
      aria-label={googleLabelFull}
      onClick={handleGoogle}
      disabled={oauthLoading || (isSignup && !hasInvite && !wsReadyForSignup)}
    >
      {oauthLoading ? (
        <FestagWorkingDots size="sm" tone="inherit" label="Lädt" />
      ) : (
        <GoogleBrandIcon />
      )}
      <span className="al-oauth-label-full">{googleLabelFull}</span>
      <span className="al-oauth-label-short" aria-hidden="true">Mit Google</span>
    </button>
  )

  const appleButton = (
    <button
      className="al-btn al-btn-apple"
      type="button"
      aria-label={appleLabelFull}
      onClick={handleApple}
      disabled={oauthLoading || (isSignup && !hasInvite && !wsReadyForSignup)}
    >
      <AppleBrandIcon />
      <span className="al-oauth-label-full">{appleLabelFull}</span>
      <span className="al-oauth-label-short" aria-hidden="true">Mit Apple</span>
    </button>
  )

  const loginWorkspacePath = displayWorkspaceName ? (
    <span className="al-ws-path-check-row">
      <AuthWorkspacePath name={displayWorkspaceName} />
      {loginPathStatus === 'checking' ? (
        <span
          className="al-ws-ok-badge al-ws-ok-badge--checking"
          aria-label="Workspace wird geprüft"
          title="Wird geprüft…"
          role="status"
        >
          <span className="al-ws-ok-spinner" aria-hidden="true" />
        </span>
      ) : loginPathStatus === 'confirmed' ? (
        <span
          key={`ok-${displayWorkspaceName}`}
          className="al-ws-ok-badge"
          aria-label="Workspace erkannt"
          title="Workspace erkannt"
          role="status"
        >
          <Check size={11} weight="bold" />
        </span>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {loginPathStatus === 'checking'
          ? 'Workspace wird geprüft'
          : loginPathStatus === 'confirmed'
            ? 'Workspace erkannt'
            : ''}
      </span>
    </span>
  ) : null

  const mainSignIn = (
    <div className="al-signin-stack">
      {showTopError ? <p className="al-error">{error}</p> : null}

      <div className="al-method-group al-method-group--oauth">
        {googleButton}
        {appleButton}
      </div>

      <div className="al-divider" aria-hidden="true">
        <span>oder</span>
      </div>

      <div className="al-method-group">
        <div className={`al-input-shell${email.trim() ? ' has-value' : ''}`}>
          {!email.trim() ? (
            <span className="al-input-fake-ph" aria-hidden="true">Arbeits-E-Mail eingeben</span>
          ) : null}
          <input
            ref={emailRef}
            className="al-input"
            type="email"
            autoComplete="email"
            placeholder=""
            aria-label="Arbeits-E-Mail eingeben"
            value={email}
            aria-invalid={showEmailInvalid || undefined}
            onChange={e => {
              const next = e.target.value
              setEmail(next)
              if (failedAuthAttempts > 0) setFailedAuthAttempts(0)
              if (error && isEmailFieldError(error)) setError('')
              if (accountExistsFor && next.trim().toLowerCase() !== accountExistsFor) {
                setAccountExistsFor(null)
              }
            }}
            onBlur={() => setEmailTouched(true)}
          />
        </div>
        {isMobileAuth ? (
          <div
            className={`al-email-feedback-host${showMobileEmailError ? ' is-open' : ''}`}
            aria-live="polite"
          >
            <div className="al-email-feedback-clip">
              <div className="al-email-feedback al-email-feedback--error" role="alert">
                <div key={showMobileEmailError ? 'err' : 'idle'} className="al-email-feedback-inner">
                  <p className="al-email-feedback-text">{emailInvalidLabel}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <button
          className={`al-btn al-btn-primary al-btn--enter-glyph${emailCtaReady ? ' al-btn-primary--ready' : ''}`}
          type="button"
          onClick={handleEmailSubmit}
          disabled={loading || (isSignup && !hasInvite && !wsReadyForSignup)}
        >
          <span className="al-btn-label">{loading ? 'Wird gesendet…' : 'Weiter'}</span>
          <AuthEnterGlyph ready={emailCtaReady && !loading} />
        </button>
      </div>

      <div className="al-method-group al-sso-group">
        <button
          className="al-btn al-btn-ghost"
          type="button"
          onClick={() => { void openSsoFlow() }}
          disabled={oauthLoading || (isSignup && !hasInvite && !wsReadyForSignup)}
        >
          Single Sign-On (SSO)
        </button>
      </div>

      {!isSignup && showForgotPassword ? (
        <div className="al-login-aux">
          <button
            type="button"
            className="al-login-aux-secondary"
            onClick={openSupportModal}
          >
            Passwort vergessen
          </button>
        </div>
      ) : null}
    </div>
  )

  const ssoScreen = (
    <>
      <div className="al-signin-stack">
        {error && <p className="al-error">{error}</p>}
        <p className="al-flow-info">
          {ssoDomainPreview ? (
            <>
              Weiter mit Firmen-Domain{' '}
              <strong>{ssoDomainPreview}</strong>
              {ssoChecking ? (
                <> — prüfen…</>
              ) : ssoDomainCheck?.configured ? (
                <> — SSO bereit{ssoDomainCheck.displayName && ssoDomainCheck.displayName !== ssoDomainPreview ? ` (${ssoDomainCheck.displayName})` : ''}</>
              ) : ssoDomainCheck && ssoDomainCheck.lookupOk !== false ? (
                <> — Domain noch nicht freigeschaltet</>
              ) : null}
            </>
          ) : (
            <>Arbeits-E-Mail oder Firmen-Domain eingeben. Wir leiten Sie zum Login Ihres Unternehmens weiter.</>
          )}
        </p>
        <div className={`al-input-shell${ssoInput.trim() ? ' has-value' : ''}`}>
          {!ssoInput.trim() ? (
            <span className="al-input-fake-ph" aria-hidden="true">Arbeits-E-Mail eingeben</span>
          ) : null}
          <input
            ref={ssoRef}
            className="al-input"
            type="text"
            autoComplete="username"
            inputMode="email"
            placeholder=""
            aria-label="Arbeits-E-Mail eingeben"
            value={ssoInput}
            onChange={e => setSsoInput(e.target.value)}
            spellCheck={false}
            autoCapitalize="none"
          />
        </div>
        <button
          className={`al-btn al-btn-primary al-btn--enter-glyph${ssoReady ? ' al-btn-primary--ready' : ''}`}
          type="button"
          onClick={handleSsoSubmit}
          disabled={oauthLoading || !ssoDomainPreview}
        >
          <span className="al-btn-label">{oauthLoading ? 'Weiterleitung…' : 'Weiter'}</span>
          <AuthEnterGlyph ready={ssoReady && !oauthLoading} />
        </button>
        <button className="al-back" type="button" onClick={switchBack} disabled={oauthLoading}>Zurück</button>
      </div>
      <AuthHelpAccordion id="al-sso-help" summary="Hilfe zu SSO">
        <p>
          Firmen-SSO verbindet Festag mit dem Login Ihres Unternehmens (z. B. Okta, Microsoft Entra
          oder Google Workspace). Arbeits-E-Mail oder Firmendomain eingeben — wir leiten Sie zum
          Firmen-Login weiter.
        </p>
        <p>
          Die Domain muss freigeschaltet sein (Enterprise-Setup). Danach kein separates Festag-Passwort:
          derselbe Firmen-Login gilt beim nächsten Mal erneut.
        </p>
        <p>
          Noch nicht eingerichtet? Workspace-Admin kann unter Einstellungen → Sicherheit „SSO anfragen“,
          oder Sie wenden sich an Festag Support.
        </p>
      </AuthHelpAccordion>
    </>
  )

  // Shared login + register code window — same chrome, same CTA labels.
  const codeEntryScreen = (
    <div className="al-signin-stack al-signin-stack--code">
      {error && <p className="al-error">{error}</p>}
      <p className="al-flow-info">
        Wir haben den Anmeldecode an <strong>{email}</strong> gesendet.
      </p>
      <AuthOtpInput
        value={code}
        onChange={setCode}
        onComplete={full => { void handleVerifyCode(full) }}
        disabled={loading}
        autoFocus
      />
      <button
        className="al-btn al-btn-primary al-btn-primary--ready al-btn--enter-glyph"
        type="button"
        onClick={() => handleVerifyCode()}
        disabled={loading}
      >
        <span className="al-btn-label">{loading ? 'Wird geprüft…' : 'Bestätigen'}</span>
        <AuthEnterGlyph ready={!loading} />
      </button>
      <p className="al-code-help">
        Sie haben keinen Code erhalten?{' '}
        <button
          type="button"
          className="al-code-help-action"
          onClick={handleResend}
          disabled={resendDisabled}
        >
          {resending ? 'Wird gesendet…' : resendCooldown > 0 ? `Neu anfordern (${resendCooldown}s)` : 'Neu anfordern'}
        </button>
        {' '}oder{' '}
        <button
          type="button"
          className="al-code-help-action"
          onClick={openSupportModal}
        >
          Support kontaktieren
        </button>
        .
      </p>
      <button className="al-back" type="button" onClick={switchBack} disabled={loading}>
        E-Mail ändern
      </button>
      {showForgotPassword ? (
        <button
          type="button"
          className="al-login-aux-secondary"
          onClick={openSupportModal}
        >
          Passwort vergessen
        </button>
      ) : null}
    </div>
  )

  const accountHint = !subFlow ? (
    isSignup ? (
      <button type="button" className="al-account-hint-link" onClick={() => switchAuthMode('/login')}>
        Anmelden
      </button>
    ) : (
      <button type="button" className="al-account-hint-link" onClick={() => switchAuthMode('/register')}>
        Konto erstellen
      </button>
    )
  ) : null

  if (booting) {
    return (
      <main
        ref={rootRef}
        className="al-root al-root--centered"
        data-theme="light"
        data-auth-mode={activeMode}
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <style>{AUTH_LANDING_STYLES}</style>
        <style>{AUTH_OS_STYLES}</style>
        <FestagWorkingDots size="lg" label="Lädt" />
      </main>
    )
  }

  return (
    <main
      ref={rootRef}
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}${softModeLocked ? ' al-soft-mode' : ''}${softEnterPulse ? ' al-soft-enter' : ''}`}
      data-theme="light"
      data-auth-mode={activeMode}
      data-auth-step={authStep}
    >
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{AUTH_OS_STYLES}</style>
      <style>{AUTH_GLASSY_HERO_CSS}</style>
      <style>{AUTH_ENTER_GLYPH_CSS}</style>

      <div className="al-container">
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag" role="img">
            <img
              className="al-wordmark-img al-wordmark-img--fluid"
              src="/brand/festag-mark-fluid.png?v=20260731"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
            />
          </span>
          <div className="al-header-actions">
            <AuthDocsPopover />
          </div>
        </header>

        <main className="al-main">
          <div className={`al-desktop-stage al-desktop-stage--centered${subFlow ? ' al-desktop-stage--focus' : ''}`}>
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section
                    className={`al-signin${animating ? ' al-signin--out' : ''}`}
                    aria-label={isSignup ? 'Festag Registrierung' : 'Festag Anmeldung'}
                  >
                    <div className="al-signin-head">
                      {!subFlow && emailTakenActive ? (
                        <div className="al-hero-copy al-hero-copy--status">
                          <AuthGlassyHero
                            animKey="email-taken"
                            instant={softModeLocked}
                            className="al-title--status"
                            lead={EMAIL_ALREADY_USED_TITLE}
                          />
                        </div>
                      ) : !subFlow ? (
                        <div className="al-hero-copy">
                          {isSignup ? (
                            <AuthGlassyHero
                              animKey={`signup-${devInviteToken ? 'invite' : 'ws'}`}
                              instant={softModeLocked}
                              lead={devInviteToken ? 'Einladung annehmen.' : 'Erstelle dein Konto.'}
                            />
                          ) : displayWorkspaceName ? (
                            <AuthGlassyHero
                              animKey={`login-ws-${displayWorkspaceName}`}
                              instant={softModeLocked}
                              lead="Willkommen zurück."
                            />
                          ) : (
                            <AuthGlassyHero
                              animKey="login-cold"
                              instant={softModeLocked}
                              lead="Willkommen zurück."
                            />
                          )}
                          {isSignup && !hasInvite ? (
                            <div className="al-hero-secondary">
                              {wsAvailability === 'available' && displayWorkspaceName && !wsNameEditing ? (
                                <span className="al-ws-path-check-row">
                                  <AuthWorkspacePath
                                    name={displayWorkspaceName}
                                    onEdit={startEditingWorkspaceName}
                                  />
                                  <span className="al-ws-ok-badge" aria-hidden="true" title="Verfügbar">
                                    <Check size={11} weight="bold" />
                                  </span>
                                </span>
                              ) : (
                                <AuthExpandableTextField
                                  ref={wsNameRef}
                                  lineClassName={`al-ws-name-line${workspaceName ? ' has-value' : ''}${wsBadgeStatus ? ' al-ws-name-line--has-badge' : ''}`}
                                  inputClassName="al-ws-name-input"
                                  rightAdornment={
                                    wsBadgeStatus
                                      ? <UsernameCheckBadge status={wsBadgeStatus} title={wsBadgeTitle} />
                                      : null
                                  }
                                  srLabel="Account-Name"
                                  type="text"
                                  inputMode="text"
                                  value={workspaceName}
                                  onChange={e => updateWorkspaceName(e.target.value)}
                                  onInput={e => updateWorkspaceName((e.target as HTMLInputElement).value)}
                                  onBlur={handleWorkspaceNameBlur}
                                  onFocus={() => {
                                    if (isMobileAuth) setWsFieldFocusedMobile(true)
                                    if (wsAvailabilityRef.current === 'available' && displayWorkspaceNameRef.current) {
                                      armWsOkHint()
                                    }
                                  }}
                                  placeholder=""
                                  autoComplete="off"
                                  autoCorrect="off"
                                  autoCapitalize="words"
                                  spellCheck={false}
                                  maxLength={64}
                                  aria-label="Account-Name"
                                  aria-invalid={wsAvailability === 'taken' || wsAvailability === 'invalid'}
                                  aria-describedby={wsBadgeStatus ? 'al-ws-check-live' : undefined}
                                  persistIdleCaret={mobileRegisterCaret && !workspaceName}
                                />
                              )}
                              <span id="al-ws-check-live" className="sr-only" aria-live="polite">
                                {wsBadgeTitle || ''}
                              </span>
                            </div>
                          ) : !isSignup && displayWorkspaceName ? (
                            <div className="al-hero-secondary">
                              {loginWorkspacePath}
                            </div>
                          ) : softModeLocked ? (
                            /* Reserve path/field height so login↔register doesn't jump. */
                            <div className="al-hero-secondary al-hero-secondary--spacer" aria-hidden="true" />
                          ) : null}
                        </div>
                      ) : authStep === 'sso' ? (
                        <div className="al-hero-copy">
                          <AuthGlassyHero animKey="sso" instant={softModeLocked} lead="Mit SSO fortfahren." />
                          {loginWorkspacePath ? (
                            <div className="al-hero-secondary">
                              {loginWorkspacePath}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="al-hero-copy">
                          <AuthGlassyHero animKey="otp" instant={softModeLocked} lead="Code eingeben." />
                          {loginWorkspacePath ? (
                            <div className="al-hero-secondary">
                              {loginWorkspacePath}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <>
                      <div
                        className={`al-content${animating ? ' animating' : ''}${subFlow ? ' al-content--sub' : ''}${mobileWsCollapse ? ' al-content--ws-collapse' : ''}${emailTakenActive ? ' al-content--status-dim' : ''}`}
                      >
                        {authStep === 'main' ? mainSignIn : authStep === 'sso' ? ssoScreen : codeEntryScreen}
                      </div>
                      {!mobileWsCollapse && accountHint ? (
                        <div className="al-auth-switch">{accountHint}</div>
                      ) : null}
                    </>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Dev/test — jump straight into Build onboarding */}
      <div className="al-test-jumps" aria-label="Test Onboarding">
        <a
          href="/onboarding?preview=1"
          onPointerEnter={() => prefetchAuthHref('/onboarding?preview=1')}
          onClick={e => {
            e.preventDefault()
            navigateWithFade('/onboarding?preview=1')
          }}
        >
          Onboarding
        </a>
      </div>

      <AuthRecoveryModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        initialEmail={email}
        page={isSignup ? '/register' : '/login'}
        variant="client"
      />

    </main>
  )
}
