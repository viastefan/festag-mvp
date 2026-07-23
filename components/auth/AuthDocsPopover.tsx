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

  const isDarkCanvas = canvasTheme === 'dark' || canvasTheme === 'classic-dark'

  const panel = (
    <div
      ref={popRef}
      className={[
        'auth-docs-pop',
        isDarkCanvas ? 'auth-docs-pop--dark' : 'auth-docs-pop--light',
        visible ? 'is-visible' : '',
        /* No festag-popup-surface on mobile — its --fp-bg/border paints white corner ears. */
        isMobile ? 'festag-popup-mobile-sheet' : '',
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
      <a className="auth-docs-all al-btn al-btn-ghost" href="/docs" onClick={e => goDocs('/docs', e)}>Alle anzeigen</a>
    </div>
  )

  const overlay = mounted
    ? isMobile && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`festag-popup-mobile-host auth-docs-mobile-host${visible ? ' is-visible' : ''}${isDarkCanvas ? ' auth-docs-mobile-host--dark' : ''}`}
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
    border: 0 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
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
  /* Light — Apple gray surface (NOT global --raised which is pure #fff). */
  .auth-docs-pop.auth-docs-pop--light {
    background: #FCFCFD !important;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.03),
      0 6px 16px rgba(0, 0, 0, 0.04) !important;
  }
  /* Dark — OLED popup step. */
  .auth-docs-pop.auth-docs-pop--dark {
    background: #121214 !important;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.35),
      0 10px 24px rgba(0, 0, 0, 0.38) !important;
    color: #f5f5f7;
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
    min-height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    border: 0;
    background: var(--festag-input-fill, #EEEEF0);
    color: var(--al-text-muted, #8891a0);
    box-sizing: border-box;
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
  .auth-docs-pop--dark .auth-docs-item:hover {
    /* Same quiet slate lift as dark SSO / ghost CTA hover. */
    background: rgba(186, 194, 210, 0.09) !important;
  }
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
  .auth-docs-all.al-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 42px;
    min-height: 42px;
    margin: 0;
    padding: 0 16px;
    border-radius: 999px;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: var(--ls-body, 0.021em);
    white-space: nowrap;
    text-decoration: none !important;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    appearance: none;
    outline: none;
    transition: background .15s, border-color .15s, color .15s, box-shadow .15s, transform .08s ease;
  }
  /* Light Alle anzeigen = same recipe as Weiter / SSO ghost. */
  .auth-docs-pop--light .auth-docs-all.al-btn {
    color: #1e1e20 !important;
    background: #ffffff !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  }
  .auth-docs-pop--light .auth-docs-all.al-btn:hover {
    background: #fafafa !important;
    border-color: rgba(30, 30, 32, 0.08) !important;
    color: #1e1e20 !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  }
  .auth-docs-pop--light .auth-docs-all.al-btn:active {
    transform: scale(0.985);
    background: #f5f5f6 !important;
    box-shadow: none !important;
  }
  /* Dark Alle anzeigen = same slate idle as SSO ghost. */
  .auth-docs-pop--dark .auth-docs-all.al-btn {
    color: rgba(245, 245, 247, 0.88) !important;
    background: rgba(186, 194, 210, 0.06) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    box-shadow: none !important;
  }
  .auth-docs-pop--dark .auth-docs-all.al-btn:hover,
  .auth-docs-pop--dark .auth-docs-all.al-btn:focus-visible {
    background: rgba(186, 194, 210, 0.09) !important;
    color: rgba(245, 245, 247, 0.96) !important;
    border-color: rgba(255, 255, 255, 0.09) !important;
    box-shadow: none !important;
  }
  .auth-docs-pop--dark .auth-docs-all.al-btn:active {
    transform: scale(0.985);
    background: rgba(186, 194, 210, 0.12) !important;
    color: #f5f5f7 !important;
    border-color: rgba(255, 255, 255, 0.07) !important;
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
      /* Same solid sheet as AuthPanelSwitch — no surface border / white corner ears. */
      border-radius: var(--festag-sheet-radius, 22px) var(--festag-sheet-radius, 22px) 0 0 !important;
      border: 0 !important;
      background: #ffffff !important;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.09),
        0 -24px 56px -20px rgba(15, 23, 42, 0.28) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      isolation: isolate;
      overflow: hidden;
      background-clip: padding-box;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 14px);
      gap: 8px;
      transform-origin: bottom center;
      pointer-events: auto;
      box-sizing: border-box;
      /* Kill desktop popover motion/radius that leaks white corner ghosts. */
      opacity: 1;
      transform: none;
    }
    .auth-docs-pop.auth-docs-pop--dark.festag-popup-mobile-sheet {
      background: #121214 !important;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.35),
        0 -16px 36px -16px rgba(0, 0, 0, 0.5) !important;
    }
    .auth-docs-mobile-host .auth-docs-pop.festag-popup-mobile-sheet {
      opacity: 0;
      transform: translate3d(0, 28px, 0);
    }
    .auth-docs-mobile-host.is-visible .auth-docs-pop.festag-popup-mobile-sheet {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
    .auth-docs-pop.festag-popup-mobile-sheet .festag-popup-drag-area {
      display: flex;
      padding: 8px 0 0;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-search {
      margin-top: 0;
      height: 43px;
      min-height: 43px;
      border-radius: 999px;
      padding: 0 14px;
      font-size: 15px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-search input {
      font-size: 15px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-list {
      max-height: min(52dvh, 420px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
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
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-all.al-btn {
      height: 43px;
      min-height: 43px;
      padding: 0 16px;
      font-size: 15px;
      letter-spacing: -0.015em;
      border-radius: 999px !important;
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
  /* Dark content chrome — keyed off auth-docs-pop--dark (desktop + mobile). */
  .auth-docs-pop--dark .auth-docs-search {
    background: #1c1d22 !important;
    border: 0;
    color: rgba(245, 245, 247, 0.55);
  }
  .auth-docs-pop--dark .auth-docs-search input {
    color: rgba(232, 236, 242, 0.94);
    -webkit-text-fill-color: rgba(232, 236, 242, 0.94);
    caret-color: rgba(198, 206, 222, 0.78);
  }
  .auth-docs-pop--dark .auth-docs-search input::placeholder {
    color: rgba(245, 245, 247, 0.28) !important;
    -webkit-text-fill-color: rgba(245, 245, 247, 0.28) !important;
  }
  .auth-docs-pop--dark .auth-docs-item-title { color: #f5f5f7; }
  .auth-docs-pop--dark .auth-docs-item-desc,
  .auth-docs-pop--dark .auth-docs-empty { color: rgba(245, 245, 247, 0.55); }
  .auth-docs-pop--light .auth-docs-search {
    background: #EEEEF0;
    color: #8891a0;
  }

  @media (max-width: 768px) {
    .auth-docs-pop--dark.festag-popup-mobile-sheet .festag-popup-drag-handle,
    .auth-docs-mobile-host--dark .auth-docs-pop .festag-popup-drag-handle {
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
