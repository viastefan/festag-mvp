'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthWorkspacePath from '@/components/auth/AuthWorkspacePath'
import AuthExpandableTextField from '@/components/auth/AuthExpandableTextField'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { prepareAuthRouteTransition, useAuthTheme, consumePanelEnter, navigateLeavingAuthChrome } from '@/lib/auth-theme'
import {
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
  normalizeWorkspaceName,
} from '@/lib/pending-workspace'
import { useWorkspaceNameField } from '@/lib/use-workspace-name-field'
import { bootstrapPersonalWorkspace } from '@/lib/workspace-bootstrap-client'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'

/**
 * Post-auth „Workspace erstellen“ — same chrome as /login + /register.
 * Used when signup finished without a personal workspace (SSO, OAuth
 * without pending name, bootstrap race, or returning session).
 */
export default function WorkspaceCreatePage() {
  const supabase = createClient()
  const router = useRouter()
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')
  const [booting, setBooting] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)
  const [hydrated, setHydrated] = useState(false)

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
  } = useWorkspaceNameField({ enabled: !booting && hydrated })

  const [wsNameEditing, setWsNameEditing] = useState(true)
  const [mobileLiveCaret, setMobileLiveCaret] = useState(false)
  const availabilityRef = useRef(availability)
  const displayNameRef = useRef(displayName)
  availabilityRef.current = availability
  displayNameRef.current = displayName

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setMobileLiveCaret(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  function startEditingWorkspaceName() {
    setWsNameEditing(true)
    window.setTimeout(() => {
      inputRef.current?.focus()
      const len = inputRef.current?.value.length ?? 0
      try { inputRef.current?.setSelectionRange(len, len) } catch { /* noop */ }
    }, 30)
  }

  function handleWorkspaceNameBlur() {
    window.setTimeout(() => {
      if (inputRef.current && document.activeElement === inputRef.current) return
      // Mobile: never settle to `/name` path chip — keep field + idle caret.
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
        setWsNameEditing(true)
        return
      }
      if (availabilityRef.current === 'available' && displayNameRef.current) {
        setWsNameEditing(false)
      }
    }, 0)
  }

  function updateWorkspaceName(next: string) {
    setWsNameEditing(true)
    setError('')
    setWorkspaceName(next)
  }

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

  useEffect(() => {
    if (mobileLiveCaret) return
    if (availability !== 'available' || !displayName || !wsNameEditing) return
    if (document.activeElement === inputRef.current) return
    setWsNameEditing(false)
  }, [availability, displayName, wsNameEditing, inputRef, mobileLiveCaret])

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

        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, name')
          .eq('primary_owner_id', user.id)
          .eq('is_personal', true)
          .maybeSingle()

        if (ws?.id) {
          const target = await resolvePostAuthTarget(supabase, user.id, '/dashboard')
          window.location.href = target
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
    if (booting) return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => inputRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [booting, inputRef])

  async function handleCreate() {
    setError('')
    const trimmed = displayName
    if (!trimmed) {
      setError('Bitte gib zuerst deinem Workspace einen Namen.')
      inputRef.current?.focus()
      return
    }
    const check = await checkAvailability(trimmed)
    if (!check.ok) {
      setError(check.reason || 'Dieser Workspace-Name ist bereits vergeben.')
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = await bootstrapPersonalWorkspace(trimmed)
      if (!result.ok) {
        setError(result.message)
        if (result.status === 409) {
          /* availability already reflects taken */
        }
        setSubmitting(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        rememberFestagAccount({
          userId: user.id,
          email: user.email ?? null,
          method: user.app_metadata?.provider === 'google' ? 'google' : 'email',
          onboardingCompleted: false,
          workspaceName: result.workspace.name,
        })
      }

      // Welcome mails + seed-memory fire when hybrid onboarding completes.
      const target = user
        ? await resolvePostAuthTarget(supabase, user.id, '/onboarding')
        : '/onboarding'
      prepareAuthRouteTransition(target)
      setPageExiting(true)
      window.setTimeout(() => {
        window.location.href = target === '/create-workspace' ? '/onboarding' : target
      }, 160)
    } catch {
      setError('Workspace konnte nicht erstellt werden. Bitte versuche es erneut.')
      setSubmitting(false)
    }
  }

  if (booting) {
    return (
      <main
        data-theme={theme}
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
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}`}
      data-theme={theme}
    >
      <style>{AUTH_LANDING_STYLES}</style>

      <div className="al-container">
        <header className="al-header">
          <span
            className="al-wordmark"
            aria-label="festag"
            role="img"
          >
            <span className="al-wordmark-mark" aria-hidden="true" />
          </span>
          <div className="al-header-actions">
            <AuthDocsPopover />
            <button
              type="button"
              className="al-theme-icon al-theme-icon--header"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
                  <section className="al-signin" aria-label="Workspace erstellen">
                    <div className="al-signin-head">
                      <div className="al-hero-copy">
                        <h1 className="al-title al-title-display">Workspace erstellen</h1>
                        {availability === 'available' && displayName && !wsNameEditing && !mobileLiveCaret ? (
                          <AuthWorkspacePath
                            name={displayName}
                            onEdit={startEditingWorkspaceName}
                          />
                        ) : (
                          <AuthExpandableTextField
                            ref={inputRef}
                            lineClassName={`al-ws-name-line${workspaceName ? ' has-value' : ''}`}
                            inputClassName="al-ws-name-input"
                            srLabel="Workspace-Name"
                            type="text"
                            value={workspaceName}
                            onChange={e => updateWorkspaceName(e.target.value)}
                            onInput={e => updateWorkspaceName((e.target as HTMLInputElement).value)}
                            onBlur={handleWorkspaceNameBlur}
                            onKeyDown={e => {
                              if (e.key === 'Enter') void handleCreate()
                            }}
                            onExpandEnter={() => { void handleCreate() }}
                            placeholder=""
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="words"
                            spellCheck={false}
                            maxLength={64}
                            aria-label="Workspace-Name"
                            aria-invalid={availability === 'taken' || availability === 'invalid'}
                            persistIdleCaret={mobileLiveCaret}
                          />
                        )}
                        {availability === 'checking' && displayName ? (
                          <p className="al-ws-status">Wird geprüft…</p>
                        ) : null}
                        {availability === 'available' && displayName && (wsNameEditing || mobileLiveCaret) ? (
                          <p className="al-ws-status al-ws-status--ok">Benutzername verfügbar</p>
                        ) : null}
                        {(availability === 'taken' || availability === 'invalid') && availabilityMsg ? (
                          <p className="al-ws-status al-ws-status--bad">{availabilityMsg}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="al-content">
                      <div className="al-signin-stack">
                        {error ? <p className="al-error">{error}</p> : null}
                        <button
                          className="al-btn al-btn-primary"
                          type="button"
                          onClick={() => void handleCreate()}
                          disabled={submitting || !ready}
                        >
                          {submitting ? 'Wird erstellt…' : 'Weiter'}
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="al-footer-meta">
          <button
            type="button"
            className="al-theme-icon al-theme-icon--footer no-min-tap"
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
          <span className="al-footer-sep al-footer-sep--desktop-only" aria-hidden="true">|</span>
          <div className="al-footer-links">
            <a
              className="al-dev-link al-dev-link--desktop-only"
              href="/dev/login"
              onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}
            >
              Dev Zugang
            </a>
            <span
              className="al-footer-sep al-footer-sep--mode al-mode-switch--desktop-only"
              aria-hidden="true"
            />
            <a
              className="al-dev-link al-mode-switch--desktop-only al-footer-mode-switch"
              href="/register"
              onClick={e => { e.preventDefault(); navigateWithFade('/register') }}
            >
              Zurück zur Registrierung
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}
