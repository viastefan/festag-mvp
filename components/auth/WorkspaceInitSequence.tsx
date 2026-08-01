'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MASTER_FLOW_DOTS, MASTER_PREP_LINES } from '@/lib/platform/master-onboarding'
import { WORKSPACE_INIT_DURATION_MS } from '@/lib/platform/onboarding'

export const WORKSPACE_INIT_LINES = MASTER_PREP_LINES

/** Canvas PreparingStage dwell per lyric line. */
export const WORKSPACE_INIT_STEP_MS = 2400
export const WORKSPACE_INIT_HOLD_MS = 900

export function workspaceInitDuration(lineCount: number = MASTER_PREP_LINES.length) {
  /* Cap total toward constitution 800–1500ms when lines are short; otherwise canvas tempo. */
  const canvasTotal = lineCount * WORKSPACE_INIT_STEP_MS + WORKSPACE_INIT_HOLD_MS
  const target =
    (WORKSPACE_INIT_DURATION_MS.min + WORKSPACE_INIT_DURATION_MS.max) / 2
  return Math.min(canvasTotal, Math.max(target, lineCount * 320 + WORKSPACE_INIT_HOLD_MS))
}

type Props = {
  active: boolean
  onComplete?: () => void
  className?: string
}

/**
 * Prepare screen — centered lyrics; footer navi = loading bar (each prior card registers).
 */
