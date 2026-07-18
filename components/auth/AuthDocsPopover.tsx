'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpenText, MagnifyingGlass } from '@phosphor-icons/react'
import { festagDocsArticles } from '@/lib/festag-docs'

type Props = {
  className?: string
}

export default function AuthDocsPopover({ className }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
    function onDown(e: MouseEvent) {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`auth-docs ${className || ''}`.trim()} ref={rootRef}>
      <style>{AUTH_DOCS_CSS}</style>
      <button
        type="button"
        className="auth-docs-trigger"
        aria-label="Dokumentation"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(v => !v)}
      >
        <BookOpenText size={15} weight="regular" aria-hidden />
      </button>
      {open ? (
        <div className="auth-docs-pop" role="dialog" aria-label="Dokumentation">
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
    width: 28px;
    height: 28px;
    padding: 0;
    margin: 0;
    border: 0 !important;
    border-radius: 999px;
    background: #f5f5f7;
    color: #6e6e73;
    cursor: pointer;
    box-shadow: none;
    outline: none;
    flex-shrink: 0;
    transition: color .15s ease, background .15s ease, opacity .15s ease;
  }
  .auth-docs-trigger:hover {
    color: #1e1e20;
    background: #ebebed;
  }
  .auth-docs-trigger:focus-visible {
    color: #1e1e20;
    background: #ebebed;
  }
  .auth-docs-trigger[aria-expanded="true"] {
    color: #1e1e20;
    background: #ebebed;
  }
  .auth-docs-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 40;
    width: min(320px, calc(100vw - 32px));
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
  }
  .auth-docs-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    border: 0.7px solid #e7ebf0;
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
    font-weight: 500;
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
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    color: #1e1e20;
    text-decoration: none;
  }
  .auth-docs-all:hover { background: rgba(15, 23, 42, 0.04); }

  [data-theme="dark"] .auth-docs-trigger {
    background: rgba(255,255,255,0.08);
    border: 0;
    color: rgba(245,245,247,0.55);
    box-shadow: none;
  }
  [data-theme="dark"] .auth-docs-trigger:hover,
  [data-theme="dark"] .auth-docs-trigger:focus-visible,
  [data-theme="dark"] .auth-docs-trigger[aria-expanded="true"] {
    color: #f5f5f7;
    background: rgba(255,255,255,0.12);
  }
  [data-theme="dark"] .auth-docs-pop {
    background: rgba(18, 18, 20, 0.88);
    border-color: rgba(255,255,255,0.1);
    box-shadow: 0 16px 40px rgba(0,0,0,0.45);
  }
  [data-theme="dark"] .auth-docs-search {
    background: rgba(12, 12, 14, 0.72);
    border-color: rgba(255,255,255,0.1);
    color: rgba(245,245,247,0.45);
  }
  [data-theme="dark"] .auth-docs-search input { color: #f5f5f7; }
  [data-theme="dark"] .auth-docs-item:hover { background: rgba(255,255,255,0.06); }
  [data-theme="dark"] .auth-docs-item-title { color: #f5f5f7; }
  [data-theme="dark"] .auth-docs-item-desc,
  [data-theme="dark"] .auth-docs-empty { color: rgba(245,245,247,0.45); }
  [data-theme="dark"] .auth-docs-all { color: #f5f5f7; }
  [data-theme="dark"] .auth-docs-all:hover { background: rgba(255,255,255,0.06); }
`
