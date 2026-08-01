'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

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
  const [mounted, setMounted] = useState(false)
  const [popStyle, setPopStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLElement | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
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
    setMounted(true)
  }, [])

  useEffect(() => {
    const el = textRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [full])

  useLayoutEffect(() => {
    if (!open) return
    const anchor = textRef.current
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const width = Math.min(360, Math.max(160, r.width))
    let left = r.left
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
    let top = r.bottom + 10
    const popH = popRef.current?.getBoundingClientRect().height || 48
    if (top + popH > window.innerHeight - 12) {
      top = Math.max(12, r.top - popH - 10)
    }
    setPopStyle({
      position: 'fixed',
      top,
      left,
      width,
      zIndex: 1300,
    })
  }, [open, full])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target
      if (!(t instanceof Node)) return
      if (rootRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      const anchor = textRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const width = Math.min(360, Math.max(160, r.width))
      let left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12))
      let top = r.bottom + 10
      const popH = popRef.current?.getBoundingClientRect().height || 48
      if (top + popH > window.innerHeight - 12) {
        top = Math.max(12, r.top - popH - 10)
      }
      setPopStyle({
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 1300,
      })
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
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
      {open && !onEdit && mounted
        ? createPortal(
            <div
              ref={popRef}
              id={popId}
              className="auth-ws-path-pop"
              role="dialog"
              aria-label="Workspace-Name"
              style={popStyle}
            >
              <p className="auth-ws-path-pop-text">{label}</p>
            </div>,
            document.body,
          )
        : null}
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
    /* Spacing from H1 lives on .al-hero-secondary — not here.
       Top margin on the wrap pulls the inline check badge off-center. */
    margin: 0;
    max-width: 100%;
    min-width: 0;
  }
  /* Inside the check row the path must shrink-wrap (canvas: inline-flex + gap 8). */
  .al-ws-path-check-row > .auth-ws-path-wrap,
  .al-ws-path-check-row > .auth-ws-path,
  .al-ws-path-check-row > button.auth-ws-path--tap,
  .al-ws-path-check-row > button.auth-ws-path--edit {
    width: auto !important;
    max-width: 100%;
    display: block;
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
  /* Portaled to body — solid plate, never inherits hero opacity/blur. */
  .auth-ws-path-pop {
    box-sizing: border-box;
    max-width: min(360px, calc(100vw - 24px));
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff !important;
    opacity: 1 !important;
    isolation: isolate;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    color: #1e1e20;
    font-family: inherit;
    animation: authWsPop .16s cubic-bezier(.16,1,.3,1) both;
    pointer-events: auto;
  }
  .auth-ws-path-pop-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
    letter-spacing: -0.01em;
    font-weight: 400;
    word-break: break-word;
    color: #1e1e20;
  }
  @keyframes authWsPop {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: none; }
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
  html[data-theme="dark"] .auth-ws-path-pop,
  html[data-theme="classic-dark"] .auth-ws-path-pop {
    background: #1A1A1E !important;
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #f5f5f7;
    box-shadow: 0 1px 2px rgba(0,0,0,0.28);
  }
  html[data-theme="dark"] .auth-ws-path-pop-text,
  html[data-theme="classic-dark"] .auth-ws-path-pop-text {
    color: #f5f5f7;
  }
`