export default function WorkspaceInitSequence({ active, onComplete, className = '' }: Props) {
  const lines = useMemo(() => [...MASTER_PREP_LINES], [])
  const flowDots = MASTER_FLOW_DOTS
  const stepMs = useMemo(() => {
    const total = workspaceInitDuration(lines.length)
    return Math.max(280, Math.floor((total - WORKSPACE_INIT_HOLD_MS) / lines.length))
  }, [lines.length])

  const [index, setIndex] = useState(0)
  const [lit, setLit] = useState(0)
  const [entered, setEntered] = useState(false)
  const raf = useRef(0)
  const fillStart = useRef(0)
  const completedRef = useRef(false)

  const PREP_FONT = 26
  const LINE_SLOT = Math.round(PREP_FONT * 1.3)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      setLit(0)
      setEntered(false)
      completedRef.current = false
      return
    }
    const enter = window.setTimeout(() => setEntered(true), 40)
    const timers: number[] = [enter]
    for (let i = 1; i < lines.length; i++) {
      timers.push(window.setTimeout(() => setIndex(i), i * stepMs))
    }
    timers.push(
      window.setTimeout(() => {
        if (completedRef.current) return
        completedRef.current = true
        onComplete?.()
      }, workspaceInitDuration(lines.length)),
    )
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [active, lines, onComplete, stepMs])

  useEffect(() => {
    if (!active) return
    const text = lines[index] || ''
    const total = Array.from(text).length
    if (!total) {
      setLit(0)
      return
    }
    const fillMs = Math.min(stepMs * 0.78, Math.max(420, total * 28))
    fillStart.current = performance.now()
    setLit(0)
    cancelAnimationFrame(raf.current)
    const tick = (now: number) => {
      const p = Math.min(1, (now - fillStart.current) / fillMs)
      const eased = 1 - (1 - p) * (1 - p)
      setLit(Math.floor(eased * total))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setLit(total)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [active, index, lines, stepMs])

  if (!active) return null

  const fillProgress = Math.min(
    1,
    (index + lit / Math.max(1, Array.from(lines[index] || '').length)) / lines.length,
  )
  const ready =
    index >= lines.length - 1 && lit >= Array.from(lines[index] || '').length

  return (
    <>
      <style>{INIT_CSS}</style>
      <div
        className={`ws-init${entered ? ' is-entered' : ''}${className ? ` ${className}` : ''}`}
        role="status"
        aria-live="polite"
        aria-busy={!ready}
      >
        <div className="ws-init-stage">
          <div className="ws-init-lyrics" aria-hidden>
            {lines.map((text, i) => {
              const offset = i - index
              if (offset < -2 || offset > 2) return null
              const isCurrent = offset === 0
              const opacity =
                offset <= -2
                  ? 0
                  : offset === -1
                    ? 0.42
                    : offset === 0
                      ? 1
                      : offset === 1
                        ? 0.42
                        : 0
              return (
                <p
                  key={`prep-${i}`}
                  className="ws-init-line"
                  style={{
                    transform: `translate3d(0, ${offset * LINE_SLOT}px, 0)`,
                    opacity,
                  }}
                >
                  {Array.from(text).map((ch, ci) => (
                    <span
                      key={ci}
                      className={isCurrent && ci < lit ? 'is-lit' : undefined}
                    >
                      {ch}
                    </span>
                  ))}
                </p>
              )
            })}
          </div>
        </div>

        <footer className="ws-init-footer">
          <button
            type="button"
            className="ws-init-nav"
            aria-label={ready ? 'Festag öffnen' : 'Workspace wird eingerichtet'}
            aria-busy={!ready}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fillProgress * 100)}
            onClick={() => {
              if (!ready || completedRef.current) return
              completedRef.current = true
              onComplete?.()
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="ws-init-logo"
              src="/brand/festag-mark-fluid.png?v=20260731"
              alt=""
              width={22}
              height={22}
            />
            <span className="ws-init-beads" aria-hidden>
              {flowDots.map((dot, i) => {
                const n = flowDots.length
                const beadLit = fillProgress > (i + 0.12) / n || ready
                const active =
                  !ready && fillProgress >= i / n && fillProgress < (i + 1) / n
                return (
                  <span
                    key={dot.id}
                    title={dot.label}
                    className={`ws-init-bead${beadLit ? ' is-lit' : ''}${active ? ' is-active' : ''}${ready ? ' is-ready' : ''}`}
                  />
                )
              })}
            </span>
          </button>
        </footer>
      </div>
    </>
  )
}

const INIT_CSS = /* css */ `
  .ws-init {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0;
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
      linear-gradient(180deg, #FCFAF3 0%, #FBF7EE 48%, #F3EFE4 100%);
    opacity: 0;
    transition: opacity .35s ease;
    font-family: 'Aeonik', system-ui, sans-serif !important;
    font-weight: 400 !important;
    font-synthesis: none;
  }
  .ws-init,
  .ws-init button,
  .ws-init p,
  .ws-init span {
    font-family: 'Aeonik', system-ui, sans-serif !important;
    font-weight: 400 !important;
  }
  .ws-init.is-entered { opacity: 1; }
  .ws-init-stage {
    flex: 1;
    width: 100%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 56px 28px 120px;
    box-sizing: border-box;
    min-height: 0;
  }
  .ws-init-lyrics {
    position: relative;
    width: 100%;
    height: ${Math.round(26 * 1.3) * 3}px;
    overflow: hidden;
    mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
  }
  .ws-init-line {
    position: absolute;
    left: 0;
    right: 0;
    top: ${Math.round(26 * 1.3)}px;
    margin: 0;
    height: ${Math.round(26 * 1.3)}px;
    font-size: 26px;
    line-height: ${Math.round(26 * 1.3)}px;
    letter-spacing: 0.006em;
    font-weight: 400;
    color: rgba(26, 25, 23, 0.28);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    transition: opacity .58s cubic-bezier(.22,1,.36,1), transform .58s cubic-bezier(.22,1,.36,1);
  }
  .ws-init-line span { color: inherit; transition: color .07s linear; }
  .ws-init-line span.is-lit { color: rgba(26, 25, 23, 0.92); }

  .ws-init-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 6;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
    background: transparent;
    box-sizing: border-box;
    pointer-events: none;
  }
  .ws-init-nav {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 14px;
    height: 36px;
    min-height: 36px;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: rgba(26, 25, 23, 0.88);
    cursor: default;
    pointer-events: auto;
    font-family: inherit;
  }
  .ws-init-nav:not([aria-busy="true"]) {
    cursor: pointer;
  }
  .ws-init-logo {
    width: 22px;
    height: 22px;
    object-fit: contain;
    flex-shrink: 0;
    filter: brightness(0) saturate(100%);
    opacity: 0.9;
  }
  .ws-init-beads {
    display: inline-flex;
    align-items: center;
    gap: 9px;
  }
  .ws-init-bead {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.16;
    flex-shrink: 0;
    transition: width .42s cubic-bezier(.22,1,.36,1), opacity .28s ease;
  }
  .ws-init-bead.is-lit {
    width: 14px;
    opacity: 0.45;
  }
  .ws-init-bead.is-active {
    width: 26px;
    opacity: 0.85;
  }
  .ws-init-bead.is-ready {
    width: 14px;
    opacity: 0.88;
  }
  .ws-init-bead.is-ready.is-active,
  .ws-init-bead.is-ready:last-child {
    width: 26px;
  }

  @media (max-width: 380px) {
    .ws-init-line { font-size: 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ws-init, .ws-init-line { transition: none !important; }
    .ws-init-bead { transition: none !important; }
  }
`
