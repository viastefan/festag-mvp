'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthExpandableTextField from '@/components/auth/AuthExpandableTextField'
import UsernameCheckBadge from '@/components/auth/UsernameCheckBadge'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { AUTH_OS_STYLES } from '@/components/auth/auth-os-styles'
import AuthSandAmbient from '@/components/auth/AuthSandAmbient'
import { useAuthEnterSubmit } from '@/components/auth/useAuthEnterSubmit'
import AuthEnterGlyph, { AUTH_ENTER_GLYPH_CSS } from '@/components/auth/AuthEnterGlyph'
import { WORKSPACE_CREATE_WIZARD_CSS } from '@/components/auth/workspace-create-styles'
import {
  prepareAuthRouteTransition,
  useAuthTheme,
  applyAuthTheme,
  consumePanelEnter,
  markPanelEnter,
  navigateLeavingAuthChrome,
} from '@/lib/auth-theme'
import {
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
  normalizeWorkspaceName,
} from '@/lib/pending-workspace'
import { useWorkspaceNameField } from '@/lib/use-workspace-name-field'
import { bootstrapPersonalWorkspace } from '@/lib/workspace-bootstrap-client'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'
import {
  WORKSPACE_CREATION_COPY as COPY,
  WORKSPACE_USE_CASES,
  getWorkspaceUseCase,
  workspaceSubdomainPreview,
  type WorkspaceUseCaseId,
} from '@/lib/platform/workspace-creation'

type Step = 'name' | 'use' | 'creating' | 'welcome' | 'plan'

/**
 * Phase 2 — Workspace Creation Wizard.
 * Name → How will you use this? → Creating… → Welcome → /overview
 * First workspace free. No module picker. No price on the first path.
 */
