'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthSecurityModal from '@/components/auth/AuthSecurityModal'
import AuthWorkspacePath, { truncateWorkspaceLabel } from '@/components/auth/AuthWorkspacePath'
import AuthExpandableTextField from '@/components/auth/AuthExpandableTextField'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { prepareAuthRouteTransition, useAuthTheme, consumePanelEnter } from '@/lib/auth-theme'
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
  const [securityOpen, setSecurityOpen] = useState(false)
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

  const wordmarkBase = displayName
    ? `Workspace ${truncateWorkspaceLabel(displayName).text}`
    : 'Festag'

  function navigateWithFade(href: string) {
    router.prefetch(href)
    try {
      const path = new URL(href, window.location.origin).pathname
      if (isLegalPath(path)) rememberLegalReturn()
    } catch { /* noop */ }
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), 160)
  }

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
          onboardingCompleted: true,
          workspaceName: result.workspace.name,
        })
      }

      // Welcome mails are idempotent — fire once after first workspace.
      try {
        fetch('/api/onboarding/welcome-emails', { method: 'POST', credentials: 'include' })
        fetch('/api/onboarding/seed-memory', { method: 'POST', credentials: 'include' })
      } catch { /* non-fatal */ }

      const target = user
        ? await resolvePostAuthTarget(supabase, user.id, '/dashboard')
        : '/dashboard'
      prepareAuthRouteTransition(target)
      setPageExiting(true)
      window.setTimeout(() => {
        window.location.href = target === '/create-workspace' ? '/dashboard' : target
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
          <a
            key={wordmarkBase}
            className="al-wordmark"
            href="/"
            onClick={e => { e.preventDefault(); navigateWithFade('/') }}
          >
            {wordmarkBase}
          </a>
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
                        <AuthExpandableTextField
                          ref={inputRef}
                          lineClassName={`al-ws-name-line${workspaceName ? ' has-value' : ''}`}
                          inputClassName="al-ws-name-input"
                          srLabel="Workspace-Name"
                          type="text"
                          value={workspaceName}
                          onChange={e => {
                            setError('')
                            setWorkspaceName(e.target.value)
                          }}
                          onInput={e => setWorkspaceName((e.target as HTMLInputElement).value)}
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
                        />
                        {availability === 'checking' && displayName ? (
                          <p className="al-ws-status">Wird geprüft…</p>
                        ) : null}
                        {availability === 'available' && displayName ? (
                          <>
                            <p className="al-ws-status al-ws-status--ok">Verfügbar</p>
                            {displayName.length > 25 ? (
                              <AuthWorkspacePath name={displayName} withSlash />
                            ) : null}
                          </>
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
            className="al-theme-icon al-theme-icon--footer"
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
          <div className="al-footer-links">
            <button
              type="button"
              className="al-ssl-badge"
              aria-label="Sicherheit und Verschlüsselung"
              onClick={() => setSecurityOpen(true)}
            >
              <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
              </svg>
              <span>SSL, End-to-End verschlüsselt</span>
            </button>
          </div>
        </footer>
      </div>

      <AuthSecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </main>
  )
}
