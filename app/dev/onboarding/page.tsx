'use client'

/**
 * /dev/onboarding — Dev Panel onboarding flow.
 *
 * Runs after GitHub OAuth (or any first-time dev login) when the dev
 * does not yet have a complete profile. Three calm steps:
 *   1. profil  — display name (pre-filled from GitHub), position
 *   2. fokus   — dev role / stack focus
 *   3. bereit  — done, open first task or go to /dev
 *
 * Uses the exact same auth chrome as the client onboarding
 * (AUTH_LANDING_STYLES, al-btn, al-input, onb-dots, etc.) but with
 * dev-specific copy and dark-mode default.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import {
  prepareAuthRouteTransition,
  useAuthTheme,
  consumePanelEnter,
} from '@/lib/auth-theme'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'

/* ─── Types ─────────────────────────────────────────────────────────── */

type StepId = 'profil' | 'fokus' | 'verbinden' | 'bereit'
type FocusId = 'frontend' | 'backend' | 'fullstack' | 'devops' | 'freelance'

const STEPS: StepId[] = ['profil', 'fokus', 'verbinden', 'bereit']

type IntegrationId = 'github' | 'linear' | 'jira' | 'slack' | 'notion'
const INTEGRATIONS: Array<{ id: IntegrationId; name: string; desc: string; available: boolean }> = [
  { id: 'github',  name: 'GitHub',   desc: 'Commits, Pull Requests und Deployments direkt in Festag.',  available: true },
  { id: 'linear',  name: 'Linear',   desc: 'Issues und Projekte mit dem Festag-Status synchronisieren.', available: false },
  { id: 'jira',    name: 'Jira',     desc: 'Ticket-Status und Sprint-Progress automatisch übertragen.',  available: false },
  { id: 'slack',   name: 'Slack',    desc: 'Statusberichte und Alerts direkt in deinen Slack-Channel.',  available: false },
  { id: 'notion',  name: 'Notion',   desc: 'Docs und Wikis mit Projekt-Briefings verknüpfen.',           available: false },
]

/* ─── Focus options ──────────────────────────────────────────────────── */

const FOCUS_OPTIONS: Array<{ id: FocusId; title: string; desc: string }> = [
  { id: 'frontend',  title: 'Frontend',     desc: 'Web, Apps, Design-Systeme und UI-Komponenten.' },
  { id: 'backend',   title: 'Backend',      desc: 'APIs, Datenbanken, Services und Datenmodelle.' },
  { id: 'fullstack', title: 'Full-Stack',   desc: 'Alles, von Feature-Idee bis zum Deploy.' },
  { id: 'devops',    title: 'DevOps',       desc: 'CI/CD, Cloud-Infrastruktur und Platform Engineering.' },
  { id: 'freelance', title: 'Freiberuflich', desc: 'Projektbasiert, wechselnde Stacks, mehrere Kunden.' },
]

/* ─── Hero copy ──────────────────────────────────────────────────────── */

const PROFIL_HERO = {
  lead: 'Dein Entwicklerprofil.',
  rest: ' Name und Position für Projekte, Briefings und Team-Übersichten.',
}

const FOKUS_HERO: Record<FocusId, { lead: string; rest: string }> = {
  frontend:  { lead: 'Frontend-Entwicklung.', rest: ' UI, Components, Web und Apps.' },
  backend:   { lead: 'Backend-Entwicklung.',  rest: ' APIs, Datenbanken und Services.' },
  fullstack: { lead: 'Full-Stack.',           rest: ' Von der Idee bis zur fertigen Funktion.' },
  devops:    { lead: 'DevOps und Platform.',  rest: ' CI/CD, Cloud, Infrastruktur und Skalierung.' },
  freelance: { lead: 'Freiberuflich.',        rest: ' Projektbasiert, mehrere Stacks, flexibel.' },
}

const VERBINDEN_HERO = {
  lead: 'Deine Tools verbinden.',
  rest: ' Festag holt sich den Kontext direkt aus den Quellen — kein manuelles Update.',
}

