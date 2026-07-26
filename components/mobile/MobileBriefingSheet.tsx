'use client'

/**
 * MobileBriefingSheet — mobile-only status peek after login.
 *
 * States
 *   peek  — full card slides up from bottom, shows key stats + Anhören CTA
 *   mini  — card snaps to a compact strip at the screen edge (56px visible)
 *   gone  — completely dismissed for this session
 *
 * Interaction
 *   • Auto-shows after 500ms on first mount (sessionStorage gate).
 *   • Drag handle / drag down → mini (below a velocity/distance threshold).
 *   • Hard swipe past 30% of card height → gone immediately.
 *   • Tap mini strip → expands back to peek.
 *   • "Anhören" button → fires onListenBriefing, sheet stays open.
 */

import { useEffect, useRef, useState } from 'react'
import { Play, CaretUp, Scales, CheckSquare } from '@phosphor-icons/react'

export type MobileBriefingSheetProps = {
  openDecisionsCount: number
  blockersCount: number
  openTasksCount?: number
  hasBriefing: boolean
  onListenBriefing: () => void
}

type SheetState = 'hidden' | 'peek' | 'mini' | 'gone'

const SESSION_KEY = 'festag-briefing-sheet-state'
const CARD_HEIGHT = 216  // px — full sheet height (excl. safe area)
const MINI_HEIGHT = 56   // px — visible strip in mini state

