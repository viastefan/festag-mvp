'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import VeyraLogo from '@/components/VeyraLogo'

interface Props {
  forceOpen?: boolean
  onDone?: () => void
}

type OnboardingState = 'idle' | 'welcome' | 'tour' | 'completed' | 'skipped'
type StoredStatus = 'not_started' | 'welcome_seen' | 'tour_active' | 'completed' | 'skipped'
type Placement = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'sheet'

type TourStep = {
  id: string
  target: string
  title: string
  description: string
  preferred: 'left' | 'right' | 'top' | 'bottom'
}

const STATUS_KEY = 'festag_onboarding_status'
const LEGACY_DONE_KEY = 'festag_tour_completed'
const TOOLTIP_WIDTH = 344
const TOOLTIP_GAP = 12
const VIEWPORT_PAD = 14

const TOUR_STEPS: TourStep[] = [
  {
    id: 'status',
    target: 'sidebar-status',
    title: 'Deine Statuszentrale',
    description: 'Hier siehst du, was heute wichtig ist: Status, Berichte, offene Aufgaben und nächste Schritte.',
    preferred: 'right',
  },
  {
    id: 'voice',
    target: 'voice-briefing',
    title: 'Briefings statt Projektchaos',
    description: 'Veyra fasst aktive Projekte, Aufgaben, Risiken und Entscheidungen in einem klaren Bericht zusammen.',
    preferred: 'left',
  },
  {
    id: 'inbox',
    target: 'sidebar-inbox',
    title: 'Wichtige Ergebnisse landen in der Inbox',
    description: 'Beendete Chats, offene Entscheidungen, Briefings und Zusammenfassungen werden hier gesammelt.',
    preferred: 'right',
  },
  {
    id: 'projects',
    target: 'sidebar-projects',
    title: 'Projekte bleiben nachvollziehbar',
    description: 'Jedes Projekt verbindet Aufgaben, Team, Statusberichte, Entscheidungen, Risiken und Kommunikation.',
    preferred: 'right',
  },
  {
    id: 'tagro-chat',
    target: 'sidebar-tagro-chat',
    title: 'Frag Veyra jederzeit',
    description: 'Veyra übersetzt Projektarbeit in klare Antworten, nächste Schritte und Briefings.',
    preferred: 'right',
  },
]

function readStoredStatus(): StoredStatus {
  try {
    const status = window.localStorage.getItem(STATUS_KEY)
    if (status === 'welcome_seen' || status === 'tour_active' || status === 'completed' || status === 'skipped') return status
    if (window.localStorage.getItem(LEGACY_DONE_KEY) === '1') return 'completed'
  } catch {}
  return 'not_started'
}

function writeStoredStatus(status: StoredStatus) {
  try {
    window.localStorage.setItem(STATUS_KEY, status)
    if (status === 'completed' || status === 'skipped') window.localStorage.setItem(LEGACY_DONE_KEY, '1')
    else window.localStorage.removeItem(LEGACY_DONE_KEY)
  } catch {}
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getTarget(target: string) {
  return document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null
}

function targetIsUsable(el: HTMLElement | null) {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)
  return rect.width > 4 && rect.height > 4 && style.visibility !== 'hidden' && style.display !== 'none'
}

