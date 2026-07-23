'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import {
  WELCOME_TOUR_INTRO,
  WELCOME_TOUR_STEPS,
  type TourPlacement,
  type WelcomeTourStep,
} from '@/lib/welcome-tour'

interface Props {
  forceOpen?: boolean
  onDone?: () => void
}

type OnboardingState = 'idle' | 'welcome' | 'tour' | 'completed' | 'skipped'
type StoredStatus = 'not_started' | 'welcome_seen' | 'tour_active' | 'completed' | 'skipped'
type Placement = TourPlacement | 'center' | 'sheet'

const STATUS_KEY = 'festag_onboarding_status'
const LEGACY_DONE_KEY = 'festag_tour_completed'
const TOOLTIP_WIDTH = 392
const TOOLTIP_GAP = 14
const VIEWPORT_PAD = 16

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

function calculatePlacement(rect: DOMRect | null, preferred: TourPlacement, approxHeight: number): {
  placement: Placement
  top: number
  left: number
} {
  if (!rect || typeof window === 'undefined') {
    return { placement: 'center', top: 0, left: 0 }
  }

  if (window.innerWidth <= 768) {
    return { placement: 'sheet', top: 0, left: 0 }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxLeft = vw - TOOLTIP_WIDTH - VIEWPORT_PAD
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

function stepApproxHeight(step: WelcomeTourStep | undefined) {
  const bullets = step?.bullets?.length ?? 0
  return 168 + bullets * 28
}

function WelcomeTourInner({ forceOpen = false, onDone }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [state, setState] = useState<OnboardingState>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const checkedRef = useRef(false)
  const routePendingRef = useRef<string | null>(null)

  const step = WELCOME_TOUR_STEPS[stepIdx]
  const approxHeight = stepApproxHeight(step)
  const tooltip = calculatePlacement(targetRect, step?.preferred ?? 'bottom', approxHeight)
  const total = WELCOME_TOUR_STEPS.length

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
    if (state !== 'tour' || !step?.route) return
    if (pathname === step.route || pathname === '/') return
    routePendingRef.current = step.route
    router.push(step.route)
  }, [pathname, router, state, step?.route])

  useEffect(() => {
    if (state !== 'tour' || !step) return

    let cancelled = false
    const measure = () => {
      if (cancelled) return
      if (step.route && pathname !== step.route && pathname !== '/') {
        setTargetRect(null)
        return
      }
      if (routePendingRef.current && routePendingRef.current !== pathname) return
      routePendingRef.current = null

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

    const boot = window.setTimeout(measure, step.route ? 280 : 0)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    window.addEventListener('scroll', measure, true)
    const interval = window.setInterval(measure, 450)
    return () => {
      cancelled = true
      window.clearTimeout(boot)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('scroll', measure, true)
      window.clearInterval(interval)
    }
  }, [pathname, state, stepIdx, step])

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
    window.dispatchEvent(new CustomEvent('festag:tour-finished'))
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('festag:onboarding-ended'))
    }, 3000)
    onDone?.()
  }, [onDone, persistProfile, stepIdx])

  const complete = useCallback(() => {
    writeStoredStatus('completed')
    setState('completed')
    void persistProfile('completed', total)
    window.dispatchEvent(new CustomEvent('festag:tour-finished'))
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
      const candidate = WELCOME_TOUR_STEPS[next]
      if (candidate.route && candidate.route !== pathname && pathname !== '/') {
        break
      }
      const el = getTarget(candidate.target)
      if (targetIsUsable(el)) break
      next += 1
    }
    if (next >= total) {
      complete()
      return
    }
    setStepIdx(next)
    void persistProfile('tour', next + 1)
  }, [complete, pathname, persistProfile, stepIdx, total])

  const prevStep = useCallback(() => {
    let prev = stepIdx - 1
    while (prev >= 0) {
      const el = getTarget(WELCOME_TOUR_STEPS[prev].target)
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
      if (step.route && pathname !== step.route && pathname !== '/') return
      const el = getTarget(step.target)
      if (targetIsUsable(el)) return
      let next = stepIdx + 1
      while (next < total) {
        const nextEl = getTarget(WELCOME_TOUR_STEPS[next].target)
        if (targetIsUsable(nextEl)) {
          setStepIdx(next)
          void persistProfile('tour', next + 1)
          return
        }
        next += 1
      }
      complete()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [complete, pathname, persistProfile, state, step, stepIdx, total])

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
        <section className="wt-welcome-card festag-popup-surface">
          <button className="wt-close" type="button" onClick={skip} aria-label="Schließen">
            <X size={15} weight="regular" />
          </button>
          <div className="wt-mark" aria-hidden>
            <img src="/brand/favicon.svg?v=20260723-fluid-mark" alt="" width={44} height={44} className="wt-mark-img" />
          </div>
          <p className="wt-kicker">{WELCOME_TOUR_INTRO.kicker}</p>
          <h2 className="wt-title">{WELCOME_TOUR_INTRO.title}</h2>
          <p className="wt-body">{WELCOME_TOUR_INTRO.body}</p>
          <p className="wt-meta">{total} kurze Schritte durch das Portal</p>
          <div className="wt-welcome-actions">
            <button className="wt-muted" type="button" onClick={skip}>Überspringen</button>
            <button className="wt-primary" type="button" onClick={startTour}>
              Tour starten <ArrowRight size={14} weight="bold" />
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
      borderRadius: Math.min(14, Math.max(8, targetRect.height / 5)),
    } : undefined

    const node = (
      <div className={`wt-tour-layer wt-placement-${tooltip.placement}`} role="dialog" aria-modal="true" aria-label="Festag Einführung">
        <style>{CSS}</style>
        {usableTarget ? (
          <div className="wt-spotlight" style={spot} aria-hidden />
        ) : (
          <div className="wt-tour-dim" aria-hidden />
        )}
        <section
          className={`wt-tooltip festag-popup-surface${tooltip.placement === 'sheet' ? ' sheet' : ''}${!usableTarget ? ' centered' : ''}`}
          style={usableTarget && tooltip.placement !== 'sheet' ? { top: tooltip.top, left: tooltip.left } : undefined}
        >
          <p className="wt-step-label">Schritt {stepIdx + 1} von {total}</p>
          <h3 className="wt-hint-title">{step?.title}</h3>
          <p className="wt-hint-text">{step?.description}</p>
          {step?.bullets?.length ? (
            <ul className="wt-hint-list">
              {step.bullets.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="wt-dots" aria-hidden>
            {WELCOME_TOUR_STEPS.map((item, idx) => (
              <span key={item.id} className={idx === stepIdx ? 'on' : idx < stepIdx ? 'done' : ''} />
            ))}
          </div>
          <div className="wt-hint-actions">
            <button type="button" className="wt-hint-end" onClick={endTour}>Tour beenden</button>
            <div className="wt-hint-nav">
              {stepIdx > 0 && (
                <button type="button" className="wt-hint-back" onClick={prevStep}>
                  <ArrowLeft size={12} weight="bold" /> Zurück
                </button>
              )}
              <button type="button" className="wt-hint-next" onClick={stepIdx === total - 1 ? complete : nextStep}>
                {stepIdx === total - 1 ? <>Fertig <Check size={12} weight="bold" /></> : <>Weiter <ArrowRight size={12} weight="bold" /></>}
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

  .wt-welcome-stage,
  .wt-tour-layer {
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 400;
    letter-spacing: -0.01em;
  }

  .wt-welcome-stage {
    position: fixed;
    inset: 0;
    z-index: 13000;
    display: grid;
    place-items: center;
    padding: max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom));
    animation: wtFade .2s ease both;
  }
  .wt-welcome-backdrop,
  .wt-tour-dim {
    position: absolute;
    inset: 0;
    background: var(--modal-backdrop, rgba(245, 245, 247, 0.72));
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .wt-welcome-card,
  .wt-tooltip {
    position: relative;
    color: var(--fp-text, var(--portal-text, #0f0f10));
    border: 1px solid var(--fp-border, rgba(0, 0, 0, 0.08));
    box-shadow:
      0 24px 64px -32px rgba(15, 23, 42, 0.28),
      0 1px 2px rgba(15, 23, 42, 0.06);
    animation: wtPop .24s cubic-bezier(.16, 1, .3, 1) both;
  }
  [data-theme="dark"] .wt-welcome-card,
  [data-theme="classic-dark"] .wt-welcome-card,
  [data-theme="dark"] .wt-tooltip,
  [data-theme="classic-dark"] .wt-tooltip {
    background: var(--festag-black-popup, var(--fp-bg, #121214));
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 28px 72px -28px rgba(0, 0, 0, 0.72);
  }

  .wt-welcome-card {
    width: min(440px, calc(100vw - 32px));
    border-radius: 18px;
    padding: 26px 24px 22px;
    text-align: center;
  }

  @keyframes wtFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes wtPop { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }

  .wt-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border: 1px solid var(--fp-border, rgba(0, 0, 0, 0.08));
    border-radius: 8px;
    background: transparent;
    color: var(--fp-muted, var(--portal-muted, #90959f));
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background .12s ease, color .12s ease;
  }
  .wt-close:hover {
    background: var(--fp-hover, rgba(15, 23, 42, 0.04));
    color: var(--fp-text, var(--portal-text, #0f0f10));
  }

  .wt-mark {
    width: 44px;
    height: 44px;
    margin: 0 auto 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .wt-mark-img {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: block;
  }

  .wt-kicker,
  .wt-step-label {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--fp-muted, var(--portal-muted, #90959f));
  }

  .wt-title {
    margin: 0;
    font-size: 29px;
    line-height: 1.02;
    font-weight: 400;
    letter-spacing: -0.5px;
    color: var(--fp-text, var(--portal-text, #0f0f10));
  }

  .wt-body,
  .wt-hint-text {
    margin: 10px 0 0;
    color: var(--fp-muted, var(--portal-muted, #90959f));
    font-size: 15px;
    line-height: 1.55;
    font-weight: 400;
  }
  .wt-body { max-width: 360px; margin-left: auto; margin-right: auto; }

  .wt-meta {
    margin: 14px 0 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--fp-soft, var(--portal-muted, #90959f));
  }

  .wt-welcome-actions {
    margin-top: 22px;
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
    cursor: pointer;
  }

  .wt-muted {
    height: 40px;
    padding: 0 16px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--fp-muted, var(--portal-muted, #90959f));
  }
  .wt-muted:hover {
    color: var(--fp-text, var(--portal-text, #0f0f10));
    background: var(--fp-hover, rgba(15, 23, 42, 0.04));
  }

  .wt-primary,
  .wt-hint-next {
    height: 40px;
    padding: 0 18px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--portal-btn-primary, #2d2e2c);
    color: var(--portal-btn-primary-text, #fafafa);
  }
  [data-theme="dark"] .wt-primary,
  [data-theme="classic-dark"] .wt-primary,
  [data-theme="dark"] .wt-hint-next,
  [data-theme="classic-dark"] .wt-hint-next {
    background: #fff;
    color: #121214;
  }
  .wt-primary:hover,
  .wt-hint-next:hover { opacity: 0.92; }

  .wt-tour-layer {
    position: fixed;
    inset: 0;
    z-index: 13000;
    pointer-events: none;
  }

  .wt-spotlight {
    position: fixed;
    z-index: 13001;
    pointer-events: none;
    box-shadow:
      0 0 0 9999px rgba(15, 15, 16, 0.32),
      0 0 0 1.5px rgba(255, 255, 255, 0.92),
      0 12px 32px -18px rgba(15, 23, 42, 0.35);
    transition: top .2s ease, left .2s ease, width .2s ease, height .2s ease, border-radius .2s ease;
  }
  [data-theme="dark"] .wt-spotlight,
  [data-theme="classic-dark"] .wt-spotlight {
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.52),
      0 0 0 1.5px rgba(255, 255, 255, 0.18),
      0 12px 36px -16px rgba(0, 0, 0, 0.55);
  }

  .wt-tooltip {
    position: fixed;
    z-index: 13002;
    width: min(${TOOLTIP_WIDTH}px, calc(100vw - 28px));
    padding: 18px 18px 16px;
    border-radius: 16px;
    pointer-events: auto;
  }
  .wt-tooltip.centered {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .wt-hint-title {
    margin: 0;
    font-size: 20px;
    line-height: 1.15;
    font-weight: 400;
    letter-spacing: -0.5px;
    color: var(--fp-text, var(--portal-text, #0f0f10));
  }

  .wt-hint-list {
    margin: 12px 0 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13.5px;
    line-height: 1.45;
    color: var(--fp-muted, var(--portal-muted, #90959f));
  }
  .wt-hint-list li::marker {
    color: var(--fp-soft, #b0b4be);
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
    background: var(--fp-muted, #90959f);
    opacity: 0.28;
    transition: width .16s ease, opacity .16s ease;
  }
  .wt-dots span.done { opacity: 0.55; }
  .wt-dots span.on {
    width: 18px;
    opacity: 1;
    background: var(--portal-btn-primary, #2d2e2c);
  }
  [data-theme="dark"] .wt-dots span.on,
  [data-theme="classic-dark"] .wt-dots span.on {
    background: #fff;
  }

  .wt-hint-actions {
    margin-top: 16px;
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
    height: 34px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--fp-muted, var(--portal-muted, #90959f));
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  .wt-hint-end:hover,
  .wt-hint-back:hover {
    color: var(--fp-text, var(--portal-text, #0f0f10));
    background: var(--fp-hover, rgba(15, 23, 42, 0.04));
  }

  @media (max-width: 768px) {
    .wt-welcome-stage { padding: 16px; }
    .wt-welcome-card { padding: 24px 18px 18px; border-radius: 20px; }
    .wt-welcome-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }
    .wt-muted,
    .wt-primary { width: 100%; justify-content: center; }
    .wt-tooltip.sheet {
      left: max(12px, env(safe-area-inset-left));
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
      top: auto;
      width: auto;
      border-radius: 20px 20px 0 0;
      padding-bottom: max(18px, env(safe-area-inset-bottom));
    }
    .wt-hint-actions {
      align-items: stretch;
      flex-direction: column;
    }
    .wt-hint-nav { justify-content: flex-end; }
  }
`

export default function WelcomeTour(props: Props) {
  return (
    <Suspense fallback={null}>
      <WelcomeTourInner {...props} />
    </Suspense>
  )
}
