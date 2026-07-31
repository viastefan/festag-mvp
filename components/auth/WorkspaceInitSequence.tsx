'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  WORKSPACE_INIT_LINES as PLATFORM_INIT_LINES,
  WORKSPACE_INIT_DURATION_MS,
} from '@/lib/platform/onboarding'

export const WORKSPACE_INIT_LINES = PLATFORM_INIT_LINES

/** Calm premium init — real work during sequence; total ~800–1500ms. */
export const WORKSPACE_INIT_STEP_MS = Math.round(
  (WORKSPACE_INIT_DURATION_MS.min + WORKSPACE_INIT_DURATION_MS.max) / 2 / PLATFORM_INIT_LINES.length,
)
export const WORKSPACE_INIT_HOLD_MS = 280

export function workspaceInitDuration(lineCount: number = PLATFORM_INIT_LINES.length) {
  return lineCount * WORKSPACE_INIT_STEP_MS + WORKSPACE_INIT_HOLD_MS
}

type Props = {
  active: boolean
  onComplete?: () => void
  className?: string
}

/**
 * Premium first-load sequence after Build Projects.
 * Same dusk language as onboarding — not a spinner.
 */
export default function WorkspaceInitSequence({ active, onComplete, className = '' }: Props) {
  const lines = useMemo(() => [...WORKSPACE_INIT_LINES], [])
  const [index, setIndex] = useState(0)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      setEntered(false)
      return
    }
    const enter = window.setTimeout(() => setEntered(true), 40)
    const timers: number[] = [enter]
    for (let i = 1; i < lines.length; i++) {
      timers.push(window.setTimeout(() => setIndex(i), i * WORKSPACE_INIT_STEP_MS))
    }
    timers.push(
      window.setTimeout(() => {
        onComplete?.()
      }, workspaceInitDuration(lines.length)),
    )
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [active, lines, onComplete])

  if (!active) return null

  const progress = Math.min(1, (index + 1) / lines.length)

  return (
    <>
      <style>{INIT_CSS}</style>
      <div
        className={`ws-init${entered ? ' is-entered' : ''}${className ? ` ${className}` : ''}`}
        role="status"
        aria-live="polite"
        aria-busy={index < lines.length - 1}
      >
        <div className="ws-init-ambient" aria-hidden />
        <div className="ws-init-stage">
          <div className="ws-init-line" key={index}>
            {lines[index]}
          </div>
          <div className="ws-init-track" aria-hidden>
            <div className="ws-init-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>
      </div>
    </>
  )
}

const INIT_CSS = `
  .ws-init {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0C0D12;
    opacity: 0;
    transition: opacity .35s cubic-bezier(.22,1,.36,1);
    overflow: hidden;
  }
  .ws-init.is-entered { opacity: 1; }
  .ws-init-ambient {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse 70% 42% at 50% -8%, rgba(91, 100, 125, 0.18), transparent 58%),
      radial-gradient(ellipse 55% 36% at 82% 108%, rgba(91, 100, 125, 0.08), transparent 52%),
      linear-gradient(180deg, #10121A 0%, #0C0D12 42%, #0E1018 100%);
  }
  .ws-init-stage {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
    padding: 0 28px;
    max-width: 420px;
    width: 100%;
  }
  .ws-init-line {
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: 22px;
    line-height: 1.35;
    letter-spacing: -0.02em;
    font-weight: 400;
    color: rgba(230, 232, 238, 0.92);
    text-align: center;
    animation: wsInitIn .42s cubic-bezier(.16,1,.3,1) both;
  }
  .ws-init-track {
    width: min(180px, 42vw);
    height: 2px;
    border-radius: 999px;
    background: rgba(230, 232, 238, 0.08);
    overflow: hidden;
  }
  .ws-init-fill {
    height: 100%;
    width: 100%;
    transform-origin: left center;
    background: rgba(91, 100, 125, 0.85);
    transition: transform .45s cubic-bezier(.22,1,.36,1);
  }
  @keyframes wsInitIn {
    from {
      opacity: 0;
      transform: translateY(10px);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ws-init, .ws-init-line, .ws-init-fill { animation: none !important; transition: none !important; }
  }
`