function calculatePlacement(rect: DOMRect | null, preferred: TourStep['preferred']): {
  placement: Placement
  top: number
  left: number
} {
  if (!rect || typeof window === 'undefined') {
    return { placement: 'center', top: window.innerHeight / 2, left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2 }
  }

  const isMobile = window.innerWidth <= 720
  if (isMobile) {
    return { placement: 'sheet', top: 0, left: 0 }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxLeft = vw - TOOLTIP_WIDTH - VIEWPORT_PAD
  const approxHeight = 210
  const maxTop = vh - approxHeight - VIEWPORT_PAD

  const canRight = rect.right + TOOLTIP_GAP + TOOLTIP_WIDTH <= vw - VIEWPORT_PAD
  const canLeft = rect.left - TOOLTIP_GAP - TOOLTIP_WIDTH >= VIEWPORT_PAD
  const canBottom = rect.bottom + TOOLTIP_GAP + approxHeight <= vh - VIEWPORT_PAD
  const canTop = rect.top - TOOLTIP_GAP - approxHeight >= VIEWPORT_PAD

  let placement: Placement = preferred
  if (preferred === 'right' && !canRight) placement = canLeft ? 'left' : canBottom ? 'bottom' : 'top'
  if (preferred === 'left' && !canLeft) placement = canRight ? 'right' : canBottom ? 'bottom' : 'top'
  if (preferred === 'bottom' && !canBottom) placement = canTop ? 'top' : canRight ? 'right' : 'left'
  if (preferred === 'top' && !canTop) placement = canBottom ? 'bottom' : canRight ? 'right' : 'left'

  if (placement === 'right') {
    return {
      placement,
      left: clamp(rect.right + TOOLTIP_GAP, VIEWPORT_PAD, maxLeft),
      top: clamp(rect.top + rect.height / 2 - approxHeight / 2, VIEWPORT_PAD, maxTop),
    }
  }
  if (placement === 'left') {
    return {
      placement,
      left: clamp(rect.left - TOOLTIP_GAP - TOOLTIP_WIDTH, VIEWPORT_PAD, maxLeft),
      top: clamp(rect.top + rect.height / 2 - approxHeight / 2, VIEWPORT_PAD, maxTop),
    }
  }
  if (placement === 'bottom') {
    return {
      placement,
      left: clamp(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, VIEWPORT_PAD, maxLeft),
      top: clamp(rect.bottom + TOOLTIP_GAP, VIEWPORT_PAD, maxTop),
    }
  }
  return {
    placement: 'top',
    left: clamp(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, VIEWPORT_PAD, maxLeft),
    top: clamp(rect.top - TOOLTIP_GAP - approxHeight, VIEWPORT_PAD, maxTop),
  }
}

export default function WelcomeTour({ forceOpen = false, onDone }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [state, setState] = useState<OnboardingState>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const checkedRef = useRef(false)

  const step = TOUR_STEPS[stepIdx]
  const tooltip = calculatePlacement(targetRect, step?.preferred ?? 'bottom')
  const total = TOUR_STEPS.length

  const setOnboardingActive = useCallback((active: boolean) => {
    if (typeof document === 'undefined') return
    document.documentElement.toggleAttribute('data-onboarding-active', active)
    window.dispatchEvent(new CustomEvent('festag:onboarding-active', { detail: { active } }))
  }, [])

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const wantsTour = searchParams?.get('tour') === '1'
      const stored = readStoredStatus()
      if (forceOpen || wantsTour) {
        writeStoredStatus('not_started')
        setStepIdx(0)
        setState('welcome')
        return
      }
      if (stored === 'completed' || stored === 'skipped') return
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen])

  useEffect(() => {
    const active = state === 'welcome' || state === 'tour'
    setOnboardingActive(active)
    return () => setOnboardingActive(false)
  }, [state, setOnboardingActive])

  useEffect(() => {
    if (state !== 'tour' || !step) return

    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const el = getTarget(step.target)
      if (!targetIsUsable(el)) {
        setTargetRect(null)
        return
      }
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      requestAnimationFrame(() => {
        if (cancelled) return
        const target = getTarget(step.target)
        setTargetRect(targetIsUsable(target) ? target!.getBoundingClientRect() : null)
      })
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    window.addEventListener('scroll', measure, true)
    const interval = window.setInterval(measure, 450)
    return () => {
      cancelled = true
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('scroll', measure, true)
      window.clearInterval(interval)
    }
  }, [state, stepIdx, step, pathname])

  const persistProfile = useCallback(async (status: OnboardingState, tourStep: number) => {
    if (!userId) return
    if (status === 'completed') {
      await supabase.from('profiles').update({
        tour_completed_at: new Date().toISOString(),
        tour_step: total,
      }).eq('id', userId)
      return
    }
    if (status === 'skipped') {
      await supabase.from('profiles').update({
        tour_step: tourStep,
      }).eq('id', userId)
      return
    }
    await supabase.from('profiles').update({ tour_step: tourStep }).eq('id', userId)
  }, [supabase, total, userId])

  const startTour = useCallback(() => {
    writeStoredStatus('tour_active')
    setStepIdx(0)
    setState('tour')
    void persistProfile('tour', 1)
  }, [persistProfile])

  const skip = useCallback(() => {
    writeStoredStatus('skipped')
    setState('skipped')
    void persistProfile('skipped', stepIdx)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('festag:onboarding-ended'))
    }, 3000)
    onDone?.()
  }, [onDone, persistProfile, stepIdx])

  const complete = useCallback(() => {
    writeStoredStatus('completed')
    setState('completed')
    void persistProfile('completed', total)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('festag:onboarding-ended'))
    }, 3000)
    onDone?.()
  }, [onDone, persistProfile, total])

  const endTour = useCallback(() => {
    skip()
  }, [skip])

  const nextStep = useCallback(() => {
    let next = stepIdx + 1
    while (next < total) {
      const el = getTarget(TOUR_STEPS[next].target)
      if (targetIsUsable(el)) break
      next += 1
    }
    if (next >= total) {
      complete()
      return
    }
    setStepIdx(next)
    void persistProfile('tour', next + 1)
  }, [complete, persistProfile, stepIdx, total])

  const prevStep = useCallback(() => {
    let prev = stepIdx - 1
    while (prev >= 0) {
      const el = getTarget(TOUR_STEPS[prev].target)
      if (targetIsUsable(el)) break
      prev -= 1
    }
    if (prev < 0) return
    setStepIdx(prev)
    void persistProfile('tour', prev + 1)
  }, [persistProfile, stepIdx])

  useEffect(() => {
    if (state !== 'tour' || !step) return
    const timer = window.setTimeout(() => {
      const el = getTarget(step.target)
      if (targetIsUsable(el)) return
      let next = stepIdx + 1
      while (next < total) {
        const nextEl = getTarget(TOUR_STEPS[next].target)
        if (targetIsUsable(nextEl)) {
          setStepIdx(next)
          void persistProfile('tour', next + 1)
          return
        }
        next += 1
      }
      complete()
    }, 650)
    return () => window.clearTimeout(timer)
  }, [complete, persistProfile, state, step, stepIdx, total])

  useEffect(() => {
    if (state === 'idle' || state === 'completed' || state === 'skipped') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (state === 'welcome') skip()
        else endTour()
      }
      if (state === 'tour' && event.key === 'ArrowRight') nextStep()
      if (state === 'tour' && event.key === 'ArrowLeft') prevStep()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [endTour, nextStep, prevStep, skip, state])

  if (state === 'idle' || state === 'completed' || state === 'skipped') return null

  if (state === 'welcome') {
    const node = (
      <div className="wt-welcome-stage" role="dialog" aria-modal="true" aria-label="Willkommen bei Festag">
        <style>{CSS}</style>
        <div className="wt-welcome-backdrop" aria-hidden />
        <section className="wt-welcome-card">
          <button className="wt-close" type="button" onClick={skip} aria-label="Schließen">
            <X size={15} />
          </button>
          <div className="wt-mark" aria-hidden>
            <VeyraLogo size={32} />
          </div>
          <p className="wt-eyebrow">ERSTER EINSTIEG</p>
          <h2 className="wt-title">Willkommen bei Festag</h2>
          <p className="wt-body">
            Festag bündelt Projekte, Aufgaben, Statusmeldungen und Briefings in einem ruhigen Arbeitsfenster.
          </p>
          <div className="wt-welcome-actions">
            <button className="wt-muted" type="button" onClick={skip}>Überspringen</button>
            <button className="wt-primary" type="button" onClick={startTour}>
              Tour starten <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </div>
    )
    return typeof document === 'undefined' ? node : createPortal(node, document.body)
  }

  if (state === 'tour') {
    const usableTarget = Boolean(targetRect && step)
    const spot = targetRect ? {
      top: targetRect.top - 8,
      left: targetRect.left - 8,
      width: targetRect.width + 16,
      height: targetRect.height + 16,
      borderRadius: Math.min(22, Math.max(10, targetRect.height / 4)),
    } : undefined

    const node = (
      <div className={`wt-tour-layer wt-placement-${tooltip.placement}`} role="dialog" aria-modal="true" aria-label="Festag Tour">
        <style>{CSS}</style>
        {usableTarget ? (
          <div className="wt-spotlight" style={spot} aria-hidden />
        ) : (
          <div className="wt-tour-dim" aria-hidden />
        )}
        <section
          className={`wt-tooltip${tooltip.placement === 'sheet' ? ' sheet' : ''}${!usableTarget ? ' centered' : ''}`}
          style={usableTarget && tooltip.placement !== 'sheet' ? { top: tooltip.top, left: tooltip.left } : undefined}
        >
          <p className="wt-hint-eyebrow">HINWEIS {stepIdx + 1} VON {total}</p>
          <h3 className="wt-hint-title">{step?.title}</h3>
          <p className="wt-hint-text">{step?.description}</p>
          <div className="wt-dots" aria-hidden>
            {TOUR_STEPS.map((item, idx) => (
              <span key={item.id} className={idx === stepIdx ? 'on' : idx < stepIdx ? 'done' : ''} />
            ))}
          </div>
          <div className="wt-hint-actions">
            <button type="button" className="wt-hint-end" onClick={endTour}>Tour beenden</button>
            <div className="wt-hint-nav">
              {stepIdx > 0 && (
                <button type="button" className="wt-hint-back" onClick={prevStep}>
                  <ArrowLeft size={11} /> Zurück
                </button>
              )}
              <button type="button" className="wt-hint-next" onClick={stepIdx === total - 1 ? complete : nextStep}>
                {stepIdx === total - 1 ? <>Fertig <Check size={11} weight="bold" /></> : <>Weiter <ArrowRight size={11} /></>}
              </button>
            </div>
          </div>
        </section>
      </div>
    )
    return typeof document === 'undefined' ? node : createPortal(node, document.body)
  }

  return null
}

