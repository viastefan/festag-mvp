'use client'

import { useId, useState, type ReactNode } from 'react'

type Props = {
  summary: string
  children: ReactNode
  /** Element id for deep-link / scroll targets (e.g. footer Hilfe). */
  id?: string
  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * Quiet auth help accordion — same expand as Dev login Hilfe
 * (grid 0fr→1fr + opacity ~260ms), pushes content below.
 */
export default function AuthHelpAccordion({
  summary,
  children,
  id,
  open: openProp,
  onOpenChange,
  className,
}: Props) {
  const autoId = useId()
  const panelId = `${id || autoId}-panel`
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : uncontrolledOpen

  function toggle() {
    const next = !open
    if (!controlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <>
      <style>{AUTH_HELP_ACCORDION_STYLES}</style>
      <div
        id={id}
        className={`auth-help${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      >
        <button
          type="button"
          className="auth-help-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          {summary}
        </button>
        <div id={panelId} className="auth-help-body" role="region" aria-hidden={!open}>
          <div className="auth-help-body-inner">{children}</div>
        </div>
      </div>
    </>
  )
}

const AUTH_HELP_ACCORDION_STYLES = `
  .auth-help {
    position: relative;
    margin-top: 14px;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    overflow: visible;
  }
  .auth-help-toggle {
    display: block;
    width: 100%;
    margin: 0;
    padding: 4px 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight:400;
    color: var(--al-text-muted, var(--dl-text-muted, #8e8e93));
    letter-spacing: var(--festag-tracking-small, 0.015em);
    text-align: left;
    transition: color .18s ease;
    /* No shrink-on-press — color only (overrides global button:active scale). */
    transform: none;
  }
  .auth-help-toggle:hover,
  .auth-help-toggle:active {
    color: #1e1e20;
    transform: none;
  }
  .auth-help-body {
    display: grid;
    grid-template-rows: 0fr;
    margin-top: 0;
    opacity: 0;
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1.55;
    color: var(--al-text-muted, var(--dl-text-muted, #8e8e93));
    letter-spacing: var(--festag-tracking-small, 0.015em);
    transition:
      grid-template-rows .26s cubic-bezier(.16, 1, .3, 1),
      margin-top .26s cubic-bezier(.16, 1, .3, 1),
      opacity .22s ease;
  }
  .auth-help.is-open .auth-help-body {
    grid-template-rows: 1fr;
    margin-top: 8px;
    opacity: 1;
  }
  .auth-help-body-inner {
    overflow: hidden;
    min-height: 0;
  }
  .auth-help-body p {
    margin: 0 0 10px;
  }
  .auth-help-body p:last-child {
    margin-bottom: 0;
  }
  [data-theme="dark"] .auth-help-toggle:hover,
  [data-theme="dark"] .auth-help-toggle:active {
    color: #f5f5f7;
    transform: none;
  }
`
