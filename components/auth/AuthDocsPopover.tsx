'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpenText, MagnifyingGlass } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { festagDocsArticles } from '@/lib/festag-docs'

type Props = {
  className?: string
}

const EXIT_MS = 200

export default function AuthDocsPopover({ className }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
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
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
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
      window.clearTimeout(t)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, isMobile])

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
    border: 0.7px solid var(--festag-glass-border, rgba(255,255,255,0.62));
    background: var(--festag-glass-bg-strong, rgba(255,255,255,0.72));
    backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
    -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
    box-shadow: var(--festag-glass-shadow-soft, 0 12px 32px rgba(15, 23, 42, 0.1));
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: 0;
    transform: translateY(6px) scale(0.98);
    transform-origin: top right;
    pointer-events: none;
    transition: opacity .2s ease, transform .2s cubic-bezier(.16,1,.3,1);
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
  }
  .auth-docs-mobile-host .festag-popup-backdrop,
  .auth-docs-mobile-host .auth-docs-pop {
    pointer-events: auto;
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
  .auth-docs-search input::placeholder { color: #86868b; }
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
    color: #86868b;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .auth-docs-empty {
    padding: 14px 10px;
    font-size: 13px;
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

  @media (max-width: 768px) {
    .auth-docs-pop.festag-popup-mobile-sheet {
      position: relative !important;
      top: auto !important;
      right: auto !important;
      left: auto !important;
      bottom: 0 !important;
      z-index: 1;
      width: 100% !important;
      max-width: 100% !important;
      max-height: min(88dvh, 720px);
      border-radius: 20px 20px 0 0 !important;
      border: 0.7px solid var(--festag-glass-border, rgba(255,255,255,0.62));
      border-bottom: none !important;
      padding: 0 24px calc(env(safe-area-inset-bottom, 0px) + 14px);
      gap: 10px;
      opacity: 1;
      transform: none;
      transform-origin: bottom center;
      pointer-events: auto;
      box-sizing: border-box;
    }
    .auth-docs-mobile-host:not(.is-visible) .auth-docs-pop.festag-popup-mobile-sheet {
      opacity: 0;
      transform: translateY(28px);
    }
    .auth-docs-pop.festag-popup-mobile-sheet .festag-popup-drag-area {
      display: flex;
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

  [data-theme="dark"] .auth-docs-trigger {
    background: transparent;
    border: 0;
    color: rgba(245,245,247,0.55);
    box-shadow: none;
  }
  [data-theme="dark"] .auth-docs-trigger:hover,
  [data-theme="dark"] .auth-docs-trigger:focus-visible,
  [data-theme="dark"] .auth-docs-trigger[aria-expanded="true"] {
    color: #f5f5f7;
    background: transparent;
  }
  [data-theme="dark"] .auth-docs-pop {
    background: rgba(18, 18, 20, 0.88);
    border-color: transparent;
    box-shadow: 0 16px 40px rgba(0,0,0,0.45);
  }
  [data-theme="dark"] .auth-docs-search {
    background: rgba(12, 12, 14, 0.72);
    border-color: transparent;
    color: rgba(245,245,247,0.45);
  }
  [data-theme="dark"] .auth-docs-search input { color: #f5f5f7; }
  [data-theme="dark"] .auth-docs-item:hover { background: rgba(255,255,255,0.06); }
  [data-theme="dark"] .auth-docs-item-title { color: #f5f5f7; }
  [data-theme="dark"] .auth-docs-item-desc,
  [data-theme="dark"] .auth-docs-empty { color: rgba(245,245,247,0.45); }
  [data-theme="dark"] .auth-docs-all {
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.55));
    background: var(--festag-btn-dark-bg, rgba(255,255,255,0.06));
    border: 0.7px solid var(--festag-btn-dark-border, transparent);
    box-shadow: var(--festag-btn-dark-shadow, none);
  }
  [data-theme="dark"] .auth-docs-all:hover,
  [data-theme="dark"] .auth-docs-all:active,
  [data-theme="dark"] .auth-docs-all:focus-visible {
    background: var(--festag-btn-dark-bg-hover, rgba(255,255,255,0.10));
    color: var(--festag-btn-dark-fg-hover, #f5f5f7);
    border-color: var(--festag-btn-dark-border-hover, transparent);
    box-shadow: var(--festag-btn-dark-shadow-hover, none);
  }
`