const BEREIT_HERO: Record<FocusId, { lead: string; rest: string }> = {
  frontend:  { lead: 'Alles bereit.', rest: ' Öffne das Panel und starte mit dem ersten Frontend-Projekt.' },
  backend:   { lead: 'Alles bereit.', rest: ' Öffne das Panel und starte mit dem ersten Backend-Projekt.' },
  fullstack: { lead: 'Alles bereit.', rest: ' Tasks, GitHub und Tagro warten im Execution Panel.' },
  devops:    { lead: 'Alles bereit.', rest: ' Infrastruktur und Delivery starten im Execution Panel.' },
  freelance: { lead: 'Alles bereit.', rest: ' Öffne das Panel und starte mit deinem ersten Projekt.' },
}

export default function DevOnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const { mode: theme, toggleLightDark } = useAuthTheme('dev')

  const [booting, setBooting]     = useState(true)
  const [userId, setUserId]       = useState<string | null>(null)
  const [current, setCurrent]     = useState<StepId>('profil')
  const [animating, setAnimating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter]   = useState(false)
  const [reveal, setReveal]           = useState<'leaving' | 'message' | 'departing' | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revealTimers = useRef<any[]>([])

  /* Step data */
  const [fullName, setFullName]         = useState('')
  const [position, setPosition]         = useState('')
  const [focus, setFocus]               = useState<FocusId>('fullstack')
  const [githubConnected, setGithubConnected] = useState(false)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<IntegrationId>>(new Set())

  /* ── Boot: check auth + skip if already onboarded ─────────────────── */

  useLayoutEffect(() => {
    const p = consumePanelEnter()
    if (p) setPanelEnter(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        /* TEMP TEST — UI preview without auth gates. */
        if (typeof window !== 'undefined') {
          try {
            if (new URLSearchParams(window.location.search).get('preview') === '1') {
              setFullName('Alex Developer')
              setPosition('Full-Stack')
              setFocus('fullstack')
              setCurrent('profil')
              setBooting(false)
              return
            }
          } catch { /* noop */ }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/dev/login')
          return
        }
        if (cancelled) return
        setUserId(user.id)

        /* Pre-fill name from Supabase user metadata (GitHub sets this) */
        const meta = user.user_metadata ?? {}
        const ghName = meta.full_name || meta.name || meta.user_name || ''
        if (ghName && !fullName) setFullName(ghName)

        /* Check GitHub connection — present if user signed in via GitHub OAuth */
        const providers = (user.app_metadata?.providers as string[] | undefined) ?? []
        const isGhConnected = providers.includes('github') || user.app_metadata?.provider === 'github'
        if (isGhConnected) {
          setGithubConnected(true)
          setConnectedIntegrations(prev => { const s = new Set(prev); s.add('github'); return s })
        }

        /* Resuming from a mid-onboarding GitHub link redirect (see connectGithub
           below) — land back on the same step instead of bouncing to /dev. */
        const resumeStep = new URLSearchParams(window.location.search).get('step') as StepId | null
        const isResuming = resumeStep != null && STEPS.includes(resumeStep)

        /* Check if already onboarded: full_name + a dev focus work_mode set */
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, work_mode')
          .eq('id', user.id)
          .maybeSingle()

        const devFocusIds: string[] = FOCUS_OPTIONS.map(o => o.id)
        const alreadyDone =
          (prof as any)?.full_name &&
          devFocusIds.includes((prof as any)?.work_mode ?? '')

        if (alreadyDone && !isResuming) {
          /* Returning dev — skip onboarding, go straight to panel */
          router.replace('/dev')
          return
        }

        if (isResuming) setCurrent(resumeStep)

        /* Pre-fill from existing profile if partial */
        if ((prof as any)?.full_name && !fullName) setFullName((prof as any).full_name)
        if ((prof as any)?.work_mode && devFocusIds.includes((prof as any).work_mode)) {
          setFocus((prof as any).work_mode)
        }
        if (cancelled) return
        setBooting(false)
      } catch {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Step helpers ─────────────────────────────────────────────────── */

  const stepIdx = STEPS.indexOf(current)
  const isLast  = stepIdx === STEPS.length - 1

  function transition(delta: number) {
    const next = STEPS[stepIdx + delta]
    if (!next) return
    setError('')
    setAnimating(true)
    window.setTimeout(() => {
      setCurrent(next)
      setAnimating(false)
    }, 120)
  }

  function goToStep(idx: number) {
    if (idx >= stepIdx) return
    setError('')
    setAnimating(true)
    window.setTimeout(() => {
      setCurrent(STEPS[idx])
      setAnimating(false)
    }, 120)
  }

  /* ── Persist + continue ───────────────────────────────────────────── */

  const persist = useCallback(async (step: StepId): Promise<boolean> => {
    const isPreview = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('preview') === '1'
    if (isPreview) {
      if (step === 'profil' && !fullName.trim()) {
        setError('Bitte einen Namen eingeben.')
        return false
      }
      return true
    }
    if (!userId) return false
    setError('')
    try {
      if (step === 'profil') {
        if (!fullName.trim()) {
          setError('Bitte einen Namen eingeben.')
          return false
        }
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName.trim(),
          ...(position.trim() ? { position: position.trim() } : {}),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        if (upsertError) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return false
        }
      } else if (step === 'fokus') {
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: userId,
          work_mode: focus,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        if (upsertError) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return false
        }
      }
      return true
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen.')
      return false
    }
  }, [userId, fullName, position, focus, supabase])

  async function handleContinue() {
    if (submitting || animating || reveal) return
    setSubmitting(true)
    try {
      const ok = await persist(current)
      if (!ok) { setSubmitting(false); return }

      const isPreview = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('preview') === '1'

      if (isLast) {
        if (isPreview) {
          prepareAuthRouteTransition('/login')
          window.setTimeout(() => { window.location.href = '/login' }, 180)
          return
        }
        clearRevealTimers()
        setReveal('leaving')
        const t1 = window.setTimeout(() => setReveal('message'), 480)
        const t2 = window.setTimeout(() => {
          setReveal('departing')
          prepareAuthRouteTransition('/dev')
          const t3 = window.setTimeout(() => {
            window.location.href = '/dev'
          }, 720)
          revealTimers.current.push(t3)
        }, 480 + 2200)
        revealTimers.current.push(t1, t2)
      } else {
        transition(+1)
        setSubmitting(false)
      }
    } catch {
      setError('Speichern fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  async function connectGithub() {
    setError('')
    const { error: linkError } = await (supabase.auth as any).linkIdentity({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dev/onboarding?step=verbinden')}`,
        scopes: 'read:user user:email read:org repo',
      },
    })
    if (linkError) setError('GitHub-Verbindung fehlgeschlagen: ' + linkError.message)
  }

  function clearRevealTimers() {
    for (const id of revealTimers.current) window.clearTimeout(id)
    revealTimers.current = []
  }

  useEffect(() => () => clearRevealTimers(), [])

  /* ── Hero copy ────────────────────────────────────────────────────── */

  const heroCopy =
    current === 'profil'    ? PROFIL_HERO
    : current === 'fokus'     ? FOKUS_HERO[focus]
    : current === 'verbinden' ? VERBINDEN_HERO
    : BEREIT_HERO[focus]

  const heroKey = current === 'fokus' || current === 'bereit' ? `${current}-${focus}` : current
  const revealing  = reveal != null

  /* ── Loading spinner ─────────────────────────────────────────────── */

  if (booting) {
    return (
      <main
        data-theme={theme}
        style={{
          minHeight: '100dvh', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <style>{`@keyframes alboot{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(168,176,188,.25)', borderTopColor: 'rgba(168,176,188,.9)', animation: 'alboot .8s linear infinite' }} />
      </main>
    )
  }

  /* ─────────────────────────────────────────────────────────────────── */

  return (
    <main
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}${revealing ? ` onb-revealing onb-reveal-${reveal}` : ''}`}
      data-theme={theme}
    >
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{DEV_ONB_CSS}</style>

      {(reveal === 'message' || reveal === 'departing') && (
        <div className="onb-complete" aria-live="polite">
          <h1 className="onb-complete-title">
            Dein Execution Panel ist eingerichtet.
          </h1>
          <p className="onb-complete-sub">
            Einen Moment — wir öffnen dein Panel.
          </p>
        </div>
      )}

      <div className={`al-container${revealing ? ' onb-chrome-exit' : ''}`}>
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag Execution Panel" role="img">
            <img
              className="al-wordmark-img al-wordmark-img--light"
              src="/brand/auth-logo-light-3d.png?v=20260727"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
            />
            <img
              className="al-wordmark-img al-wordmark-img--dark"
              src="/brand/auth-logo-dark.png?v=20260725-soft3d"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
            />
          </span>
          <div className="al-header-actions">
            <AuthDocsPopover />
            <button
              type="button"
              className="al-theme-icon al-theme-icon--header"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => toggleLightDark()}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </div>
        </header>

        <main className="al-main">
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section className="al-signin" aria-label="Execution Panel Onboarding">

                    <div className={`al-signin-head${animating ? ' onb-animating' : ''}`}>
                      <div className="al-hero-copy">
                        <h1
                          key={heroKey}
                          className="al-title al-title-display onb-hero-line onb-hero-swap"
                        >
                          <span className="onb-hero-lead">{heroCopy.lead}</span>
                          <span className="al-hero-gray">{heroCopy.rest}</span>
                        </h1>
                      </div>
                    </div>

                    <div className={`al-content${animating ? ' onb-animating' : ''}`}>
                      <div className="al-signin-stack">

                        {/* ── Step 1: Profil ─────────────────────────── */}
                        {current === 'profil' && (
                          <form
                            className="al-method-group"
                            autoComplete="on"
                            onSubmit={(e) => { e.preventDefault(); void handleContinue() }}
                          >
                            <div className="onb-field-group">
                              <label className="onb-field-label" htmlFor="dev-onb-name">
                                Anzeigename
                              </label>
                              <input
                                id="dev-onb-name"
                                className="al-input"
                                type="text"
                                name="name"
                                autoComplete="name"
                                autoCapitalize="words"
                                spellCheck={false}
                                value={fullName}
                                onChange={(e) => { setError(''); setFullName(e.target.value) }}
                                placeholder="Vollständiger Name…"
                                maxLength={80}
                                autoFocus
                              />
                            </div>
                            <div className="onb-field-group">
                              <label className="onb-field-label" htmlFor="dev-onb-position">
                                Position
                                <span className="onb-field-optional"> (optional)</span>
                              </label>
                              <input
                                id="dev-onb-position"
                                className="al-input"
                                type="text"
                                name="organization-title"
                                autoComplete="organization-title"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                placeholder="z. B. Senior Frontend Developer"
                                maxLength={64}
                              />
                            </div>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}

                            <button
                              type="submit"
                              className={`al-btn al-btn-primary onb-cta${fullName.trim() ? ' al-btn-primary--ready' : ''}`}
                              disabled={submitting || !fullName.trim()}
                            >
                              {submitting ? 'Speichere…' : 'Weiter'}
                            </button>
                          </form>
                        )}

                        {/* ── Step 2: Fokus ─────────────────────────── */}
                        {current === 'fokus' && (
                          <>
                            <ul
                              className="onb-toggle-list"
                              role="radiogroup"
                              aria-label="Entwicklungsfokus"
                            >
                              {FOCUS_OPTIONS.map((opt) => {
                                const active = focus === opt.id
                                return (
                                  <li
                                    key={opt.id}
                                    className={`onb-toggle-row${active ? ' is-active' : ''}`}
                                    role="radio"
                                    aria-checked={active}
                                    tabIndex={0}
                                    onClick={() => setFocus(opt.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        setFocus(opt.id)
                                      }
                                    }}
                                  >
                                    <div className="onb-toggle-text">
                                      <p className="onb-toggle-title">{opt.title}</p>
                                      <p className="onb-toggle-desc">{opt.desc}</p>
                                    </div>
                                    <span
                                      className={`onb-switch${active ? ' is-on' : ''}`}
                                      role="presentation"
                                      aria-hidden
                                    >
                                      <span className="onb-switch-knob" />
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}

                            <button
                              type="button"
                              className="al-btn al-btn-primary al-btn-primary--ready onb-cta"
                              onClick={() => void handleContinue()}
                              disabled={submitting}
                            >
                              {submitting ? 'Speichere…' : 'Weiter'}
                            </button>
                            <p className="onb-fine onb-fine--under-cta">
                              Jederzeit in den Einstellungen änderbar.
                            </p>
                          </>
                        )}

                        {/* ── Step 3: Verbinden ─────────────────────── */}
                        {current === 'verbinden' && (
                          <>
                            <ul className="onb-integration-list" role="list" aria-label="Integrationen">
                              {INTEGRATIONS.map((intg) => {
                                const isConnected = connectedIntegrations.has(intg.id)
                                return (
                                  <li key={intg.id} className={`onb-integration-row${isConnected ? ' is-connected' : ''}${!intg.available ? ' is-soon' : ''}`}>
                                    <div className="onb-integration-logo" aria-hidden="true">
                                      {intg.id === 'github'  && <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.19-3.11-.12-.29-.51-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.6.23 2.79.11 3.08.74.81 1.19 1.85 1.19 3.11 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>}
                                      {intg.id === 'linear'  && <svg viewBox="0 0 100 100" width="18" height="18" fill="currentColor"><path d="M1.27 61.1 38.9 98.73a4.64 4.64 0 0 0 7.17-.54L2.1 53.1a4.64 4.64 0 0 0-.83 8zm6.98-13.78 43.43 43.43a4.64 4.64 0 0 0 2.26-1.07L10.53 44.27a4.64 4.64 0 0 0-2.28 3.05zM14.32 38.04l47.64 47.64a57 57 0 0 0 4.53-4.97L19.29 33.51a57 57 0 0 0-4.97 4.53zm9.75-8.08 45.97 45.97C92.05 52.4 92.05 20.28 69.96 5.72L24 29.96zm21.36-21.2C30.45 3.64 11.25 18.76 6.3 38.1L45.43 8.76z"/></svg>}
                                      {intg.id === 'jira'    && <svg viewBox="0 0 32 32" width="18" height="18"><path fill="#2684FF" d="M15.867 5.63 6.634 14.863a1.25 1.25 0 0 0 0 1.769l9.233 9.234a1.25 1.25 0 0 0 1.768 0l9.234-9.234a1.25 1.25 0 0 0 0-1.769L17.635 5.63a1.25 1.25 0 0 0-1.768 0zm.884 4.295 6.88 6.822-6.88 6.822-6.88-6.822z"/></svg>}
                                      {intg.id === 'slack'   && <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"/><path fill="#E01E5A" d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/><path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"/><path fill="#36C5F0" d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/><path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"/><path fill="#2EB67D" d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/><path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"/><path fill="#ECB22E" d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>}
                                      {intg.id === 'notion'  && <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>}
                                    </div>
                                    <div className="onb-integration-text">
                                      <p className="onb-integration-name">{intg.name}</p>
                                      <p className="onb-integration-desc">{intg.desc}</p>
                                    </div>
                                    <div className="onb-integration-action">
                                      {isConnected ? (
                                        <span className="onb-integration-badge onb-integration-badge--connected">Verbunden</span>
                                      ) : intg.available ? (
                                        <button
                                          type="button"
                                          className="onb-integration-btn"
                                          onClick={() => {
                                            if (intg.id === 'github') void connectGithub()
                                          }}
                                        >
                                          Verbinden
                                        </button>
                                      ) : (
                                        <span className="onb-integration-badge">Bald</span>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}

                            <button
                              type="button"
                              className="al-btn al-btn-primary al-btn-primary--ready onb-cta"
                              onClick={() => void handleContinue()}
                              disabled={submitting}
                            >
                              {submitting ? 'Weiter…' : 'Weiter'}
                            </button>
                            <p className="onb-fine onb-fine--under-cta">
                              Weitere Integrationen folgen in den Einstellungen.
                            </p>
                          </>
                        )}

                        {/* ── Step 4: Bereit — headline only, no checklist card ── */}
                        {current === 'bereit' && (
                          <div className="al-method-group">
                            {error ? <p className="al-error" role="alert">{error}</p> : null}

                            <button
                              type="button"
                              className="al-btn al-btn-primary al-btn-primary--ready onb-cta"
                              onClick={() => void handleContinue()}
                              disabled={submitting || revealing}
                            >
                              {submitting || revealing ? 'Öffne Panel…' : 'Zum Execution Panel'}
                            </button>
                            <p className="onb-fine onb-fine--under-cta">
                              Du kannst Integrationen jederzeit in den Einstellungen nachziehen.
                            </p>
                          </div>
                        )}

                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ── Progress dots ──────────────────────────────────────────── */}
        <ol
          className={`onb-dots${revealing ? ' onb-chrome-exit' : ''}`}
          aria-label="Onboarding-Fortschritt"
        >
          {STEPS.map((s, i) => {
            const canGoBack = i < stepIdx
            return (
              <li key={s}>
                <button
                  type="button"
                  className={`onb-dot${i === stepIdx ? ' is-active' : ''}${canGoBack ? ' is-done is-clickable' : ''}`}
                  aria-current={i === stepIdx ? 'step' : undefined}
                  aria-label={
                    i === stepIdx
                      ? `Schritt ${i + 1} von ${STEPS.length}`
                      : canGoBack
                        ? `Zurück zu Schritt ${i + 1}`
                        : `Schritt ${i + 1}`
                  }
                  disabled={!canGoBack}
                  onClick={() => goToStep(i)}
                />
              </li>
            )
          })}
        </ol>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className={`al-footer-meta${revealing ? ' onb-chrome-exit' : ''}`}>
          <div className="al-footer-center">
            <button
              type="button"
              className="al-theme-icon al-theme-icon--footer no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => toggleLightDark()}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </div>
          <div className="al-footer-links al-footer-links--desktop">
            <a
              className="al-dev-link"
              href="/dev/login"
              onClick={(e) => {
                e.preventDefault()
                prepareAuthRouteTransition('/dev/login')
                setPageExiting(true)
                window.setTimeout(() => router.push('/dev/login'), 220)
              }}
            >
              Zurück zur Anmeldung
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}

/* ─── Extra CSS ──────────────────────────────────────────────────────── */

const DEV_ONB_CSS = `
  .onb-hero-line {
    margin: 0;
    max-width: 100%;
  }
  .onb-hero-lead {
    color: #1e1e20;
  }
  .al-root[data-theme="dark"] .onb-hero-lead {
    color: #f5f5f7;
  }
  .onb-hero-swap {
    animation: onbHeroIn .32s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes onbHeroIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .onb-animating {
    opacity: 0;
    transform: translateY(6px);
    transition: opacity .16s ease, transform .16s ease;
  }

  /* Field groups — calm rhythm; CTA breathes below fields */
  .onb-field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .al-method-group:has(.onb-field-group) {
    gap: 16px;
  }
  .al-method-group:has(.onb-field-group) > .onb-cta {
    margin-top: 8px;
  }
  .al-method-group:has(.onb-field-group) > .al-error + .onb-cta {
    margin-top: 4px;
  }
  .al-signin-stack > .onb-cta {
    margin-top: 20px;
  }
  .al-signin-stack > .al-error + .onb-cta {
    margin-top: 12px;
  }
  @media (max-width: 768px) {
    .al-method-group:has(.onb-field-group) {
      gap: 14px;
    }
    .al-method-group:has(.onb-field-group) > .onb-cta {
      margin-top: 10px;
    }
    .al-signin-stack > .onb-cta {
      margin-top: 18px;
    }
  }
  .onb-field-label {
    font-size: 13px;
    font-weight: 400;
    color: #5c5c62;
    letter-spacing: 0.01em;
  }
  .al-root[data-theme="dark"] .onb-field-label {
    color: rgba(245, 245, 247, 0.55);
  }
  .onb-field-optional {
    color: #8891a0;
    font-size: 12px;
    margin-left: 3px;
  }
  .al-root[data-theme="dark"] .onb-field-optional {
    color: rgba(245, 245, 247, 0.35);
  }

  /* Focus toggle list — same as client onboarding team cards */
  .onb-toggle-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .onb-toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: background .12s ease, border-color .12s ease;
    outline: none;
  }
  .onb-toggle-row:hover {
    background: #f7f8f8;
  }
  .onb-toggle-row.is-active {
    border-color: rgba(30, 30, 32, 0.18);
    background: #f5f5f7;
  }
  .al-root[data-theme="dark"] .onb-toggle-row {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.07);
    color: #f5f5f7;
  }
  .al-root[data-theme="dark"] .onb-toggle-row:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .al-root[data-theme="dark"] .onb-toggle-row.is-active {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.14);
  }
  .onb-toggle-text {
    flex: 1;
    min-width: 0;
  }
  .onb-toggle-title {
    font-size: 14.5px;
    font-weight: 400;
    color: #1e1e20;
    line-height: 1.3;
    margin: 0;
  }
  .al-root[data-theme="dark"] .onb-toggle-title {
    color: #f5f5f7;
  }
  .onb-toggle-desc {
    font-size: 12.5px;
    color: #8891a0;
    line-height: 1.45;
    margin: 2px 0 0;
  }
  .al-root[data-theme="dark"] .onb-toggle-desc {
    color: rgba(245, 245, 247, 0.42);
  }

  /* Toggle switch knob */
  .onb-switch {
    flex-shrink: 0;
    width: 30px;
    height: 18px;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.10);
    display: flex;
    align-items: center;
    padding: 2px;
    transition: background .14s ease;
  }
  .onb-switch.is-on {
    background: #1e1e20;
  }
  .al-root[data-theme="dark"] .onb-switch {
    background: rgba(255, 255, 255, 0.12);
  }
  .al-root[data-theme="dark"] .onb-switch.is-on {
    background: #ffffff;
  }
  .onb-switch-knob {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
    transition: transform .14s cubic-bezier(.16,1,.3,1);
  }
  .onb-switch.is-on .onb-switch-knob {
    transform: translateX(12px);
  }
  .al-root[data-theme="dark"] .onb-switch-knob {
    background: rgba(30, 30, 32, 0.85);
  }
  .al-root[data-theme="dark"] .onb-switch.is-on .onb-switch-knob {
    background: #1e1e20;
  }

  /* ── Integration cards (Verbinden step) ─── */
  .onb-integration-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .onb-integration-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 10px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
  }
  .onb-integration-row.is-connected {
    border-color: rgba(34, 197, 94, 0.28);
    background: rgba(34, 197, 94, 0.04);
  }
  .onb-integration-row.is-soon {
    opacity: 0.55;
  }
  .al-root[data-theme="dark"] .onb-integration-row {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.07);
  }
  .al-root[data-theme="dark"] .onb-integration-row.is-connected {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.06);
  }
  .onb-integration-logo {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1e1e20;
  }
  .al-root[data-theme="dark"] .onb-integration-logo {
    color: rgba(245, 245, 247, 0.85);
  }
  .onb-integration-text {
    flex: 1;
    min-width: 0;
  }
  .onb-integration-name {
    font-size: 14px;
    font-weight: 400;
    color: #1e1e20;
    line-height: 1.3;
    margin: 0;
  }
  .al-root[data-theme="dark"] .onb-integration-name {
    color: #f5f5f7;
  }
  .onb-integration-desc {
    font-size: 12px;
    color: #8891a0;
    line-height: 1.4;
    margin: 2px 0 0;
  }
  .al-root[data-theme="dark"] .onb-integration-desc {
    color: rgba(245, 245, 247, 0.38);
  }
  .onb-integration-action {
    flex-shrink: 0;
  }
  .onb-integration-btn {
    background: rgba(30, 30, 32, 0.06);
    color: #1e1e20;
    border: 1px solid rgba(30, 30, 32, 0.10);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 400;
    font-family: inherit;
    padding: 5px 12px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .1s ease;
    outline: none;
  }
  .onb-integration-btn:hover {
    background: rgba(30, 30, 32, 0.10);
  }
  .al-root[data-theme="dark"] .onb-integration-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #f5f5f7;
    border-color: rgba(255, 255, 255, 0.12);
  }
  .al-root[data-theme="dark"] .onb-integration-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  .onb-integration-badge {
    font-size: 11.5px;
    font-weight: 400;
    color: #8891a0;
    background: rgba(30, 30, 32, 0.05);
    border-radius: 999px;
    padding: 4px 10px;
    white-space: nowrap;
  }
  .onb-integration-badge--connected {
    background: rgba(34, 197, 94, 0.12);
    color: #16a34a;
  }
  .al-root[data-theme="dark"] .onb-integration-badge {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(245, 245, 247, 0.38);
  }
  .al-root[data-theme="dark"] .onb-integration-badge--connected {
    background: rgba(34, 197, 94, 0.14);
    color: #4ade80;
  }

  /* Fine print under CTA */
  .onb-fine {
    font-size: 12.5px;
    color: #8891a0;
    text-align: center;
    line-height: 1.4;
    margin: 0;
  }
  .al-root[data-theme="dark"] .onb-fine {
    color: rgba(245, 245, 247, 0.38);
  }
  .onb-fine--under-cta { margin-top: 12px; }

  /* Progress dots — same elongated pill as client onboarding */
  .onb-dots {
    list-style: none;
    padding: 0;
    margin: 0;
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 72px);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 5;
  }
  .onb-dots li {
    display: flex;
    align-items: center;
  }
  .onb-dot {
    width: 6px;
    height: 6px;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.14);
    transition: width .25s ease, background .25s ease, transform .12s ease;
    appearance: none;
    -webkit-appearance: none;
    pointer-events: none;
    position: relative;
    outline: none;
  }
  .onb-dot.is-active {
    width: 24px;
    background: #1d1d1f;
  }
  .onb-dot.is-done { background: rgba(30, 30, 32, 0.28); }
  .onb-dot.is-clickable {
    pointer-events: auto;
    cursor: pointer;
  }
  .onb-dot.is-clickable::before {
    content: '';
    position: absolute;
    inset: -10px;
  }
  .onb-dot.is-clickable:hover,
  .onb-dot.is-clickable:focus-visible {
    transform: scale(1.35);
    background: rgba(30, 30, 32, 0.45);
  }
  .al-root[data-theme="dark"] .onb-dot { background: rgba(255,255,255,0.15); }
  .al-root[data-theme="dark"] .onb-dot.is-active { background: rgba(255,255,255,0.85); }
  .al-root[data-theme="dark"] .onb-dot.is-done { background: rgba(255,255,255,0.35); }
  .al-root[data-theme="dark"] .onb-dot.is-clickable:hover,
  .al-root[data-theme="dark"] .onb-dot.is-clickable:focus-visible {
    background: rgba(255,255,255,0.55);
  }

  /* Completion reveal */
  .al-root.onb-revealing { pointer-events: none; }
  .onb-chrome-exit {
    opacity: 0;
    transform: translateY(4px) scale(0.992);
    filter: blur(1.5px);
    transition:
      opacity .48s cubic-bezier(.22,1,.36,1),
      transform .48s cubic-bezier(.22,1,.36,1),
      filter .48s cubic-bezier(.22,1,.36,1);
  }
  .onb-complete {
    position: fixed; inset: 0; z-index: 40;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 32px; text-align: center;
    pointer-events: none;
  }
  .onb-complete-title {
    margin: 0; max-width: 18em;
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: 32px;
    line-height: 39px;
    letter-spacing: -0.03em;
    font-weight: 500;
    color: #1e1e20;
    animation: onbCompleteIn .7s cubic-bezier(.16,1,.3,1) both;
  }
  .onb-complete-sub {
    margin: 14px 0 0; max-width: 28em;
    font-size: 15px; font-weight: 400; line-height: 1.5;
    letter-spacing: 0.01em; color: #5c5c62;
    animation: onbCompleteIn .7s cubic-bezier(.16,1,.3,1) .12s both;
  }
  .al-root[data-theme="dark"] .onb-complete-title { color: #f5f5f7; }
  .al-root[data-theme="dark"] .onb-complete-sub { color: rgba(245,245,247,0.58); }
  .al-root.onb-reveal-departing .onb-complete-title,
  .al-root.onb-reveal-departing .onb-complete-sub {
    animation: onbCompleteOut .72s cubic-bezier(.4,0,.2,1) both;
  }
  @keyframes onbCompleteIn {
    from { opacity: 0; transform: translateY(12px); letter-spacing: -0.01em; filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0); letter-spacing: -0.03em; filter: blur(0); }
  }
  @keyframes onbCompleteOut {
    from { opacity: 1; transform: translateY(0); filter: blur(0); }
    to   { opacity: 0; transform: translateY(-6px); filter: blur(2px); }
  }
`
