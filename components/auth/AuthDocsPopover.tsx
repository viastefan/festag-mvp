'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpenText, MagnifyingGlass } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'
import { festagDocsArticles } from '@/lib/festag-docs'

type Props = {
  className?: string
}

export default function AuthDocsPopover({ className }: Props) {
  const [open, setOpen] = useState(false)
  const { mounted, visible } = useFestagPopupPresence(open)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useFestagMobile()
  const close = () => setOpen(false)

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
      role="dialog"
      aria-label="Dokumentation"
    >
      {isMobile ? <FestagPopupDragHandle onDismiss={close} /> : null}
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
            <a href={`/docs/${a.slug}`} className="auth-docs-item">
              <span className="auth-docs-item-title">{a.title}</span>
              <span className="auth-docs-item-desc">{a.description}</span>
            </a>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="auth-docs-empty">Keine Treffer</li>
        ) : null}
      </ul>
      <a className="auth-docs-all" href="/docs">Alle anzeigen</a>
    </div>
  )

  const overlay = mounted
    ? isMobile && typeof document !== 'undefined'
      ? createPortal(
          <div className={`festag-popup-mobile-host auth-docs-mobile-host${visible ? ' is-visible' : ''}`}>
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
    <div className={`auth-docs ${className || ''}`.trim()} ref={rootRef}>
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
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    max-width: 28px;
    max-height: 28px;
    aspect-ratio: 1;
    padding: 0;
    margin: 0;
    border: 0 !important;
    border-radius: 999px;
    background: transparent;
    color: #6e6e73;
    cursor: pointer;
    box-shadow: none;
    outline: none;
    flex-shrink: 0;
    line-height: 0;
    transition: color .15s ease, opacity .15s ease;
  }
  .auth-docs-trigger:hover {
    color: #1e1e20;
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
    /* Cooler, slightly more opaque glass — less white / less blur */
    border: 0.7px solid rgba(210, 216, 228, 0.55);
    background: rgba(244, 246, 250, 0.86);
    backdrop-filter: blur(12px) saturate(118%);
    -webkit-backdrop-filter: blur(12px) saturate(118%);
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 12px 28px rgba(15, 23, 42, 0.08);
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
  [data-theme="dark"] .auth-docs-mobile-host .festag-popup-backdrop,
  [data-theme="classic-dark"] .auth-docs-mobile-host .festag-popup-backdrop {
    background: rgba(0, 0, 0, 0.68);
  }
  .auth-docs-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    border: 0.7px solid transparent;
    background: rgba(245, 245, 247, 0.72);
    color: #86868b;
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
    color: #86868b;
    letter-spacing: var(--festag-tracking-small, 0.015em);
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
    color: #86868b;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .auth-docs-empty {
    padding: 14px 10px;
    font-size: 13px;
    letter-spacing: var(--festag-tracking-small, 0.015em);
    color: #86868b;
  }
  .auth-docs-all {
    display: block;
    text-align: center;
    padding: 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight:400;
    color: var(--festag-btn-dark-fg, #1e1e20);
    background: var(--festag-btn-dark-bg, #ffffff);
    border: 0.7px solid var(--festag-btn-dark-border, #e7ebf0);
    box-shadow: var(--festag-btn-dark-shadow,
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 1px 3px rgba(15, 23, 42, 0.03));
    text-decoration: none;
    transition: background .15s, border-color .15s, color .15s, box-shadow .15s;
  }
  .auth-docs-all:hover {
    background: var(--festag-btn-dark-bg-hover, #f7f8fb);
    border-color: var(--festag-btn-dark-border-hover, #dce1ea);
    color: var(--festag-btn-dark-fg-hover, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow-hover,
      0 1px 2px rgba(15, 23, 42, 0.05),
      0 1px 3px rgba(15, 23, 42, 0.04));
  }
  .auth-docs-all:active {
    background: var(--festag-btn-dark-bg-active, #e8ebf0);
    border-color: var(--festag-btn-dark-border-active, #cfd5df);
    color: var(--festag-btn-dark-fg-active, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow-active,
      inset 0 1px 2px rgba(15, 23, 42, 0.07),
      0 0.5px 1px rgba(15, 23, 42, 0.03));
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
      border: 0.7px solid rgba(210, 216, 228, 0.55);
      border-bottom: none !important;
      /* Cooler denser glass on mobile sheet */
      background: rgba(242, 244, 248, 0.92);
      backdrop-filter: blur(11px) saturate(125%);
      -webkit-backdrop-filter: blur(11px) saturate(125%);
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
      padding: 12px;
      font-size: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-docs-pop {
      transition: none !important;
    }
  }

  [data-theme="dark"] .auth-docs-trigger,
  [data-theme="classic-dark"] .auth-docs-trigger {
    background: transparent;
    border: 0;
    color: rgba(245,245,247,0.55);
    box-shadow: none;
  }
  [data-theme="dark"] .auth-docs-trigger:hover,
  [data-theme="dark"] .auth-docs-trigger:focus-visible,
  [data-theme="dark"] .auth-docs-trigger[aria-expanded="true"],
  [data-theme="classic-dark"] .auth-docs-trigger:hover,
  [data-theme="classic-dark"] .auth-docs-trigger:focus-visible,
  [data-theme="classic-dark"] .auth-docs-trigger[aria-expanded="true"] {
    color: #f5f5f7;
    background: transparent;
  }
  /* Solid OLED popup step — never leave light glass / blur on dark. */
  [data-theme="dark"] .auth-docs-pop,
  [data-theme="classic-dark"] .auth-docs-pop,
  [data-theme="dark"] .auth-docs-pop.festag-popup-mobile-sheet,
  [data-theme="classic-dark"] .auth-docs-pop.festag-popup-mobile-sheet {
    background: var(--festag-black-popup, #121214) !important;
    border-color: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow:
      0 -1px 2px rgba(0, 0, 0, 0.28),
      0 -24px 56px -20px rgba(0, 0, 0, 0.55);
  }
  [data-theme="dark"] .auth-docs-pop:not(.festag-popup-mobile-sheet),
  [data-theme="classic-dark"] .auth-docs-pop:not(.festag-popup-mobile-sheet) {
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  }
  [data-theme="dark"] .auth-docs-search,
  [data-theme="classic-dark"] .auth-docs-search {
    background: rgba(186, 194, 210, 0.26);
    border-color: transparent;
    color: rgba(245, 245, 247, 0.55);
  }
  [data-theme="dark"] .auth-docs-search input,
  [data-theme="classic-dark"] .auth-docs-search input { color: #f5f5f7; }
  [data-theme="dark"] .auth-docs-item:hover,
  [data-theme="classic-dark"] .auth-docs-item:hover { background: rgba(186,194,210,0.26); }
  [data-theme="dark"] .auth-docs-item-title,
  [data-theme="classic-dark"] .auth-docs-item-title { color: #f5f5f7; }
  [data-theme="dark"] .auth-docs-item-desc,
  [data-theme="dark"] .auth-docs-empty,
  [data-theme="classic-dark"] .auth-docs-item-desc,
  [data-theme="classic-dark"] .auth-docs-empty { color: rgba(245,245,247,0.55); }
  [data-theme="dark"] .auth-docs-all,
  [data-theme="classic-dark"] .auth-docs-all {
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.16));
    border: 0;
    box-shadow: none;
  }
  [data-theme="dark"] .auth-docs-all:hover,
  [data-theme="dark"] .auth-docs-all:focus-visible,
  [data-theme="classic-dark"] .auth-docs-all:hover,
  [data-theme="classic-dark"] .auth-docs-all:focus-visible {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.28));
    color: var(--festag-btn-dark-fg-hover, #f5f5f7);
  }
  [data-theme="dark"] .auth-docs-all:active,
  [data-theme="classic-dark"] .auth-docs-all:active {
    background: var(--festag-btn-dark-bg-active, rgba(186,194,210,0.36));
    color: var(--festag-btn-dark-fg-active, #f5f5f7);
    box-shadow: none;
  }
  @media (max-width: 768px) {
    [data-theme="dark"] .auth-docs-pop.festag-popup-mobile-sheet .festag-popup-drag-handle,
    [data-theme="classic-dark"] .auth-docs-pop.festag-popup-mobile-sheet .festag-popup-drag-handle {
      background: rgba(255, 255, 255, 0.22);
      opacity: 1;
    }
  }
`
