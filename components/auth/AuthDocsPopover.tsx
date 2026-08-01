'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { BookOpenText, MagnifyingGlass } from '@phosphor-icons/react'
import AuthRecoveryModal from '@/components/auth/AuthRecoveryModal'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'
import { navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { festagDocsArticles } from '@/lib/festag-docs'

type Props = {
  className?: string
  /** Prefill recovery contact when Support is opened from Docs. */
  initialEmail?: string
  /** Prefer parent-owned recovery modal (Login/Register). Falls back to local modal. */
  onContactSupport?: () => void
  /** Where recovery was opened from (support routing). */
  page?: string
}

/** Auth canvas theme — never inherit portal html[data-theme=dark] on a light login. */
function readAuthCanvasTheme(): string {
  if (typeof document === 'undefined') return 'light'
  const root = document.querySelector('.al-root, .dl-root, .mob')
  const theme = root?.getAttribute('data-theme')
  return theme === 'dark' || theme === 'classic-dark' || theme === 'read' ? theme : 'light'
}

export default function AuthDocsPopover({
  className,
  initialEmail = '',
  onContactSupport,
  page = '/login',
}: Props) {
  const [open, setOpen] = useState(false)
  const { mounted, visible } = useFestagPopupPresence(open)
  const [query, setQuery] = useState('')
  const [supportOpen, setSupportOpen] = useState(false)
  const [canvasTheme, setCanvasTheme] = useState(() => readAuthCanvasTheme())
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useFestagMobile()
  const close = () => setOpen(false)

  function openSupport() {
    setOpen(false)
    if (onContactSupport) {
      onContactSupport()
      return
    }
    setSupportOpen(true)
  }

  function goDocs(href: string, e?: ReactMouseEvent<HTMLAnchorElement>) {
    e?.preventDefault()
    setOpen(false)
    navigateLeavingAuthChrome(href)
  }

  useEffect(() => {
    const sync = () => setCanvasTheme(readAuthCanvasTheme())
    sync()
    const root = document.querySelector('.al-root, .dl-root, .mob')
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

  const showLegal = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      q.includes('recht')
      || q.includes('agb')
      || q.includes('datenschutz')
      || q.includes('impressum')
      || q.includes('privacy')
      || q.includes('widerruf')
      || q.includes('nutzung')
    )
  }, [query])

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
      {isMobile ? (
        <h2 className="auth-docs-sheet-title">
          Alles zu Festag — klar und kurz nachschlagen.
        </h2>
      ) : null}
      <div className="auth-docs-search">
        <MagnifyingGlass size={15} weight="regular" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Suchen…"
          aria-label="Dokumentation durchsuchen"
        />
      </div>
      <button type="button" className="auth-docs-support" onClick={openSupport}>
        <span className="auth-docs-support-title">Support kontaktieren</span>
        <span className="auth-docs-support-desc">
          Benutzername oder Passwort vergessen — wir helfen dir weiter.
        </span>
      </button>
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
        {showLegal ? (
          <li>
            <a
              href="/datenschutz"
              className="auth-docs-item"
              onClick={e => goDocs('/datenschutz', e)}
            >
              <span className="auth-docs-item-title">Rechtliches</span>
              <span className="auth-docs-item-desc">
                Datenschutz, AGB, Impressum und mehr
              </span>
            </a>
          </li>
        ) : null}
        {filtered.length === 0 && !showLegal ? (
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
      {!onContactSupport ? (
        <AuthRecoveryModal
          open={supportOpen}
          onClose={() => setSupportOpen(false)}
          initialEmail={initialEmail}
          page={page}
          variant="client"
        />
      ) : null}
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
    border-radius: var(--festag-auth-radius-sm, 10px);
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
    border-radius: 12px;
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
  /* Light — clean paper, quiet contact shadow (no heavy ambient lift). */
  .auth-docs-pop.auth-docs-pop--light {
    background: #FFFFFF !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
  }
  /* Dark — dusk popup surface (inherits --festag-black-popup from auth html). */
  .auth-docs-pop.auth-docs-pop--dark {
    background: var(--festag-black-popup, #171A24) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.22) !important;
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
    height: 40px;
    min-height: 40px;
    padding: 0 12px;
    border-radius: var(--festag-input-radius, 8px);
    /* Same 2px stroke as Login email — color only on focus. */
    border: 2px solid rgba(30, 30, 32, 0.15);
    background: transparent;
    color: var(--al-accent, #5B647D);
    opacity: 1;
    box-sizing: border-box;
    box-shadow: none;
    transition: border-color .18s ease;
  }
  .auth-docs-search:focus-within {
    border-color: var(--festag-input-border-focus, #7E889F);
    box-shadow: none;
  }
  .auth-docs-search svg {
    color: var(--al-accent, #5B647D);
    opacity: 0.55;
    flex-shrink: 0;
  }
  .auth-docs-search:focus-within svg {
    opacity: 0.85;
  }
  .auth-docs-search input,
  .auth-docs-search input:hover,
  .auth-docs-search input:active,
  .auth-docs-search input:focus,
  .auth-docs-search input:focus-visible {
    flex: 1;
    min-width: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0 !important;
    outline: none !important;
    box-shadow: none !important;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: #1e1e20;
    -webkit-text-fill-color: #1e1e20;
    caret-color: #1e1e20;
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1.25;
    -webkit-appearance: none !important;
    appearance: none !important;
    border-radius: 0 !important;
  }
  .auth-docs-search input::placeholder {
    color: var(--festag-input-placeholder, #8891a0) !important;
    -webkit-text-fill-color: var(--festag-input-placeholder, #8891a0) !important;
    letter-spacing: var(--festag-tracking-small, 0.015em);
    opacity: 1;
  }
  .auth-docs-search input::-webkit-search-decoration,
  .auth-docs-search input::-webkit-search-cancel-button,
  .auth-docs-search input::-webkit-search-results-button,
  .auth-docs-search input::-webkit-search-results-decoration {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }
  .auth-docs-support {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    margin: 0;
    padding: 10px 10px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    border-radius: var(--festag-auth-radius, 6px);
    background: rgba(91, 100, 125, 0.05);
    color: inherit;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    appearance: none;
    transition: background .15s ease, border-color .15s ease;
  }
  .auth-docs-support:hover,
  .auth-docs-support:focus-visible {
    background: rgba(91, 100, 125, 0.09);
    border-color: rgba(30, 30, 32, 0.12);
    outline: none;
  }
  .auth-docs-support-title {
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: var(--auth-tracking, 0.01em);
    color: #1e1e20;
  }
  .auth-docs-support-desc {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: var(--auth-tracking, 0.01em);
    color: var(--al-text-muted, #8891a0);
  }
  .auth-docs-pop--dark .auth-docs-support {
    background: rgba(186, 194, 210, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .auth-docs-pop--dark .auth-docs-support:hover,
  .auth-docs-pop--dark .auth-docs-support:focus-visible {
    background: rgba(186, 194, 210, 0.10);
    border-color: rgba(255, 255, 255, 0.12);
  }
  .auth-docs-pop--dark .auth-docs-support-title {
    color: #f5f5f7;
  }
  .auth-docs-pop--dark .auth-docs-support-desc {
    color: var(--al-text-muted, #8891a0);
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
    border-radius: var(--festag-auth-radius, 6px);
    text-decoration: none;
    color: inherit;
  }
  .auth-docs-item:hover { background: rgba(91, 100, 125, 0.07); }
  .auth-docs-pop--dark .auth-docs-item:hover {
    background: rgba(186, 194, 210, 0.09) !important;
  }
  .auth-docs-item-title {
    font-size: 13.5px;
    font-weight:400;
    letter-spacing: var(--auth-tracking, 0.01em);
    color: #1e1e20;
  }
  .auth-docs-item-desc {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: var(--auth-tracking, 0.01em);
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
    height: var(--festag-btn-height, 40px);
    min-height: var(--festag-btn-height, 40px);
    max-height: var(--festag-btn-height, 40px);
    margin: 0;
    padding: 0 16px;
    border-radius: var(--festag-auth-radius, 6px) !important;
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: var(--auth-tracking, 0.01em);
    white-space: nowrap;
    text-decoration: none !important;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    appearance: none;
    outline: none;
    transition: background .15s, border-color .15s, color .15s, box-shadow .15s, transform .08s ease;
  }
  /* Light Alle anzeigen — Linear soft white (same as auth Weiter). */
  .auth-docs-pop--light .auth-docs-all.al-btn {
    color: var(--festag-btn-dark-fg, #1e1e20) !important;
    background: var(--festag-btn-dark-bg, #ffffff) !important;
    border: 1px solid var(--festag-btn-dark-border, rgba(30, 30, 32, 0.08)) !important;
    box-shadow: var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
  }
  .auth-docs-pop--light .auth-docs-all.al-btn:hover {
    background: var(--festag-btn-dark-bg-hover, #fafafa) !important;
    border-color: var(--festag-btn-dark-border-hover, rgba(30, 30, 32, 0.08)) !important;
    color: var(--festag-btn-dark-fg-hover, #1e1e20) !important;
    box-shadow: var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
  }
  .auth-docs-pop--light .auth-docs-all.al-btn:active {
    transform: scale(0.985);
    background: var(--festag-btn-dark-bg-active, #f5f5f6) !important;
    box-shadow: var(--festag-btn-dark-shadow-active, none) !important;
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
      /* Soft top corners — match shared sheet radius (not 22px pills). */
      --auth-docs-sheet-r: var(--festag-sheet-radius, 14px);
      border-radius: var(--auth-docs-sheet-r) var(--auth-docs-sheet-r) 0 0 !important;
      border: 0 !important;
      background: #FFFFFF !important;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.09),
        0 -24px 56px -20px rgba(15, 23, 42, 0.28) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      isolation: isolate;
      overflow: hidden !important;
      background-clip: padding-box !important;
      -webkit-background-clip: padding-box !important;
      clip-path: inset(0 round var(--auth-docs-sheet-r) var(--auth-docs-sheet-r) 0 0);
      -webkit-clip-path: inset(0 round var(--auth-docs-sheet-r) var(--auth-docs-sheet-r) 0 0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      /* will-change+transform paints rectangular white ears in Safari/WebKit */
      will-change: auto !important;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 14px);
      gap: 8px;
      transform-origin: bottom center;
      pointer-events: auto;
      box-sizing: border-box;
      opacity: 1;
      transform: none;
    }
    .auth-docs-pop.auth-docs-pop--dark.festag-popup-mobile-sheet {
      background: var(--festag-black-popup, #171A24) !important;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.28),
        0 -16px 36px -16px rgba(0, 0, 0, 0.45) !important;
    }
    .auth-docs-mobile-host {
      background: transparent !important;
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
    /* Festag popup mark: sentence H1 only — no muted lead under it. */
    .auth-docs-sheet-title {
      margin: 4px 0 0;
      padding: 0;
      font-size: 26px;
      line-height: 1.22;
      letter-spacing: var(--auth-tracking-display, 0.006em);
      font-weight: 400;
      font-family: inherit;
      color: #1e1e20;
      text-align: left;
    }
    .auth-docs-pop--dark .auth-docs-sheet-title {
      color: #f5f5f7;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-search {
      margin-top: 14px;
      height: 42px;
      min-height: 42px;
      border-radius: var(--festag-auth-radius, 6px);
      padding: 0 14px;
      font-size: 14px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-search input {
      font-size: 14px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-list {
      max-height: min(52dvh, 420px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-support {
      padding: 12px 12px;
      border-radius: var(--festag-auth-radius, 6px);
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-support-title {
      font-size: 15px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-support-desc {
      font-size: 13px;
      line-height: 1.4;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item {
      padding: 12px 10px;
      border-radius: var(--festag-auth-radius, 6px);
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item-title {
      font-size: 15px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item-desc {
      font-size: 13px;
      line-height: 1.4;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-all.al-btn {
      height: var(--festag-btn-height, 44px);
      min-height: var(--festag-btn-height, 44px);
      max-height: var(--festag-btn-height, 44px);
      padding: 0 14px;
      font-size: 14px;
      letter-spacing: var(--auth-tracking, 0.01em);
      border-radius: var(--festag-auth-radius, 6px) !important;
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
    color: #8891a0;
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
    background: transparent !important;
    border: 2px solid rgba(255, 255, 255, 0.15) !important;
    color: #8891a0;
  }
  .auth-docs-pop--dark .auth-docs-search:focus-within {
    border-color: #7E889F !important;
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
  .auth-docs-pop--dark .auth-docs-empty { color: #8891a0; }
  .auth-docs-pop--light .auth-docs-search {
    background: transparent;
    border: 2px solid rgba(30, 30, 32, 0.15);
    color: var(--al-accent, #5B647D);
  }
  .auth-docs-pop--light .auth-docs-search:focus-within {
    border-color: var(--festag-input-border-focus, #7E889F);
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
    color: #8891a0 !important;
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
