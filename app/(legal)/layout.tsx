'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AuthThemeSwitcher from '@/components/AuthThemeSwitcher'
import LegalBack from '@/components/legal/LegalBack'
import { useAuthTheme } from '@/lib/auth-theme'
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'

const ALL_LEGAL = [...LEGAL_NAV, ...LEGAL_EXTRA] as const

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')

  return (
    <div className="legal-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .legal-root {
          min-height: 100dvh;
          background: var(--legal-bg);
          color: var(--legal-text);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-weight: 500;
          letter-spacing: 0.012em;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
          --legal-bg: #FCFCFD;
          --legal-bg-soft: #F5F5F7;
          --legal-text: #1A1F2C;
          --legal-text-secondary: #4E5567;
          --legal-text-muted: #8A93A4;
          --legal-border: rgba(15, 23, 42, 0.08);
          --legal-link: #1A1F2C;
        }
        [data-theme="dark"] .legal-root,
        [data-theme="classic-dark"] .legal-root {
          --legal-bg: #000000;
          --legal-bg-soft: #0C0C0E;
          --legal-text: #E8EBF1;
          --legal-text-secondary: #A8B0BD;
          --legal-text-muted: #6B7488;
          --legal-border: rgba(255, 255, 255, 0.08);
          --legal-link: #E8EBF1;
        }
        [data-theme="read"] .legal-root {
          --legal-bg: #F7F4EC;
          --legal-bg-soft: #F0EBE0;
          --legal-text: #1C1914;
          --legal-text-secondary: #4E493F;
          --legal-text-muted: #8D8678;
          --legal-border: rgba(38, 33, 24, 0.10);
          --legal-link: #1C1914;
        }

        .legal-nav {
          position: sticky; top: 0; z-index: 50;
          background: color-mix(in srgb, var(--legal-bg) 90%, transparent);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border-bottom: 1px solid var(--legal-border);
          padding: 14px clamp(20px, 4vw, 32px);
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px;
        }
        .legal-logo {
          font-family: 'Qurova DEMO', serif;
          font-size: 22px; font-weight: 500;
          color: var(--legal-text);
          text-decoration: none;
          letter-spacing: -0.2px;
          transition: opacity .15s;
          flex-shrink: 0;
        }
        .legal-logo:hover { opacity: .7; }
        .legal-nav-right {
          display: flex; align-items: center; gap: 20px;
        }
        .legal-nav-links {
          display: flex; gap: 20px;
          font-size: 13px;
        }
        .legal-nav-links a {
          color: var(--legal-text-muted);
          text-decoration: none;
          font-weight: 500;
          letter-spacing: 0.012em;
          transition: color .15s;
          white-space: nowrap;
        }
        .legal-nav-links a:hover,
        .legal-nav-links a[aria-current="page"] { color: var(--legal-text); }

        .legal-main {
          max-width: 680px;
          margin: 0 auto;
          padding: 56px clamp(20px, 4vw, 32px) 96px;
        }
        .legal-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 500;
          color: var(--legal-text-muted);
          text-decoration: none;
          margin-bottom: 48px;
          letter-spacing: 0.012em;
          transition: color .15s;
          border: 0; background: none; padding: 0; cursor: pointer;
          font-family: inherit;
        }
        .legal-back:hover { color: var(--legal-text); }

        .legal h1 {
          font-size: 30px; font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1.18;
          margin: 0 0 14px;
          color: var(--legal-text);
        }
        .legal .lead {
          font-size: 15px; line-height: 1.6; font-weight: 500;
          color: var(--legal-text-muted);
          letter-spacing: 0.012em;
          margin: 0 0 48px;
          max-width: 560px;
        }
        .legal h2 {
          font-size: 16px; font-weight: 500;
          margin: 44px 0 12px;
          color: var(--legal-text);
          letter-spacing: 0.012em;
        }
        .legal h3 {
          font-size: 14px; font-weight: 500;
          margin: 24px 0 8px;
          color: var(--legal-text);
          letter-spacing: 0.012em;
        }
        .legal p, .legal li {
          font-size: 14px;
          line-height: 1.7;
          font-weight: 500;
          letter-spacing: 0.012em;
          color: var(--legal-text-secondary);
        }
        .legal p { margin: 0 0 12px; }
        .legal ul, .legal ol { padding-left: 22px; margin: 8px 0 14px; }
        .legal li { margin: 4px 0; }
        .legal strong { color: var(--legal-text); font-weight: 500; }
        .legal a { color: var(--legal-link); text-decoration: underline; text-underline-offset: 2px; }
        .legal code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12.5px;
          padding: 1px 6px;
          border-radius: 6px;
          background: var(--legal-bg-soft);
          border: 1px solid var(--legal-border);
        }
        .legal hr {
          border: none;
          height: 1px;
          background: var(--legal-border);
          margin: 44px 0;
        }
        .legal-box {
          background: var(--legal-bg-soft);
          border: 1px solid var(--legal-border);
          border-radius: 12px;
          padding: 18px 20px;
          margin: 18px 0;
        }
        .legal-box p { margin: 0; }
        .legal-note {
          font-size: 12.5px;
          color: var(--legal-text-muted);
          margin-top: 4px;
        }
        .legal-meta {
          margin-top: 48px;
          padding-top: 20px;
          border-top: 1px solid var(--legal-border);
          font-size: 12px;
          color: var(--legal-text-muted);
          letter-spacing: 0.02em;
        }

        .legal-footer {
          border-top: 1px solid var(--legal-border);
          padding: 24px clamp(20px, 4vw, 32px);
          text-align: center;
          color: var(--legal-text-muted);
          font-size: 12px;
          letter-spacing: 0.02em;
        }
        .legal-footer strong { color: var(--legal-text-secondary); font-weight: 500; }
        .legal-footer p { margin: 0; line-height: 1.6; }
        .legal-footer p + p { margin-top: 6px; }
        .legal-footer-links {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 8px 18px; margin-bottom: 14px;
        }
        .legal-footer-links a {
          color: var(--legal-text-muted);
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.012em;
          transition: color .15s;
        }
        .legal-footer-links a:hover,
        .legal-footer-links a[aria-current="page"] { color: var(--legal-text); }

        @media (max-width: 720px) {
          .legal-nav { flex-wrap: wrap; }
          .legal-nav-right { width: 100%; justify-content: space-between; }
          .legal-nav-links { gap: 12px; font-size: 12px; overflow-x: auto; }
          .legal-main { padding-top: 32px; padding-bottom: 64px; }
          .legal h1 { font-size: 26px; }
        }
      `}</style>

      <nav className="legal-nav">
        <Link href="/" className="legal-logo">festag</Link>
        <div className="legal-nav-right">
          <div className="legal-nav-links">
            {LEGAL_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <AuthThemeSwitcher mode={theme} onChange={setTheme} variant="compact" />
        </div>
      </nav>

      <main className="legal-main legal">
        <LegalBack />
        {children}
      </main>

      <footer className="legal-footer">
        <nav className="legal-footer-links" aria-label="Rechtliches">
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
          <strong>festag</strong>, Stefan Dirnberger, Lindenstraße 15, 84036 Kumhausen
        </p>
        <p>© {new Date().getFullYear()} Festag, alle Rechte vorbehalten</p>
      </footer>
    </div>
  )
}
