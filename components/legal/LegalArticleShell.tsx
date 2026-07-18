'use client'

/**
 * LegalArticleShell — centered editorial layout for Festag legal pages.
 *
 * Header mirrors auth landings: Aeonik wordmark top-left (Festag, or Workspace
 * context when arriving from signup/login), quiet sibling links, theme switcher.
 * Article column uses a ~65ch reading measure — Anthropic-news structure,
 * Festag tokens and typography only.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import AuthThemeSwitcher from '@/components/AuthThemeSwitcher'
import { LEGAL_STYLES } from '@/components/legal/legal-styles'
import { useAuthTheme } from '@/lib/auth-theme'
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
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')
  const [wordmark, setWordmark] = useState('Festag')
  const [homeHref, setHomeHref] = useState('/')

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

  function onWordmarkClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
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

  return (
    <div className="legal-root">
      <style>{LEGAL_STYLES}</style>

      <header className="legal-nav">
        <div className="legal-nav-left">
          <a href={homeHref} className="legal-wordmark" onClick={onWordmarkClick}>
            {wordmark}
          </a>
          <nav className="legal-menu" aria-label="Rechtliches">
            {LEGAL_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="legal-nav-right">
          <AuthThemeSwitcher mode={theme} onChange={setTheme} variant="compact" />
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
