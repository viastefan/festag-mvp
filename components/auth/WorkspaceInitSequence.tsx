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
 * Lines are short + stage is wide so text never clips on mobile.
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
          <p className="ws-init-line" key={index}>
            {lines[index]}
          </p>
          <div className="ws-init-mark" aria-hidden>
            <span className={`ws-init-pair${progress >= 0.4 ? ' is-lit' : ''}${progress >= 1 ? ' is-ready' : ''}`}>
              <i className="ws-init-n ws-init-n--a" />
              <i className="ws-init-n ws-init-n--b" />
            </span>
            <span className={`ws-init-pair ws-init-pair--short${progress >= 0.75 ? ' is-lit' : ''}${progress >= 1 ? ' is-ready' : ''}`}>
              <i className="ws-init-n ws-init-n--a" />
              <i className="ws-init-n ws-init-n--b" />
            </span>
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
    align-items: flex-start;
    justify-content: flex-start;
    box-sizing: border-box;
    padding: clamp(72px, 14vh, 120px) max(24px, env(safe-area-inset-right)) 24px max(var(--al-os-gutter, 72px), env(safe-area-inset-left));
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(255, 255, 255, 0.035), transparent 55%),
      linear-gradient(180deg, #10121A 0%, #0C0D12 48%, #0B0C10 100%);
    opacity: 0;
    transition: opacity .35s cubic-bezier(.22,1,.36,1);
    overflow: visible;
  }
  .ws-init.is-entered { opacity: 1; }
  .ws-init-ambient {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(255, 255, 255, 0.035), transparent 55%),
      linear-gradient(180deg, #10121A 0%, #0C0D12 48%, #0B0C10 100%);
  }
  .ws-init-stage {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 22px;
    width: min(100%, 640px);
    max-width: 100%;
    box-sizing: border-box;
    padding: 12px 0;
    overflow: visible;
  }
  .ws-init-line {
    margin: 0;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: clamp(22px, 3.2vw, 36px);
    line-height: 1.25;
    letter-spacing: -0.028em;
    font-weight: 400;
    color: rgba(245, 245, 247, 0.92);
    text-align: left;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: normal;
    text-wrap: balance;
    padding: 0;
    min-height: 2.8em;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    animation: wsInitIn .42s cubic-bezier(.16,1,.3,1) both;
  }
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
  .ws-init-pair.is-lit {
    opacity: 0.72;
  }
  .ws-init-pair.is-ready {
    opacity: 0.92;
  }
  .ws-init-n {
    display: block;
    border-radius: 50%;
    background: rgba(230, 232, 238, 0.92);
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
  .ws-init-pair:not(.is-lit) .ws-init-n--b {
    animation: none;
  }
  @keyframes wsInitSwapA {
    0%, 100% { width: 7px; height: 7px; opacity: 0.95; }
    50% { width: 4px; height: 4px; opacity: 0.5; }
  }
  @keyframes wsInitSwapB {
    0%, 100% { width: 4px; height: 4px; opacity: 0.5; }
    50% { width: 7px; height: 7px; opacity: 0.95; }
  }
  html[data-theme="light"] .ws-init-n,
  html[data-theme="read"] .ws-init-n {
    background: rgba(26, 25, 23, 0.88);
  }
  .ws-init-track { display: none; }
  .ws-init-fill { display: none; }
  html[data-theme="light"] .ws-init,
  html[data-theme="read"] .ws-init {
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
      linear-gradient(180deg, #FBFAF6 0%, #FAF9F5 48%, #F3F0E8 100%);
  }
  html[data-theme="light"] .ws-init-ambient,
  html[data-theme="read"] .ws-init-ambient {
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
      linear-gradient(180deg, #FBFAF6 0%, #FAF9F5 48%, #F3F0E8 100%);
  }
  html[data-theme="light"] .ws-init-line,
  html[data-theme="read"] .ws-init-line {
    color: rgba(26, 25, 23, 0.92);
  }
  html[data-theme="light"] .ws-init-track,
  html[data-theme="read"] .ws-init-track {
    background: rgba(30, 30, 32, 0.08);
  }
  html[data-theme="light"] .ws-init-fill,
  html[data-theme="read"] .ws-init-fill {
    background: rgba(26, 25, 23, 0.72);
  }
  html[data-theme="dark"] .ws-init-fill {
    background: rgba(235, 232, 227, 0.82);
  }
  @keyframes wsInitIn {
    from {
      opacity: 0;
      transform: translateY(8px);
      filter: blur(2.5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }
  @media (max-width: 768px) {
    .ws-init {
      padding: clamp(56px, 12vh, 88px) 32px 24px;
      align-items: flex-start;
      justify-content: flex-start;
    }
    .ws-init-line {
      font-size: 28px;
      line-height: 32px;
    }
  }
  @media (max-width: 380px) {
    .ws-init-line {
      font-size: 24px;
      letter-spacing: -0.02em;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ws-init, .ws-init-line, .ws-init-fill { animation: none !important; transition: none !important; filter: none !important; }
  }
`
