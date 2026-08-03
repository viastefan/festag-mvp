'use client'

/**
 * Phase 2 — Workspace creation as a sequential popup slider.
 * Name → Use case → Creating… → Welcome.
 * First workspace free. No module picker. No €19 on first path.
 */

import { useEffect, useRef, useState } from 'react'
import Modal, { ModalButton } from '@/components/Modal'
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

export default function WorkspaceCreateWizardModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('name')
  const [useCase, setUseCase] = useState<WorkspaceUseCaseId | null>(null)
  const [error, setError] = useState('')
  const [creatingVisible, setCreatingVisible] = useState(0)
  const [checkingOwned, setCheckingOwned] = useState(false)
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
  const title =
    step === 'plan' ? COPY.additionalTitle
    : step === 'name' ? COPY.nameTitle
    : step === 'use' ? COPY.useTitle
    : step === 'creating' ? COPY.creatingTitle
    : `${COPY.welcomePrefix} ${displayName || 'your workspace'}.`
  const subtitle =
    step === 'plan' ? COPY.additionalBody
    : step === 'name' ? COPY.nameSupport
    : step === 'use' ? COPY.useFootnote
    : undefined

  useEffect(() => {
    function onOpen() {
      void openWizard()
    }
    window.addEventListener(OPEN_WORKSPACE_CREATE_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WORKSPACE_CREATE_EVENT, onOpen)
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

  async function openWizard() {
    setError('')
    setUseCase(null)
    setCreatingVisible(0)
    createStarted.current = false
    setCheckingOwned(true)
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
        window.setTimeout(() => inputRef.current?.focus(), 80)
      }
    } catch {
      setStep('name')
    } finally {
      setCheckingOwned(false)
    }
  }

  function closeWizard() {
    if (busy) return
    setOpen(false)
    setError('')
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
        setOpen(false)
        createStarted.current = false
      }, 1400)
    } catch {
      lineTimers.forEach(clearTimeout)
      createStarted.current = false
      setError('Workspace could not be created. Please try again.')
      setStep('use')
    }
  }

  const footer =
    step === 'plan' ? (
      <ModalButton variant="primary" onClick={closeWizard}>
        {COPY.additionalBack}
      </ModalButton>
    ) : step === 'name' ? (
      <ModalButton variant="primary" onClick={() => void goToUse()} disabled={!ready || checkingOwned}>
        {COPY.continue}
      </ModalButton>
    ) : step === 'use' ? (
      <ModalButton
        variant="primary"
        onClick={() => void startCreate()}
        disabled={!useReady}
      >
        {COPY.continue}
      </ModalButton>
    ) : null

  return (
    <Modal
      open={open}
      onClose={closeWizard}
      size="md"
      title={busy && step === 'welcome' ? title : title}
      subtitle={busy && step === 'welcome' ? undefined : subtitle}
      footer={footer}
      noBackdropClose={busy}
      autoFocus={step === 'name'}
      dragHandle
      surfaceClassName={`wc-wizard-modal${busy ? ' wc-wizard-modal--locked' : ''}`}
    >
      <style>{WIZARD_CSS}</style>
      {step === 'plan' ? (
        <p className="wc-modal-note">Your first workspace stays free. This plan unlocks more environments when you need them.</p>
      ) : null}

      {step !== 'plan' ? (
        <div className="wc-slider" data-step={step}>
          <div
            className="wc-slider-track"
            style={{ transform: `translateX(-${slideIndex(step) * 100}%)` }}
          >
            <div className="wc-slide" aria-hidden={step !== 'name'}>
              <label className="wc-field-label" htmlFor="wc-modal-name">
                {COPY.nameLabel}
              </label>
              <div className={`wc-input-row${workspaceName ? ' has-value' : ''}`}>
                <input
                  ref={inputRef}
                  id="wc-modal-name"
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

            <div className="wc-slide wc-slide--status" aria-hidden={step !== 'welcome'}>
              <p className="wc-welcome-note">Your workspace is ready.</p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="wc-error">{error}</p> : null}
    </Modal>
  )
}

const WIZARD_CSS = `
.wc-wizard-modal.wc-wizard-modal--locked .festag-modal-close {
  opacity: 0;
  pointer-events: none;
}

.wc-slider {
  overflow: hidden;
  width: 100%;
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
  padding-bottom: 4px;
}

.wc-slide--status {
  min-height: 120px;
  display: flex;
  align-items: center;
}

.wc-field-label {
  display: block;
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--fp-muted);
}

.wc-input-row {
  position: relative;
  display: flex;
  align-items: center;
}

.wc-input {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--fp-border, rgba(15, 23, 42, 0.12));
  background: transparent;
  color: var(--fp-text);
  padding: 0 40px 0 14px;
  font-size: 16px;
  letter-spacing: -0.01em;
  outline: none;
  font-family: inherit;
}

.wc-input:focus {
  border-color: var(--festag-primary, #5B647D);
}

.wc-badge {
  position: absolute;
  right: 12px;
  font-size: 13px;
  color: var(--fp-muted);
}

.wc-badge--ok { color: var(--fp-text); }
.wc-badge--bad { color: #c45c5c; }

.wc-subdomain {
  display: block;
  margin-top: 10px;
  font-size: 13.5px;
  color: var(--fp-muted);
  opacity: 0.85;
}

.wc-subdomain.is-ready {
  opacity: 1;
}

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
  background: var(--fp-pill, rgba(15, 23, 42, 0.04));
  border: 1px solid var(--fp-border, rgba(15, 23, 42, 0.08));
  color: var(--fp-text);
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
  font-family: inherit;
}

.wc-use-card:hover {
  border-color: color-mix(in srgb, var(--fp-border) 60%, var(--fp-text));
}

.wc-use-card.is-selected {
  border-color: color-mix(in srgb, var(--festag-primary, #5B647D) 55%, var(--fp-border));
  background: color-mix(in srgb, var(--festag-primary, #5B647D) 8%, transparent);
}

.wc-use-card-title {
  font-size: 15.5px;
  font-weight: 500;
  letter-spacing: -0.015em;
}

.wc-use-card-body {
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--fp-muted);
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
  color: var(--fp-muted);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 320ms ease, transform 320ms ease, color 320ms ease;
}

.wc-creating-line.is-on {
  opacity: 1;
  transform: translateY(0);
  color: var(--fp-text);
}

.wc-creating-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fp-text);
  flex-shrink: 0;
}

.wc-welcome-note,
.wc-modal-note {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--fp-muted);
}

.wc-error {
  margin: 12px 0 0;
  font-size: 13.5px;
  color: #c45c5c;
}

@media (max-width: 768px) {
  .wc-use-card { padding: 13px 14px; }
}
`
