'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AuthThemeSwitcher from '@/components/AuthThemeSwitcher'
import LegalBack from '@/components/legal/LegalBack'
import { LEGAL_STYLES } from '@/components/legal/legal-styles'
import { useAuthTheme } from '@/lib/auth-theme'
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'

const ALL_LEGAL = [...LEGAL_NAV, ...LEGAL_EXTRA] as const

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')

  return (
    <div className="legal-root">
      <style>{LEGAL_STYLES}</style>

      <nav className="legal-nav">
        <Link href="/" className="legal-logo">festag</Link>
        <div className="legal-nav-right">
          <div className="legal-nav-links">
            {LEGAL_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="legal-nav-pill"
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <AuthThemeSwitcher mode={theme} onChange={setTheme} variant="compact" />
        </div>
      </nav>

      <div className="legal-shell legal">
        <LegalBack />
        {children}
      </div>

      <footer className="legal-footer">
        <nav className="legal-footer-links" aria-label="Rechtliches">
          {ALL_LEGAL.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="legal-footer-pill"
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p>
          <strong>festag</strong>, Stefan Dirnberger, Lindenstraße 15, 84036 Kumhausen
        </p>
        <p>© {new Date().getFullYear()} Festag, alle Rechte vorbehalten</p>
      </footer>
    </div>
  )
}
