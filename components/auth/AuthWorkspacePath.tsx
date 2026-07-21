'use client'

import { useEffect, useId, useRef, useState } from 'react'

const MAX_CHARS = 25

export function truncateWorkspaceLabel(name: string, max = MAX_CHARS): { text: string; truncated: boolean; full: string } {
  const full = String(name || '').replace(/\s+/g, ' ').trim()
  if (full.length <= max) return { text: full, truncated: false, full }
  return { text: `${full.slice(0, max)}...`, truncated: true, full }
}

type Props = {
  name: string
  className?: string
  /** Prefix slash visually (default true). */
  withSlash?: boolean
  /** When set and name is short, the whole path acts as an edit control. */
  onEdit?: () => void
}

/**
 * Auth hero workspace path under the h1 (32px, matches title).
 * Long names truncate at 25 chars; tap/click opens a lightweight full-name popover.
 */
export default function AuthWorkspacePath({ name, className, withSlash = true, onEdit }: Props) {
  const { text, truncated, full } = truncateWorkspaceLabel(name)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popId = useId()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target
      if (t instanceof Node && rootRef.current && !rootRef.current.contains(t)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!full) return null

  const label = withSlash ? `/ ${text}` : text
  const fullLabel = withSlash ? `/ ${full}` : full
  const rootClass = `auth-ws-path-wrap ${className || ''}`.trim()

  if (!truncated && onEdit) {
    return (
      <button
        type="button"
        className={`${rootClass} auth-ws-path auth-ws-path--edit`.trim()}
        onClick={onEdit}
        aria-label={`Workspace ${full}, zum Bearbeiten tippen`}
      >
        <style>{AUTH_WS_PATH_CSS}</style>
        {label}
      </button>
    )
  }

  if (!truncated) {
    return (
      <p className={`${rootClass} auth-ws-path`.trim()} aria-label={`Workspace ${full}`}>
        <style>{AUTH_WS_PATH_CSS}</style>
        {label}
      </p>
    )
  }

  return (
    <div className={rootClass} ref={rootRef}>
      <style>{AUTH_WS_PATH_CSS}</style>
      <button
        type="button"
        className="auth-ws-path auth-ws-path--tap"
        aria-label={`Workspace ${full}, vollständigen Namen anzeigen`}
        aria-expanded={open}
        aria-controls={popId}
        onClick={() => setOpen(v => !v)}
      >
        {label}
      </button>
      {open ? (
        <div id={popId} className="auth-ws-path-pop" role="dialog" aria-label="Workspace-Name">
          <p className="auth-ws-path-pop-text">{fullLabel}</p>
          {onEdit ? (
            <button
              type="button"
              className="auth-ws-path-pop-edit"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
            >
              Bearbeiten
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const AUTH_WS_PATH_CSS = `
  .auth-ws-path-wrap {
    position: relative;
    display: block;
    width: 100%;
    margin: 6px 0 0;
    max-width: 100%;
  }
  .auth-ws-path,
  button.auth-ws-path--tap,
  button.auth-ws-path--edit {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    font-family: inherit;
    font-size: 32px;
    line-height: 39px;
    letter-spacing: -0.025em;
    font-weight: 400;
    /* Calm Apple slate — readable on light auth canvas (never inherit html dark). */
    color: #8891a0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;
  }
  /* Lock light path even when portal html is dark — only .al-root / .dl-root theme counts. */
  .al-root:not([data-theme="dark"]) .auth-ws-path,
  .al-root:not([data-theme="dark"]) button.auth-ws-path--tap,
  .al-root:not([data-theme="dark"]) button.auth-ws-path--edit,
  .dl-root:not([data-theme="dark"]) .auth-ws-path,
  .dl-root:not([data-theme="dark"]) button.auth-ws-path--tap,
  .dl-root:not([data-theme="dark"]) button.auth-ws-path--edit {
    color: #8891a0 !important;
  }
  @media (max-width: 768px) {
    .auth-ws-path,
    button.auth-ws-path--tap,
    button.auth-ws-path--edit {
      font-size: 24px !important;
      line-height: 30px !important;
      letter-spacing: -0.025em;
      margin-top: 0;
    }
  }
  button.auth-ws-path--tap,
  button.auth-ws-path--edit {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  button.auth-ws-path--tap:hover,
  button.auth-ws-path--tap:focus-visible,
  button.auth-ws-path--edit:hover,
  button.auth-ws-path--edit:focus-visible {
    color: #1e1e20;
    outline: none;
  }
  .al-root:not([data-theme="dark"]) button.auth-ws-path--tap:hover,
  .al-root:not([data-theme="dark"]) button.auth-ws-path--tap:focus-visible,
  .al-root:not([data-theme="dark"]) button.auth-ws-path--edit:hover,
  .al-root:not([data-theme="dark"]) button.auth-ws-path--edit:focus-visible,
  .dl-root:not([data-theme="dark"]) button.auth-ws-path--tap:hover,
  .dl-root:not([data-theme="dark"]) button.auth-ws-path--tap:focus-visible,
  .dl-root:not([data-theme="dark"]) button.auth-ws-path--edit:hover,
  .dl-root:not([data-theme="dark"]) button.auth-ws-path--edit:focus-visible {
    color: #1e1e20 !important;
  }
  .auth-ws-path-pop {
    position: absolute;
    left: 0;
    top: calc(100% + 10px);
    z-index: 40;
    max-width: min(100%, 360px);
    padding: 10px 14px;
    border-radius: 12px;
    border: 0;
    background: #ffffff;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 10px 28px rgba(15, 23, 42, 0.10);
    color: #1e1e20;
    font-family: inherit;
    animation: authWsPop .18s cubic-bezier(.16,1,.3,1) both;
  }
  .auth-ws-path-pop-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
    letter-spacing: -0.01em;
    font-weight: 400;
    word-break: break-word;
  }
  .auth-ws-path-pop-edit {
    margin: 8px 0 0;
    padding: 0;
    border: 0;
    background: transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight:400;
    letter-spacing: var(--festag-tracking-small, 0.015em);
    color: #5B647D;
    cursor: pointer;
  }
  .auth-ws-path-pop-edit:hover { color: #1e1e20; }
  @keyframes authWsPop {
    from { opacity: 0; transform: translateY(6px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  /* Dark only when auth root is dark — never via html[data-theme=dark] alone. */
  .al-root[data-theme="dark"] .auth-ws-path,
  .al-root[data-theme="dark"] button.auth-ws-path--tap,
  .al-root[data-theme="dark"] button.auth-ws-path--edit,
  .dl-root[data-theme="dark"] .auth-ws-path,
  .dl-root[data-theme="dark"] button.auth-ws-path--tap,
  .dl-root[data-theme="dark"] button.auth-ws-path--edit {
    color: #9aa3b5 !important;
  }
  .al-root[data-theme="dark"] button.auth-ws-path--tap:hover,
  .al-root[data-theme="dark"] button.auth-ws-path--tap:focus-visible,
  .al-root[data-theme="dark"] button.auth-ws-path--edit:hover,
  .al-root[data-theme="dark"] button.auth-ws-path--edit:focus-visible,
  .dl-root[data-theme="dark"] button.auth-ws-path--tap:hover,
  .dl-root[data-theme="dark"] button.auth-ws-path--tap:focus-visible,
  .dl-root[data-theme="dark"] button.auth-ws-path--edit:hover,
  .dl-root[data-theme="dark"] button.auth-ws-path--edit:focus-visible {
    color: #f5f5f7 !important;
  }
  .al-root[data-theme="dark"] .auth-ws-path-pop,
  .dl-root[data-theme="dark"] .auth-ws-path-pop {
    background: var(--festag-black-popup, #1c1c1e);
    border: 0;
    color: #f5f5f7;
    box-shadow:
      0 1px 2px rgba(0,0,0,0.35),
      0 12px 32px rgba(0,0,0,0.45);
  }
  .al-root[data-theme="dark"] .auth-ws-path-pop-edit,
  .dl-root[data-theme="dark"] .auth-ws-path-pop-edit {
    color: rgba(245,245,247,0.7);
  }
`
