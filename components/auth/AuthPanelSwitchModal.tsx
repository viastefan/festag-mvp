'use client'

import { useEffect } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagOutsideClickHint } from '@/hooks/useFestagOutsideClickHint'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'

type Props = {
  open: boolean
  onClose: () => void
  /** Current surface — copy + CTA target the opposite panel. */
  variant: 'client' | 'dev'
  onSwitch: () => void
}

/**
 * Sheet to switch Client ↔ Dev auth panels.
 * Same hierarchy as AuthSecurityModal: large H1, then T1 body, then CTA.
 */
export default function AuthPanelSwitchModal({ open, onClose, variant, onSwitch }: Props) {
  const { mounted, visible } = useFestagPopupPresence(open)
  const { showHint, onOverlayPointer, reset } = useFestagOutsideClickHint(open)

  const isClient = variant === 'client'
  const title = isClient ? 'Client Panel' : 'Dev Panel'
  const body = isClient
    ? 'Du bist im Client Portal. Für Entwickler-Zugang und Workspace-Tools wechsle zum Dev Panel.'
    : 'Du bist im Dev Panel. Für die normale Festag-Anmeldung wechsle zum Client Portal.'
  const cta = isClient ? 'Zum Dev Panel' : 'Zum Client Portal'

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (!mounted) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mounted, onClose])

  if (!mounted) return null

  return (
    <div
      className={`auth-panel-switch-backdrop${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-panel-switch-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onMouseMove={e => {
        onOverlayPointer(e.target === e.currentTarget)
      }}
      onMouseLeave={() => onOverlayPointer(false)}
    >
      <style>{PANEL_SWITCH_CSS}</style>
      {showHint ? (
        <p className="auth-panel-switch-outside-hint" aria-hidden="true">
          Außerhalb klicken zum Schließen.
        </p>
      ) : null}
      <div className="auth-panel-switch-panel" onClick={e => e.stopPropagation()}>
        <FestagPopupDragHandle onDismiss={onClose} />
        <div className="auth-panel-switch-inner">
          <h2 id="auth-panel-switch-title" className="auth-panel-switch-title">
            {title}
          </h2>
          <div className="auth-panel-switch-body">
            <p>{body}</p>
          </div>
          <button
            type="button"
            className="auth-panel-switch-cta"
            onClick={() => {
              onClose()
              onSwitch()
            }}
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
    background: rgba(15, 23, 42, 0.52);
    opacity: 0;
    transition: opacity var(--festag-sheet-ms, 240ms) ease;
  }
  .auth-panel-switch-backdrop.is-visible { opacity: 1; }
  .auth-panel-switch-outside-hint {
    position: absolute;
    left: 50%;
    bottom: max(20px, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    margin: 0;
    z-index: 1;
    font-size: 12px;
    letter-spacing: 0.01em;
    color: rgba(245, 245, 247, 0.72);
    pointer-events: none;
  }
  .auth-panel-switch-panel {
    position: relative;
    width: min(100%, 380px);
    max-height: min(88dvh, 520px);
    overflow: auto;
    border-radius: 22px;
    background: #ffffff;
    border: 0;
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
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
  }
  .auth-panel-switch-title {
    margin: 0 0 18px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 1.28;
    letter-spacing: -0.022em;
    color: #1e1e20;
  }
  .auth-panel-switch-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .auth-panel-switch-body p {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 15.5px;
    font-weight: 400;
    line-height: 1.65;
    letter-spacing: 0.004em;
    color: #5c5c62;
  }
  .auth-panel-switch-cta {
    margin-top: 24px;
    width: 100%;
    height: 42px;
    border-radius: 999px;
    border: 1px solid var(--festag-btn-dark-border, #e5e5e6);
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.05));
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s, border-color .15s, box-shadow .15s;
  }
  .auth-panel-switch-cta:hover {
    background: var(--festag-btn-dark-bg-hover, #fafafa);
    border-color: var(--festag-btn-dark-border-hover, #d8d8da);
    box-shadow: var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.07));
  }
  .auth-panel-switch-cta:active {
    background: var(--festag-btn-dark-bg-active, #f4f4f5);
    box-shadow: var(--festag-btn-dark-shadow-active, 0 1px 1px rgba(0, 0, 0, 0.04));
  }
  [data-theme="dark"] .auth-panel-switch-panel,
  .al-root[data-theme="dark"] .auth-panel-switch-panel,
  .dl-root[data-theme="dark"] .auth-panel-switch-panel {
    background: var(--festag-black-popup, #1c1c1e);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55);
  }
  [data-theme="dark"] .auth-panel-switch-title,
  .al-root[data-theme="dark"] .auth-panel-switch-title,
  .dl-root[data-theme="dark"] .auth-panel-switch-title {
    color: #f5f5f7;
  }
  [data-theme="dark"] .auth-panel-switch-body p,
  .al-root[data-theme="dark"] .auth-panel-switch-body p,
  .dl-root[data-theme="dark"] .auth-panel-switch-body p {
    color: rgba(245, 245, 247, 0.68);
  }
  [data-theme="dark"] .auth-panel-switch-cta,
  .al-root[data-theme="dark"] .auth-panel-switch-cta,
  .dl-root[data-theme="dark"] .auth-panel-switch-cta {
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.11));
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.92));
    border: 0;
    box-shadow: none;
  }
  [data-theme="dark"] .auth-panel-switch-cta:hover,
  .al-root[data-theme="dark"] .auth-panel-switch-cta:hover,
  .dl-root[data-theme="dark"] .auth-panel-switch-cta:hover {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.16));
  }
  @media (max-width: 768px) {
    .auth-panel-switch-backdrop {
      align-items: flex-end;
      padding: 0;
      background: rgba(0, 0, 0, 0.48);
    }
    .auth-panel-switch-panel {
      width: 100%;
      max-width: none;
      max-height: min(72dvh, 520px);
      border-radius: var(--festag-sheet-radius, 22px) var(--festag-sheet-radius, 22px) 0 0;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 18px);
      transform: translate3d(0, 100%, 0);
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.09),
        0 -24px 56px -20px rgba(15, 23, 42, 0.28);
    }
    .auth-panel-switch-backdrop.is-visible .auth-panel-switch-panel {
      transform: translate3d(0, 0, 0);
    }
    .auth-panel-switch-panel .festag-popup-drag-area { display: flex; }
    .auth-panel-switch-title {
      margin: 4px 0 16px;
      font-size: 28px;
      line-height: 1.22;
    }
    .auth-panel-switch-body p {
      font-size: 16px;
      line-height: 1.62;
    }
    .auth-panel-switch-cta {
      margin-top: 28px;
      height: 44px;
      font-size: 14px;
    }
  }
`
