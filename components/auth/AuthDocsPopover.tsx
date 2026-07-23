'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { BookOpenText, MagnifyingGlass } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'
import { navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { festagDocsArticles } from '@/lib/festag-docs'

type Props = {
  className?: string
}

/** Auth canvas theme — never inherit portal html[data-theme=dark] on a light login. */
function readAuthCanvasTheme(): string {
  if (typeof document === 'undefined') return 'light'
  const root = document.querySelector('.al-root, .dl-root')
  const theme = root?.getAttribute('data-theme')
  return theme === 'dark' || theme === 'classic-dark' || theme === 'read' ? theme : 'light'
}

export default function AuthDocsPopover({ className }: Props) {
  const [open, setOpen] = useState(false)
  const { mounted, visible } = useFestagPopupPresence(open)
  const [query, setQuery] = useState('')
  const [canvasTheme, setCanvasTheme] = useState('light')
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useFestagMobile()
  const close = () => setOpen(false)

  function goDocs(href: string, e?: ReactMouseEvent<HTMLAnchorElement>) {
    e?.preventDefault()
    setOpen(false)
    navigateLeavingAuthChrome(href)
  }

  useEffect(() => {
    const sync = () => setCanvasTheme(readAuthCanvasTheme())
    sync()
    const root = document.querySelector('.al-root, .dl-root')
    if (!root) return
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  const starters = useMemo(() => {
    const first = festagDocsArticles.filter(a => a.category === 'Erste Schritte' || a.popular)
    const pool = first.length >= 4 ? first : festagDocsArticles
    return pool.slice(0, 6)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return starters
    return festagDocsArticles
      .filter(a =>
        a.title.toLowerCase().includes(q)
        || a.description.toLowerCase().includes(q)
        || a.tags.some(t => t.toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [query, starters])

  useEffect(() => {
    if (!open || !visible) return
    inputRef.current?.focus()
    function onDown(e: MouseEvent) {
      const target = e.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (popRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    if (isMobile) document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, visible, isMobile])

  const panel = (
    <div
      ref={popRef}
      className={[
        'auth-docs-pop',
        visible ? 'is-visible' : '',
        isMobile ? 'festag-popup-surface festag-popup-mobile-sheet' : '',
      ].filter(Boolean).join(' ')}
      data-theme={canvasTheme}
      role="dialog"
      aria-label="Dokumentation"
    >
      {isMobile ? <FestagPopupDragHandle onDismiss={close} visible={visible} /> : null}
      <div className="auth-docs-search">
        <MagnifyingGlass size={15} weight="regular" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Suchen…"
          aria-label="Dokumentation durchsuchen"
        />
      </div>
      <ul className="auth-docs-list">
        {filtered.map(a => (
          <li key={a.slug}>
            <a
              href={`/docs/${a.slug}`}
              className="auth-docs-item"
              onClick={e => goDocs(`/docs/${a.slug}`, e)}
            >
              <span className="auth-docs-item-title">{a.title}</span>
              <span className="auth-docs-item-desc">{a.description}</span>
            </a>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="auth-docs-empty">Keine Treffer</li>
        ) : null}
      </ul>
      <a className="auth-docs-all" href="/docs" onClick={e => goDocs('/docs', e)}>Alle anzeigen</a>
    </div>
  )

  const overlay = mounted
    ? isMobile && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`festag-popup-mobile-host auth-docs-mobile-host${visible ? ' is-visible' : ''}`}
            data-theme={canvasTheme}
          >
            <button
              type="button"
              className="festag-popup-backdrop"
              aria-label="Schließen"
              onClick={close}
            />
            {panel}
          </div>,
          document.body,
        )
      : panel
    : null

  return (
    <div
      className={`auth-docs ${className || ''}`.trim()}
      data-theme={canvasTheme}
      ref={rootRef}
    >
      <style>{AUTH_DOCS_CSS}</style>
      <button
        type="button"
        className="auth-docs-trigger no-min-tap"
        aria-label="Dokumentation"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(v => !v)}
      >
        <BookOpenText size={15} weight="regular" aria-hidden />
      </button>
      {overlay}
    </div>
  )
}

const AUTH_DOCS_CSS = `
  .auth-docs { position: relative; flex-shrink: 0; }
  .auth-docs-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    max-width: 36px;
    max-height: 36px;
    aspect-ratio: 1;
    padding: 0;
    margin: 0;
    border: 0 !important;
    border-radius: 999px;
    background: transparent;
    color: #6e6e73 !important;
    cursor: pointer;
    box-shadow: none;
    outline: none;
    flex-shrink: 0;
    line-height: 0;
    transition: color .15s ease, opacity .15s ease;
  }
  .auth-docs-trigger:hover {
    color: #1e1e20 !important;
    background: transparent;
  }
  .auth-docs-trigger:focus-visible {
    color: #1e1e20;
    background: transparent;
  }
  .auth-docs-trigger[aria-expanded="true"] {
    color: #1e1e20;
    background: transparent;
  }
  .auth-docs-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 40;
    width: min(320px, calc(100vw - 32px));
    max-width: min(320px, calc(100vw - 32px));
    border-radius: 16px;
    /* Light: raised surface (not pure white) + soft lift — same family as festag popovers. */
    border: 0 !important;
    background: var(--raised, #FAFAFA);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.03),
      0 8px 20px rgba(15, 23, 42, 0.05);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: 0;
    transform: translateY(6px) scale(0.98);
    transform-origin: top right;
    pointer-events: none;
    transition:
      opacity var(--festag-sheet-ms, 240ms) ease,
      transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1));
  }
  .auth-docs-pop.is-visible {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
  .auth-docs-pop .festag-popup-drag-area {
    display: none;
  }
  .auth-docs-mobile-host {
    pointer-events: none;
    background: transparent;
    isolation: isolate;
  }
  .auth-docs-mobile-host .festag-popup-backdrop {
    pointer-events: auto;
    z-index: 0;
    border-radius: 0;
    background: var(--modal-backdrop, rgba(15, 18, 24, 0.38));
  }
  .auth-docs-mobile-host .auth-docs-pop {
    pointer-events: auto;
    z-index: 1;
  }
  .auth-docs-mobile-host[data-theme="dark"] .festag-popup-backdrop,
  .auth-docs-mobile-host[data-theme="classic-dark"] .festag-popup-backdrop,
  .al-root[data-theme="dark"] .auth-docs-mobile-host .festag-popup-backdrop,
  .al-root[data-theme="classic-dark"] .auth-docs-mobile-host .festag-popup-backdrop {
    background: var(--modal-backdrop, rgba(0, 0, 0, 0.58));
  }
  .auth-docs-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    border: 0;
    background: var(--festag-input-fill, #EEEEF0);
    color: var(--al-text-muted, #8891a0);
  }
  .auth-docs-search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: #1e1e20;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 400;
  }
  .auth-docs-search input::placeholder {
    color: var(--festag-input-placeholder, #8e95a3) !important;
    -webkit-text-fill-color: var(--festag-input-placeholder, #8e95a3) !important;
    letter-spacing: var(--festag-tracking-small, 0.015em);
    opacity: 1;
  }
  .auth-docs-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 280px;
    overflow: auto;
  }
  .auth-docs-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 10px;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
  }
  .auth-docs-item:hover { background: rgba(15, 23, 42, 0.04); }
  .auth-docs-item-title {
    font-size: 13.5px;
    font-weight:400;
    letter-spacing: -0.01em;
    color: #1e1e20;
  }
  .auth-docs-item-desc {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: var(--festag-tracking-small, 0.015em);
    color: var(--al-text-muted, #8891a0);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .auth-docs-empty {
    padding: 14px 10px;
    font-size: 13px;
    letter-spacing: var(--festag-tracking-small, 0.015em);
    color: var(--al-text-muted, #8891a0);
  }
  .auth-docs-all {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 45px;
    min-height: 45px;
    padding: 0 16px;
    border-radius: 999px;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: var(--ls-body, 0.021em);
    white-space: nowrap;
    /* Same Linear lock as auth Weiter / SSO (.al-btn-primary / ghost). */
    color: #1e1e20 !important;
    background: #ffffff !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    outline: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
    text-decoration: none;
    cursor: pointer;
    transition: background .15s, border-color .15s, color .15s, box-shadow .15s, transform .08s ease;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    appearance: none;
  }
  .auth-docs-all:hover {
    background: #fafafa !important;
    border-color: rgba(30, 30, 32, 0.08) !important;
    color: #1e1e20 !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  }
  .auth-docs-all:active {
    transform: scale(0.985);
    background: #f5f5f6 !important;
    border-color: rgba(30, 30, 32, 0.08) !important;
    color: #1e1e20 !important;
    box-shadow: none !important;
  }

  @media (max-width: 768px) {
    .auth-docs-pop.festag-popup-mobile-sheet {
      position: relative !important;
      top: auto !important;
      right: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      z-index: 1;
      width: 100% !important;
      max-width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      max-height: min(88dvh, 720px);
      border-radius: var(--festag-sheet-radius, 22px) var(--festag-sheet-radius, 22px) 0 0 !important;
      border: 0;
      border-bottom: none !important;
      /* Soft raised sheet — same as desktop light popover. */
      background: var(--raised, #FAFAFA) !important;
      border: 0 !important;
      box-shadow:
        0 -1px 2px rgba(15, 23, 42, 0.04),
        0 -12px 28px rgba(15, 23, 42, 0.06) !important;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      isolation: isolate;
      background-clip: padding-box;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 14px);
      gap: 6px;
      transform-origin: bottom center;
      pointer-events: auto;
      box-sizing: border-box;
      /* Host drives enter/exit via shared festag-popup-mobile-host rules */
    }
    .auth-docs-pop.festag-popup-mobile-sheet .festag-popup-drag-area {
      display: flex;
      padding: 8px 0 0;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-search {
      margin-top: 0;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-list {
      max-height: min(52dvh, 420px);
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item {
      padding: 12px 10px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item-title {
      font-size: 15px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item-desc {
      font-size: 13px;
      line-height: 1.4;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-all {
      height: 52px;
      min-height: 52px;
      padding: 0 18px;
      font-size: 15px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-docs-pop {
      transition: none !important;
    }
  }

  .al-root[data-theme="dark"] .auth-docs-trigger,
  .al-root[data-theme="classic-dark"] .auth-docs-trigger,
  .auth-docs[data-theme="dark"] .auth-docs-trigger,
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger,
  .dl-root[data-theme="dark"] .auth-docs-trigger {
    background: transparent;
    border: 0;
    color: rgba(245,245,247,0.55);
    box-shadow: none;
  }
  .al-root[data-theme="dark"] .auth-docs-trigger:hover,
  .al-root[data-theme="dark"] .auth-docs-trigger:focus-visible,
  .al-root[data-theme="dark"] .auth-docs-trigger[aria-expanded="true"],
  .al-root[data-theme="classic-dark"] .auth-docs-trigger:hover,
  .al-root[data-theme="classic-dark"] .auth-docs-trigger:focus-visible,
  .al-root[data-theme="classic-dark"] .auth-docs-trigger[aria-expanded="true"] {
    color: #f5f5f7;
    background: transparent;
  }
  /* Solid OLED popup step — never leave light glass / blur on dark. */
  .al-root[data-theme="dark"] .auth-docs-pop,
  .al-root[data-theme="classic-dark"] .auth-docs-pop,
  .al-root[data-theme="dark"] .auth-docs-pop.festag-popup-mobile-sheet,
  .al-root[data-theme="classic-dark"] .auth-docs-pop.festag-popup-mobile-sheet,
  .auth-docs-pop[data-theme="dark"],
  .auth-docs-pop[data-theme="classic-dark"],
  .auth-docs-mobile-host[data-theme="dark"] .auth-docs-pop,
  .auth-docs-mobile-host[data-theme="classic-dark"] .auth-docs-pop {
    background: var(--festag-black-popup, #121214) !important;
    border: 0 !important;
    border-color: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.35),
      0 12px 28px rgba(0, 0, 0, 0.4) !important;
    --fp-bg: var(--festag-black-popup, #121214);
    --fp-border: transparent;
    --fp-shadow: none;
  }
  .al-root[data-theme="dark"] .auth-docs-pop.festag-popup-mobile-sheet,
  .al-root[data-theme="classic-dark"] .auth-docs-pop.festag-popup-mobile-sheet,
  .auth-docs-mobile-host[data-theme="dark"] .auth-docs-pop.festag-popup-mobile-sheet,
  .auth-docs-mobile-host[data-theme="classic-dark"] .auth-docs-pop.festag-popup-mobile-sheet {
    box-shadow:
      0 -1px 2px rgba(0, 0, 0, 0.35),
      0 -16px 36px -16px rgba(0, 0, 0, 0.5) !important;
  }
  .al-root[data-theme="dark"] .auth-docs-search,
  .al-root[data-theme="classic-dark"] .auth-docs-search,
  .auth-docs-pop[data-theme="dark"] .auth-docs-search,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-search {
    /* Recessed chip — same fill step as dark auth inputs. */
    background: var(--festag-input-fill, #1c1d22) !important;
    border: 0;
    color: rgba(245, 245, 247, 0.55);
  }
  .al-root[data-theme="dark"] .auth-docs-search input,
  .al-root[data-theme="classic-dark"] .auth-docs-search input,
  .auth-docs-pop[data-theme="dark"] .auth-docs-search input,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-search input {
    color: var(--festag-input-fg, rgba(232, 236, 242, 0.94));
    -webkit-text-fill-color: var(--festag-input-fg, rgba(232, 236, 242, 0.94));
    caret-color: var(--festag-input-caret, rgba(198, 206, 222, 0.78));
  }
  .al-root[data-theme="dark"] .auth-docs-search input::placeholder,
  .al-root[data-theme="classic-dark"] .auth-docs-search input::placeholder,
  .auth-docs-pop[data-theme="dark"] .auth-docs-search input::placeholder,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-search input::placeholder {
    color: rgba(245, 245, 247, 0.28) !important;
    -webkit-text-fill-color: rgba(245, 245, 247, 0.28) !important;
  }
  /* Same quiet slate lift as dark SSO / ghost CTA hover. */
  .al-root[data-theme="dark"] .auth-docs-item:hover,
  .al-root[data-theme="classic-dark"] .auth-docs-item:hover,
  .auth-docs-pop[data-theme="dark"] .auth-docs-item:hover,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-item:hover {
    background: rgba(186, 194, 210, 0.09) !important;
  }
  .al-root[data-theme="dark"] .auth-docs-item-title,
  .al-root[data-theme="classic-dark"] .auth-docs-item-title,
  .auth-docs-pop[data-theme="dark"] .auth-docs-item-title,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-item-title { color: #f5f5f7; }
  .al-root[data-theme="dark"] .auth-docs-item-desc,
  .al-root[data-theme="dark"] .auth-docs-empty,
  .al-root[data-theme="classic-dark"] .auth-docs-item-desc,
  .al-root[data-theme="classic-dark"] .auth-docs-empty,
  .auth-docs-pop[data-theme="dark"] .auth-docs-item-desc,
  .auth-docs-pop[data-theme="dark"] .auth-docs-empty,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-item-desc,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-empty { color: rgba(245,245,247,0.55); }
  /* Same dark CTA recipe as SSO / Weiter idle. */
  .al-root[data-theme="dark"] .auth-docs-all,
  .al-root[data-theme="classic-dark"] .auth-docs-all,
  .auth-docs-pop[data-theme="dark"] .auth-docs-all,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-all {
    color: rgba(245, 245, 247, 0.88) !important;
    background: rgba(186, 194, 210, 0.06) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    box-shadow: none !important;
  }
  .al-root[data-theme="dark"] .auth-docs-all:hover,
  .al-root[data-theme="dark"] .auth-docs-all:focus-visible,
  .al-root[data-theme="classic-dark"] .auth-docs-all:hover,
  .al-root[data-theme="classic-dark"] .auth-docs-all:focus-visible,
  .auth-docs-pop[data-theme="dark"] .auth-docs-all:hover,
  .auth-docs-pop[data-theme="dark"] .auth-docs-all:focus-visible,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-all:hover,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-all:focus-visible {
    background: rgba(186, 194, 210, 0.09) !important;
    color: rgba(245, 245, 247, 0.96) !important;
    border-color: rgba(255, 255, 255, 0.09) !important;
    box-shadow: none !important;
  }
  .al-root[data-theme="dark"] .auth-docs-all:active,
  .al-root[data-theme="classic-dark"] .auth-docs-all:active,
  .auth-docs-pop[data-theme="dark"] .auth-docs-all:active,
  .auth-docs-pop[data-theme="classic-dark"] .auth-docs-all:active {
    background: rgba(186, 194, 210, 0.12) !important;
    color: #f5f5f7 !important;
    border-color: rgba(255, 255, 255, 0.07) !important;
    box-shadow: none !important;
  }
  @media (max-width: 768px) {
    .al-root[data-theme="dark"] .auth-docs-pop.festag-popup-mobile-sheet .festag-popup-drag-handle,
    .al-root[data-theme="classic-dark"] .auth-docs-pop.festag-popup-mobile-sheet .festag-popup-drag-handle,
    .auth-docs-mobile-host[data-theme="dark"] .auth-docs-pop .festag-popup-drag-handle,
    .auth-docs-mobile-host[data-theme="classic-dark"] .auth-docs-pop .festag-popup-drag-handle {
      background: rgba(255, 255, 255, 0.22);
      opacity: 1;
    }
  }

  /* Local data-theme (incl. portaled sheet) — independent of html portal theme. */
  .auth-docs[data-theme="dark"] .auth-docs-trigger,
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger {
    color: rgba(245,245,247,0.55) !important;
  }
  .auth-docs[data-theme="dark"] .auth-docs-trigger:hover,
  .auth-docs[data-theme="dark"] .auth-docs-trigger:focus-visible,
  .auth-docs[data-theme="dark"] .auth-docs-trigger[aria-expanded="true"],
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger:hover,
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger:focus-visible,
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger[aria-expanded="true"] {
    color: #f5f5f7 !important;
  }
`
