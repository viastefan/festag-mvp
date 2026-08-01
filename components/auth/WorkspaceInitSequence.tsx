'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MASTER_PREP_LINES } from '@/lib/platform/master-onboarding'
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
 * Prepare screen — ivory lyrics + logo-style paired dots (master canvas 1:1).
 */
export default function WorkspaceInitSequence({ active, onComplete, className = '' }: Props) {
  const lines = useMemo(() => [...MASTER_PREP_LINES], [])
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

          <div className="ws-init-mark" aria-hidden>
            <span
              className={`ws-init-pair${fillProgress >= 0.4 ? ' is-lit' : ''}${ready ? ' is-ready' : ''}`}
            >
              <i className="ws-init-n ws-init-n--a" />
              <i className="ws-init-n ws-init-n--b" />
            </span>
            <span
              className={`ws-init-pair ws-init-pair--short${fillProgress >= 0.75 ? ' is-lit' : ''}${ready ? ' is-ready' : ''}`}
            >
              <i className="ws-init-n ws-init-n--a" />
              <i className="ws-init-n ws-init-n--b" />
            </span>
          </div>
        </div>
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
    align-items: center;
    justify-content: center;
    padding: clamp(56px, 12vh, 96px) 28px 40px;
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
      linear-gradient(180deg, #FBFAF6 0%, #FAF9F5 48%, #F3F0E8 100%);
    opacity: 0;
    transition: opacity .35s ease;
    font-family: Aeonik, system-ui, sans-serif;
    font-weight: 400;
  }
  .ws-init.is-entered { opacity: 1; }
  .ws-init-stage {
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 28px;
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
    letter-spacing: -0.01em;
    font-weight: 400;
    color: rgba(26, 25, 23, 0.28);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    transition: opacity .58s cubic-bezier(.22,1,.36,1), transform .58s cubic-bezier(.22,1,.36,1);
  }
  .ws-init-line span { color: inherit; transition: color .07s linear; }
  .ws-init-line span.is-lit { color: rgba(26, 25, 23, 0.92); }

  .ws-init-mark {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    flex-shrink: 0;
    align-self: flex-start;
    min-height: 28px;
    justify-content: center;
  }
  .ws-init-pair {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 8px;
    opacity: 0.22;
    transition: opacity .35s ease;
  }
  .ws-init-pair--short {
    transform-origin: left center;
    transform: scaleX(0.78);
  }
  .ws-init-pair.is-lit { opacity: 0.72; }
  .ws-init-pair.is-ready { opacity: 0.92; }
  .ws-init-n {
    display: block;
    border-radius: 50%;
    background: rgba(26, 25, 23, 0.88);
    flex-shrink: 0;
  }
  .ws-init-n--a {
    width: 7px;
    height: 7px;
    animation: wsInitSwapA 1.45s cubic-bezier(.45,.05,.55,.95) infinite;
  }
  .ws-init-n--b {
    width: 4px;
    height: 4px;
    animation: wsInitSwapB 1.45s cubic-bezier(.45,.05,.55,.95) infinite;
  }
  .ws-init-pair:nth-child(2) .ws-init-n--a,
  .ws-init-pair:nth-child(2) .ws-init-n--b { animation-delay: .2s; }
  .ws-init-pair:not(.is-lit) .ws-init-n--a,
  .ws-init-pair:not(.is-lit) .ws-init-n--b { animation: none; }
  @keyframes wsInitSwapA {
    0%, 100% { width: 7px; height: 7px; opacity: 0.95; }
    50% { width: 4px; height: 4px; opacity: 0.5; }
  }
  @keyframes wsInitSwapB {
    0%, 100% { width: 4px; height: 4px; opacity: 0.5; }
    50% { width: 7px; height: 7px; opacity: 0.95; }
  }

  @media (max-width: 380px) {
    .ws-init-line { font-size: 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ws-init, .ws-init-line { transition: none !important; }
    .ws-init-n--a, .ws-init-n--b { animation: none !important; }
  }
`
