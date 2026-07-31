'use client'

import { useEffect, useRef, useState } from 'react'
import { DotsThree } from '@phosphor-icons/react'
import { AUTH_LEGAL_LINKS } from '@/lib/legal-nav'

type Props = {
  onNavigate: (href: string) => void
}

/** Ghost ··· menu — compact Aeonik popover (Datenschutz, AGB, …). */
export default function AuthLandingMobileMenu({ onNavigate }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMounted(true)
    setVisible(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
  }

  function closeMenu() {
    setVisible(false)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMounted(false), 220)
  }

  function toggleMenu() {
    if (mounted && visible) closeMenu()
    else openMenu()
  }

  function go(href: string) {
    closeMenu()
    onNavigate(href)
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

  return (
    <>
      <style>{MENU_CSS}</style>
      {mounted ? (
        <button
          type="button"
          className={`al-mobile-menu-backdrop${visible ? ' is-visible' : ''}`}
          aria-label="Menü schließen"
          onClick={closeMenu}
        />
      ) : null}
      <div className="al-mobile-menu" ref={rootRef}>
        <button
          type="button"
          className="al-mobile-menu-trigger no-min-tap"
          aria-label="Menü"
          aria-expanded={mounted && visible}
          aria-haspopup="menu"
          onClick={toggleMenu}
        >
          <DotsThree size={18} weight="bold" aria-hidden />
        </button>

        {mounted ? (
          <div
            className={`al-mobile-menu-pop${visible ? ' is-visible' : ''}`}
            role="menu"
            aria-label="Festag Navigation"
          >
            {AUTH_LEGAL_LINKS.map(({ href, label }) => (
              <button
                key={href}
                type="button"
                role="menuitem"
                className="al-mobile-menu-item"
                onClick={() => go(href)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
    color: rgba(232, 230, 225, 0.55);
  }
  .al-root[data-theme="dark"] .al-mobile-menu-trigger:hover,
  .al-root[data-theme="dark"] .al-mobile-menu-trigger:focus-visible,
  .al-root[data-theme="dark"] .al-mobile-menu-trigger[aria-expanded="true"],
  .dl-root[data-theme="dark"] .al-mobile-menu-trigger:hover,
  .dl-root[data-theme="dark"] .al-mobile-menu-trigger:focus-visible,
  .dl-root[data-theme="dark"] .al-mobile-menu-trigger[aria-expanded="true"] {
    color: rgba(232, 230, 225, 0.88);
  }

  .al-mobile-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 55;
    margin: 0;
    padding: 0;
    border: 0;
    background: rgba(0, 0, 0, 0.42);
    opacity: 0;
    cursor: default;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .22s ease;
  }
  .al-mobile-menu-backdrop.is-visible {
    opacity: 1;
  }

  .al-mobile-menu-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: -4px;
    z-index: 60;
    min-width: 148px;
    padding: 5px;
    border-radius: 8px;
    background: #141311;
    border: 1px solid rgba(232, 230, 225, 0.09);
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    opacity: 0;
    transform: translateY(-6px) scale(0.97);
    transform-origin: top right;
    pointer-events: none;
    transition:
      opacity .2s ease,
      transform .22s cubic-bezier(.16, 1, .3, 1);
  }
  .al-mobile-menu-pop.is-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }
  .al-root:not([data-theme="dark"]) .al-mobile-menu-pop,
  .dl-root:not([data-theme="dark"]) .al-mobile-menu-pop {
    background: #ffffff;
    border-color: rgba(30, 30, 32, 0.08);
  }

  .al-mobile-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 11px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: rgba(232, 230, 225, 0.78);
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1.25;
    letter-spacing: 0.02em;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: background .12s ease, color .12s ease;
  }
  .al-mobile-menu-item:hover,
  .al-mobile-menu-item:focus-visible {
    background: rgba(232, 230, 225, 0.06);
    color: rgba(232, 230, 225, 0.95);
    outline: none;
  }
  .al-root:not([data-theme="dark"]) .al-mobile-menu-item,
  .dl-root:not([data-theme="dark"]) .al-mobile-menu-item {
    color: rgba(30, 30, 32, 0.78);
  }
  .al-root:not([data-theme="dark"]) .al-mobile-menu-item:hover,
  .al-root:not([data-theme="dark"]) .al-mobile-menu-item:focus-visible,
  .dl-root:not([data-theme="dark"]) .al-mobile-menu-item:hover,
  .dl-root:not([data-theme="dark"]) .al-mobile-menu-item:focus-visible {
    background: rgba(30, 30, 32, 0.05);
    color: #1e1e20;
  }

  @media (min-width: 769px) {
    .al-mobile-menu { display: none !important; }
    .al-mobile-menu-backdrop { display: none !important; }
  }
`
