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
 * Not a spinner — a calm OS readiness beat.
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

  return (
    <>
      <style>{INIT_CSS}</style>
      <div
        className={`ws-init${entered ? ' is-entered' : ''}${className ? ` ${className}` : ''}`}
        role="status"
        aria-live="polite"
        aria-busy={index < lines.length - 1}
      >
        <div className="ws-init-line" key={index}>
          {lines[index]}
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
    background: #070708;
    opacity: 0;
    transition: opacity .35s cubic-bezier(.22,1,.36,1);
  }
  .ws-init.is-entered { opacity: 1; }
  .ws-init-line {
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: 22px;
    line-height: 1.35;
    letter-spacing: -0.02em;
    font-weight: 400;
    color: rgba(230, 232, 238, 0.88);
    animation: wsInitIn .42s cubic-bezier(.16,1,.3,1) both;
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
    .ws-init, .ws-init-line { animation: none !important; transition: none !important; }
  }
`
