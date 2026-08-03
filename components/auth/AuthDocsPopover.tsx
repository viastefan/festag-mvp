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
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'

type Props = {
  className?: string
  /** Prefill recovery contact when Support is opened from Docs. */
  initialEmail?: string
  /** Prefer parent-owned recovery modal (Login/Register). Falls back to local modal. */
  onContactSupport?: () => void
  /** Where recovery was opened from (support routing). */
  page?: string
}

type DocsListItem = {
  href: string
  title: string
  description: string
}

/** Default Docs pop rows — legal first (auth-relevant), calm descriptions. */
const AUTH_DOCS_LEGAL_ITEMS: DocsListItem[] = [
  {
    href: '/datenschutz',
    title: 'Datenschutz',
    description: 'Wie Festag Daten speichert, schützt und wofür sie genutzt werden.',
  },
  {
    href: '/agb',
    title: 'AGB',
    description: 'Vertragliche Grundlagen für die Nutzung von festag.app.',
  },
  {
    href: '/nutzungsbedingungen',
    title: 'Nutzungsbedingungen',
    description: 'Regeln für Zugang, Verhalten und erlaubte Nutzung.',
  },
  {
    href: '/impressum',
    title: 'Impressum',
    description: 'Anbieterkennzeichnung und rechtliche Angaben.',
  },
  {
    href: '/widerruf',
    title: 'Widerruf',
    description: 'Widerrufsbelehrung und Hinweise zu Verbraucherrechten.',
  },
]

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return AUTH_DOCS_LEGAL_ITEMS

    const legalHits = AUTH_DOCS_LEGAL_ITEMS.filter(
      a =>
        a.title.toLowerCase().includes(q)
        || a.description.toLowerCase().includes(q)
        || LEGAL_NAV.some(l => l.href === a.href && l.label.toLowerCase().includes(q))
        || LEGAL_EXTRA.some(l => l.href === a.href && l.label.toLowerCase().includes(q)),
    )

    const docHits = festagDocsArticles
      .filter(a =>
        a.title.toLowerCase().includes(q)
        || a.description.toLowerCase().includes(q)
        || a.tags.some(t => t.toLowerCase().includes(q)),
      )
      .slice(0, 6)
      .map(a => ({
        href: `/docs/${a.slug}`,
        title: a.title,
        description: a.description,
      }))

    const seen = new Set<string>()
    const merged: DocsListItem[] = []
    for (const item of [...legalHits, ...docHits]) {
      if (seen.has(item.href)) continue
      seen.add(item.href)
      merged.push(item)
    }
    return merged.slice(0, 8)
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

  const panel = (
    <div
      ref={popRef}
      className={[
        'auth-docs-pop',
        'auth-docs-pop--light',
        visible ? 'is-visible' : '',
        isMobile ? 'festag-popup-mobile-sheet' : '',
      ].filter(Boolean).join(' ')}
      data-theme="light"
      role="dialog"
      aria-label="Dokumentation"
    >
      {isMobile ? <FestagPopupDragHandle onDismiss={close} visible={visible} /> : null}
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
      <ul className="auth-docs-list">
        {!query.trim() ? (
          <li>
            <button type="button" className="auth-docs-item auth-docs-item--action" onClick={openSupport}>
              <span className="auth-docs-item-title">Zugang wiederfinden</span>
              <span className="auth-docs-item-desc">
                Passwort, PIN oder Benutzername — wir helfen weiter.
              </span>
            </button>
          </li>
        ) : null}
        {filtered.map(a => (
          <li key={a.href}>
            <a
              href={a.href}
              className="auth-docs-item"
              onClick={e => goDocs(a.href, e)}
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
      <a
        className="auth-docs-all al-btn al-btn-ghost"
        href="/docs"
        onClick={e => goDocs('/docs', e)}
      >
        Alle anzeigen
      </a>
    </div>
  )

  const overlay = mounted
    ? isMobile && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`festag-popup-mobile-host auth-docs-mobile-host${visible ? ' is-visible' : ''}`}
            data-theme="light"
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

  /*
   * Docs pop — always Festag button-white (#FFFFFF).
   * Quiet shadow, 6px auth radius — never loud lift.
   */
  .auth-docs-pop,
  .auth-docs-pop.auth-docs-pop--light,
  .auth-docs-pop.auth-docs-pop--dark {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 40;
    width: min(340px, calc(100vw - 32px));
    max-width: min(340px, calc(100vw - 32px));
    border-radius: 6px;
    background: #FFFFFF !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #1e1e20;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    opacity: 0;
    transform: translateY(6px) scale(0.985);
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

  .auth-docs-search {
    display: flex;
    align-items: center;
    gap: 8px;
    /* Same height as Login .al-input */
    height: 46px;
    min-height: 46px;
    max-height: 46px;
    padding: 0 14px;
    border-radius: 8px;
    border: 2px solid rgba(30, 30, 32, 0.15);
    background: transparent;
    color: #5B647D;
    box-sizing: border-box;
    box-shadow: none;
    transition: border-color .18s ease;
  }
  .auth-docs-search:focus-within {
    border-color: #5B647D;
  }
  .auth-docs-search svg {
    color: #5B647D;
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
    color: #1e1e20 !important;
    -webkit-text-fill-color: #1e1e20;
    caret-color: #5B647D;
    font-family: inherit;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.25;
    -webkit-appearance: none !important;
    appearance: none !important;
    border-radius: 0 !important;
  }
  .auth-docs-search input::placeholder {
    color: #8891a0 !important;
    -webkit-text-fill-color: #8891a0 !important;
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

  .auth-docs-list {
    list-style: none;
    margin: 2px 0 0;
    padding: 0;
    max-height: 300px;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(30, 30, 32, 0.18) transparent;
  }
  .auth-docs-list::-webkit-scrollbar { width: 6px; }
  .auth-docs-list::-webkit-scrollbar-thumb {
    background: rgba(30, 30, 32, 0.14);
    border-radius: 999px;
  }

  .auth-docs-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    width: 100%;
    margin: 0;
    padding: 10px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    text-decoration: none;
    text-align: left;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    appearance: none;
    box-sizing: border-box;
    transition: background .15s ease;
  }
  .auth-docs-item:hover,
  .auth-docs-item:focus-visible {
    background: rgba(30, 30, 32, 0.04);
    outline: none;
  }
  .auth-docs-item-title {
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.3;
    color: #1e1e20;
  }
  .auth-docs-item-desc {
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1.4;
    letter-spacing: 0.01em;
    color: #8891a0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .auth-docs-empty {
    padding: 14px 10px;
    font-size: 13px;
    letter-spacing: 0.01em;
    color: #8891a0;
  }

  .auth-docs-all.al-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    /* Same as Login Weiter / SSO white CTA */
    height: 46px;
    min-height: 46px;
    max-height: 46px;
    margin: 4px 0 0;
    padding: 0 16px;
    border-radius: 6px !important;
    font-family: inherit;
    font-size: 14.5px;
    font-weight: 400;
    letter-spacing: 0.01em;
    white-space: nowrap;
    text-decoration: none !important;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    appearance: none;
    outline: none;
    color: #1e1e20 !important;
    background: #ffffff !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
    transition: background .15s, border-color .15s, box-shadow .15s, transform .08s ease;
  }
  .auth-docs-all.al-btn:hover {
    background: #fafafa !important;
    border-color: rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  }
  .auth-docs-all.al-btn:active {
    transform: scale(0.985);
    background: #f5f5f6 !important;
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
      --auth-docs-sheet-r: 14px;
      border-radius: var(--auth-docs-sheet-r) var(--auth-docs-sheet-r) 0 0 !important;
      border: 0 !important;
      background: #FFFFFF !important;
      box-shadow: 0 -1px 4px rgba(15, 23, 42, 0.05) !important;
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
      will-change: auto !important;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 16px);
      gap: 8px;
      transform-origin: bottom center;
      pointer-events: auto;
      box-sizing: border-box;
      opacity: 1;
      transform: none;
      color: #1e1e20;
    }
    .auth-docs-mobile-host { background: transparent !important; }
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
    /* No H1 above search on mobile — search is the top of content */
    .auth-docs-sheet-title {
      display: none !important;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-search {
      margin-top: 10px;
      height: 46px;
      min-height: 46px;
      max-height: 46px;
      border-radius: 8px;
      padding: 0 14px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-search input {
      font-size: 15px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-list {
      max-height: min(52dvh, 420px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      margin-top: 4px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item {
      padding: 12px 8px;
      border-radius: 8px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item-title {
      font-size: 15px;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-item-desc {
      font-size: 13px;
      line-height: 1.42;
    }
    .auth-docs-pop.festag-popup-mobile-sheet .auth-docs-all.al-btn {
      height: 46px;
      min-height: 46px;
      max-height: 46px;
      margin-top: 8px;
      border-radius: 6px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-docs-pop { transition: none !important; }
  }

  .al-root[data-theme="dark"] .auth-docs-trigger,
  .al-root[data-theme="classic-dark"] .auth-docs-trigger,
  .auth-docs[data-theme="dark"] .auth-docs-trigger,
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger,
  .dl-root[data-theme="dark"] .auth-docs-trigger {
    color: rgba(245, 245, 247, 0.55) !important;
  }
  .al-root[data-theme="dark"] .auth-docs-trigger:hover,
  .al-root[data-theme="dark"] .auth-docs-trigger:focus-visible,
  .al-root[data-theme="dark"] .auth-docs-trigger[aria-expanded="true"],
  .al-root[data-theme="classic-dark"] .auth-docs-trigger:hover,
  .al-root[data-theme="classic-dark"] .auth-docs-trigger:focus-visible,
  .al-root[data-theme="classic-dark"] .auth-docs-trigger[aria-expanded="true"],
  .auth-docs[data-theme="dark"] .auth-docs-trigger:hover,
  .auth-docs[data-theme="dark"] .auth-docs-trigger:focus-visible,
  .auth-docs[data-theme="dark"] .auth-docs-trigger[aria-expanded="true"],
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger:hover,
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger:focus-visible,
  .auth-docs[data-theme="classic-dark"] .auth-docs-trigger[aria-expanded="true"] {
    color: rgba(245, 245, 247, 0.92) !important;
  }
`
