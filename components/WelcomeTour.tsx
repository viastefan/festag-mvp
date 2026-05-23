'use client'

/**
 * WelcomeTour — post-registration introduction.
 *
 * Two phases:
 *   1. Centred modal: welcome card + 5 explanation steps. Skippable
 *      at every point, "Später ansehen" closes without marking the
 *      tour done (so it pops up again next time), the final step's
 *      "Fertigstellen" writes profiles.tour_completed_at.
 *   2. Anchored hints: 4 small popovers attached to the sidebar
 *      entries (Projekte, Statusabfrage, Tagro Chat, Mitwirkende).
 *      Each shows a single sentence + "Verstanden". When the last
 *      one is dismissed the tour is marked complete.
 *
 * State is persisted on profiles.tour_step + tour_completed_at, with
 * a localStorage fallback so the modal doesn't double-render between
 * the DB write and the next session check.
 *
 * Replay: the tour also accepts a `forceOpen` prop — fired from the
 * settings "Einführung erneut starten" link. That ignores the DB flag
 * and runs the tour from step 0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'

interface Props {
  /** When true, runs the tour regardless of the DB flag. */
  forceOpen?: boolean
  /** Called when the tour is fully dismissed (skip, finish, anchored end). */
  onDone?: () => void
}

type Phase = 'idle' | 'modal' | 'anchored' | 'done'

type Step = {
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: 'Willkommen bei Festag',
    body: 'Festag hilft dabei, Projekte, Aufgaben, Statusmeldungen und Verantwortlichkeiten zentral zu überblicken — ruhig, klar und an einem Ort.',
  },
  {
    title: 'Dashboard',
    body: 'Die zentrale Übersicht. Aktuelle Projekte, offene Aufgaben, Statusmeldungen und wichtige Updates landen hier — auf einen Blick.',
  },
  {
    title: 'Projekte',
    body: 'Der zentrale Arbeitsbereich. Jedes Projekt bündelt Aufgaben, Beteiligte, Dateien, Fortschritt und Verantwortlichkeiten.',
  },
  {
    title: 'Statusabfragen',
    body: 'Hole regelmäßig klare Updates von Teammitgliedern, Dienstleistern oder Projektbeteiligten ein — ohne lange Rückfragen.',
  },
  {
    title: 'Tagro Briefings',
    body: 'Tagro übersetzt Projektinformationen in verständliche Statusberichte, Zusammenfassungen und auf Wunsch auch Audio-Briefings.',
  },
  {
    title: 'Teams & Rollen',
    body: 'Verwalte Personen, Rollen, Berechtigungen und Verantwortlichkeiten — wer sieht was, wer entscheidet was.',
  },
]

// Anchored hints. Selector picks the sidebar nav entry by its href —
// matches the Sidebar component's <Link href="…"> nodes.
const HINTS: Array<{ selector: string; text: string; placement?: 'right' | 'top' }> = [
  { selector: 'a[href="/projects"]',  text: 'Hier entstehen neue Projekte und Arbeitsbereiche.' },
  { selector: 'a[href="/dashboard"]', text: 'Hier werden Updates von Beteiligten eingesammelt.' },
  { selector: 'a[href="/ai"]',        text: 'Hier entstehen automatische Zusammenfassungen und Briefings.' },
  { selector: 'a[href="/observers"]', text: 'Hier werden Personen, Rollen und Zugriffe verwaltet.' },
]

const TOTAL_STEPS = STEPS.length

