'use client'

import { useEffect, useRef, useState } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagOutsideClickHint, isPointerOverOverlay } from '@/hooks/useFestagOutsideClickHint'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'
import { FESTAG_SHEET_MS, prefersReducedMotion } from '@/lib/festag-sheet-motion'

type Props = {
  open: boolean
  onClose: () => void
  /** Current surface — copy + CTA target the opposite panel. */
  variant: 'client' | 'dev'
  onSwitch: () => void
}

/**
 * Sheet to switch Client ↔ Dev auth panels.
 * H1 = one calm sentence, T1 = next sentence, then Linear CTA.
 */
export default function AuthPanelSwitchModal({ open, onClose, variant, onSwitch }: Props) {
  const { mounted, visible } = useFestagPopupPresence(open)
  const { showHint, onOverlayPointer, reset } = useFestagOutsideClickHint(open, 1)
  const [switching, setSwitching] = useState(false)
  const switchTimerRef = useRef<number | null>(null)

  const isClient = variant === 'client'
  const title = isClient
    ? 'Du bleibst im gleichen Workspace — jetzt aus der Dev-Perspektive.'
    : 'Du bleibst im gleichen Workspace — jetzt aus der Client-Perspektive.'
  const body = isClient
    ? 'Wechsle zu Dev für Umsetzung, Reviews und technische Details.'
    : 'Wechsle zu Client für Status, Freigaben und die ruhige Projektansicht.'
  const cta = isClient ? 'Zum Dev Panel' : 'Zum Client Panel'

  useEffect(() => {
    if (!open) {
      reset()
      if (switchTimerRef.current == null) setSwitching(false)
    }
  }, [open, reset])

  useEffect(() => {
    return () => {
      if (switchTimerRef.current != null) {
        window.clearTimeout(switchTimerRef.current)
        switchTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !switching) onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mounted, onClose, switching])

  function runSwitch() {
    if (switching || switchTimerRef.current != null) return
    setSwitching(true)
    onClose()
    const delay = prefersReducedMotion() ? 0 : FESTAG_SHEET_MS
    switchTimerRef.current = window.setTimeout(() => {
      switchTimerRef.current = null
      setSwitching(false)
      onSwitch()
    }, delay)
  }

  if (!mounted) return null

  return (
    <div
      className={`auth-panel-switch-backdrop${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-panel-switch-title"
      onClick={e => {
        if (switching) return
        if (isPointerOverOverlay(e, '.auth-panel-switch-panel')) onClose()
      }}
      onPointerMove={e => {
        onOverlayPointer(isPointerOverOverlay(e, '.auth-panel-switch-panel'))
      }}
      onPointerLeave={() => onOverlayPointer(false)}
    >
      <style>{PANEL_SWITCH_CSS}</style>
      {showHint ? (
        <p className="auth-panel-switch-outside-hint" aria-hidden="true">
          Durch Klicken schließen.
        </p>
      ) : null}
      <div className="auth-panel-switch-panel" onClick={e => e.stopPropagation()}>
        <FestagPopupDragHandle onDismiss={switching ? () => {} : onClose} visible={visible} />
        <div className="auth-panel-switch-inner">
          <h2 id="auth-panel-switch-title" className="auth-panel-switch-title">
            {title}
          </h2>
          <p className="auth-panel-switch-body">{body}</p>
          <button
            type="button"
            className="auth-panel-switch-cta"
            onClick={runSwitch}
            disabled={switching}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  )
}

const PANEL_SWITCH_CSS = `
  .auth-panel-switch-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.42);
    opacity: 0;
    transition: opacity var(--festag-sheet-ms, 240ms) ease;
  }
  .auth-panel-switch-backdrop.is-visible { opacity: 1; }
  .auth-panel-switch-outside-hint {
    position: absolute;
    left: 50%;
    top: max(28px, env(safe-area-inset-top));
    transform: translateX(-50%);
    margin: 0;
    z-index: 2;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.01em;
    color: rgba(245, 245, 247, 0.88);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    pointer-events: none;
    white-space: nowrap;
  }
  .auth-panel-switch-panel {
    position: relative;
    width: min(100%, 400px);
    max-height: min(88dvh, 520px);
    overflow: auto;
    border-radius: var(--festag-plate-radius, 12px);
    background: #FFFFFF;
    border: 1px solid rgba(15, 23, 42, 0.055);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.88) inset,
      0 0 0 0.5px rgba(15, 23, 42, 0.04),
      0 16px 40px rgba(15, 23, 42, 0.10);
    transform: translateY(8px) scale(0.985);
    opacity: 0;
    transition:
      opacity var(--festag-sheet-ms, 240ms) cubic-bezier(.16,1,.3,1),
      transform var(--festag-sheet-ms, 240ms) cubic-bezier(.16,1,.3,1);
  }
  .auth-panel-switch-backdrop.is-visible .auth-panel-switch-panel {
    opacity: 1;
    transform: none;
  }
  .auth-panel-switch-panel .festag-popup-drag-area { display: none; }
  .auth-panel-switch-inner {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 28px 26px 24px;
  }
  .auth-panel-switch-title,
  #auth-panel-switch-title,
  .auth-panel-switch-panel h2.auth-panel-switch-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 26px !important;
    font-weight: 400 !important;
    line-height: 1.28 !important;
    letter-spacing: -0.022em;
    color: #1e1e20;
  }
  .auth-panel-switch-body {
    margin: 10px 0 0;
    font-family: inherit;
    font-size: 15.5px;
    font-weight: 400;
    line-height: 1.65;
    letter-spacing: -0.01em;
    color: var(--al-text-muted, #8891a0);
  }
  .auth-panel-switch-cta {
    margin-top: 24px;
    width: 100%;
    height: 40px;
    min-height: 40px;
    border-radius: var(--festag-auth-radius, 8px);
    border: 1px solid var(--festag-btn-dark-border, rgba(30, 30, 32, 0.08));
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.015em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s, border-color .15s, box-shadow .15s;
  }
  .auth-panel-switch-cta:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, #fafafa);
    border-color: var(--festag-btn-dark-border-hover, rgba(30, 30, 32, 0.08));
    box-shadow: var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.04));
  }
  .auth-panel-switch-cta:active:not(:disabled) {
    background: var(--festag-btn-dark-bg-active, #f5f5f6);
    box-shadow: var(--festag-btn-dark-shadow-active, none);
  }
  .auth-panel-switch-cta:disabled { opacity: 0.6; cursor: default; }
  [data-theme="dark"] .auth-panel-switch-panel,
  .al-root[data-theme="dark"] .auth-panel-switch-panel,
  .dl-root[data-theme="dark"] .auth-panel-switch-panel {
    background: var(--festag-black-popup, #1A1A1E);
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55);
  }
  [data-theme="dark"] .auth-panel-switch-backdrop,
  .al-root[data-theme="dark"] .auth-panel-switch-backdrop,
  .dl-root[data-theme="dark"] .auth-panel-switch-backdrop {
    background: var(--modal-backdrop, rgba(0, 0, 0, 0.58));
  }
  [data-theme="dark"] .auth-panel-switch-title,
  [data-theme="dark"] #auth-panel-switch-title,
  .al-root[data-theme="dark"] .auth-panel-switch-title,
  .al-root[data-theme="dark"] #auth-panel-switch-title,
  .dl-root[data-theme="dark"] .auth-panel-switch-title,
  .dl-root[data-theme="dark"] #auth-panel-switch-title {
    color: #f5f5f7 !important;
  }
  [data-theme="dark"] .auth-panel-switch-body,
  .al-root[data-theme="dark"] .auth-panel-switch-body,
  .dl-root[data-theme="dark"] .auth-panel-switch-body {
    color: rgba(245, 245, 247, 0.55) !important;
  }
  [data-theme="dark"] .auth-panel-switch-cta,
  .al-root[data-theme="dark"] .auth-panel-switch-cta,
  .dl-root[data-theme="dark"] .auth-panel-switch-cta {
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.06)) !important;
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.88)) !important;
    border: 1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06)) !important;
    box-shadow: var(--festag-btn-dark-shadow, none) !important;
  }
  [data-theme="dark"] .auth-panel-switch-cta:hover:not(:disabled),
  [data-theme="dark"] .auth-panel-switch-cta:focus-visible:not(:disabled),
  .al-root[data-theme="dark"] .auth-panel-switch-cta:hover:not(:disabled),
  .al-root[data-theme="dark"] .auth-panel-switch-cta:focus-visible:not(:disabled),
  .dl-root[data-theme="dark"] .auth-panel-switch-cta:hover:not(:disabled),
  .dl-root[data-theme="dark"] .auth-panel-switch-cta:focus-visible:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09)) !important;
    color: var(--festag-btn-dark-fg-hover, rgba(245,245,247,0.96)) !important;
    border-color: var(--festag-btn-dark-border-hover, rgba(255,255,255,0.09)) !important;
    box-shadow: var(--festag-btn-dark-shadow-hover, none) !important;
  }
  [data-theme="dark"] .auth-panel-switch-cta:active:not(:disabled),
  .al-root[data-theme="dark"] .auth-panel-switch-cta:active:not(:disabled),
  .dl-root[data-theme="dark"] .auth-panel-switch-cta:active:not(:disabled) {
    background: var(--festag-btn-dark-bg-active, rgba(186,194,210,0.12)) !important;
    color: var(--festag-btn-dark-fg-active, #f5f5f7) !important;
    border-color: var(--festag-btn-dark-border-active, rgba(255,255,255,0.07)) !important;
    box-shadow: var(--festag-btn-dark-shadow-active, none) !important;
  }
  [data-theme="read"] .auth-panel-switch-panel,
  .al-root[data-theme="read"] .auth-panel-switch-panel,
  .dl-root[data-theme="read"] .auth-panel-switch-panel {
    background: #FFFFFF;
    border-color: rgba(40, 34, 28, 0.08);
  }
  [data-theme="read"] .auth-panel-switch-body,
  .al-root[data-theme="read"] .auth-panel-switch-body,
  .dl-root[data-theme="read"] .auth-panel-switch-body {
    color: #8a8378;
  }
  @media (max-width: 768px) {
    .auth-panel-switch-backdrop {
      align-items: flex-end;
      padding: 0;
      background: var(--modal-backdrop, rgba(0, 0, 0, 0.58));
    }
    .auth-panel-switch-outside-hint {
      top: max(20px, env(safe-area-inset-top));
      bottom: auto;
      font-size: 12.5px;
    }
    .auth-panel-switch-panel {
      width: 100%;
      max-width: none;
      max-height: min(72dvh, 520px);
      border-radius: var(--festag-sheet-radius, 14px) var(--festag-sheet-radius, 14px) 0 0;
      border: 0;
      padding: 0;
      overflow: hidden;
      transform: translate3d(0, 100%, 0);
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.09),
        0 -24px 56px -20px rgba(15, 23, 42, 0.28);
    }
    .auth-panel-switch-backdrop.is-visible .auth-panel-switch-panel {
      transform: translate3d(0, 0, 0);
    }
    .auth-panel-switch-panel .festag-popup-drag-area { display: flex; }
    .auth-panel-switch-inner {
      padding: 4px var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 18px);
    }
    .auth-panel-switch-title,
    #auth-panel-switch-title,
    .auth-panel-switch-panel h2.auth-panel-switch-title {
      margin: 4px 0 0;
      font-size: 28px !important;
      line-height: 1.22 !important;
    }
    .auth-panel-switch-body {
      margin-top: 10px;
      font-size: 16px;
      line-height: 1.62;
    }
    .auth-panel-switch-cta {
      margin-top: 28px;
      height: var(--festag-mobile-control-height, 42px);
      min-height: var(--festag-mobile-control-height, 42px);
      border-radius: var(--festag-mobile-control-radius, 8px);
      font-size: 14px;
      letter-spacing: -0.015em;
    }
  }
`
