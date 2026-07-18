'use client'

/**
 * LegalArticleShell — centered editorial layout for Festag legal pages.
 *
 * Always-light white reading surface (no theme switcher). Header: Aeonik
 * wordmark top-left; transparent icon buttons (menu + back) top-right —
 * same treatment as login `auth-docs-trigger`. Article column uses a ~65ch
 * reading measure.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowUUpLeft, List } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { LEGAL_STYLES } from '@/components/legal/legal-styles'
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'
import {
  captureLegalReturnFromReferrer,
  isAuthReturnPath,
  readLegalReturn,
} from '@/lib/legal-return'
import {
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
  normalizeWorkspaceName,
} from '@/lib/pending-workspace'

const ALL_LEGAL = [...LEGAL_NAV, ...LEGAL_EXTRA] as const

export default function LegalArticleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [wordmark, setWordmark] = useState('Festag')
  const [homeHref, setHomeHref] = useState('/')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    captureLegalReturnFromReferrer()
    const returnPath = readLegalReturn()
    const ws =
      normalizeWorkspaceName(getPendingWorkspaceName() || '') ||
      normalizeWorkspaceName(getRememberedWorkspaceName() || '')

    if (returnPath && isAuthReturnPath(returnPath)) {
      setWordmark(ws ? `Workspace ${ws}` : 'Festag')
      setHomeHref(returnPath)
      return
    }
    setWordmark(ws ? `Workspace ${ws}` : 'Festag')
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
    const returnPath = readLegalReturn()
    if (returnPath && isAuthReturnPath(returnPath)) {
      router.push(returnPath)
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(homeHref || '/')
  }

  function onWordmarkClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    goBack()
  }

  return (
    <div className="legal-root" data-theme="light">
      <style>{LEGAL_STYLES}</style>

      <header className="legal-nav">
        <a href={homeHref} className="legal-wordmark" onClick={onWordmarkClick}>
          {wordmark}
        </a>
        <div className="legal-nav-right">
          <div className="legal-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="legal-icon-btn no-min-tap"
              aria-label="Rechtstexte"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen(v => !v)}
            >
              <List size={18} weight="regular" aria-hidden />
            </button>
            {menuOpen ? (
              <nav className="legal-menu-pop" role="menu" aria-label="Rechtstexte">
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
          <button
            type="button"
            className="legal-icon-btn no-min-tap"
            aria-label="Zurück"
            onClick={goBack}
          >
            <ArrowUUpLeft size={18} weight="regular" aria-hidden />
          </button>
        </div>
      </header>

      <main className="legal-shell legal">{children}</main>

      <footer className="legal-footer">
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
        <p>
          <strong>Festag</strong>, Stefan Dirnberger, Lindenstraße 15, 84036 Kumhausen
        </p>
        <p>© {new Date().getFullYear()} Festag, alle Rechte vorbehalten</p>
      </footer>
    </div>
  )
}
