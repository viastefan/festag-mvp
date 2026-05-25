'use client'

/**
 * WelcomeTour — premium guided product tour for Festag.
 *
 * Behaviour (2026-05-23 rebuild per spec):
 *   • Anchored steps: each step targets a [data-tour="<id>"] element.
 *     The component reads the bounding rect, picks the best of
 *     right/left/top/bottom that actually fits the viewport, falls back
 *     to a centred modal card when none does. Recomputes on resize,
 *     scroll, route change.
 *   • Clean spotlight ring around the target (10 px padding, 14 px
 *     radius, 2 px Slate ring + soft outer dim) — no disconnected
 *     white rectangle.
 *   • Mobile (≤ 720 px): floats become a bottom sheet with safe-area-
 *     aware padding instead of a side tooltip. Anchor still gets the
 *     spotlight when visible.
 *   • Body-level class `tour-active` while running — the PWA install
 *     banner and other overlays hide themselves via CSS while this is
 *     true. After the tour ends, the banner is given a 4 s grace
 *     period before it can pop back in.
 *   • Persistence: profiles.tour_completed_at / tour_step + a
 *     localStorage flag. ?tour=1 triggers auto-run for fresh
 *     registrations; otherwise the tour stays quiet until manually
 *     restarted from More / Help.
 *
 * Falls back gracefully when a target selector can't be resolved —
 * shows the centred modal variant instead of crashing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'

interface Props {
  forceOpen?: boolean
  onDone?: () => void
}

type Placement = 'right' | 'left' | 'top' | 'bottom' | 'center'
type Step = {
  id: string
  target?: string                  // data-tour selector value
  title: string
  body: string
  preferred?: Placement
  isWelcome?: boolean              // first step renders bigger / TagroLogo
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Willkommen bei Festag',
    body: 'Festag bündelt Projekte, Aufgaben und Statusmeldungen in einem ruhigen Arbeitsfenster — keine WhatsApp-Updates, keine PDF-Schleifen.',
    isWelcome: true,
  },
  {
    id: 'status-note',
    target: 'status-note',
    title: 'Dein ruhiges Arbeitsfenster',
    body: 'Hier fasst Tagro Status, Berichte und Audio-Briefings in einem festen Bereich zusammen.',
    preferred: 'bottom',
  },
  {
    id: 'voice-briefing',
    target: 'voice-briefing',
    title: 'Briefings statt Projektchaos',
    body: 'Tagro verdichtet aktive Projekte, offene Aufgaben und Entscheidungen zu einem klaren Bericht — auf Wunsch auch als Audio.',
    preferred: 'left',
  },
  {
    id: 'sidebar-status',
    target: 'sidebar-status',
    title: 'Alles bleibt erreichbar',
    body: 'Projekte, Inbox, Tasks, Mitwirkende und Tagro bleiben über die Navigation schnell zugänglich.',
    preferred: 'right',
  },
  {
    id: 'inbox',
    target: 'sidebar-inbox',
    title: 'Wichtige Ergebnisse landen in der Inbox',
    body: 'Beendete Chats, Briefings und offene Entscheidungen werden dort als prüfbare Zusammenfassung gespeichert.',
    preferred: 'right',
  },
]

const TOTAL_STEPS = STEPS.length
const PADDING = 10                  // around the spotlight target
const VIEWPORT_MARGIN = 24
const VIEWPORT_MARGIN_MOBILE = 16

// Read tooltip dimensions per device so placement maths is honest.
function tooltipBox(isMobile: boolean) {
  return { w: isMobile ? Math.min(window.innerWidth - 32, 360) : 340, h: 220 }
}

type Position = {
  placement: Placement
  top: number
  left: number
  width: number
  // anchor rect we should highlight (in viewport coords)
  anchor: { top: number; left: number; width: number; height: number } | null
}

function computePosition(rect: DOMRect | null, preferred: Placement | undefined, isMobile: boolean): Position {
  const box = tooltipBox(isMobile)
  const vw = window.innerWidth
  const vh = window.innerHeight
  const m = isMobile ? VIEWPORT_MARGIN_MOBILE : VIEWPORT_MARGIN

  if (!rect || isMobile) {
    return {
      placement: 'center',
      top: 0, left: 0,
      width: isMobile ? vw - 32 : box.w,
      anchor: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
    }
  }

  const candidates: Array<{ p: Placement; top: number; left: number; ok: boolean }> = []

  // bottom
  candidates.push({
    p: 'bottom',
    top: rect.bottom + 14,
    left: clamp(rect.left + rect.width / 2 - box.w / 2, m, vw - box.w - m),
    ok: rect.bottom + 14 + box.h <= vh - m,
  })
  // top
  candidates.push({
    p: 'top',
    top: rect.top - 14 - box.h,
    left: clamp(rect.left + rect.width / 2 - box.w / 2, m, vw - box.w - m),
    ok: rect.top - 14 - box.h >= m,
  })
  // right
  candidates.push({
    p: 'right',
    top: clamp(rect.top + rect.height / 2 - box.h / 2, m, vh - box.h - m),
    left: rect.right + 14,
    ok: rect.right + 14 + box.w <= vw - m,
  })
  // left
  candidates.push({
    p: 'left',
    top: clamp(rect.top + rect.height / 2 - box.h / 2, m, vh - box.h - m),
    left: rect.left - 14 - box.w,
    ok: rect.left - 14 - box.w >= m,
  })

  // Honour preferred placement if it fits.
  const ordered = preferred
    ? [...candidates.sort((a, b) => (a.p === preferred ? -1 : b.p === preferred ? 1 : 0))]
    : candidates

  const fit = ordered.find(c => c.ok)
  if (fit) {
    return {
      placement: fit.p,
      top: fit.top,
      left: fit.left,
      width: box.w,
      anchor: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    }
  }

  // No placement fits — fall back to centred card but still spotlight the target.
  return {
    placement: 'center',
    top: 0, left: 0,
    width: box.w,
    anchor: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function findTarget(selector: string | undefined): HTMLElement | null {
  if (!selector || typeof document === 'undefined') return null
  return document.querySelector<HTMLElement>(`[data-tour="${selector}"]`)
}

export default function WelcomeTour({ forceOpen = false, onDone }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [pos, setPos] = useState<Position | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const checkedRef = useRef(false)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // Reduced-motion CSS hook via body class.
  useEffect(() => {
    if (reducedMotion && typeof document !== 'undefined') {
      document.body.classList.add('tour-reduced-motion')
    }
    return () => document.body.classList.remove('tour-reduced-motion')
  }, [reducedMotion])

  // Mobile detection.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsMobile(window.innerWidth <= 720)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Trigger gate — only run with forceOpen or ?tour=1.
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      if (forceOpen) {
        setPhase('running'); setStepIdx(0); return
      }
      const wantsTour = searchParams?.get('tour') === '1'
      if (!wantsTour) return
      try {
        const stored = window.localStorage.getItem('festag_onboarding_tour_status')
        if (stored === 'completed') return
      } catch {}
      setStepIdx(0)
      setPhase('running')
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen])

  // Body-class management — drives the install-banner suppression CSS
  // and any other "tour-active" gates added later.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (phase === 'running') {
      document.body.classList.add('tour-active')
      try { window.localStorage.setItem('festag_onboarding_tour_status', 'active') } catch {}
    } else {
      document.body.classList.remove('tour-active')
    }
    return () => document.body.classList.remove('tour-active')
  }, [phase])

  // Compute / recompute position when step changes or viewport shifts.
  const recompute = useCallback(() => {
    if (phase !== 'running') return
    const step = STEPS[stepIdx]
    if (!step) return
    if (step.isWelcome) {
      setPos({ placement: 'center', top: 0, left: 0, width: isMobile ? window.innerWidth - 32 : 460, anchor: null })
      return
    }
    const el = findTarget(step.target)
    if (!el) {
      // Target missing — fall back to centred without anchor.
      setPos({ placement: 'center', top: 0, left: 0, width: isMobile ? window.innerWidth - 32 : 360, anchor: null })
      return
    }
    // Scroll into view if substantially off-screen.
    const rect = el.getBoundingClientRect()
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
    if (!fullyVisible) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
      // Recompute after the scroll settles.
      requestAnimationFrame(() => {
        const r2 = el.getBoundingClientRect()
        setPos(computePosition(r2, step.preferred, isMobile))
      })
      return
    }
    setPos(computePosition(rect, step.preferred, isMobile))
  }, [phase, stepIdx, isMobile, reducedMotion])

  useEffect(() => {
    if (phase !== 'running') return
    recompute()
    const onResize = () => recompute()
    const onScroll = () => recompute()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    const id = setInterval(recompute, 800)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      clearInterval(id)
    }
  }, [phase, stepIdx, recompute])

  // Keyboard navigation.
  useEffect(() => {
    if (phase !== 'running') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      skip()
      if (e.key === 'ArrowRight')  next()
      if (e.key === 'ArrowLeft')   prev()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIdx])

  const markComplete = useCallback(async () => {
    setPhase('done')
    try { window.localStorage.setItem('festag_onboarding_tour_status', 'completed') } catch {}
    try { window.localStorage.setItem('festag_tour_completed', '1') } catch {}
    if (userId) {
      await supabase.from('profiles').update({
        tour_completed_at: new Date().toISOString(),
        tour_step: TOTAL_STEPS,
      }).eq('id', userId)
    }
    // Give the install banner a 4 s grace period — set a stamp that
    // the banner reads (see PwaInstallBanner).
    try { window.localStorage.setItem('festag_install_banner_unmute_at', String(Date.now() + 4000)) } catch {}
    onDone?.()
  }, [supabase, userId, onDone])

  const skip = useCallback(() => {
    try { window.localStorage.setItem('festag_onboarding_tour_status', 'skipped') } catch {}
    try { window.localStorage.setItem('festag_install_banner_unmute_at', String(Date.now() + 4000)) } catch {}
    setPhase('done')
    onDone?.()
  }, [onDone])

  const next = useCallback(() => {
    setStepIdx(i => {
      if (i < TOTAL_STEPS - 1) return i + 1
      void markComplete()
      return i
    })
  }, [markComplete])

  const prev = useCallback(() => {
    setStepIdx(i => Math.max(0, i - 1))
  }, [])

  if (phase !== 'running' || !pos) return null

  const step = STEPS[stepIdx]
  const isFirst = stepIdx === 0
  const isLast = stepIdx === TOTAL_STEPS - 1
  const isCenter = pos.placement === 'center'

  // Spotlight rect: anchor + padding.
  const spot = pos.anchor
    ? {
        top: pos.anchor.top - PADDING,
        left: pos.anchor.left - PADDING,
        width: pos.anchor.width + PADDING * 2,
        height: pos.anchor.height + PADDING * 2,
      }
    : null

  return (
    <div
      className={`wt-root placement-${pos.placement}${isMobile ? ' mobile' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      <style>{CSS}</style>

      {/* Dim overlay — single rect, no double-layer mess */}
      <div className="wt-overlay" onClick={skip} aria-hidden />

      {/* Spotlight ring around the anchor */}
      {spot && (
        <div
          className="wt-spotlight"
          style={{
            top: spot.top, left: spot.left,
            width: spot.width, height: spot.height,
          }}
          aria-hidden
        />
      )}

      {/* Tooltip (desktop) or bottom sheet (mobile / center fallback) */}
      <div
        className={`wt-card ${isCenter ? 'centered' : 'floating'}${isMobile ? ' sheet' : ''}${step.isWelcome ? ' welcome' : ''}`}
        style={isCenter ? undefined : { top: pos.top, left: pos.left, width: pos.width }}
        role="document"
      >
        {isMobile && !isCenter && <div className="wt-handle" aria-hidden />}

        <button type="button" className="wt-close" onClick={skip} aria-label="Tour beenden">
          <X size={14} />
        </button>

        {step.isWelcome && (
          <div className="wt-mark"><TagroLogo size={28} /></div>
        )}
        <p className="wt-eyebrow">
          {step.isWelcome ? 'Erster Eindruck' : `Hinweis ${stepIdx + 1} von ${TOTAL_STEPS}`}
        </p>
        <h2 className="wt-title">{step.title}</h2>
        <p className="wt-body">{step.body}</p>

        <div className="wt-progress" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`wt-dot${i === stepIdx ? ' active' : i < stepIdx ? ' done' : ''}`} />
          ))}
        </div>

        <div className="wt-actions">
          {!isFirst ? (
            <button type="button" className="wt-secondary" onClick={prev}>
              <ArrowLeft size={12} /> Zurück
            </button>
          ) : (
            <button type="button" className="wt-skip-inline" onClick={skip}>Tour beenden</button>
          )}
          <button type="button" className="wt-primary" onClick={next}>
            {isLast
              ? <>Tour abschließen <Check size={12} weight="bold" /></>
              : isFirst
                ? <>Einführung starten <ArrowRight size={12} /></>
                : <>Weiter <ArrowRight size={12} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

const CSS = `
  .wt-root {
    position: fixed; inset: 0;
    z-index: 14000;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    pointer-events: none;
  }
  .wt-overlay {
    position: absolute; inset: 0;
    background: rgba(0, 0, 0, .56);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    pointer-events: auto;
    cursor: default;
    animation: wtFade .2s ease both;
  }
  @keyframes wtFade { from { opacity: 0; } to { opacity: 1; } }
  body.tour-reduced-motion .wt-overlay { animation: none; }

  /* Spotlight ring — clean rounded outline around the anchor.
     Two layers: an inner ring (Slate, 2 px) and an outer soft glow. */
  .wt-spotlight {
    position: absolute;
    z-index: 1;
    border-radius: 14px;
    pointer-events: none;
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--btn-prim) 80%, transparent),
      0 0 0 6px color-mix(in srgb, var(--btn-prim) 22%, transparent),
      0 18px 60px -10px color-mix(in srgb, var(--btn-prim) 30%, transparent);
    transition: top .22s ease, left .22s ease, width .22s ease, height .22s ease;
  }
  body.tour-reduced-motion .wt-spotlight { transition: none; }

  /* Card */
  .wt-card {
    position: absolute;
    pointer-events: auto;
    background: var(--card);
    color: var(--text);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 16px;
    padding: 18px 18px 16px;
    box-shadow:
      0 1px 2px rgba(0,0,0,.18),
      0 26px 60px -22px rgba(0,0,0,.55);
    animation: wtPop .24s cubic-bezier(.16,1,.3,1) both;
    max-width: calc(100vw - 32px);
  }
  body.tour-reduced-motion .wt-card { animation: none; }
  [data-theme="dark"] .wt-card,
  [data-theme="classic-dark"] .wt-card {
    background: color-mix(in srgb, var(--card) 96%, #fff 4%);
    box-shadow:
      0 1px 2px rgba(0,0,0,.45),
      0 32px 70px -22px rgba(0,0,0,.7);
  }
  @keyframes wtPop {
    from { opacity: 0; transform: translateY(6px) scale(.985); }
    to { opacity: 1; transform: none; }
  }

  .wt-card.centered {
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: min(440px, calc(100vw - 32px));
  }
  .wt-card.centered.welcome {
    width: min(460px, calc(100vw - 32px));
    padding: 26px 22px 20px;
    text-align: center;
  }
  .wt-card.welcome .wt-mark {
    margin: 0 auto 6px;
    width: 56px; height: 56px;
    border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }

  .wt-close {
    position: absolute; top: 10px; right: 10px;
    width: 26px; height: 26px;
    border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .wt-close:hover {
    background: color-mix(in srgb, var(--surface-2) 60%, transparent);
    color: var(--text);
  }

  .wt-handle {
    width: 36px; height: 4px; border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted) 55%, transparent);
    opacity: .5;
    margin: -2px auto 8px;
  }

  .wt-eyebrow {
    margin: 0 0 4px;
    font-size: 10px; font-weight: 500;
    letter-spacing: .14em; text-transform: uppercase;
    color: var(--text-muted);
  }
  .wt-title {
    margin: 0;
    font-size: 16px; font-weight: 500; letter-spacing: -.005em;
    color: var(--text);
    line-height: 1.35;
  }
  .wt-card.welcome .wt-title { font-size: 19px; margin-top: 4px; }
  .wt-body {
    margin: 6px 0 0;
    font-size: 13px; line-height: 1.55;
    color: var(--text-muted);
    font-weight: 500; letter-spacing: .012em;
  }

  .wt-progress { display: flex; gap: 4px; margin-top: 12px; }
  .wt-dot {
    width: 5px; height: 5px; border-radius: 999px;
    background: var(--text-muted); opacity: .22;
    transition: width .2s, opacity .2s, background .2s;
  }
  .wt-dot.done { opacity: .42; }
  .wt-dot.active {
    width: 18px; border-radius: 999px;
    background: var(--btn-prim); opacity: .85;
  }

  .wt-actions {
    display: flex; gap: 8px; align-items: center;
    margin-top: 14px;
    justify-content: space-between;
  }
  .wt-card.welcome .wt-actions { justify-content: center; }
  .wt-primary {
    display: inline-flex; align-items: center; gap: 6px;
    height: 34px; padding: 0 14px;
    border: 0; border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .012em;
    cursor: pointer; transition: opacity .12s, transform .12s;
    min-height: 34px;
    flex-shrink: 0;
  }
  .wt-primary:hover { opacity: .92; }
  .wt-primary:active { transform: scale(.97); }
  .wt-secondary {
    display: inline-flex; align-items: center; gap: 5px;
    height: 32px; padding: 0 12px;
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
    background: transparent;
    color: var(--text-secondary);
    border-radius: 999px;
    font: inherit; font-size: 11.5px; font-weight: 500; letter-spacing: .012em;
    cursor: pointer; transition: background .12s, color .12s;
  }
  .wt-secondary:hover {
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    color: var(--text);
  }
  .wt-skip-inline {
    background: transparent; border: 0;
    padding: 4px 0;
    color: var(--text-muted);
    font: inherit; font-size: 11.5px; font-weight: 500; letter-spacing: .012em;
    cursor: pointer;
  }
  .wt-skip-inline:hover { color: var(--text); }

  /* Mobile bottom-sheet variant */
  .wt-root.mobile .wt-card.floating,
  .wt-root.mobile .wt-card.centered {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    top: auto;
    transform: none;
    width: 100%;
    max-width: 100%;
    border-radius: 22px 22px 0 0;
    padding: 14px 18px calc(env(safe-area-inset-bottom, 0px) + 16px);
    box-shadow: 0 -28px 60px -28px rgba(0,0,0,.6);
    animation: wtSheet .26s cubic-bezier(.16,1,.3,1) both;
    max-height: 55dvh;
    overflow-y: auto;
  }
  body.tour-reduced-motion .wt-root.mobile .wt-card.floating,
  body.tour-reduced-motion .wt-root.mobile .wt-card.centered { animation: none; }
  @keyframes wtSheet { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }

  @media (max-width: 720px) {
    .wt-card.welcome { text-align: left; padding-top: 14px; }
    .wt-card.welcome .wt-mark { margin: 4px 0 6px; }
    .wt-title { font-size: 17px; }
  }

  /* Install banner suppression while tour runs. */
  body.tour-active .pwa-banner { display: none !important; }
`
