'use client'

/**
 * Phase 2 — Workspace creation slider.
 * Onboarding chrome: glassy H1, 46px field, large use-case cards + toggle,
 * Weiter CTA with Enter glyph. Theme follows signed-in settings.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthGlassyHero, { AUTH_GLASSY_HERO_CSS } from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import FestagToggle, { FESTAG_TOGGLE_CSS } from '@/components/ui/FestagToggle'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import {
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
} from '@/lib/pending-workspace'
import { useWorkspaceNameField } from '@/lib/use-workspace-name-field'
import { bootstrapPersonalWorkspace } from '@/lib/workspace-bootstrap-client'
import {
  OPEN_WORKSPACE_CREATE_EVENT,
  emitWorkspaceCreated,
} from '@/lib/workspace-create-open'
import {
  getTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
} from '@/lib/theme'
import {
  WORKSPACE_CREATION_COPY as COPY,
  WORKSPACE_USE_CASES,
  getWorkspaceUseCase,
  workspaceSubdomainPreview,
  type WorkspaceUseCaseId,
} from '@/lib/platform/workspace-creation'

type Step = 'name' | 'use' | 'creating' | 'welcome' | 'plan'

const SLIDE_ORDER: Step[] = ['name', 'use', 'creating', 'welcome']

function slideIndex(step: Step): number {
  if (step === 'plan') return 0
  return Math.max(0, SLIDE_ORDER.indexOf(step))
}

function resolveWizardTheme(mode: PanelThemeMode): 'light' | 'read' | 'dark' {
  if (mode === 'dark') return 'dark'
  if (mode === 'read') return 'read'
  return 'light'
}

export default function WorkspaceCreateWizardModal() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>('name')
  const [useCase, setUseCase] = useState<WorkspaceUseCaseId | null>(null)
  const [error, setError] = useState('')
  const [creatingVisible, setCreatingVisible] = useState(0)
  const [checkingOwned, setCheckingOwned] = useState(false)
  const [fieldFocused, setFieldFocused] = useState(false)
  const [themeMode, setThemeMode] = useState<PanelThemeMode>(() => getTheme('client'))
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
  } = useWorkspaceNameField({ enabled: open && step === 'name' })

  const subdomain = workspaceSubdomainPreview(displayName || workspaceName)
  const useReady = Boolean(useCase)
  const busy = step === 'creating' || step === 'welcome'
  const dataTheme = resolveWizardTheme(themeMode)
  const hasName = Boolean(displayName)

  useEffect(() => {
    function onOpen() {
      void openWizard()
    }
    window.addEventListener(OPEN_WORKSPACE_CREATE_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WORKSPACE_CREATE_EVENT, onOpen)
  }, [])

  useEffect(() => {
    setThemeMode(getTheme('client'))
    const onTheme = (e: Event) => {
      const parsed = parseThemeEventDetail((e as CustomEvent).detail)
      if (!parsed) return
      if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'read') {
        setThemeMode(parsed.mode)
      }
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('create') === '1' || params.get('create-workspace') === '1') {
      void openWizard()
      const url = new URL(window.location.href)
      url.searchParams.delete('create')
      url.searchParams.delete('create-workspace')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const id = requestAnimationFrame(() => setVisible(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) closeWizard()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy])

  async function openWizard() {
    setError('')
    setUseCase(null)
    setCreatingVisible(0)
    createStarted.current = false
    setCheckingOwned(true)
    setThemeMode(getTheme('client'))
    setOpen(true)
    /* Always start on the full create flow — never open on the plan-only screen. */
    setStep('name')

    const seed = getPendingWorkspaceName() || getRememberedWorkspaceName() || ''
    if (seed) hydrate(seed)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?next=/overview?create=1'
        return
      }
      window.setTimeout(() => inputRef.current?.focus(), 120)
    } catch {
      /* stay on name */
    } finally {
      setCheckingOwned(false)
    }
  }

  function closeWizard() {
    if (busy) return
    setVisible(false)
    window.setTimeout(() => {
      setOpen(false)
      setError('')
    }, 220)
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

    /* True second+ workspace only. One owned workspace can still be finished / updated via bootstrap. */
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count } = await supabase
          .from('workspaces')
          .select('id', { count: 'exact', head: true })
          .eq('primary_owner_id', user.id)
        if ((count ?? 0) >= 2) {
          setStep('plan')
          return
        }
      }
    } catch { /* continue to create */ }

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

      const supabase = createClient()
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
      await new Promise((r) => window.setTimeout(r, Math.max(0, 2000 - elapsed)))
      setCreatingVisible(COPY.creatingLines.length)
      setStep('welcome')
      emitWorkspaceCreated(result.workspace.name)

      window.setTimeout(() => {
        setVisible(false)
        window.setTimeout(() => {
          setOpen(false)
          createStarted.current = false
        }, 220)
      }, 1400)
    } catch {
      lineTimers.forEach(clearTimeout)
      createStarted.current = false
      setError('Workspace could not be created. Please try again.')
      setStep('use')
    }
  }

  if (!open || typeof document === 'undefined') return null

  const heroLead =
    step === 'plan' ? COPY.additionalTitle
    : step === 'name' ? COPY.nameTitle
    : step === 'use' ? COPY.useTitle
    : step === 'creating' ? COPY.creatingTitle
    : `${COPY.welcomePrefix} ${displayName || 'your workspace'}.`

  const heroSupport =
    step === 'plan' ? COPY.additionalBody
    : step === 'name' ? COPY.nameSupport
    : step === 'use' ? COPY.useFootnote
    : step === 'welcome' ? 'Your workspace is ready.'
    : null

  return createPortal(
    <div
      className={`wc-os${visible ? ' is-visible' : ''}${busy ? ' is-busy' : ''}`}
      data-theme={dataTheme}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wc-os-title"
    >
      <style>{AUTH_GLASSY_HERO_CSS}</style>
      <style>{FESTAG_TOGGLE_CSS}</style>
      <style>{WIZARD_CSS}</style>

      <header className="wc-os-header">
        <button
          type="button"
          className="wc-os-wordmark"
          aria-label={busy ? 'Festag' : 'Close'}
          onClick={() => {
            if (!busy) closeWizard()
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="wc-os-mark"
            src="/brand/festag-mark-fluid.png?v=20260731"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
          />
        </button>
        <div className="wc-os-header-actions">
          <AuthDocsPopover page="/overview" />
        </div>
      </header>

      <div className="wc-os-body">
        <div className="wc-os-stage">
          <div id="wc-os-title" className="wc-os-hero">
            <AuthGlassyHero
              animKey={`wc-${step}`}
              lead={heroLead}
              className="mob-glassy-h1"
            />
            {heroSupport ? <p className="wc-os-support">{heroSupport}</p> : null}
          </div>

          {step === 'plan' ? (
            <div className="wc-plan">
              <div className="wc-continue-slot">
                <ContinueHint
                  ready
                  label={COPY.additionalBack}
                  onContinue={closeWizard}
                />
              </div>
            </div>
          ) : (
            <div className="wc-slider" data-step={step}>
              <div
                className="wc-slider-track"
                style={{ transform: `translateX(-${slideIndex(step) * 100}%)` }}
              >
                {/* Name */}
                <div className="wc-slide" aria-hidden={step !== 'name'}>
                  <label className="wc-field-label" htmlFor="wc-os-name">
                    {COPY.nameLabel}
                  </label>
                  <div className="wc-field-wrap">
                    <div
                      className={[
                        'wc-field-shell',
                        hasName ? 'has-value' : '',
                        fieldFocused ? 'is-focused' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        ref={inputRef}
                        id="wc-os-name"
                        className={`wc-field-input${hasName ? '' : ' is-empty'}`}
                        type="text"
                        value={workspaceName}
                        onChange={(e) => {
                          setError('')
                          setWorkspaceName(e.target.value)
                        }}
                        onFocus={() => setFieldFocused(true)}
                        onBlur={() => setFieldFocused(false)}
                        placeholder=""
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="words"
                        spellCheck={false}
                        maxLength={64}
                        aria-invalid={availability === 'taken' || availability === 'invalid'}
                        aria-label={`${COPY.nameLabel}, e.g. ${COPY.namePlaceholder}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && ready) {
                            e.preventDefault()
                            void goToUse()
                          }
                        }}
                      />
                      {!hasName ? (
                        <span aria-hidden className="wc-field-example">
                          {COPY.namePlaceholder}
                        </span>
                      ) : null}
                      {!hasName ? <span aria-hidden className="wc-field-caret" /> : null}
                      {availability === 'checking' && displayName ? (
                        <span className="wc-badge">…</span>
                      ) : availability === 'available' && displayName ? (
                        <span className="wc-badge wc-badge--ok" title="Available">✓</span>
                      ) : (availability === 'taken' || availability === 'invalid') && displayName ? (
                        <span className="wc-badge wc-badge--bad" title={availabilityMsg || 'Taken'}>✕</span>
                      ) : null}
                    </div>
                    <span className={`wc-subdomain${displayName ? ' is-ready' : ''}`}>
                      {subdomain}
                    </span>
                  </div>
                  {error && step === 'name' ? <p className="wc-error">{error}</p> : null}
                  <div className="wc-continue-slot">
                    <ContinueHint
                      ready={ready && !checkingOwned}
                      label={COPY.continue}
                      onContinue={() => void goToUse()}
                    />
                  </div>
                </div>

                {/* Use case */}
                <div className="wc-slide" aria-hidden={step !== 'use'}>
                  <div className="wc-ws-list" role="listbox" aria-label={COPY.useTitle}>
                    {WORKSPACE_USE_CASES.map((card, i) => {
                      const on = useCase === card.id
                      return (
                        <div
                          key={card.id}
                          role="option"
                          aria-selected={on}
                          tabIndex={0}
                          className={`wc-ws-card${on ? ' is-on' : ''}`}
                          style={{ ['--i' as string]: i }}
                          onClick={() => {
                            setError('')
                            setUseCase(card.id)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setUseCase(card.id)
                            }
                          }}
                        >
                          <span className="wc-ws-card-copy">
                            <span className="wc-ws-card-title">{card.title}</span>
                            <span className="wc-ws-card-body">{card.description}</span>
                          </span>
                          <FestagToggle
                            on={on}
                            label={`Select ${card.title}`}
                            stopPropagation
                            onChange={() => setUseCase(card.id)}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {error && step === 'use' ? <p className="wc-error">{error}</p> : null}
                  <div className="wc-ws-footer">
                    <div className="wc-continue-slot wc-continue-slot--ws">
                      <ContinueHint
                        ready={useReady}
                        label={COPY.continue}
                        onContinue={() => void startCreate()}
                      />
                    </div>
                  </div>
                </div>

                {/* Creating */}
                <div className="wc-slide wc-slide--status" aria-hidden={step !== 'creating'}>
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

                <div className="wc-slide wc-slide--status" aria-hidden={step !== 'welcome'} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

const WIZARD_CSS = `
.wc-os {
  --mob-ink: #1A1917;
  --mob-muted: #8891a0;
  --mob-primary: #5B647D;
  --mob-caret: #5B647D;
  --mob-stroke-idle: 2px;
  --mob-stroke-focus: 2px;
  --mob-card-bg-on: #FFFFFF;
  --mob-control-h: 46px;
  --mob-field-radius: 8px;
  --auth-tracking: 0.01em;
  --auth-tracking-display: 0.006em;
  --wc-canvas: #FBF7EE;
  --wc-wash-top: #FCFAF3;
  --wc-wash-bottom: #F3EFE4;
  --wc-mark-filter: brightness(0) saturate(100%);
  --wc-mark-opacity: 0.9;
  --wc-gutter: 28px;
  --wc-content-max: 380px;

  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
    linear-gradient(180deg, var(--wc-wash-top) 0%, var(--wc-canvas) 48%, var(--wc-wash-bottom) 100%);
  color: var(--mob-ink);
  font-family: 'Aeonik', system-ui, sans-serif;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.wc-os.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.wc-os[data-theme="read"] {
  --wc-canvas: #F7F4EC;
  --wc-wash-top: #FAF7F0;
  --wc-wash-bottom: #F0EBE0;
}

.wc-os[data-theme="dark"] {
  --mob-ink: rgba(245, 245, 247, 0.96);
  --mob-muted: rgba(245, 245, 247, 0.55);
  --mob-card-bg-on: rgba(186, 194, 210, 0.1);
  --wc-canvas: #0C0D12;
  --wc-wash-top: #10121A;
  --wc-wash-bottom: #0A0B10;
  --wc-mark-filter: none;
  --wc-mark-opacity: 0.92;
  background:
    radial-gradient(ellipse 80% 50% at 30% -10%, rgba(91, 100, 125, 0.16), transparent 55%),
    radial-gradient(ellipse 70% 40% at 90% 110%, rgba(235, 232, 227, 0.04), transparent 50%),
    linear-gradient(180deg, var(--wc-wash-top) 0%, var(--wc-canvas) 45%, var(--wc-wash-bottom) 100%);
}

.wc-os-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(10px, calc(env(safe-area-inset-top, 0px) + 8px)) 16px 10px;
  box-sizing: border-box;
  width: 100%;
}

.wc-os-wordmark {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wc-os-mark {
  display: block;
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: var(--wc-mark-filter);
  opacity: var(--wc-mark-opacity);
}

.wc-os-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wc-os-header-actions .auth-docs-trigger {
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
}

.wc-os-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: calc(var(--wc-content-max) + var(--wc-gutter) * 2);
  margin: 0 auto;
  padding: 20px var(--wc-gutter) 40px;
  box-sizing: border-box;
  overflow: hidden;
}

.wc-os-stage {
  width: 100%;
  max-width: var(--wc-content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Glassy H1 — same metrics as onboarding */
.wc-os .al-glassy-hero.mob-glassy-h1 {
  --al-hero-display-size: 29px;
  --al-hero-display-lh: 36px;
  margin: 0;
  max-width: 100%;
  font-size: 29px !important;
  line-height: 36px !important;
  letter-spacing: var(--auth-tracking-display) !important;
  font-weight: 400 !important;
  font-family: Aeonik, system-ui, sans-serif;
  color: var(--mob-ink);
}
.wc-os .al-glassy-hero.mob-glassy-h1 .al-gword-lead {
  color: var(--mob-ink);
}
.wc-os .al-glassy-hero.mob-glassy-h1 .al-gword-inner.al-hero-gray {
  color: var(--mob-muted);
}
.wc-os .al-glassy-hero--stacked .al-glassy-hero-line {
  display: block;
  line-height: 36px;
  min-height: 36px;
}
.wc-os .al-glassy-hero.mob-glassy-h1 .al-gword {
  height: 36px;
  line-height: 36px;
  vertical-align: top;
  padding: 0;
  margin: 0;
}
.wc-os .al-glassy-hero.mob-glassy-h1 .al-gword-inner {
  height: 36px;
  line-height: 36px;
}

.wc-os-hero {
  margin-bottom: 22px;
}

.wc-os-support {
  margin: 12px 0 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--mob-muted);
  max-width: 36ch;
  letter-spacing: var(--auth-tracking);
}

.wc-plan {
  width: 100%;
}

.wc-slider {
  overflow: hidden;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.wc-slider-track {
  display: flex;
  width: 100%;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.wc-slide {
  flex: 0 0 100%;
  width: 100%;
  min-width: 100%;
  box-sizing: border-box;
}

.wc-slide--status {
  min-height: 140px;
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
}

.wc-field-label {
  display: block;
  margin: 0 0 10px;
  font-size: 13px;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-muted);
}

.wc-field-wrap {
  position: relative;
  width: 100%;
}

.wc-field-shell {
  position: relative;
  display: flex;
  align-items: center;
  min-height: var(--mob-control-h);
  height: var(--mob-control-h);
  padding: 0 40px 0 16px;
  border-radius: var(--mob-field-radius);
  border: var(--mob-stroke-idle) solid rgba(30, 30, 32, 0.15) !important;
  background: transparent;
  box-sizing: border-box;
  transition: border-color .18s ease, border-width .18s ease;
}

.wc-field-shell:hover {
  border-color: rgba(30, 30, 32, 0.20) !important;
}

.wc-field-shell.has-value,
.wc-field-shell.is-focused {
  border-width: var(--mob-stroke-focus) !important;
  border-color: var(--mob-primary) !important;
}

.wc-os[data-theme="dark"] .wc-field-shell {
  border-color: rgba(255, 255, 255, 0.15) !important;
}
.wc-os[data-theme="dark"] .wc-field-shell:hover {
  border-color: rgba(255, 255, 255, 0.20) !important;
}
.wc-os[data-theme="dark"] .wc-field-shell.has-value,
.wc-os[data-theme="dark"] .wc-field-shell.is-focused {
  border-color: var(--mob-primary) !important;
}

.wc-field-input {
  width: 100%;
  height: var(--mob-control-h);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--mob-ink);
  font-size: 17px;
  line-height: 25px;
  font-family: inherit;
  font-weight: 400;
  letter-spacing: var(--auth-tracking);
  outline: none;
  box-sizing: border-box;
  caret-color: var(--mob-caret);
}

.wc-field-input.is-empty { caret-color: transparent; }

.wc-field-example {
  position: absolute;
  left: 16px;
  right: 40px;
  top: 50%;
  transform: translate3d(0, -50%, 0);
  pointer-events: none;
  color: var(--mob-muted);
  font-size: 17px;
  line-height: 25px;
  letter-spacing: var(--auth-tracking);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.88;
}

.wc-field-caret {
  position: absolute;
  left: 16px;
  top: 50%;
  margin-top: -10px;
  width: 1.5px;
  height: 20px;
  background: var(--mob-caret);
  pointer-events: none;
  animation: wcCaretBlink 1.05s steps(1, end) infinite;
}

@keyframes wcCaretBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.wc-badge {
  position: absolute;
  right: 14px;
  font-size: 13px;
  color: var(--mob-muted);
}
.wc-badge--ok { color: var(--mob-ink); }
.wc-badge--bad { color: #c45c5c; }

.wc-subdomain {
  display: block;
  margin-top: 10px;
  font-size: 13.5px;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-muted);
  opacity: 0.85;
}
.wc-subdomain.is-ready { opacity: 1; }

/* Use-case cards — onboarding workspace cards, taller for support line */
.wc-ws-list {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-inline: 3px;
  box-sizing: border-box;
}

.wc-ws-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  min-height: 64px;
  padding: 14px 14px;
  border-radius: 10px;
  border: var(--mob-stroke-idle) solid rgba(30, 30, 32, 0.15) !important;
  background: #FFFFFF;
  box-shadow: none;
  color: var(--mob-ink);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color .18s ease,
    border-width .18s ease,
    background .2s ease,
    opacity .2s ease;
  animation: wcCardIn 0.5s cubic-bezier(.22, 1, .36, 1) both;
  animation-delay: calc(0.1s + var(--i, 0) * 48ms);
  opacity: 0.92;
}

.wc-ws-card:hover:not(.is-on) {
  border-color: rgba(30, 30, 32, 0.20) !important;
  opacity: 1;
}

.wc-ws-card.is-on {
  border-width: var(--mob-stroke-focus) !important;
  border-color: var(--mob-primary) !important;
  background: var(--mob-card-bg-on);
  opacity: 1;
}

.wc-ws-card:focus,
.wc-ws-card:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.wc-os[data-theme="dark"] .wc-ws-card {
  background: rgba(186, 194, 210, 0.06);
  border-color: rgba(255, 255, 255, 0.12) !important;
}
.wc-os[data-theme="dark"] .wc-ws-card:hover:not(.is-on) {
  border-color: rgba(255, 255, 255, 0.18) !important;
}
.wc-os[data-theme="dark"] .wc-ws-card.is-on {
  border-color: var(--mob-primary) !important;
  background: var(--mob-card-bg-on);
}

.wc-ws-card-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.wc-ws-card-title {
  font-size: 15px;
  line-height: 1.25;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-ink);
}

.wc-ws-card-body {
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-muted);
}

.wc-os .ft-toggle,
.wc-os button.ft-toggle,
.wc-os .wc-ws-card .ft-toggle {
  border-radius: 9999px !important;
  overflow: hidden !important;
}

@keyframes wcCardIn {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translate3d(0, 10px, 0) scale(0.985);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translate3d(0, 0, 0) scale(1);
  }
}

.wc-ws-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 4px;
}

.wc-continue-slot {
  min-height: var(--mob-control-h);
  margin-top: 28px;
  width: 100%;
}

.wc-continue-slot--ws {
  margin-top: 16px;
}

/* ContinueHint — same as onboarding Weiter */
.wc-os .mob-continue-btn {
  width: 100%;
  height: var(--mob-control-h);
  margin: 0;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 8px;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: #ffffff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 400;
  letter-spacing: var(--auth-tracking);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.wc-os .mob-continue-btn.is-idle,
.wc-os .mob-continue-btn.is-idle:disabled {
  background: transparent !important;
  color: var(--mob-muted) !important;
  border: 1px solid rgba(30, 30, 32, 0.04) !important;
  box-shadow: none !important;
  cursor: default;
  opacity: 1;
}

.wc-os .mob-continue-btn.is-idle .mob-enter-ico {
  color: var(--mob-muted);
  opacity: 0.45;
}

.wc-os .mob-continue-btn.is-ready {
  background: #ffffff;
  color: #1e1e20;
  border: 1px solid rgba(30, 30, 32, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.wc-os .mob-continue-btn.is-ready:hover:not(:disabled) {
  background: #fafafa;
}

.wc-os .mob-continue-btn.is-ready:active:not(:disabled) {
  background: #f5f5f6;
  box-shadow: none !important;
}

.wc-os .mob-continue-btn-label {
  flex: 1;
  text-align: left;
}

.wc-os .mob-enter-ico {
  display: inline-flex;
  flex-shrink: 0;
  color: #1e1e20;
  opacity: 0.72;
}

.wc-os[data-theme="dark"] .mob-continue-btn.is-idle,
.wc-os[data-theme="dark"] .mob-continue-btn.is-idle:disabled {
  background: transparent !important;
  color: rgba(228, 228, 234, 0.62) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  box-shadow: none !important;
}

.wc-os[data-theme="dark"] .mob-continue-btn.is-ready {
  background: #EBE8E3 !important;
  color: #1A1917 !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
}

.wc-os[data-theme="dark"] .mob-continue-btn.is-ready:hover:not(:disabled) {
  background: #DDD9D2 !important;
}

.wc-os[data-theme="dark"] .mob-continue-btn.is-ready .mob-enter-ico {
  color: #1A1917;
  opacity: 0.72;
}

.wc-creating-lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.wc-creating-line {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 10px;
  border: var(--mob-stroke-idle) solid rgba(30, 30, 32, 0.08);
  font-size: 15px;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-muted);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 320ms ease, transform 320ms ease, color 320ms ease, border-color 320ms ease;
}

.wc-os[data-theme="dark"] .wc-creating-line {
  border-color: rgba(255, 255, 255, 0.06);
}

.wc-creating-line.is-on {
  opacity: 1;
  transform: translateY(0);
  color: var(--mob-ink);
  border-color: var(--mob-primary);
}

.wc-creating-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mob-ink);
  flex-shrink: 0;
}

.wc-error {
  margin: 12px 0 0;
  font-size: 13.5px;
  color: #c45c5c;
}

@media (min-width: 769px) {
  .wc-os {
    --wc-gutter: 48px;
  }
  .wc-os-header {
    padding: 24px 32px 12px;
  }
  .wc-os-wordmark {
    width: 42px;
    height: 42px;
  }
  .wc-os-mark {
    width: 38px;
    height: 38px;
  }
  .wc-os-body {
    padding: clamp(40px, 10vh, 100px) var(--wc-gutter) 48px;
    max-width: none;
    align-items: center;
  }
  .wc-os .al-glassy-hero.mob-glassy-h1 {
    font-size: 32px !important;
    line-height: 40px !important;
    --al-hero-display-size: 32px;
    --al-hero-display-lh: 40px;
  }
  .wc-os .al-glassy-hero--stacked .al-glassy-hero-line,
  .wc-os .al-glassy-hero.mob-glassy-h1 .al-gword,
  .wc-os .al-glassy-hero.mob-glassy-h1 .al-gword-inner {
    height: 40px;
    line-height: 40px;
    min-height: 40px;
  }
}
`