export default function WorkspaceCreatePage() {
  const supabase = createClient()
  const router = useRouter()
  const { setMode: setThemeMode, rootRef } = useAuthTheme('client')
  const [booting, setBooting] = useState(true)
  const [step, setStep] = useState<Step>('name')
  const [useCase, setUseCase] = useState<WorkspaceUseCaseId | null>(null)
  const [error, setError] = useState('')
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [creatingVisible, setCreatingVisible] = useState(0)
  const createStarted = useRef(false)

  const {
    workspaceName,
    displayName,
    availability,
    availabilityMsg,
    ready,
    inputRef,
    setWorkspaceName,
    hydrate,
    checkAvailability,
  } = useWorkspaceNameField({ enabled: !booting && hydrated && step === 'name' })

  const subdomain = workspaceSubdomainPreview(displayName || workspaceName)
  const useReady = Boolean(useCase)

  useLayoutEffect(() => {
    if (hydrated) return
    const seed =
      getPendingWorkspaceName() ||
      getRememberedWorkspaceName() ||
      ''
    if (seed) hydrate(seed)
    setHydrated(true)
  }, [hydrated, hydrate])

  useLayoutEffect(() => {
    applyAuthTheme('dark', 'dev')
    setThemeMode('dark')
  }, [setThemeMode])

  useLayoutEffect(() => {
    if (consumePanelEnter() !== 'client') return
    setPanelEnter(true)
    const t = window.setTimeout(() => setPanelEnter(false), 360)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/register'
          return
        }

        const { count } = await supabase
          .from('workspaces')
          .select('id', { count: 'exact', head: true })
          .eq('primary_owner_id', user.id)

        if (!cancelled && (count ?? 0) >= 1) {
          setStep('plan')
          setBooting(false)
          return
        }

        const meta =
          typeof user.user_metadata?.pending_workspace_name === 'string'
            ? user.user_metadata.pending_workspace_name
            : typeof user.user_metadata?.workspace_name === 'string'
              ? user.user_metadata.workspace_name
              : ''
        const seed = normalizeWorkspaceName(meta)
        if (seed) hydrate(seed)
      } catch {
        /* stay on page */
      }
      if (!cancelled) setBooting(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (booting || step !== 'name') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => inputRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [booting, step, inputRef])

  function navigateWithFade(href: string) {
    try {
      const path = new URL(href, window.location.origin).pathname
      if (isLegalPath(path)) {
        rememberLegalReturn()
        navigateLeavingAuthChrome(path)
        return
      }
    } catch { /* noop */ }
    router.prefetch(href)
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), 160)
  }

  function updateWorkspaceName(next: string) {
    setError('')
    setWorkspaceName(next)
  }

  async function goToUse() {
    setError('')
    const trimmed = displayName
    if (!trimmed) {
      setError('Please give your workspace a name.')
      inputRef.current?.focus()
      return
    }
    const check = await checkAvailability(trimmed)
    if (!check.ok) {
      setError(check.reason || 'This workspace name is already taken.')
      inputRef.current?.focus()
      return
    }
    setStep('use')
  }

  async function startCreate() {
    if (!useCase || createStarted.current) return
    const trimmed = displayName
    if (!trimmed) {
      setStep('name')
      return
    }
    const selected = getWorkspaceUseCase(useCase)
    if (!selected) return

    createStarted.current = true
    setError('')
    setStep('creating')
    setCreatingVisible(0)

    const startedAt = Date.now()
    const lineTimers = COPY.creatingLines.map((_, i) =>
      window.setTimeout(() => setCreatingVisible(i + 1), 280 + i * 420),
    )

    try {
      const result = await bootstrapPersonalWorkspace(trimmed, {
        useCase: selected.id,
        workspaceType: selected.workspaceType,
      })
      if (!result.ok) {
        lineTimers.forEach(clearTimeout)
        createStarted.current = false
        setError(result.message)
        setStep('use')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        rememberFestagAccount({
          userId: user.id,
          email: user.email ?? null,
          method: user.app_metadata?.provider === 'google' ? 'google' : 'email',
          onboardingCompleted: true,
          workspaceName: result.workspace.name,
        })
      }

      const elapsed = Date.now() - startedAt
      const wait = Math.max(0, 2000 - elapsed)
      await new Promise((r) => window.setTimeout(r, wait))
      setCreatingVisible(COPY.creatingLines.length)
      setStep('welcome')

      window.setTimeout(() => {
        markPanelEnter('client')
        prepareAuthRouteTransition('/overview')
        setPageExiting(true)
        window.setTimeout(() => {
          try {
            router.push('/overview')
          } catch {
            window.location.assign('/overview')
          }
        }, 220)
      }, 1400)
    } catch {
      lineTimers.forEach(clearTimeout)
      createStarted.current = false
      setError('Workspace could not be created. Please try again.')
      setStep('use')
    }
  }

  useAuthEnterSubmit({
    enabled:
      !booting &&
      ((step === 'name' && ready) || (step === 'use' && useReady && !createStarted.current)),
    onSubmit: () => {
      if (step === 'name') void goToUse()
      else if (step === 'use') void startCreate()
    },
  })

  if (booting) {
    return (
      <main
        ref={rootRef}
        data-theme="dark"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <style>{`@keyframes alboot{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(168,176,188,.25)', borderTopColor: 'rgba(168,176,188,.9)', animation: 'alboot .8s linear infinite' }} />
      </main>
    )
  }

  return (
    <main
      ref={rootRef}
      className={`al-root al-root--centered onb-sand-dark${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}`}
      data-theme="dark"
    >
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: AUTH_LANDING_STYLES }} />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: AUTH_OS_STYLES }} />
      <style>{AUTH_ENTER_GLYPH_CSS}</style>
      <style>{WORKSPACE_CREATE_WIZARD_CSS}</style>
      <AuthSandAmbient variant="dev-onboarding" />

      <div className="al-container">
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag" role="img">
            <img
              className="al-wordmark-img al-wordmark-img--dark"
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
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section className="al-signin" aria-label="Create workspace">
                    <div className="wc-wizard">
                      {step === 'plan' ? (
                        <div className="wc-plan">
                          <h1 className="wc-plan-title">
                            {COPY.additionalTitle}{' '}
                            <span className="wc-plan-title-muted">{COPY.additionalBody}</span>
                          </h1>
                          <div className="wc-actions">
                            <button
                              type="button"
                              className="al-btn al-btn-primary al-btn-primary--ready"
                              onClick={() => navigateWithFade('/overview')}
                            >
                              <span className="al-btn-label">{COPY.additionalBack}</span>
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {step === 'name' ? (
                        <>
                          <h1 className="wc-hero-title">{COPY.nameTitle}</h1>
                          <label className="wc-field-label" htmlFor="wc-workspace-name">
                            {COPY.nameLabel}
                          </label>
                          <AuthExpandableTextField
                            ref={inputRef}
                            id="wc-workspace-name"
                            lineClassName={`al-ws-name-line${workspaceName ? ' has-value' : ''}${
                              availability === 'checking' || availability === 'available' || availability === 'taken' || availability === 'invalid'
                                ? ' al-ws-name-line--has-badge'
                                : ''
                            }`}
                            inputClassName="al-ws-name-input"
                            rightAdornment={
                              availability === 'checking' && displayName ? (
                                <UsernameCheckBadge status="checking" title="Checking…" />
                              ) : availability === 'available' && displayName ? (
                                <UsernameCheckBadge status="available" title="Available" />
                              ) : (availability === 'taken' || availability === 'invalid') && displayName ? (
                                <UsernameCheckBadge status="taken" title={availabilityMsg || 'Taken'} />
                              ) : null
                            }
                            srLabel={COPY.nameLabel}
                            type="text"
                            value={workspaceName}
                            onChange={e => updateWorkspaceName(e.target.value)}
                            onInput={e => updateWorkspaceName((e.target as HTMLInputElement).value)}
                            placeholder={COPY.namePlaceholder}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="words"
                            spellCheck={false}
                            maxLength={64}
                            aria-label={COPY.nameLabel}
                            aria-invalid={availability === 'taken' || availability === 'invalid'}
                          />
                          <span className={`wc-subdomain${displayName ? ' is-ready' : ''}`}>
                            {subdomain}
                          </span>
                          {error ? <p className="al-error" style={{ marginTop: 14 }}>{error}</p> : null}
                          <div className="wc-actions">
                            <button
                              className={`al-btn al-btn-primary al-btn--enter-glyph${ready ? ' al-btn-primary--ready' : ''}`}
                              type="button"
                              onClick={() => void goToUse()}
                              disabled={!ready}
                            >
                              <span className="al-btn-label">{COPY.continue}</span>
                              <AuthEnterGlyph ready={ready} />
                            </button>
                          </div>
                        </>
                      ) : null}

                      {step === 'use' ? (
                        <>
                          <h1 className="wc-hero-title">{COPY.useTitle}</h1>
                          <div className="wc-use-grid" role="radiogroup" aria-label={COPY.useTitle}>
                            {WORKSPACE_USE_CASES.map((card) => {
                              const selected = useCase === card.id
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  className={`wc-use-card${selected ? ' is-selected' : ''}`}
                                  onClick={() => {
                                    setError('')
                                    setUseCase(card.id)
                                  }}
                                >
                                  <span className="wc-use-card-title">{card.title}</span>
                                  <span className="wc-use-card-body">{card.description}</span>
                                </button>
                              )
                            })}
                          </div>
                          {error ? <p className="al-error" style={{ marginTop: 14 }}>{error}</p> : null}
                          <div className="wc-actions">
                            <button
                              className={`al-btn al-btn-primary al-btn--enter-glyph${useReady ? ' al-btn-primary--ready' : ''}`}
                              type="button"
                              onClick={() => void startCreate()}
                              disabled={!useReady}
                            >
                              <span className="al-btn-label">{COPY.continue}</span>
                              <AuthEnterGlyph ready={useReady} />
                            </button>
                          </div>
                        </>
                      ) : null}

                      {step === 'creating' ? (
                        <div className="wc-creating" aria-live="polite">
                          <h1 className="wc-hero-title">{COPY.creatingTitle}</h1>
                          <ul className="wc-creating-lines">
                            {COPY.creatingLines.map((line, i) => (
                              <li
                                key={line}
                                className={`wc-creating-line${creatingVisible > i ? ' is-on' : ''}`}
                              >
                                <span className="wc-creating-dot" aria-hidden="true" />
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {step === 'welcome' ? (
                        <div className="wc-welcome" aria-live="polite">
                          <h1 className="wc-welcome-title">
                            {COPY.welcomePrefix} {displayName || 'your workspace'}.
                          </h1>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  )
}