const CSS = `
  html[data-onboarding-active] .pwa-banner,
  html[data-onboarding-active] [class*="toast"],
  html[data-onboarding-active] [class*="copilot"],
  html[data-onboarding-active] [class*="install"] {
    display: none !important;
  }

  .wt-welcome-stage {
    position: fixed;
    inset: 0;
    z-index: 13000;
    display: grid;
    place-items: center;
    padding: 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: wtFade .18s ease both;
  }
  .wt-welcome-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,.35);
  }
  [data-theme="dark"] .wt-welcome-backdrop,
  [data-theme="classic-dark"] .wt-welcome-backdrop {
    background: rgba(0,0,0,.50);
  }
  .wt-welcome-card {
    position: relative;
    width: min(420px, calc(100vw - 40px));
    border-radius: 22px;
    padding: 28px 28px 24px;
    background: rgba(255,255,255,.98);
    color: var(--text);
    text-align: center;
    border: 1px solid rgba(15,23,42,.08);
    box-shadow: 0 32px 90px -48px rgba(15,23,42,.50), 0 1px 2px rgba(15,23,42,.06);
    animation: wtPop .24s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .wt-welcome-card,
  [data-theme="classic-dark"] .wt-welcome-card {
    background: color-mix(in srgb, var(--card) 94%, #fff 6%);
    border-color: rgba(255,255,255,.07);
    box-shadow: 0 36px 100px -44px rgba(0,0,0,.72), inset 0 1px 0 rgba(255,255,255,.05);
  }
  @keyframes wtFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes wtPop { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }

  .wt-close {
    position: absolute;
    top: 13px;
    right: 13px;
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background .12s ease, color .12s ease;
  }
  .wt-close:hover { background: color-mix(in srgb, var(--surface-2) 64%, transparent); color: var(--text); }
  .wt-mark {
    width: 58px;
    height: 58px;
    margin: 0 auto 16px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 62%, transparent);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.58);
  }
  .wt-eyebrow,
  .wt-hint-eyebrow {
    margin: 0 0 8px;
    color: var(--text-muted);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .wt-title {
    margin: 0;
    color: var(--text);
    font-size: 21px;
    line-height: 1.22;
    font-weight: 500;
    letter-spacing: -.012em;
  }
  .wt-body {
    margin: 12px auto 0;
    max-width: 340px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.6;
    font-weight: 500;
    letter-spacing: .012em;
  }
  .wt-welcome-actions {
    margin-top: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .wt-muted,
  .wt-primary,
  .wt-hint-end,
  .wt-hint-back,
  .wt-hint-next {
    font-family: inherit;
    font-weight: 500;
    letter-spacing: .012em;
    cursor: pointer;
  }
  .wt-muted {
    height: 38px;
    padding: 0 15px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
  }
  .wt-muted:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 48%, transparent); }
  .wt-primary {
    height: 40px;
    padding: 0 18px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    box-shadow: 0 10px 22px -18px rgba(15,23,42,.4);
  }
  .wt-primary:hover,
  .wt-hint-next:hover { opacity: .92; }

  .wt-tour-layer {
    position: fixed;
    inset: 0;
    z-index: 13000;
    pointer-events: none;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .wt-spotlight {
    position: fixed;
    z-index: 13001;
    pointer-events: none;
    border-radius: 14px;
    box-shadow:
      0 0 0 9999px rgba(0,0,0,.35),
      0 0 0 2px color-mix(in srgb, var(--btn-prim) 80%, #fff 20%),
      0 14px 38px -22px color-mix(in srgb, var(--btn-prim) 70%, transparent);
    transition: top .18s ease, left .18s ease, width .18s ease, height .18s ease;
  }
  [data-theme="dark"] .wt-spotlight,
  [data-theme="classic-dark"] .wt-spotlight {
    box-shadow:
      0 0 0 9999px rgba(0,0,0,.50),
      0 0 0 2px color-mix(in srgb, var(--btn-prim) 78%, #fff 22%),
      0 14px 42px -20px color-mix(in srgb, var(--btn-prim) 54%, transparent);
  }
  .wt-tour-dim {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,.35);
  }
  [data-theme="dark"] .wt-tour-dim,
  [data-theme="classic-dark"] .wt-tour-dim { background: rgba(0,0,0,.50); }

  .wt-tooltip {
    position: fixed;
    z-index: 13002;
    width: min(344px, calc(100vw - 28px));
    padding: 17px 17px 15px;
    border-radius: 16px;
    background: rgba(255,255,255,.98);
    color: var(--text);
    border: 1px solid rgba(15,23,42,.08);
    box-shadow: 0 30px 80px -42px rgba(15,23,42,.55), 0 1px 2px rgba(15,23,42,.08);
    pointer-events: auto;
    animation: wtPop .2s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .wt-tooltip,
  [data-theme="classic-dark"] .wt-tooltip {
    background: color-mix(in srgb, var(--card) 94%, #fff 6%);
    border-color: rgba(255,255,255,.07);
    box-shadow: 0 32px 88px -40px rgba(0,0,0,.78), inset 0 1px 0 rgba(255,255,255,.05);
  }
  .wt-tooltip.centered {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .wt-hint-title {
    margin: 0;
    color: var(--text);
    font-size: 16px;
    line-height: 1.28;
    font-weight: 500;
    letter-spacing: -.006em;
  }
  .wt-hint-text {
    margin: 9px 0 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 500;
    letter-spacing: .012em;
  }
  .wt-dots {
    margin-top: 14px;
    display: flex;
    gap: 6px;
  }
  .wt-dots span {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--text-muted);
    opacity: .25;
    transition: width .16s ease, opacity .16s ease;
  }
  .wt-dots span.done { opacity: .48; }
  .wt-dots span.on {
    width: 20px;
    opacity: .9;
    background: var(--btn-prim);
  }
  .wt-hint-actions {
    margin-top: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .wt-hint-nav {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .wt-hint-end,
  .wt-hint-back {
    height: 32px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .wt-hint-end:hover,
  .wt-hint-back:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-2) 46%, transparent);
  }
  .wt-hint-next {
    height: 34px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  @media (max-width: 720px) {
    .wt-welcome-stage {
      inset: 0 !important;
      padding: 18px;
    }
    .wt-welcome-card {
      padding: 26px 20px 20px;
    }
    .wt-welcome-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }
    .wt-muted,
    .wt-primary {
      width: 100%;
      justify-content: center;
    }
    .wt-tooltip.sheet {
      left: max(12px, env(safe-area-inset-left));
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
      top: auto;
      width: auto;
      border-radius: 18px;
    }
    .wt-hint-actions {
      align-items: stretch;
      flex-direction: column;
    }
    .wt-hint-nav {
      justify-content: flex-end;
    }
  }
`
