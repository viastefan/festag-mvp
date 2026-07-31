'use client'

/**
 * Auth mobile ··· menu — Festag Night bottom sheet with drag handle
 * (same sheet language as festag-popup-mobile-sheet).
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DotsThree } from '@phosphor-icons/react'
import { AUTH_DACH_REGION_NOTE, AUTH_LEGAL_LINKS } from '@/lib/legal-nav'

type Props = {
  onNavigate: (href: string) => void
}

const SHEET_MS = 220
const DISMISS_PX = 72

function resolveChrome(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  const root = document.querySelector('.al-root, .dl-root')
  const fromRoot = root?.getAttribute('data-theme')
  const fromHtml = document.documentElement.getAttribute('data-theme')
  const theme = fromRoot || fromHtml
  if (theme === 'dark' || theme === 'classic-dark') return 'dark'
  if (root?.classList.contains('onb-sand-dark')) return 'dark'
  return 'light'
}

export default function AuthLandingMobileMenu({ onNavigate }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [chrome, setChrome] = useState<'dark' | 'light'>('dark')
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<{ startY: number } | null>(null)

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setChrome(resolveChrome())
    setDragY(0)
    setDragging(false)
    setMounted(true)
    setVisible(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
  }

  function closeMenu() {
    setVisible(false)
    setDragY(0)
    setDragging(false)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMounted(false), SHEET_MS)
  }

  function toggleMenu() {
    if (mounted && visible) closeMenu()
    else openMenu()
  }

  function go(href: string) {
    closeMenu()
    onNavigate(href)
  }

  function onDragStart(e: React.PointerEvent) {
    if (e.button !== 0) return
    dragRef.current = { startY: e.clientY }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    setDragY(Math.max(0, e.clientY - d.startY))
  }

  function onDragEnd(e: React.PointerEvent) {
    const dy = dragY
    dragRef.current = null
    setDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch { /* noop */ }
    if (dy >= DISMISS_PX) closeMenu()
    else setDragY(0)
  }

  useEffect(() => {
    if (!mounted) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted])

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const sheet = mounted && typeof document !== 'undefined'
    ? createPortal(
        <div
          className={`al-nav-sheet-host${visible ? ' is-visible' : ''}`}
          data-chrome={chrome}
          aria-hidden={!visible}
        >
          <button
            type="button"
            className="al-nav-sheet-backdrop"
            aria-label="Menü schließen"
            onClick={closeMenu}
          />
          <div
            className="al-nav-sheet"
            role="menu"
            aria-label="Festag Navigation"
            style={{
              transform: visible
                ? `translate3d(0, ${dragY}px, 0)`
                : 'translate3d(0, 100%, 0)',
              transition: dragging
                ? 'none'
                : `transform ${SHEET_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            <div
              className={`al-nav-sheet-drag${visible ? ' is-grip-visible' : ''}`}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              <div className="al-nav-sheet-grip" aria-hidden />
            </div>
            <div className="al-nav-sheet-body">
              {AUTH_LEGAL_LINKS.map(({ href, label }) => (
                <div key={href} className="al-nav-sheet-block">
                  <button
                    type="button"
                    role="menuitem"
                    className="al-nav-sheet-item"
                    onClick={() => go(href)}
                  >
                    {label}
                  </button>
                  {href === '/agb' ? (
                    <p className="al-nav-sheet-note">{AUTH_DACH_REGION_NOTE}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <style>{MENU_CSS}</style>
      <div className="al-mobile-menu">
        <button
          type="button"
          className="al-mobile-menu-trigger no-min-tap"
          aria-label="Menü"
          aria-expanded={mounted && visible}
          aria-haspopup="dialog"
          onClick={toggleMenu}
        >
          <DotsThree size={18} weight="bold" aria-hidden />
        </button>
      </div>
      {sheet}
    </>
  )
}

const MENU_CSS = `
  .al-mobile-menu {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: transparent !important;
    box-shadow: none !important;
    height: auto;
    padding: 0;
    border-radius: 0;
    z-index: 62;
  }
  .al-mobile-menu-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    padding: 0;
    margin: 0;
    border: 0 !important;
    border-radius: var(--festag-auth-radius-sm, 10px);
    background: transparent !important;
    color: #6e6e73;
    cursor: pointer;
    box-shadow: none !important;
    outline: none;
    line-height: 0;
    transition: color .15s ease, opacity .15s ease;
  }
  .al-mobile-menu-trigger:hover,
  .al-mobile-menu-trigger:focus-visible,
  .al-mobile-menu-trigger[aria-expanded="true"] {
    color: #1e1e20;
    background: transparent !important;
  }
  .al-root[data-theme="dark"] .al-mobile-menu-trigger,
  .dl-root[data-theme="dark"] .al-mobile-menu-trigger {
    color: rgba(230, 230, 234, 0.55);
  }
  .al-root[data-theme="dark"] .al-mobile-menu-trigger:hover,
  .al-root[data-theme="dark"] .al-mobile-menu-trigger:focus-visible,
  .al-root[data-theme="dark"] .al-mobile-menu-trigger[aria-expanded="true"],
  .dl-root[data-theme="dark"] .al-mobile-menu-trigger:hover,
  .dl-root[data-theme="dark"] .al-mobile-menu-trigger:focus-visible,
  .dl-root[data-theme="dark"] .al-mobile-menu-trigger[aria-expanded="true"] {
    color: rgba(230, 230, 234, 0.88);
  }

  .al-nav-sheet-host {
    position: fixed;
    inset: 0;
    z-index: 120000;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    pointer-events: none;
    isolation: isolate;
  }
  .al-nav-sheet-host.is-visible {
    pointer-events: auto;
  }
  .al-nav-sheet-backdrop {
    position: absolute;
    inset: 0;
    z-index: 0;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: rgba(7, 7, 8, 0.58);
    opacity: 0;
    cursor: default;
    -webkit-tap-highlight-color: transparent;
    transition: opacity ${SHEET_MS}ms ease;
  }
  .al-nav-sheet-host[data-chrome="light"] .al-nav-sheet-backdrop {
    background: rgba(15, 18, 24, 0.38);
  }
  .al-nav-sheet-host.is-visible .al-nav-sheet-backdrop {
    opacity: 1;
  }

  .al-nav-sheet {
    position: relative;
    z-index: 1;
    width: 100%;
    max-height: min(78dvh, 520px);
    box-sizing: border-box;
    border-radius: 14px 14px 0 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: none;
    background: #1A1A1E;
    color: #E6E6EA;
    box-shadow:
      0 -1px 2px rgba(0, 0, 0, 0.28),
      0 -24px 56px -20px rgba(0, 0, 0, 0.55);
    padding: 0 12px calc(env(safe-area-inset-bottom, 0px) + 14px);
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    will-change: transform;
  }
  .al-nav-sheet-host[data-chrome="light"] .al-nav-sheet {
    background: #ffffff;
    border-color: rgba(30, 30, 32, 0.08);
    color: #1e1e20;
    box-shadow:
      0 -1px 2px rgba(30, 30, 32, 0.04),
      0 -18px 40px rgba(30, 30, 32, 0.12);
  }

  .al-nav-sheet-drag {
    width: 100%;
    padding: 10px 0 4px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    touch-action: none;
    cursor: grab;
    opacity: 0;
    transform: translate3d(0, -5px, 0);
    transition:
      opacity ${SHEET_MS}ms cubic-bezier(0.32, 0.72, 0, 1),
      transform ${SHEET_MS}ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .al-nav-sheet-drag:active { cursor: grabbing; }
  .al-nav-sheet-drag.is-grip-visible {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    transition-delay: 40ms;
  }
  .al-nav-sheet-grip {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
  }
  .al-nav-sheet-host[data-chrome="light"] .al-nav-sheet-grip {
    background: rgba(30, 30, 32, 0.18);
  }

  .al-nav-sheet-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 4px 2px;
  }
  .al-nav-sheet-block {
    display: flex;
    flex-direction: column;
  }
  .al-nav-sheet-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 14px 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: 0.015em;
    line-height: 1.3;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .14s ease;
  }
  .al-nav-sheet-item:hover,
  .al-nav-sheet-item:focus-visible {
    background: #27272C;
    outline: none;
  }
  .al-nav-sheet-host[data-chrome="light"] .al-nav-sheet-item:hover,
  .al-nav-sheet-host[data-chrome="light"] .al-nav-sheet-item:focus-visible {
    background: rgba(30, 30, 32, 0.05);
  }
  .al-nav-sheet-note {
    margin: 0 12px 10px;
    padding: 0;
    font-size: 12px;
    line-height: 1.45;
    letter-spacing: 0.015em;
    font-weight: 400;
    color: #8891a0;
  }
  .al-nav-sheet-host[data-chrome="light"] .al-nav-sheet-note {
    color: #8891a0;
  }

  @media (min-width: 769px) {
    .al-mobile-menu { display: none !important; }
    .al-nav-sheet-host { display: none !important; }
  }
`