export default function WelcomeTour({ forceOpen = false, onDone }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [hintIdx, setHintIdx] = useState(0)
  const [hintRect, setHintRect] = useState<DOMRect | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const checkedRef = useRef(false)

  // Trigger rule (per spec, 2026-05-23):
  //   • Auto-run ONLY when the URL carries ?tour=1 — that flag is set
  //     by the /onboarding redirect right after a fresh registration.
  //     Plain logins or clicks on /dashboard never carry it, so the
  //     tour stays quiet for returning users.
  //   • forceOpen=true (replay link from settings) bypasses everything.
  //   • The DB flag tour_completed_at still gets written on finish so
  //     a manual replay knows the tour was seen, but auto-trigger no
  //     longer depends on it.
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      if (forceOpen) {
        setPhase('modal')
        setStepIdx(0)
        return
      }
      const wantsTour = searchParams?.get('tour') === '1'
      if (!wantsTour) return
      try {
        const stored = window.localStorage.getItem('festag_tour_completed')
        if (stored === '1') return
      } catch {}
      setStepIdx(0)
      setPhase('modal')
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen])

  // Persist step progress (debounced).
  useEffect(() => {
    if (!userId || phase !== 'modal') return
    const t = setTimeout(() => {
      supabase.from('profiles').update({ tour_step: stepIdx + 1 }).eq('id', userId).then(() => undefined, () => undefined)
    }, 350)
    return () => clearTimeout(t)
  }, [stepIdx, phase, userId, supabase])

  // Track the anchored hint's target element on scroll/resize.
  useEffect(() => {
    if (phase !== 'anchored') return
    const hint = HINTS[hintIdx]
    if (!hint) return

    const reposition = () => {
      const el = document.querySelector(hint.selector) as HTMLElement | null
      if (!el) { setHintRect(null); return }
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      // Wait one frame for the smooth-scroll target to settle.
      requestAnimationFrame(() => {
        const target = document.querySelector(hint.selector) as HTMLElement | null
        if (target) setHintRect(target.getBoundingClientRect())
      })
    }

    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    const interval = setInterval(reposition, 600)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      clearInterval(interval)
    }
  }, [phase, hintIdx])

  // Esc key behaviour.
  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'modal') postpone()
        else if (phase === 'anchored') finishAnchored()
      }
      if (phase === 'modal' && e.key === 'ArrowRight') next()
      if (phase === 'modal' && e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIdx])

  // No body-scroll lock — locking causes the surrounding layout to
  // jump (scrollbar disappears, sidebar shifts). The modal has its own
  // backdrop and the page underneath stays put on its own.

  const markComplete = useCallback(async () => {
    setPhase('done')
    try { window.localStorage.setItem('festag_tour_completed', '1') } catch {}
    if (userId) {
      await supabase.from('profiles').update({
        tour_completed_at: new Date().toISOString(),
        tour_step: TOTAL_STEPS,
      }).eq('id', userId)
    }
    onDone?.()
  }, [supabase, userId, onDone])

  const postpone = useCallback(() => {
    setPhase('done')
    onDone?.()
  }, [onDone])

  const next = useCallback(() => {
    if (stepIdx < TOTAL_STEPS - 1) setStepIdx(i => i + 1)
    else setPhase('anchored')
  }, [stepIdx])

  const prev = useCallback(() => {
    if (stepIdx > 0) setStepIdx(i => i - 1)
  }, [stepIdx])

  const finishAnchored = useCallback(() => {
    markComplete()
  }, [markComplete])

  const advanceHint = useCallback(() => {
    if (hintIdx < HINTS.length - 1) setHintIdx(i => i + 1)
    else finishAnchored()
  }, [hintIdx, finishAnchored])

  if (phase === 'idle' || phase === 'done') return null

  // ──────────────────────────────── Modal ──────────────────────────
  if (phase === 'modal') {
    const step = STEPS[stepIdx]
    const isFirst = stepIdx === 0
    const isLast  = stepIdx === TOTAL_STEPS - 1
    return (
      <div className="wt-overlay" role="dialog" aria-modal="true" aria-label="Willkommen bei Festag">
        <style>{CSS}</style>
        <div className="wt-backdrop" onClick={postpone} />
        <div className={`wt-card${isFirst ? ' welcome' : ''}`}>
          <button className="wt-close" type="button" onClick={postpone} aria-label="Schließen">
            <X size={16} />
          </button>

          {isFirst && (
            <div className="wt-mark">
              <TagroLogo size={36} />
            </div>
          )}
          <p className="wt-eyebrow">
            {isFirst ? 'Erster Eindruck' : `Schritt ${stepIdx + 1} von ${TOTAL_STEPS}`}
          </p>
          <h2 className="wt-title">{step.title}</h2>
          <p className="wt-body">{step.body}</p>

          <div className="wt-progress" aria-hidden>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span key={i} className={`wt-dot${i === stepIdx ? ' active' : i < stepIdx ? ' done' : ''}`} />
            ))}
          </div>

          <div className="wt-actions">
            <button
              className="wt-secondary"
              type="button"
              onClick={prev}
              disabled={isFirst}
            >
              <ArrowLeft size={13} /> Zurück
            </button>
            <button className="wt-primary" type="button" onClick={next}>
              {isLast
                ? <>Tour abschließen <Check size={13} weight="bold" /></>
                : isFirst
                  ? <>Einführung starten <ArrowRight size={13} /></>
                  : <>Weiter <ArrowRight size={13} /></>}
            </button>
          </div>
          <button className="wt-skip" type="button" onClick={postpone}>
            {isFirst ? 'Später ansehen' : 'Tour überspringen'}
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────── Anchored hint ──────────────────
  if (phase === 'anchored') {
    const hint = HINTS[hintIdx]
    if (!hintRect || !hint) {
      // Anchor not found in DOM (e.g. mobile rail collapsed) — bail out cleanly.
      return (
        <div className="wt-hint-fallback" role="status">
          <style>{CSS}</style>
          <div className="wt-hint-card floating">
            <p className="wt-hint-text">{hint?.text || 'Tour beendet.'}</p>
            <button type="button" className="wt-hint-cta" onClick={advanceHint}>
              {hintIdx < HINTS.length - 1 ? 'Weiter' : 'Verstanden'}
            </button>
          </div>
        </div>
      )
    }

    const top = hintRect.top + hintRect.height / 2
    const left = hintRect.right + 12
    return (
      <div className="wt-anchor-layer" role="dialog" aria-modal="false" aria-label="Hinweis">
        <style>{CSS}</style>
        <div
          className="wt-spotlight"
          style={{
            top: hintRect.top - 6,
            left: hintRect.left - 6,
            width: hintRect.width + 12,
            height: hintRect.height + 12,
          }}
          aria-hidden
        />
        <div
          className="wt-hint-card"
          style={{ top, left }}
          role="status"
        >
          <p className="wt-hint-eyebrow">Hinweis {hintIdx + 1} von {HINTS.length}</p>
          <p className="wt-hint-text">{hint.text}</p>
          <div className="wt-hint-actions">
            <button type="button" className="wt-hint-skip" onClick={finishAnchored}>
              Tour beenden
            </button>
            <button type="button" className="wt-hint-cta" onClick={advanceHint}>
              {hintIdx < HINTS.length - 1 ? <>Weiter <ArrowRight size={11} /></> : <>Verstanden <Check size={11} weight="bold" /></>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

const CSS = `
  .wt-overlay {
    position: fixed; inset: 0; z-index: 13000;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: wtFade .2s ease both;
  }
  .wt-backdrop {
    position: absolute; inset: 0;
    background: rgba(8,10,14,.55);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
  }
  @keyframes wtFade { from { opacity: 0 } to { opacity: 1 } }

  .wt-card {
    position: relative;
    width: min(480px, calc(100vw - 36px));
    background: var(--card); color: var(--text);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 22px;
    padding: 30px 28px 22px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 28px 72px -28px rgba(15,23,42,.4);
    text-align: left;
    display: flex; flex-direction: column; gap: 12px;
    animation: wtPop .26s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .wt-card,
  [data-theme="classic-dark"] .wt-card {
    background: color-mix(in srgb, var(--card) 95%, #fff 5%);
    box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 28px 80px -28px rgba(0,0,0,.6);
  }
  @keyframes wtPop { from { opacity:0; transform:translateY(8px) scale(.98);} to { opacity:1; transform:none; } }

  .wt-card.welcome { text-align: center; align-items: center; }
  .wt-mark {
    width: 64px; height: 64px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    margin-bottom: 2px;
  }

  .wt-close {
    position: absolute; top: 14px; right: 14px;
    width: 30px; height: 30px;
    border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px;
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .wt-close:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }

  .wt-eyebrow {
    margin: 0; font-size: 10.5px; font-weight: 500; letter-spacing: .14em;
    text-transform: uppercase; color: var(--text-muted);
  }
  .wt-title {
    margin: 0; font-size: 20px; font-weight: 500; letter-spacing: -.005em;
    line-height: 1.3; color: var(--text);
  }
  .wt-body {
    margin: 0; font-size: 14px; line-height: 1.65;
    color: var(--text-secondary); font-weight: 500; letter-spacing: .015em;
  }
  .wt-card.welcome .wt-body { max-width: 380px; }

  .wt-progress {
    display: flex; gap: 6px; margin-top: 6px;
  }
  .wt-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--text-muted); opacity: .25;
    transition: width .2s ease, opacity .2s ease, background .2s ease;
  }
  .wt-dot.done { opacity: .55; }
  .wt-dot.active { width: 22px; border-radius: 999px; opacity: .9; background: var(--btn-prim); }

  .wt-actions {
    display: flex; gap: 8px; margin-top: 10px;
    align-items: center; justify-content: flex-end;
  }
  .wt-card.welcome .wt-actions { justify-content: center; }
  .wt-primary {
    display: inline-flex; align-items: center; gap: 7px;
    height: 38px; padding: 0 18px;
    border: 0; border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 13.5px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: opacity .12s, transform .12s;
  }
  .wt-primary:hover { opacity: .92; }
  .wt-primary:active { transform: scale(.97); }
  .wt-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 14px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: transparent; color: var(--text-secondary);
    border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: background .12s, color .12s, border-color .12s;
  }
  .wt-secondary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-2) 60%, transparent);
    color: var(--text);
  }
  .wt-secondary:disabled { opacity: .35; cursor: not-allowed; }
  .wt-skip {
    margin: 4px 0 0; align-self: center;
    background: transparent; border: 0; padding: 4px 8px;
    color: var(--text-muted); font: inherit; font-size: 12px;
    font-weight: 500; letter-spacing: .015em;
    cursor: pointer;
  }
  .wt-skip:hover { color: var(--text); }

  /* ── Anchored hint phase ──────────────────────────────────── */
  .wt-anchor-layer {
    position: fixed; inset: 0; z-index: 13000;
    pointer-events: none;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .wt-spotlight {
    position: fixed; z-index: 13001;
    border-radius: 12px;
    box-shadow:
      0 0 0 9999px rgba(15,20,30,.35),
      0 0 0 2px var(--btn-prim);
    pointer-events: none;
    transition: top .2s ease, left .2s ease, width .2s ease, height .2s ease;
  }
  .wt-hint-card {
    position: fixed; z-index: 13002;
    transform: translateY(-50%);
    width: 280px; max-width: calc(100vw - 28px);
    padding: 16px 16px 14px;
    background: var(--card); color: var(--text);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 18px 48px -18px rgba(15,23,42,.4);
    pointer-events: auto;
    animation: wtPop .22s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .wt-hint-card,
  [data-theme="classic-dark"] .wt-hint-card {
    background: color-mix(in srgb, var(--card) 95%, #fff 5%);
    box-shadow: 0 1px 2px rgba(0,0,0,.5), 0 24px 60px -22px rgba(0,0,0,.7);
  }
  .wt-hint-card.floating {
    /* Used when the anchor can't be located (e.g. collapsed rail). */
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
  }
  .wt-hint-eyebrow {
    margin: 0 0 4px; font-size: 10px; font-weight: 500;
    letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted);
  }
  .wt-hint-text {
    margin: 0; font-size: 13px; line-height: 1.55;
    color: var(--text); font-weight: 500; letter-spacing: .015em;
  }
  .wt-hint-actions {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 12px; gap: 10px;
  }
  .wt-hint-skip {
    border: 0; background: transparent; padding: 4px 0;
    color: var(--text-muted); font: inherit; font-size: 11.5px;
    font-weight: 500; letter-spacing: .015em; cursor: pointer;
  }
  .wt-hint-skip:hover { color: var(--text); }
  .wt-hint-cta {
    display: inline-flex; align-items: center; gap: 5px;
    height: 30px; padding: 0 14px;
    border: 0; border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: opacity .12s, transform .12s;
  }
  .wt-hint-cta:hover { opacity: .92; }

  /* Mobile / narrow viewport — collapse hint cards next to the anchor
     if the anchor disappears; centred floating fallback handles the
     mobile rail being hidden entirely. */
  @media (max-width: 640px) {
    .wt-card { padding: 24px 20px 20px; }
    .wt-actions { flex-direction: column-reverse; align-items: stretch; }
    .wt-secondary, .wt-primary { justify-content: center; width: 100%; }
  }

  .wt-hint-fallback {
    position: fixed; inset: 0; z-index: 13000;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: rgba(8,10,14,.45);
    backdrop-filter: blur(6px);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
`
