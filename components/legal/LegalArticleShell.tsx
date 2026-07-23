'use client'

/**
 * LegalArticleShell — editorial layout for Festag legal pages.
 *
 * Always-light white reading surface (no theme switcher). Header: Zurück +
 * menu top-right (no wordmark). Desktop: Zurück above left TOC + ~65ch article
 * in a centered shell. Mobile keeps floating TOC dock; Zurück stays in the
 * header next to menu until the TOC rail appears.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowUUpLeft, DotsThree } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LEGAL_STYLES } from '@/components/legal/legal-styles'
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'
import {
  captureLegalReturnFromReferrer,
  isAuthReturnPath,
  navigateLegalBack,
  readLegalReturn,
} from '@/lib/legal-return'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'

const ALL_LEGAL = [...LEGAL_NAV, ...LEGAL_EXTRA] as const

export default function LegalArticleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [homeHref, setHomeHref] = useState('/')
  const [menuOpen, setMenuOpen] = useState(false)
  const { mounted: menuMounted, visible: menuVisible } = useFestagPopupPresence(menuOpen)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    captureLegalReturnFromReferrer()
    const returnPath = readLegalReturn()
    if (returnPath && isAuthReturnPath(returnPath)) {
      setHomeHref(returnPath)
      return
    }
    setHomeHref('/')
  }, [pathname])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: globalThis.MouseEvent) {
      if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function goBack() {
    navigateLegalBack(router.push, router.back, homeHref)
  }

  return (
    <div className="legal-root" data-theme="light">
      <style>{LEGAL_STYLES}</style>

      <header className="legal-nav">
        <div className="legal-nav-right">
          <button
            type="button"
            className="legal-icon-btn legal-nav-back no-min-tap"
            aria-label="Zurück"
            onClick={goBack}
          >
            <ArrowUUpLeft size={20} weight="regular" aria-hidden />
          </button>
          <div className="legal-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="legal-icon-btn legal-nav-menu no-min-tap"
              aria-label="Rechtstexte"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen(v => !v)}
            >
              <DotsThree size={18} weight="bold" aria-hidden />
            </button>
            {menuMounted ? (
              <nav
                className={`legal-menu-pop${menuVisible ? ' is-visible' : ''}`}
                role="menu"
                aria-label="Rechtstexte"
              >
                {ALL_LEGAL.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    aria-current={pathname === item.href ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </header>

      <main className="legal-shell legal">{children}</main>

      <footer className="legal-footer">
        <p className="legal-footer-brand">Festag</p>
        <nav className="legal-footer-links" aria-label="Weitere Rechtstexte">
          {ALL_LEGAL.map(item => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="legal-footer-meta">
          © {new Date().getFullYear()} Festag
          <br />
          Anbieter: Stefan Dirnberger,{' '}
          <Link href="/impressum">Impressum</Link>
        </p>
      </footer>
    </div>
  )
}
