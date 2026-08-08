'use client'

/**
 * Phase 2 — Workspace creation popup with horizontal slides.
 * Name → Nutzung → Creating… → Ready.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AuthGlassyHero, { AUTH_GLASSY_HERO_CSS } from '@/components/auth/AuthGlassyHero'
import { useFestagOutsideClickHint, isPointerOverOverlay } from '@/hooks/useFestagOutsideClickHint'
import UsernameCheckBadge from '@/components/auth/UsernameCheckBadge'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import FestagToggle, { FESTAG_TOGGLE_CSS } from '@/components/ui/FestagToggle'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import { useWorkspaceNameField } from '@/lib/use-workspace-name-field'
import { bootstrapPersonalWorkspace } from '@/lib/workspace-bootstrap-client'
import {
  OPEN_WORKSPACE_CREATE_EVENT,
  emitWorkspaceCreated,
  emitWorkspaceSetupDone,
} from '@/lib/workspace-create-open'
import { openNewProject } from '@/lib/new-project-open'
import {
  getTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
} from '@/lib/theme'
import {
  AUTH_STROKE,
  AUTH_STROKE_IDLE,
  AUTH_STROKE_IDLE_HOVER,
  AUTH_STROKE_WIDTH_FOCUS,
  AUTH_STROKE_WIDTH_IDLE,
} from '@/components/auth/auth-chrome-tokens'
import {
  WORKSPACE_CREATION_COPY as COPY,
  WORKSPACE_USE_CASES,
  getWorkspaceUseCase,
  workspaceDomainFromSlug,
  type WorkspaceUseCaseId,
} from '@/lib/platform/workspace-creation'

const DOMAIN_PLACEHOLDER_SLUG = 'dein-workspace'

/** Soft crossfade when use-case H1 text changes — morph, no remount flash. */
function MorphingUseHero({
  lead,
  rest,
  active,
}: {
  lead: string
  rest: string
  active: boolean
}) {
  const [shown, setShown] = useState({ lead, rest })
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const shownRef = useRef(shown)
  const timer = useRef<number | null>(null)
  shownRef.current = shown

  useEffect(() => {
    if (shownRef.current.lead === lead && shownRef.current.rest === rest) return
    if (timer.current) window.clearTimeout(timer.current)
    setPhase('out')
    timer.current = window.setTimeout(() => {
      setShown({ lead, rest })
      setPhase('in')
      timer.current = window.setTimeout(() => {
        setPhase('idle')
        timer.current = null
      }, 300)
    }, 170)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [lead, rest])

  const isDefault = shown.lead === COPY.useSlideTitle
  const instant = !active || phase !== 'idle' || !isDefault

  return (
    <div
      className={[
        'wc-hero-morph',
        phase === 'out' ? 'is-out' : '',
        phase === 'in' ? 'is-in' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AuthGlassyHero
        animKey={active ? 'wc-use-on' : 'wc-use-off'}
        lead={shown.lead}
        rest={shown.rest}
        stacked
        className="mob-glassy-h1"
        instant={instant}
      />
    </div>
  )
}

/** Domain preview — placeholder slug morphs glassy into confirmed name. */
function DomainPreview({
  slug,
  ready,
  label,
  hint,
}: {
  slug: string
  ready: boolean
  label: string
  hint: string
}) {
  const [liveSlug, setLiveSlug] = useState<string | null>(null)

  useEffect(() => {
    if (ready && slug) {
      setLiveSlug(slug)
      return
    }
    if (!slug) setLiveSlug(null)
  }, [ready, slug])

  const displaySlug = liveSlug || DOMAIN_PLACEHOLDER_SLUG

  return (
    <div className={`wc-domain${liveSlug ? ' is-ready' : ''}`}>
      <span className="wc-domain-label">{label}</span>
      <span className="wc-subdomain" aria-live="polite">
        <span
          key={displaySlug}
          className={`wc-subdomain-slug${liveSlug ? ' is-live' : ''}`}
        >
          {displaySlug}
        </span>
        <span className="wc-subdomain-host">.festag.app</span>
      </span>
      <p className="wc-domain-hint">{hint}</p>
    </div>
  )
}

type Step = 'name' | 'use' | 'creating' | 'welcome'

const SLIDE_ORDER: Step[] = ['name', 'use', 'creating', 'welcome']

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
  const [workspaceId, setWorkspaceId] = useState('')
  const [createdSlug, setCreatedSlug] = useState('')
  const createStarted = useRef(false)
  const slideRefs = useRef<Partial<Record<Step, HTMLElement | null>>>({})
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)

  const {
    workspaceName,
    displayName,
    availability,
    availabilityMsg,
    confirmedSlug,
    ready,
    inputRef,
    setWorkspaceName,
    checkAvailability,
  } = useWorkspaceNameField({ enabled: open && (step === 'name' || step === 'use') })

  const domainReady = availability === 'available' && Boolean(confirmedSlug)
  const nameReady = ready && !checkingOwned
  const useReady = Boolean(useCase)
  const canCreate = nameReady && useReady
  const busy = step === 'creating' || step === 'welcome'
  const { showHint, onOverlayPointer, reset: resetOutsideHint } =
    useFestagOutsideClickHint(open && !busy, 1)
  const dataTheme = resolveWizardTheme(themeMode)
  const hasName = Boolean(displayName)
  const slideIndex = Math.max(0, SLIDE_ORDER.indexOf(step))
  const selectedUseCase = getWorkspaceUseCase(useCase)
  const useHeroLead = selectedUseCase?.title ?? COPY.useSlideTitle
  const useHeroRest = selectedUseCase?.description ?? COPY.useSlideRest
  const welcomeDomain = workspaceDomainFromSlug(createdSlug || confirmedSlug)
  const welcomeRest = displayName ? `${COPY.welcomeDomainLead} ${welcomeDomain}` : undefined

  function goUseSlide() {
    setError('')
    if (!nameReady) {
      setError('Bitte gib deinem Workspace einen Namen.')
      inputRef.current?.focus()
      return
    }
    setStep('use')
  }

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
    if (open) resetOutsideHint()
  }, [open, resetOutsideHint])

  useEffect(() => {
    if (!open) {
      setViewportHeight(undefined)
      return
    }
    const el = slideRefs.current[step]
    if (!el) return
    const measure = () => setViewportHeight(el.scrollHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, step, useCase, workspaceName, availability, confirmedSlug, createdSlug, creatingVisible, displayName])

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
      if (e.key !== 'Escape' || busy) return
      if (step === 'use') {
        setStep('name')
        setError('')
        return
      }
      closeWizard()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, step])

  async function openWizard() {
    setError('')
    setUseCase(null)
    setCreatingVisible(0)
    createStarted.current = false
    setWorkspaceId('')
    setCreatedSlug('')
    setCheckingOwned(true)
    setThemeMode(getTheme('client'))
    setOpen(true)
    setStep('name')
    setWorkspaceName('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?next=/overview?create=1'
        return
      }
      window.setTimeout(() => inputRef.current?.focus(), 120)
      window.setTimeout(() => inputRef.current?.focus(), 280)
    } catch {
      /* stay on form */
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

  async function startCreate() {
    if (createStarted.current) return
    setError('')
    const trimmed = displayName
    if (!trimmed) {
      setError('Bitte gib deinem Workspace einen Namen.')
      inputRef.current?.focus()
      return
    }
    const check = await checkAvailability(trimmed)
    if (!check.ok) {
      setError(check.reason || 'Dieser Workspace-Name ist bereits vergeben.')
      inputRef.current?.focus()
      return
    }
    if (!useCase) {
      setError('Bitte wähle, wofür du den Workspace nutzt.')
      return
    }
    const selected = getWorkspaceUseCase(useCase)
    if (!selected) return

    let createAdditional = false
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count } = await supabase
          .from('workspaces')
          .select('id', { count: 'exact', head: true })
          .eq('primary_owner_id', user.id)
        if ((count ?? 0) >= 2) {
          setError(`${COPY.additionalTitle} ${COPY.additionalBody}`)
          return
        }
        createAdditional = (count ?? 0) >= 1
      }
    } catch { /* continue to create */ }

    createStarted.current = true
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
        additional: createAdditional,
      })
      if (!result.ok) {
        lineTimers.forEach(clearTimeout)
        createStarted.current = false
        setError(result.message)
        setStep('name')
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
      setWorkspaceId(result.workspace.id)
      setCreatedSlug(result.workspace.slug || confirmedSlug)
      setStep('welcome')
      emitWorkspaceCreated({
        name: result.workspace.name,
        id: result.workspace.id,
      })

      /* Short success, then Create Project (Phase 2b — not a wizard slide). */
      window.setTimeout(() => {
        createStarted.current = false
        finishSetup()
      }, 1400)
    } catch {
      lineTimers.forEach(clearTimeout)
      createStarted.current = false
      setError('Workspace konnte nicht erstellt werden. Bitte erneut versuchen.')
      setStep('name')
    }
  }

  function finishSetup() {
    emitWorkspaceSetupDone({
      workspaceId: workspaceId || undefined,
      name: displayName || undefined,
    })
    setVisible(false)
    window.setTimeout(() => {
      setOpen(false)
      createStarted.current = false
      window.setTimeout(() => openNewProject(), 260)
    }, 220)
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`wc-os${visible ? ' is-visible' : ''}${busy ? ' is-busy' : ''}`}
      data-theme={dataTheme}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wc-os-title"
      onPointerMove={(e) => {
        onOverlayPointer(isPointerOverOverlay(e, '.wc-os-panel'))
      }}
      onPointerLeave={() => onOverlayPointer(false)}
    >
      <style>{AUTH_GLASSY_HERO_CSS}</style>
      <style>{FESTAG_TOGGLE_CSS}</style>
      <style>{WIZARD_CSS}</style>

      <button
        type="button"
        className="wc-os-backdrop"
        aria-label="Schließen"
        disabled={busy}
        onClick={() => {
          if (!busy) closeWizard()
        }}
      />

      {showHint && !busy ? (
        <p className="festag-modal-outside-hint" aria-hidden="true">
          Durch Klicken schließen.
        </p>
      ) : null}

      <div className="wc-os-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="wc-os-grip" aria-hidden="true">
          <span className="wc-os-grip-bar" />
        </div>
        <header className="wc-os-header">
          <button
            type="button"
            className="wc-os-wordmark"
            aria-label="Festag"
            tabIndex={-1}
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
        </header>

        <div
          className="wc-os-viewport"
          style={viewportHeight ? { height: viewportHeight } : undefined}
        >
          <div
            className="wc-os-track"
            style={{ transform: `translate3d(-${slideIndex * 100}%, 0, 0)` }}
          >
            {/* Slide: Name */}
            <section
              ref={(el) => { slideRefs.current.name = el }}
              className="wc-os-slide wc-os-slide--name"
              aria-hidden={step !== 'name'}
            >
              <div className="wc-os-stage">
                <div id="wc-os-title" className="wc-os-hero">
                  <AuthGlassyHero
                    animKey="wc-name"
                    lead={COPY.nameTitle}
                    rest={COPY.nameTitleRest}
                    className="mob-glassy-h1"
                    instant={step !== 'name'}
                  />
                </div>
                <div className="wc-form">
                  <div className="wc-form-body">
                    <div className="wc-field-wrap">
                      <div className={`al-input-shell${hasName ? ' has-value' : ''}`}>
                        {!hasName ? (
                          <span className="al-input-fake-ph" aria-hidden="true">
                            {COPY.namePlaceholder}
                          </span>
                        ) : null}
                        <input
                          ref={inputRef}
                          id="wc-os-name"
                          className="al-input"
                          type="text"
                          value={workspaceName}
                          onChange={(e) => {
                            setError('')
                            setWorkspaceName(e.target.value)
                          }}
                          placeholder=""
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="words"
                          spellCheck={false}
                          maxLength={64}
                          aria-invalid={availability === 'taken' || availability === 'invalid'}
                          aria-label={COPY.namePlaceholder}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && nameReady) {
                              e.preventDefault()
                              goUseSlide()
                            }
                          }}
                        />
                        {availability === 'checking' && displayName ? (
                          <UsernameCheckBadge status="checking" title="Wird geprüft…" />
                        ) : availability === 'available' && displayName ? (
                          <UsernameCheckBadge status="available" title="Verfügbar" />
                        ) : (availability === 'taken' || availability === 'invalid') && displayName ? (
                          <UsernameCheckBadge status="taken" title={availabilityMsg || 'Vergeben'} />
                        ) : null}
                      </div>
                      <DomainPreview
                        slug={confirmedSlug}
                        ready={domainReady}
                        label={COPY.domainLabel}
                        hint={COPY.domainHint}
                      />
                    </div>
                    {error && step === 'name' ? <p className="wc-error">{error}</p> : null}
                  </div>
                  <div className="wc-continue-slot">
                    <ContinueHint
                      ready={nameReady}
                      label={COPY.continue}
                      onContinue={goUseSlide}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Slide: Use */}
            <section
              ref={(el) => { slideRefs.current.use = el }}
              className="wc-os-slide wc-os-slide--use"
              aria-hidden={step !== 'use'}
            >
              <div className="wc-os-stage">
                <div className="wc-os-hero">
                  <MorphingUseHero
                    lead={useHeroLead}
                    rest={useHeroRest}
                    active={step === 'use'}
                  />
                </div>
                <div className="wc-form">
                  <div className="wc-form-body">
                    <div className="wc-ws-list" role="listbox" aria-label={COPY.useTitle}>
                      {WORKSPACE_USE_CASES.map((card, i) => {
                        const on = useCase === card.id
                        return (
                          <div
                            key={card.id}
                            role="option"
                            aria-selected={on}
                            aria-label={`${card.title}. ${card.description}`}
                            tabIndex={0}
                            className={`wc-ws-row${on ? ' is-on' : ''}`}
                            style={{ ['--i' as string]: i }}
                            onClick={() => {
                              setError('')
                              setUseCase(card.id)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setError('')
                                setUseCase(card.id)
                              }
                            }}
                          >
                            <span className="wc-ws-card-title">{card.title}</span>
                            <FestagToggle
                              on={on}
                              label={`${card.title} auswählen`}
                              stopPropagation
                              onChange={() => {
                                setError('')
                                setUseCase(card.id)
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                    {error && step === 'use' ? <p className="wc-error">{error}</p> : null}
                  </div>
                  <div className="wc-continue-slot">
                    <ContinueHint
                      ready={canCreate}
                      label={COPY.continue}
                      onContinue={() => void startCreate()}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Slide: Creating */}
            <section
              ref={(el) => { slideRefs.current.creating = el }}
              className="wc-os-slide wc-os-slide--creating"
              aria-hidden={step !== 'creating'}
            >
              <div className="wc-os-stage">
                <div className="wc-os-hero">
                  <AuthGlassyHero
                    animKey="wc-creating"
                    lead={COPY.creatingTitle}
                    className="mob-glassy-h1"
                    instant={step !== 'creating'}
                  />
                </div>
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
            </section>

            {/* Slide: Welcome */}
            <section
              ref={(el) => { slideRefs.current.welcome = el }}
              className="wc-os-slide wc-os-slide--welcome"
              aria-hidden={step !== 'welcome'}
            >
              <div className="wc-os-stage">
                <div className="wc-os-hero">
                  <AuthGlassyHero
                    animKey="wc-welcome"
                    lead={COPY.welcomeReady}
                    rest={welcomeRest}
                    stacked
                    className="mob-glassy-h1"
                    instant={step !== 'welcome'}
                  />
                </div>
              </div>
            </section>
          </div>
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
  --mob-control-h: 46px;
  --mob-field-radius: 8px;
  --auth-tracking: 0.01em;
  --auth-tracking-display: 0.006em;
  --wc-canvas: #FBF7EE;
  --wc-panel: #FFFEFB;
  --wc-wash-top: #FCFAF3;
  --wc-wash-bottom: #F3EFE4;
  --wc-mark-filter: brightness(0) saturate(100%);
  --wc-mark-opacity: 0.9;
  /* Shared slide stack — same padding + hero rhythm on every slide */
  --wc-pad-x: 44px;
  --wc-pad-top: 16px;
  --wc-pad-bottom: 24px;
  --wc-stack-gap: 22px;
  --wc-hero-lh: 34px;
  --wc-hero-lines: 2;
  --wc-hero-stack-h: calc(var(--wc-hero-lines) * var(--wc-hero-lh));
  --wc-gutter: var(--wc-pad-x);
  --wc-content-max: 100%;
  --wc-panel-radius: 14px;
  --wc-panel-w: 520px;
  /* Login email field tokens — identical to auth chrome */
  --festag-input-height: 46px;
  --festag-input-font-size: 15px;
  --festag-input-radius: 8px;
  --festag-input-border: ${AUTH_STROKE_IDLE};
  --festag-input-border-hover: ${AUTH_STROKE_IDLE_HOVER};
  --festag-input-border-width: ${AUTH_STROKE_WIDTH_IDLE};
  --festag-input-border-filled: ${AUTH_STROKE_IDLE};
  --festag-input-border-width-filled: ${AUTH_STROKE_WIDTH_IDLE};
  --festag-input-border-focus: ${AUTH_STROKE};
  --festag-input-border-width-focus: ${AUTH_STROKE_WIDTH_FOCUS};
  --festag-input-fill: transparent;
  --festag-input-fill-focus: transparent;
  --festag-input-caret: ${AUTH_STROKE};
  --festag-input-placeholder: #8891a0;

  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(24px, env(safe-area-inset-top, 0px)) 24px max(24px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  color: var(--mob-ink);
  font-family: 'Aeonik', system-ui, sans-serif;
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
}

.wc-os.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.wc-os-backdrop {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--modal-backdrop, rgba(15, 18, 24, 0.42));
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wc-os.is-busy .wc-os-backdrop {
  cursor: default;
}

.wc-os-panel {
  position: relative;
  z-index: 1;
  width: min(100%, var(--wc-panel-w));
  height: auto;
  max-height: min(88dvh, 760px);
  display: flex;
  flex-direction: column;
  border-radius: var(--wc-panel-radius);
  border: 1px solid rgba(30, 30, 32, 0.08);
  background:
    radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
    linear-gradient(180deg, var(--wc-wash-top) 0%, var(--wc-panel) 48%, var(--wc-wash-bottom) 100%);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.14), 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transform: translateY(14px) scale(0.985);
  filter: blur(8px);
  opacity: 0;
  transition:
    opacity 280ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wc-os.is-visible .wc-os-panel {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

.wc-os[data-theme="read"] {
  --wc-canvas: #F7F4EC;
  --wc-panel: #FAF7F0;
  --wc-wash-top: #FAF7F0;
  --wc-wash-bottom: #F0EBE0;
}

.wc-os[data-theme="dark"] {
  --mob-ink: rgba(245, 245, 247, 0.96);
  --mob-muted: rgba(245, 245, 247, 0.55);
  --mob-card-bg-on: rgba(186, 194, 210, 0.1);
  --wc-canvas: #0C0D12;
  --wc-panel: #12141C;
  --wc-wash-top: #151822;
  --wc-wash-bottom: #0E1016;
  --wc-mark-filter: none;
  --wc-mark-opacity: 0.92;
  --festag-input-placeholder: rgba(245, 245, 247, 0.45);
}

.wc-os[data-theme="dark"] .wc-os-backdrop {
  background: var(--modal-backdrop, rgba(7, 7, 8, 0.72));
}

.wc-os[data-theme="dark"] .wc-os-panel {
  border-color: rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(ellipse 80% 50% at 30% -10%, rgba(91, 100, 125, 0.16), transparent 55%),
    linear-gradient(180deg, var(--wc-wash-top) 0%, var(--wc-panel) 45%, var(--wc-wash-bottom) 100%);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.wc-os-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 20px var(--wc-pad-x) 6px;
  box-sizing: border-box;
  width: 100%;
}

.wc-os-wordmark {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: default;
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
  gap: 4px;
  margin-left: auto;
}

.wc-os-close {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--mob-muted);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.14s ease, color 0.14s ease;
}

.wc-os-close:hover:not(:disabled) {
  background: rgba(30, 30, 32, 0.06);
  color: var(--mob-ink);
}

.wc-os-close:disabled {
  opacity: 0.4;
  cursor: default;
}

.wc-os[data-theme="dark"] .wc-os-close:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}

.wc-os-viewport {
  flex: 0 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.wc-os-track {
  display: flex;
  align-items: flex-start;
  width: 100%;
  /* Viewport height follows the active slide — no dead air on shorter steps */
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.wc-os-slide {
  flex: 0 0 100%;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: var(--wc-pad-top) var(--wc-pad-x) var(--wc-pad-bottom);
  overflow-x: hidden;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wc-os-stage {
  width: 100%;
  max-width: var(--wc-content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  box-sizing: border-box;
}

.wc-os-slide--name .wc-form,
.wc-os-slide--use .wc-form {
  flex: 1 1 auto;
  min-height: 0;
}

/* Glassy H1 — locked line metrics for every slide */
.wc-os .al-glassy-hero.mob-glassy-h1 {
  --al-hero-display-size: 28px;
  --al-hero-display-lh: var(--wc-hero-lh);
  margin: 0;
  max-width: 100%;
  width: 100%;
  text-align: left;
  font-size: 28px !important;
  line-height: var(--wc-hero-lh) !important;
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
  line-height: var(--wc-hero-lh);
  min-height: var(--wc-hero-lh);
}
.wc-os .al-glassy-hero.mob-glassy-h1 .al-gword {
  height: var(--wc-hero-lh);
  line-height: var(--wc-hero-lh);
  vertical-align: top;
  padding: 0;
  margin: 0;
}
.wc-os .al-glassy-hero.mob-glassy-h1 .al-gword-inner {
  height: var(--wc-hero-lh);
  line-height: var(--wc-hero-lh);
}

.wc-os-hero {
  flex-shrink: 0;
  min-height: var(--wc-hero-stack-h);
  margin: 0 0 var(--wc-stack-gap);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  text-align: left;
  width: 100%;
}

.wc-hero-morph {
  width: 100%;
  text-align: left;
  transition:
    opacity 170ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 170ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 170ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, filter, transform;
}
.wc-hero-morph.is-out {
  opacity: 0;
  filter: blur(8px);
  transform: translate3d(0, 4px, 0);
}
.wc-hero-morph.is-in {
  animation: wcHeroMorphIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes wcHeroMorphIn {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translate3d(0, 6px, 0);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translate3d(0, 0, 0);
  }
}

.wc-field-wrap {
  position: relative;
  width: 100%;
  margin-bottom: 0;
}

/* Exact Login email field — same shell / input / fake placeholder */
.wc-os .al-input-shell {
  position: relative;
  width: 100%;
  display: block;
  font-size: var(--festag-input-font-size, 15px);
  overflow: visible;
  box-sizing: border-box;
}
.wc-os .al-input-fake-ph {
  position: absolute;
  left: 14px;
  right: 44px;
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
  padding: 0;
  border: 0;
  pointer-events: none;
  z-index: 1;
  font-family: inherit;
  font-size: var(--festag-input-font-size, 15px);
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.25;
  text-align: left;
  color: var(--festag-input-placeholder, #8891a0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wc-os .al-input-shell.has-value .al-input-fake-ph {
  display: none;
}
.wc-os .al-input {
  position: relative;
  z-index: 2;
  width: 100%;
  height: var(--festag-input-height, 46px);
  min-height: var(--festag-input-height, 46px);
  max-height: var(--festag-input-height, 46px);
  border-radius: var(--festag-input-radius, 8px);
  border: var(--festag-input-border-width, 1.5px) solid var(--festag-input-border, transparent) !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  color: var(--mob-ink);
  -webkit-text-fill-color: var(--mob-ink);
  font-family: inherit;
  font-size: var(--festag-input-font-size, 15px);
  font-weight: 400;
  font-synthesis: none;
  letter-spacing: 0;
  line-height: 1.25;
  padding: 0 44px 0 14px;
  text-align: left;
  text-indent: 0;
  outline: none !important;
  outline-offset: 0 !important;
  caret-color: var(--festag-input-caret, #5B647D);
  box-shadow: none !important;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color .18s ease;
  box-sizing: border-box !important;
}
.wc-os .al-input:hover,
.wc-os .al-input:active {
  background: transparent !important;
  border-color: var(--festag-input-border-hover, transparent) !important;
  box-shadow: none !important;
}
.wc-os .al-input-shell.has-value .al-input {
  border-color: var(--festag-input-border-filled, transparent) !important;
}
.wc-os .al-input:focus,
.wc-os .al-input:focus-visible,
.wc-os .al-input-shell.has-value .al-input:focus,
.wc-os .al-input-shell.has-value .al-input:focus-visible {
  background: transparent !important;
  border-color: var(--festag-input-border-focus, #5B647D) !important;
  outline: none !important;
  box-shadow: none !important;
}
.wc-os .al-input-shell .uc-badge {
  z-index: 3;
}

.wc-badge {
  position: absolute;
  right: 14px;
  font-size: 13px;
  color: var(--mob-muted);
}
.wc-badge--ok { color: #2E9B52; }
.wc-badge--bad { color: #A65B56; }

/* Soft green check — match auth UsernameCheckBadge inside the wizard */
.wc-os .uc-badge--available {
  background: rgba(46, 155, 82, 0.10);
  color: #2E9B52;
}
.wc-os[data-theme="dark"] .uc-badge--available {
  background: rgba(46, 155, 82, 0.14);
  color: #3dba66;
}
.wc-os[data-theme="dark"] .uc-badge--taken {
  color: #D86060;
  box-shadow: inset 0 0 0 1px rgba(216, 96, 96, 0.32);
}

.wc-domain {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wc-domain-label {
  font-size: 12px;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-muted);
  opacity: 0.88;
}
.wc-subdomain {
  display: block;
  font-size: 15px;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: var(--mob-ink);
  opacity: 0.55;
  font-variant-ligatures: none;
  word-break: break-all;
  transition: color 0.22s ease, opacity 0.22s ease;
}
.wc-subdomain-slug {
  display: inline-block;
  vertical-align: baseline;
}
.wc-subdomain-slug.is-live {
  animation: wcSlugGlassy 0.62s cubic-bezier(0.16, 1, 0.3, 1) both;
  color: var(--mob-primary);
  opacity: 1;
}
.wc-subdomain-host {
  opacity: inherit;
}
.wc-domain.is-ready .wc-subdomain {
  opacity: 0.92;
  color: var(--mob-ink);
}
.wc-domain.is-ready .wc-subdomain-host {
  opacity: 0.55;
  color: var(--mob-ink);
}
@keyframes wcSlugGlassy {
  from {
    opacity: 0;
    filter: blur(10px);
    transform: translate3d(0, 10px, 0);
  }
  55% {
    filter: blur(2.5px);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translate3d(0, 0, 0);
  }
}
.wc-domain-hint {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.45;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-muted);
}

/* Quellen-style toggle rows (ConnectStage) */
.wc-ws-list {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}

.wc-ws-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  height: var(--mob-control-h);
  min-height: var(--mob-control-h);
  max-height: var(--mob-control-h);
  padding: 0 12px;
  border-radius: 4px;
  border: 1.5px solid rgba(30, 30, 32, 0.15) !important;
  background: #FFFFFF;
  color: var(--mob-ink);
  cursor: pointer;
  box-sizing: border-box;
  box-shadow: none;
  transition:
    border-color 0.18s ease,
    border-width 0.18s ease,
    background 0.22s ease,
    opacity 0.22s ease;
  animation: wcCardIn 0.5s cubic-bezier(.22, 1, .36, 1) both;
  animation-delay: calc(0.08s + var(--i, 0) * 55ms);
}

.wc-ws-row:hover:not(.is-on) {
  border-color: rgba(30, 30, 32, 0.20) !important;
  background: #FFFFFF;
}

.wc-ws-row.is-on {
  border-width: 1.5px !important;
  border-color: var(--mob-primary) !important;
  background: #FFFFFF;
  box-shadow: none !important;
}

.wc-ws-row:focus,
.wc-ws-row:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.wc-os[data-theme="dark"] .wc-ws-row {
  background: rgba(186, 194, 210, 0.06);
  border-color: rgba(255, 255, 255, 0.12) !important;
}
.wc-os[data-theme="dark"] .wc-ws-row:hover:not(.is-on) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.16) !important;
}
.wc-os[data-theme="dark"] .wc-ws-row.is-on {
  background: rgba(186, 194, 210, 0.08);
  border-color: var(--mob-primary) !important;
}

.wc-ws-card-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  line-height: 1.25;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-ink);
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wc-ws-row.is-on .wc-ws-card-title {
  opacity: 1;
}

.wc-os .ft-toggle,
.wc-os button.ft-toggle,
.wc-os .wc-ws-row .ft-toggle {
  border-radius: 9999px !important;
  overflow: hidden !important;
  flex-shrink: 0;
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


.wc-form {
  width: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  animation: wcFormIn 0.45s cubic-bezier(.22, 1, .36, 1) both;
}

.wc-form-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

@keyframes wcFormIn {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

/* CTA sits at the bottom of every slide stack — no dead air under the button */
.wc-continue-slot {
  flex-shrink: 0;
  min-height: var(--mob-control-h);
  margin-top: auto;
  padding-top: var(--wc-stack-gap);
  width: 100%;
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
  border-radius: 4px;
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
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.wc-creating-line {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid rgba(30, 30, 32, 0.10) !important;
  background: #FFFFFF;
  font-size: 15.5px;
  letter-spacing: var(--auth-tracking);
  color: var(--mob-muted);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 320ms ease, transform 320ms ease, color 320ms ease, border-color 320ms ease;
}

.wc-os[data-theme="dark"] .wc-creating-line {
  background: rgba(186, 194, 210, 0.06);
  border-color: rgba(255, 255, 255, 0.12) !important;
}

.wc-creating-line.is-on {
  opacity: 1;
  transform: translateY(0);
  color: var(--mob-ink);
  border-color: rgba(91, 100, 125, 0.28) !important;
  background: rgba(91, 100, 125, 0.06);
}

.wc-os[data-theme="dark"] .wc-creating-line.is-on {
  background: rgba(91, 100, 125, 0.18);
  border-color: rgba(91, 100, 125, 0.42) !important;
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

.wc-flash {
  margin: 12px 0 0;
  font-size: 13.5px;
  color: var(--mob-ink);
}

.wc-field-wrap--desc {
  margin-bottom: 8px;
}

.wc-textarea {
  width: 100%;
  min-height: 72px;
  max-block-size: 160px;
  field-sizing: content;
  resize: none !important;
  padding: 12px 16px;
  border-radius: var(--festag-input-radius, 8px);
  border: var(--festag-input-border-width, 1.5px) solid transparent !important;
  background: transparent;
  color: var(--mob-ink);
  font-size: 15.5px;
  line-height: 1.45;
  font-family: inherit;
  letter-spacing: var(--auth-tracking);
  outline: none;
  box-sizing: border-box;
}

.wc-textarea:focus {
  border-color: var(--festag-input-border-focus, #5B647D) !important;
}

.wc-invite-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.wc-invite-tab {
  flex: 1;
  height: 36px;
  border-radius: 4px;
  border: 1px solid rgba(30, 30, 32, 0.08);
  background: transparent;
  color: var(--mob-muted);
  font-family: inherit;
  font-size: 13.5px;
  letter-spacing: var(--auth-tracking);
  cursor: pointer;
}

.wc-invite-tab.is-on {
  background: #fff;
  color: var(--mob-ink);
  border-color: rgba(30, 30, 32, 0.12);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.wc-os[data-theme="dark"] .wc-invite-tab.is-on {
  background: rgba(186, 194, 210, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: none;
}

.wc-people {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wc-people-row {
  width: 100%;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid rgba(30, 30, 32, 0.06);
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.wc-os[data-theme="dark"] .wc-people-row {
  background: rgba(186, 194, 210, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

.wc-people-name {
  font-size: 14.5px;
  color: var(--mob-ink);
}

.wc-people-handle {
  font-size: 13px;
  color: var(--mob-muted);
}

.wc-role-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 0;
}

.wc-role-chip {
  height: 34px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid rgba(30, 30, 32, 0.1);
  background: transparent;
  color: var(--mob-muted);
  font-family: inherit;
  font-size: 13px;
  letter-spacing: var(--auth-tracking);
  cursor: pointer;
  white-space: nowrap;
}

.wc-role-chip.is-on {
  border-color: var(--mob-primary);
  color: var(--mob-ink);
  background: #fff;
}

.wc-os[data-theme="dark"] .wc-role-chip.is-on {
  background: rgba(186, 194, 210, 0.1);
}

.wc-continue-slot--secondary {
  margin-top: 12px;
}

.wc-continue-slot--secondary .mob-continue-btn.is-ready {
  background: transparent !important;
  color: var(--mob-muted) !important;
  border: 1px solid rgba(30, 30, 32, 0.06) !important;
  box-shadow: none !important;
}

.wc-os-grip {
  display: none;
}

/* ── Mobile — bottom sheet ── */
@media (max-width: 768px) {
  .wc-os {
    --wc-pad-x: 24px;
    --wc-pad-top: 6px;
    --wc-pad-bottom: max(20px, env(safe-area-inset-bottom, 0px));
    --wc-stack-gap: 18px;
    --wc-hero-lh: 30px;
    --wc-content-max: 100%;
    --wc-panel-radius: 16px;
    --wc-panel-w: 100%;
    align-items: flex-end;
    justify-content: stretch;
    padding: 0;
  }

  .wc-os-panel {
    width: 100%;
    max-width: none;
    max-height: min(92dvh, 940px);
    border-radius: var(--wc-panel-radius) var(--wc-panel-radius) 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.16);
    transform: translateY(100%);
    filter: none;
  }

  .wc-os.is-visible .wc-os-panel {
    transform: translateY(0);
    filter: none;
  }

  .wc-os[data-theme="dark"] .wc-os-panel {
    box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.5);
  }

  .wc-os-grip {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 10px 0 2px;
  }

  .wc-os-grip-bar {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.14);
  }

  .wc-os[data-theme="dark"] .wc-os-grip-bar {
    background: rgba(255, 255, 255, 0.16);
  }

  .wc-os-header {
    padding: 4px var(--wc-pad-x) 2px;
  }

  .wc-os-viewport {
    flex: 1 1 auto;
    min-height: 0;
  }

  .wc-os-track {
    height: 100%;
  }

  .wc-os-slide {
    height: 100%;
    min-height: 0;
    padding: var(--wc-pad-top) var(--wc-pad-x) var(--wc-pad-bottom);
  }

  .wc-os-stage {
    min-height: 100%;
  }

  .wc-os-hero {
    margin-bottom: var(--wc-stack-gap);
  }

  .wc-os .al-glassy-hero.mob-glassy-h1 {
    font-size: 24px !important;
    line-height: var(--wc-hero-lh) !important;
    --al-hero-display-size: 24px;
    --al-hero-display-lh: var(--wc-hero-lh);
  }

  .wc-ws-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    gap: 8px;
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .wc-ws-row {
    min-height: var(--mob-control-h);
    height: var(--mob-control-h);
    max-height: var(--mob-control-h);
    padding: 0 12px;
    border-radius: 4px;
  }

  .wc-ws-card-title {
    font-size: 15px;
    white-space: nowrap;
  }

  .wc-ws-card-body {
    font-size: 13px;
  }

  .wc-domain-hint {
    font-size: 12.5px;
  }

  .wc-continue-slot {
    margin-top: auto;
    padding-top: 14px;
    background: linear-gradient(
      180deg,
      transparent 0%,
      var(--wc-panel) 28%
    );
  }

  .wc-os[data-theme="dark"] .wc-continue-slot {
    background: linear-gradient(
      180deg,
      transparent 0%,
      var(--wc-panel) 28%
    );
  }

  .wc-creating-lines {
    margin-top: 8px;
  }

  .wc-os-panel {
    max-height: min(92dvh, 100svh);
  }
}

@media (min-width: 769px) {
  .wc-os {
    --wc-pad-x: 44px;
    --wc-pad-top: 16px;
    --wc-pad-bottom: 24px;
    --wc-hero-lh: 34px;
    --wc-panel-w: 520px;
  }
  .wc-os-grip {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wc-hero-morph,
  .wc-hero-morph.is-out,
  .wc-hero-morph.is-in,
  .wc-subdomain-slug.is-live {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
  }
}
`