export default function MobileBriefingSheet({
  openDecisionsCount,
  blockersCount,
  openTasksCount = 0,
  hasBriefing,
  onListenBriefing,
}: MobileBriefingSheetProps) {
  const [state, setState] = useState<SheetState>('hidden')

  /* drag tracking */
  const dragStartY   = useRef(0)
  const dragCurrent  = useRef(0)
  const dragStartTime = useRef(0)
  const isDragging   = useRef(false)
  const rootRef      = useRef<HTMLDivElement | null>(null)

  /* ── Auto-show ───────────────────────────────────────────────────── */
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY) as SheetState | null
    if (saved === 'gone') return
    const t = window.setTimeout(() => setState('peek'), 500)
    return () => window.clearTimeout(t)
  }, [])

  /* ── Persist state ───────────────────────────────────────────────── */
  useEffect(() => {
    if (state === 'hidden') return
    sessionStorage.setItem(SESSION_KEY, state)
  }, [state])

  /* ── Drag gesture (touch) ────────────────────────────────────────── */
  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current   = e.touches[0].clientY
    dragCurrent.current  = 0
    dragStartTime.current = Date.now()
    isDragging.current   = true
    if (rootRef.current) rootRef.current.style.transition = 'none'
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta < 0) return                   // only allow downward drag
    dragCurrent.current = delta
    const translatePeek  = delta                              // peek: offset from bottom
    const translateBase  = CARD_HEIGHT - MINI_HEIGHT          // mini: already partially off
    const translate = state === 'peek'
      ? Math.max(0, translatePeek)
      : translateBase + Math.max(0, delta)
    if (rootRef.current) {
      rootRef.current.style.transform = `translateY(${translate}px)`
    }
  }

  function onTouchEnd() {
    isDragging.current = false
    if (rootRef.current) rootRef.current.style.transition = ''

    const elapsed = Date.now() - dragStartTime.current
    const velocity = dragCurrent.current / Math.max(elapsed, 1)   // px/ms
    const dragged  = dragCurrent.current

    if (state === 'peek') {
      if (velocity > 0.6 || dragged > CARD_HEIGHT * 0.55) {
        /* hard swipe → gone */
        setState('gone')
      } else if (dragged > 48) {
        /* gentle drag → mini */
        setState('mini')
      } else {
        /* snap back to peek */
        setState('peek')
      }
    } else if (state === 'mini') {
      if (velocity > 0.7 || dragged > MINI_HEIGHT * 1.2) {
        setState('gone')
      } else {
        setState('mini')
      }
    }
    dragCurrent.current = 0
  }

  /* ── Not rendered until first show ─────────────────────────────── */
  if (state === 'hidden' || state === 'gone') return null

  /* ── Derived display values ─────────────────────────────────────── */
  const atMini = state === 'mini'
  const decisionsLabel =
    openDecisionsCount === 0 ? 'Keine offenen Entscheidungen'
    : openDecisionsCount === 1 ? '1 offene Entscheidung'
    : `${openDecisionsCount} offene Entscheidungen`

  const tasksLabel =
    openTasksCount === 1 ? '1 Task offen'
    : openTasksCount > 1 ? `${openTasksCount} Tasks offen`
    : ''

  const pulse = blockersCount > 0 ? 'red' : openDecisionsCount > 0 ? 'amber' : 'green'

  return (
    <>
      <style>{MBS_CSS}</style>

      {/* Backdrop — only in peek */}
      {!atMini && (
        <div
          className="mbs-backdrop"
          onClick={() => setState('mini')}
          aria-hidden
        />
      )}

      <div
        ref={rootRef}
        className={`mbs-root mbs-state-${state}`}
        data-state={state}
        role={atMini ? 'button' : 'dialog'}
        aria-label={atMini ? 'Briefing einblenden' : 'Tagesüberblick'}
        tabIndex={0}
        onClick={atMini ? () => setState('peek') : undefined}
        onKeyDown={atMini ? (e) => { if (e.key === 'Enter' || e.key === ' ') setState('peek') } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* ── Drag grip ──────────────────────────────────────────── */}
        <div className="mbs-grip-area" aria-hidden>
          <div className="mbs-grip" />
        </div>

        {/* ── Mini strip — visible only when minimised ──────────── */}
        <div className="mbs-mini-bar">
          <span className={`mbs-pulse mbs-pulse--${pulse}`} aria-hidden />
          <span className="mbs-mini-label">{decisionsLabel}</span>
          {hasBriefing && (
            <button
              type="button"
              className="mbs-mini-listen"
              aria-label="Statusbericht anhören"
              onClick={(e) => { e.stopPropagation(); onListenBriefing() }}
            >
              <Play size={12} weight="fill" />
              <span>Anhören</span>
            </button>
          )}
          <span className="mbs-mini-expand" aria-hidden>
            <CaretUp size={12} weight="bold" />
          </span>
        </div>

        {/* ── Full content — visible only in peek ─────────────── */}
        <div className="mbs-body" aria-hidden={atMini}>
          <div className="mbs-stats">
            <div className="mbs-stat-row">
              <span className={`mbs-stat-dot mbs-stat-dot--${pulse}`} aria-hidden />
              <div className="mbs-stat-text">
                <p className="mbs-stat-label">
                  <Scales size={13} weight="regular" className="mbs-stat-icon" />
                  {decisionsLabel}
                </p>
                {tasksLabel ? (
                  <p className="mbs-stat-sub">
                    <CheckSquare size={13} weight="regular" className="mbs-stat-icon" />
                    {tasksLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {hasBriefing && (
            <button
              type="button"
              className="mbs-listen-btn"
              onClick={(e) => { e.stopPropagation(); onListenBriefing(); setState('mini') }}
            >
              <Play size={15} weight="fill" className="mbs-listen-icon" />
              <span>Statusbericht anhören</span>
            </button>
          )}

          <button
            type="button"
            className="mbs-dismiss"
            aria-label="Schließen"
            onClick={(e) => { e.stopPropagation(); setState('mini') }}
          >
            Schließen
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── CSS ─────────────────────────────────────────────────────────────── */

const MBS_CSS = `
  /* Only show on mobile — never renders on desktop */
  @media (min-width: 769px) {
    .mbs-root, .mbs-backdrop { display: none !important; }
  }

  /* Backdrop — dim behind full sheet */
  .mbs-backdrop {
    position: fixed;
    inset: 0;
    z-index: 98;
    background: rgba(0, 0, 0, 0.22);
    animation: mbsBackdropIn 0.28s ease both;
  }
  @keyframes mbsBackdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* Root sheet — fixed height so mini translateY always shows exactly 56px */
  .mbs-root {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 99;
    height: 248px;
    border-radius: 22px 22px 0 0;
    background: #ffffff;
    box-shadow:
      0 -1px 0 rgba(0, 0, 0, 0.06),
      0 -12px 40px rgba(0, 0, 0, 0.14);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition:
      transform 0.42s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.3s ease;
    will-change: transform;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    box-sizing: border-box;
  }
  [data-theme="dark"] .mbs-root,
  [data-theme="classic-dark"] .mbs-root {
    background: #0c0c0e;
    box-shadow:
      0 -1px 0 rgba(255, 255, 255, 0.05),
      0 -12px 40px rgba(0, 0, 0, 0.55);
  }

  /* State transforms */
  .mbs-state-peek {
    transform: translateY(0);
    animation: mbsSheetIn 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  /* mini: slide down until only the bottom 56px strip shows */
  .mbs-state-mini {
    transform: translateY(calc(100% - 56px));
    cursor: pointer;
    box-shadow:
      0 -1px 0 rgba(0, 0, 0, 0.06),
      0 -4px 16px rgba(0, 0, 0, 0.08);
  }
  [data-theme="dark"] .mbs-state-mini,
  [data-theme="classic-dark"] .mbs-state-mini {
    box-shadow:
      0 -1px 0 rgba(255, 255, 255, 0.06),
      0 -4px 16px rgba(0, 0, 0, 0.38);
  }

  @keyframes mbsSheetIn {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  /* Grip area */
  .mbs-grip-area {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 0 6px;
  }
  .mbs-grip {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.14);
  }
  [data-theme="dark"] .mbs-grip,
  [data-theme="classic-dark"] .mbs-grip {
    background: rgba(255, 255, 255, 0.18);
  }

  /* Mini bar — always at the bottom of the card (shown when card snaps down) */
  .mbs-mini-bar {
    flex-shrink: 0;
    height: 56px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px 0;
    padding-bottom: max(0px, calc(env(safe-area-inset-bottom, 0px) - 16px));
    margin-top: auto;
  }
  .mbs-state-peek .mbs-mini-bar { display: none; }

  .mbs-pulse {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .mbs-pulse--green  { background: #34c759; }
  .mbs-pulse--amber  { background: #ff9f0a; }
  .mbs-pulse--red    { background: #ff3b30; }

  .mbs-mini-label {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 400;
    color: #1e1e20;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  [data-theme="dark"] .mbs-mini-label,
  [data-theme="classic-dark"] .mbs-mini-label {
    color: rgba(245, 245, 247, 0.88);
  }

  .mbs-mini-listen {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(30, 30, 32, 0.10);
    background: #f5f5f7;
    color: #1e1e20;
    font-size: 12.5px;
    font-weight: 400;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.1s ease;
  }
  .mbs-mini-listen:active { background: #e8e8ed; }
  [data-theme="dark"] .mbs-mini-listen,
  [data-theme="classic-dark"] .mbs-mini-listen {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.10);
    color: rgba(245, 245, 247, 0.9);
  }
  [data-theme="dark"] .mbs-mini-listen:active,
  [data-theme="classic-dark"] .mbs-mini-listen:active {
    background: rgba(255, 255, 255, 0.13);
  }

  .mbs-mini-expand {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(30, 30, 32, 0.3);
  }
  [data-theme="dark"] .mbs-mini-expand,
  [data-theme="classic-dark"] .mbs-mini-expand {
    color: rgba(255, 255, 255, 0.25);
  }

  /* Body — full content in peek state */
  .mbs-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 10px 24px 4px;
    overflow: hidden;
  }
  .mbs-state-mini .mbs-body {
    visibility: hidden;
    pointer-events: none;
  }

  /* Stats block */
  .mbs-stats {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mbs-stat-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .mbs-stat-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 4px;
  }
  .mbs-stat-dot--green  { background: #34c759; }
  .mbs-stat-dot--amber  { background: #ff9f0a; }
  .mbs-stat-dot--red    { background: #ff3b30; }
  .mbs-stat-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .mbs-stat-icon {
    vertical-align: -2px;
    margin-right: 5px;
    opacity: 0.5;
  }
  .mbs-stat-label {
    font-size: 15.5px;
    font-weight: 400;
    color: #1e1e20;
    letter-spacing: -0.014em;
    line-height: 1.35;
    margin: 0;
  }
  .mbs-stat-sub {
    font-size: 13.5px;
    color: #8891a0;
    letter-spacing: 0.005em;
    line-height: 1.4;
    margin: 0;
  }
  [data-theme="dark"] .mbs-stat-label,
  [data-theme="classic-dark"] .mbs-stat-label {
    color: rgba(245, 245, 247, 0.92);
  }
  [data-theme="dark"] .mbs-stat-sub,
  [data-theme="classic-dark"] .mbs-stat-sub {
    color: rgba(245, 245, 247, 0.44);
  }

  /* Listen CTA */
  .mbs-listen-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid rgba(30, 30, 32, 0.09);
    background: #ffffff;
    color: #1e1e20;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.008em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    align-self: flex-start;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: background 0.1s ease, box-shadow 0.1s ease;
  }
  .mbs-listen-btn:active {
    background: #f5f5f7;
    box-shadow: none;
  }
  [data-theme="dark"] .mbs-listen-btn,
  [data-theme="classic-dark"] .mbs-listen-btn {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.10);
    color: rgba(245, 245, 247, 0.9);
    box-shadow: none;
  }
  [data-theme="dark"] .mbs-listen-btn:active,
  [data-theme="classic-dark"] .mbs-listen-btn:active {
    background: rgba(255, 255, 255, 0.12);
  }
  .mbs-listen-icon {
    color: #5B647D;
    flex-shrink: 0;
  }
  [data-theme="dark"] .mbs-listen-icon,
  [data-theme="classic-dark"] .mbs-listen-icon {
    color: rgba(245, 245, 247, 0.5);
  }

  /* Dismiss link */
  .mbs-dismiss {
    border: 0;
    background: none;
    font-size: 12.5px;
    color: #8891a0;
    cursor: pointer;
    padding: 0;
    align-self: flex-start;
    letter-spacing: 0.005em;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.1s ease;
  }
  .mbs-dismiss:active { color: #1e1e20; }
  [data-theme="dark"] .mbs-dismiss,
  [data-theme="classic-dark"] .mbs-dismiss {
    color: rgba(255, 255, 255, 0.3);
  }
  [data-theme="dark"] .mbs-dismiss:active,
  [data-theme="classic-dark"] .mbs-dismiss:active {
    color: rgba(255, 255, 255, 0.7);
  }
`
