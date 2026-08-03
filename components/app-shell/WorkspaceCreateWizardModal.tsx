'use client'

/**
 * Phase 2 — Workspace creation as a sequential popup slider.
 * Onboarding-style header (mark + Docs). Theme follows the signed-in
 * user's settings (light / read / dark) — never forced dusk.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
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
  const [themeMode, setThemeMode] = useState<PanelThemeMode>(() => getTheme('client'))
  const createStarted = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
      const { count } = await supabase
        .from('workspaces')
        .select('id', { count: 'exact', head: true })
        .eq('primary_owner_id', user.id)
      if ((count ?? 0) >= 1) {
        setStep('plan')
      } else {
        setStep('name')
        window.setTimeout(() => inputRef.current?.focus(), 120)
      }
    } catch {
      setStep('name')
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

  const title =
    step === 'plan' ? COPY.additionalTitle
    : step === 'name' ? COPY.nameTitle
    : step === 'use' ? COPY.useTitle
    : step === 'creating' ? COPY.creatingTitle
    : `${COPY.welcomePrefix} ${displayName || 'your workspace'}.`

  const support =
    step === 'plan' ? COPY.additionalBody
    : step === 'name' ? COPY.nameSupport
    : step === 'use' ? COPY.useFootnote
    : step === 'welcome' ? 'Your workspace is ready.'
    : null

  return createPortal(
    <div
      ref={rootRef}
      className={`wc-os${visible ? ' is-visible' : ''}${busy ? ' is-busy' : ''}`}
      data-theme={dataTheme}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wc-os-title"
    >
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
          <div className="wc-os-copy">
            <h1 id="wc-os-title" className="wc-os-title">{title}</h1>
            {support ? <p className="wc-os-support">{support}</p> : null}
          </div>

          {step === 'plan' ? (
            <div className="wc-os-actions">
              <button type="button" className="wc-os-btn is-ready" onClick={closeWizard}>
                {COPY.additionalBack}
              </button>
            </div>
          ) : (
            <div className="wc-slider" data-step={step}>
              <div
                className="wc-slider-track"
                style={{ transform: `translateX(-${slideIndex(step) * 100}%)` }}
              >
                <div className="wc-slide" aria-hidden={step !== 'name'}>
                  <label className="wc-field-label" htmlFor="wc-os-name">
                    {COPY.nameLabel}
                  </label>
                  <div className="wc-input-row">
                    <input
                      ref={inputRef}
                      id="wc-os-name"
                      className="wc-input"
                      type="text"
                      value={workspaceName}
                      onChange={(e) => {
                        setError('')
                        setWorkspaceName(e.target.value)
                      }}
                      placeholder={COPY.namePlaceholder}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="words"
                      spellCheck={false}
                      maxLength={64}
                      aria-invalid={availability === 'taken' || availability === 'invalid'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && ready) {
                          e.preventDefault()
                          void goToUse()
                        }
                      }}
                    />
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
                  {error && step === 'name' ? <p className="wc-error">{error}</p> : null}
                  <div className="wc-os-actions">
                    <button
                      type="button"
                      className={`wc-os-btn${ready && !checkingOwned ? ' is-ready' : ''}`}
                      onClick={() => void goToUse()}
                      disabled={!ready || checkingOwned}
                    >
                      {COPY.continue}
                    </button>
                  </div>
                </div>

                <div className="wc-slide" aria-hidden={step !== 'use'}>
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
                  {error && step === 'use' ? <p className="wc-error">{error}</p> : null}
                  <div className="wc-os-actions">
                    <button
                      type="button"
                      className={`wc-os-btn${useReady ? ' is-ready' : ''}`}
                      onClick={() => void startCreate()}
                      disabled={!useReady}
                    >
                      {COPY.continue}
                    </button>
                  </div>
                </div>

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
  --wc-ink: #1A1917;
  --wc-muted: #8891a0;
  --wc-canvas: #FBF7EE;
  --wc-wash-top: #FCFAF3;
  --wc-wash-bottom: #F3EFE4;
  --wc-card: rgba(255, 255, 255, 0.72);
  --wc-card-on: #FFFFFF;
  --wc-border: rgba(30, 30, 32, 0.08);
  --wc-border-hover: rgba(30, 30, 32, 0.14);
  --wc-input-border: rgba(30, 30, 32, 0.15);
  --wc-input-focus: #5B647D;
  --wc-btn-bg: #ffffff;
  --wc-btn-fg: #1e1e20;
  --wc-btn-border: rgba(30, 30, 32, 0.08);
  --wc-btn-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  --wc-btn-ready-bg: #ffffff;
  --wc-btn-ready-fg: #1e1e20;
  --wc-mark-filter: brightness(0) saturate(100%);
  --wc-mark-opacity: 0.9;
  --wc-gutter: 28px;
  --wc-content-max: 380px;
  --wc-control-h: 46px;
  --wc-radius: 8px;

  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
    linear-gradient(180deg, var(--wc-wash-top) 0%, var(--wc-canvas) 48%, var(--wc-wash-bottom) 100%);
  color: var(--wc-ink);
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
  --wc-ink: rgba(245, 245, 247, 0.96);
  --wc-muted: rgba(245, 245, 247, 0.55);
  --wc-canvas: #0C0D12;
  --wc-wash-top: #10121A;
  --wc-wash-bottom: #0A0B10;
  --wc-card: rgba(186, 194, 210, 0.06);
  --wc-card-on: rgba(186, 194, 210, 0.1);
  --wc-border: rgba(255, 255, 255, 0.06);
  --wc-border-hover: rgba(255, 255, 255, 0.1);
  --wc-input-border: rgba(255, 255, 255, 0.15);
  --wc-input-focus: #5B647D;
  --wc-btn-bg: rgba(186, 194, 210, 0.08);
  --wc-btn-fg: rgba(245, 245, 247, 0.88);
  --wc-btn-border: rgba(255, 255, 255, 0.06);
  --wc-btn-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  --wc-btn-ready-bg: #EBE8E3;
  --wc-btn-ready-fg: #1A1917;
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
  padding: 28px var(--wc-gutter) 40px;
  box-sizing: border-box;
  overflow: hidden;
}

.wc-os-stage {
  width: 100%;
  max-width: var(--wc-content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
}

.wc-os-copy {
  margin-bottom: 28px;
}

.wc-os-title {
  margin: 0;
  font-size: clamp(28px, 4.2vw, 34px);
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.18;
  color: var(--wc-ink);
}

.wc-os-support {
  margin: 14px 0 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--wc-muted);
  max-width: 36ch;
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
  color: var(--wc-muted);
}

.wc-input-row {
  position: relative;
  display: flex;
  align-items: center;
}

.wc-input {
  width: 100%;
  height: var(--wc-control-h);
  border-radius: var(--wc-radius);
  border: 1px solid var(--wc-input-border);
  background: transparent;
  color: var(--wc-ink);
  padding: 0 40px 0 14px;
  font-size: 16px;
  letter-spacing: -0.01em;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

.wc-input::placeholder {
  color: var(--wc-muted);
}

.wc-input:focus {
  border-color: var(--wc-input-focus);
}

.wc-badge {
  position: absolute;
  right: 12px;
  font-size: 13px;
  color: var(--wc-muted);
}

.wc-badge--ok { color: var(--wc-ink); }
.wc-badge--bad { color: #c45c5c; }

.wc-subdomain {
  display: block;
  margin-top: 10px;
  font-size: 13.5px;
  color: var(--wc-muted);
  opacity: 0.85;
}

.wc-subdomain.is-ready { opacity: 1; }

.wc-use-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wc-use-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--wc-card);
  border: 1px solid var(--wc-border);
  color: var(--wc-ink);
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
  font-family: inherit;
}

.wc-use-card:hover {
  border-color: var(--wc-border-hover);
}

.wc-use-card.is-selected {
  background: var(--wc-card-on);
  border-color: var(--wc-border-hover);
}

.wc-use-card-title {
  font-size: 15.5px;
  font-weight: 500;
  letter-spacing: -0.015em;
}

.wc-use-card-body {
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--wc-muted);
}

.wc-creating-lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.wc-creating-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  color: var(--wc-muted);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 320ms ease, transform 320ms ease, color 320ms ease;
}

.wc-creating-line.is-on {
  opacity: 1;
  transform: translateY(0);
  color: var(--wc-ink);
}

.wc-creating-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--wc-ink);
  flex-shrink: 0;
}

.wc-os-actions {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wc-os-btn {
  height: var(--wc-control-h);
  border-radius: 6px;
  border: 1px solid var(--wc-btn-border) !important;
  background: var(--wc-btn-bg) !important;
  color: var(--wc-btn-fg) !important;
  box-shadow: var(--wc-btn-shadow) !important;
  font-size: 15px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  opacity: 0.72;
  transition: background 140ms ease, opacity 140ms ease, box-shadow 140ms ease;
}

.wc-os-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

.wc-os-btn.is-ready:not(:disabled) {
  opacity: 1;
  background: var(--wc-btn-ready-bg) !important;
  color: var(--wc-btn-ready-fg) !important;
}

.wc-os[data-theme="dark"] .wc-os-btn:not(.is-ready):not(:disabled) {
  background: transparent !important;
  color: rgba(228, 228, 234, 0.62) !important;
  border-color: rgba(255, 255, 255, 0.10) !important;
  box-shadow: none !important;
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
    padding: clamp(48px, 12vh, 120px) var(--wc-gutter) 48px;
    max-width: none;
    align-items: center;
  }
  .wc-os-stage {
    margin: 0 auto;
  }
}
`
