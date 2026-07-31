'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

type Props = {
  name: string
  className?: string
  /** Prefix slash visually (default true). */
  withSlash?: boolean
  /** When set and name fits, the whole path acts as an edit control. */
  onEdit?: () => void
}

/**
 * Auth hero workspace path under the h1.
 * Long names keep the full string and fade out softly at the edge
 * (glassy dissolve) — never a hard mid-word cut or `…` ellipsis.
 */
export default function AuthWorkspacePath({ name, className, withSlash = true, onEdit }: Props) {
  const full = String(name || '').replace(/\s+/g, ' ').trim()
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLElement | null>(null)
  const popId = useId()

  const label = withSlash ? `/${full}` : full

  const measure = () => {
    const el = textRef.current
    if (!el) return
    setOverflowing(el.scrollWidth > el.clientWidth + 1)
  }

  useLayoutEffect(() => {
    measure()
  }, [full])

  useEffect(() => {
    const el = textRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [full])

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

  const rootClass = `auth-ws-path-wrap${overflowing ? ' is-fading' : ''}${className ? ` ${className}` : ''}`
  const pathClass = `auth-ws-path${overflowing ? ' auth-ws-path--fade' : ''}`

  if (!overflowing && onEdit) {
    return (
      <button
        type="button"
        ref={el => {
          textRef.current = el
        }}
        className={`${rootClass} ${pathClass} auth-ws-path--edit`.trim()}
        onClick={onEdit}
        aria-label={`Workspace ${full}, zum Bearbeiten tippen`}
      >
        <style>{AUTH_WS_PATH_CSS}</style>
        {label}
      </button>
    )
  }

  if (!overflowing) {
    return (
      <p
        ref={el => {
          textRef.current = el
        }}
        className={`${rootClass} ${pathClass}`.trim()}
        aria-label={`Workspace ${full}`}
      >
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
        ref={el => {
          textRef.current = el
        }}
        className={`${pathClass} auth-ws-path--tap`.trim()}
        aria-label={`Workspace ${full}, vollständigen Namen anzeigen`}
        aria-expanded={open}
        aria-controls={popId}
        onClick={() => {
          if (onEdit) onEdit()
          else setOpen(v => !v)
        }}
      >
        {label}
      </button>
      {open && !onEdit ? (
        <div id={popId} className="auth-ws-path-pop" role="dialog" aria-label="Workspace-Name">
          <p className="auth-ws-path-pop-text">{label}</p>
        </div>
      ) : null}
    </div>
  )
}

/** Soft edge fade — glassy dissolve instead of hard ellipsis. */
export const AUTH_WS_FADE_MASK = `linear-gradient(
  to right,
  #000 0%,
  #000 calc(100% - 36px),
  rgba(0, 0, 0, 0.45) calc(100% - 14px),
  transparent 100%
)`

const AUTH_WS_PATH_CSS = `
  .auth-ws-path-wrap {
    position: relative;
    display: block;
    width: 100%;
    margin: 6px 0 0;
    max-width: 100%;
    min-width: 0;
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
    font-size: var(--al-hero-name-size, var(--al-hero-display-size, 32px));
    line-height: var(--al-hero-name-lh, var(--al-hero-display-lh, 39px));
    letter-spacing: -0.025em;
    font-weight: 400;
    color: #8891a0;
    text-align: left;
    overflow: hidden;
    white-space: nowrap;
    box-sizing: border-box;
    transition: opacity 0.16s ease, filter 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  /* Glassy edge dissolve — full name stays, end fades into canvas. */
  .auth-ws-path--fade,
  button.auth-ws-path--tap.auth-ws-path--fade,
  button.auth-ws-path--edit.auth-ws-path--fade {
    text-overflow: clip;
    -webkit-mask-image: ${AUTH_WS_FADE_MASK};
    mask-image: ${AUTH_WS_FADE_MASK};
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
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
      font-size: var(--al-hero-name-size, var(--al-hero-display-size, 32px)) !important;
      line-height: var(--al-hero-name-lh, var(--al-hero-display-lh, 38px)) !important;
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
  @keyframes authWsPop {
    from { opacity: 0; transform: translateY(6px) scale(0.98); filter: blur(3px); }
    to { opacity: 1; transform: none; filter: blur(0); }
  }
  .al-root[data-theme="dark"] .auth-ws-path,
  .al-root[data-theme="dark"] button.auth-ws-path--tap,
  .al-root[data-theme="dark"] button.auth-ws-path--edit,
  .dl-root[data-theme="dark"] .auth-ws-path,
  .dl-root[data-theme="dark"] button.auth-ws-path--tap,
  .dl-root[data-theme="dark"] button.auth-ws-path--edit {
    color: var(--al-text-muted, #8891a0) !important;
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
    background: var(--festag-black-popup, #1A1A1E);
    border: 0;
    color: #f5f5f7;
    box-shadow:
      0 1px 2px rgba(0,0,0,0.35),
      0 12px 32px rgba(0,0,0,0.45);
  }
`
