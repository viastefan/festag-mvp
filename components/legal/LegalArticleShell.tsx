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
import { useEffect, useState, type ReactNode } from 'react'
import AuthThemeSwitcher from '@/components/AuthThemeSwitcher'
import { LEGAL_STYLES } from '@/components/legal/legal-styles'
import { useAuthTheme } from '@/lib/auth-theme'
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'
import {
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
  normalizeWorkspaceName,
} from '@/lib/pending-workspace'

const ALL_LEGAL = [...LEGAL_NAV, ...LEGAL_EXTRA] as const
const RETURN_KEY = 'festag_legal_return'

function isAuthPath(path: string): boolean {
  return (
    path === '/login' ||
    path === '/register' ||
    path.startsWith('/login/') ||
    path.startsWith('/register/') ||
    path === '/dev/login' ||
    path.startsWith('/dev/login')
  )
}

function captureReturnFromReferrer() {
  if (typeof window === 'undefined') return
  try {
    const existing = sessionStorage.getItem(RETURN_KEY)
    if (existing && isAuthPath(existing)) return

    const ref = document.referrer
    if (!ref) return
    const url = new URL(ref)
    if (url.origin !== window.location.origin) return
    if (isAuthPath(url.pathname)) {
      sessionStorage.setItem(RETURN_KEY, url.pathname)
    }
  } catch {
    /* noop */
  }
}

function readReturnPath(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(RETURN_KEY)
    if (stored && isAuthPath(stored)) return stored
  } catch {
    /* noop */
  }
  return null
}

export default function LegalArticleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')
  const [wordmark, setWordmark] = useState('Festag')
  const [homeHref, setHomeHref] = useState('/')

  useEffect(() => {
    captureReturnFromReferrer()
    const returnPath = readReturnPath()
    const ws =
      normalizeWorkspaceName(getPendingWorkspaceName() || '') ||
      normalizeWorkspaceName(getRememberedWorkspaceName() || '')

    if (returnPath && isAuthPath(returnPath)) {
      setWordmark(ws ? `Workspace ${ws}` : 'Festag')
      setHomeHref(returnPath)
      return
    }
    setWordmark(ws ? `Workspace ${ws}` : 'Festag')
    setHomeHref('/')
  }, [pathname])

  function onWordmarkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const returnPath = readReturnPath()
    if (returnPath && isAuthPath(returnPath)) {
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
