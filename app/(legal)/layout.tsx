'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const THEME_KEY = 'festag_theme'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null)
    if (stored === 'light' || stored === 'dark') setTheme(stored)
  }, [])

  return (
    <div className="legal-root" data-theme={theme}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .legal-root {
          min-height:100dvh;
          background: var(--legal-bg);
          color: var(--legal-text);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
        }
        .legal-root[data-theme="dark"] {
          --legal-bg:#0A0D14;
          --legal-bg-soft:#141B25;
          --legal-text:#F3F5F7;
          --legal-text-secondary:#98A2B3;
          --legal-text-muted:#7B8294;
          --legal-border:rgba(243,245,247,0.08);
          --legal-link:#F3F5F7;
        }
        .legal-root[data-theme="light"] {
          --legal-bg:#fcfcfd;
          --legal-bg-soft:#F4F5F7;
          --legal-text:#202532;
          --legal-text-secondary:#54585A;
          --legal-text-muted:#7B8294;
          --legal-border:rgba(15,23,42,0.08);
          --legal-link:#202532;
        }

        .legal-nav {
          position:sticky; top:0; z-index:50;
          background: color-mix(in srgb, var(--legal-bg) 92%, transparent);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--legal-border);
          padding: 18px 32px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .legal-logo {
          font-family:'Qurova DEMO', serif;
          font-size:22px; font-weight:500;
          color: var(--legal-text);
          text-decoration:none;
          letter-spacing:-.2px;
          transition: opacity .15s;
        }
        .legal-logo:hover { opacity:.7; }
        .legal-nav-links {
          display:flex; gap:24px;
          font-size:13px;
        }
        .legal-nav-links a {
          color: var(--legal-text-muted);
          text-decoration:none;
          font-weight:400;
          letter-spacing:.02em;
          transition: color .15s;
        }
        .legal-nav-links a:hover,
        .legal-nav-links a[aria-current="page"] { color: var(--legal-text); }

        .legal-main {
          max-width: 680px;
          margin: 0 auto;
          padding: 72px 32px 96px;
        }
        .legal-back {
          display:inline-flex; align-items:center; gap:6px;
          font-size:13px; font-weight:500;
          color: var(--legal-text-muted);
          text-decoration:none;
          margin-bottom: 56px;
          letter-spacing:0.01em;
          transition: color .15s;
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
          letter-spacing: 0.01em;
          margin: 0 0 56px;
          max-width: 560px;
        }
        .legal h2 {
          font-size: 16px; font-weight: 500;
          margin: 48px 0 14px;
          color: var(--legal-text);
          letter-spacing: 0.01em;
        }
        .legal h3 {
          font-size: 14px; font-weight: 500;
          margin: 28px 0 8px;
          color: var(--legal-text);
          letter-spacing: 0.01em;
        }
        .legal p, .legal li {
          font-size: 14px;
          line-height: 1.7;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--legal-text-secondary);
        }
        .legal p { margin: 0 0 12px; }
        .legal ul, .legal ol { padding-left: 22px; margin: 8px 0 14px; }
        .legal li { margin: 4px 0; }
        .legal strong { color: var(--legal-text); font-weight: 500; }
        .legal a { color: var(--legal-link); text-decoration: underline; text-underline-offset: 2px; }
        .legal hr {
          border: none;
          height: 1px;
          background: var(--legal-border);
          margin: 48px 0;
        }
        .legal-meta {
          margin-top: 56px;
          padding-top: 24px;
          border-top: 1px solid var(--legal-border);
          font-size: 12px;
          color: var(--legal-text-muted);
          letter-spacing: .02em;
        }

        .legal-footer {
          border-top: 1px solid var(--legal-border);
          padding: 24px 32px;
          text-align:center;
          color: var(--legal-text-muted);
          font-size: 12px;
          letter-spacing: .02em;
        }
        .legal-footer strong { color: var(--legal-text-secondary); font-weight: 500; }

        @media (max-width: 640px) {
          .legal-nav { padding: 14px 20px; }
          .legal-nav-links { gap: 14px; font-size: 12px; }
          .legal-main { padding: 32px 20px 64px; }
          .legal h1 { font-size: 28px; }
        }
      `}</style>

      <nav className="legal-nav">
        <Link href="/" className="legal-logo">festag</Link>
        <div className="legal-nav-links">
          <Link href="/agb">AGB</Link>
          <Link href="/nutzungsbedingungen">Nutzung</Link>
          <Link href="/datenschutz">Datenschutz</Link>
          <Link href="/impressum">Impressum</Link>
        </div>
      </nav>

      <main className="legal-main legal">
        <Link href="/login" className="legal-back">← Zurück</Link>
        {children}
      </main>

      <footer className="legal-footer">
        <p style={{ margin:0, lineHeight:1.6 }}>
          <strong>festag</strong> — Stefan Dirnberger, Lindenstraße 15, 84036 Kumhausen
        </p>
        <p style={{ margin:'6px 0 0' }}>
          © {new Date().getFullYear()} Festag · Alle Rechte vorbehalten
        </p>
      </footer>
    </div>
  )
}
