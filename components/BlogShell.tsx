'use client'

/**
 * BlogShell — Festag-Docs-Layout im OpenAI-Style.
 *
 * Drei Spalten auf Desktop:
 *   • Links: Sektion + Artikel-Nav (sticky, scrollbar)
 *   • Mitte: Article body
 *   • Rechts: Mini-TOC (anchors auf <h2>-Sektionen)
 *
 * Mobile: TOC + Sidebar werden zu collapsible Sheets.
 *
 * Verbindlich (siehe festag_design_rules):
 *   • Aeonik Medium 500 durchgehend
 *   • 1.2% letter-spacing (0.012em)
 *   • Slate-Akzent #5B647D
 *   • Keine farbigen Primary-Buttons
 *   • Dark + Light + Read alle abgedeckt
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BLOG_SECTIONS, findSiblings, type BlogArticle } from '@/lib/blog'

export type BlogTocItem = { id: string; label: string }

export default function BlogShell({
  article,
  tocItems,
  children,
}: {
  article: BlogArticle
  tocItems?: BlogTocItem[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { prev, next } = findSiblings(article.slug)
  const [activeId, setActiveId] = useState<string | null>(tocItems?.[0]?.id ?? null)
  const [navOpen, setNavOpen] = useState(false)

  // Scroll-spy for TOC
  useEffect(() => {
    if (!tocItems || tocItems.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] },
    )
    tocItems.forEach(item => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [tocItems])

  return (
    <div className="bs-root">
      <style>{`
        .bs-root {
          min-height: 100dvh;
          background: var(--bs-bg, #FCFCFD);
          color: var(--bs-text, #1A1F2C);
          font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, BlinkMacSystemFont, sans-serif);
          font-weight: 500;
          letter-spacing: .012em;
          -webkit-font-smoothing: antialiased;
          --bs-bg: #FCFCFD;
          --bs-surface: #ffffff;
          --bs-text: #1A1F2C;
          --bs-text-secondary: #4E5567;
          --bs-text-muted: #8A93A4;
          --bs-border: rgba(15, 23, 42, 0.08);
          --bs-border-strong: rgba(15, 23, 42, 0.14);
          --bs-accent: #5B647D;
          --bs-hover: rgba(15, 23, 42, 0.04);
        }
        [data-theme="dark"] .bs-root,
        [data-theme="classic-dark"] .bs-root {
          --bs-bg: #0A0F18;
          --bs-surface: #11161F;
          --bs-text: #E8EBF1;
          --bs-text-secondary: #A8B0BD;
          --bs-text-muted: #6B7488;
          --bs-border: rgba(255, 255, 255, 0.07);
          --bs-border-strong: rgba(255, 255, 255, 0.14);
          --bs-hover: rgba(255, 255, 255, 0.04);
        }
        [data-theme="read"] .bs-root {
          --bs-bg: #F7F4EC;
          --bs-surface: #FFFDF7;
          --bs-text: #1C1914;
          --bs-text-secondary: #4E493F;
          --bs-text-muted: #8D8678;
          --bs-border: rgba(38, 33, 24, 0.10);
        }

        /* ── Top bar ──────────────────────────────────────────── */
        .bs-top {
          position: sticky; top: 0; z-index: 30;
          display: flex; align-items: center; justify-content: space-between;
          gap: 18px;
          padding: 14px clamp(20px, 4vw, 56px);
          background: color-mix(in srgb, var(--bs-bg) 88%, transparent);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border-bottom: 1px solid var(--bs-border);
        }
        .bs-brand {
          display: inline-flex; align-items: center; gap: 9px;
          color: var(--bs-text); text-decoration: none;
          font-size: 14.5px; font-weight: 500;
          letter-spacing: -.005em;
        }
        .bs-brand-tag {
          padding: 2px 8px; border-radius: 999px;
          border: 1px solid var(--bs-border);
          color: var(--bs-text-secondary);
          font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
        }
        .bs-top-nav { display: flex; align-items: center; gap: 6px; }
        .bs-top-link {
          padding: 6px 12px; border-radius: 999px;
          color: var(--bs-text-secondary); text-decoration: none;
          font-size: 13px;
          transition: background .12s ease, color .12s ease;
        }
        .bs-top-link:hover { background: var(--bs-hover); color: var(--bs-text); }
        .bs-top-link.active { background: var(--bs-hover); color: var(--bs-text); }
        .bs-menu-toggle {
          display: none;
          border: 1px solid var(--bs-border);
          background: transparent;
          color: var(--bs-text-secondary);
          height: 32px; padding: 0 12px; border-radius: 999px;
          font: inherit; font-size: 12.5px; cursor: pointer;
        }

        /* ── 3-col layout ─────────────────────────────────────── */
        .bs-layout {
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr) 220px;
          gap: clamp(24px, 4vw, 64px);
          max-width: 1320px;
          margin: 0 auto;
          padding: 28px clamp(20px, 4vw, 56px) 100px;
          align-items: start;
        }
        .bs-sidebar {
          position: sticky;
          top: 76px;
          max-height: calc(100dvh - 100px);
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
        }
        .bs-sidebar::-webkit-scrollbar { width: 4px; }
        .bs-sidebar::-webkit-scrollbar-thumb { background: var(--bs-border); border-radius: 999px; }
        .bs-section-head {
          margin: 0 0 6px;
          color: var(--bs-text);
          font-size: 12.5px; font-weight: 500;
          letter-spacing: -.005em;
        }
        .bs-section + .bs-section { margin-top: 22px; }
        .bs-nav-link {
          display: block;
          padding: 5px 9px;
          margin-left: -9px;
          border-radius: 7px;
          color: var(--bs-text-secondary);
          text-decoration: none;
          font-size: 12.5px;
          line-height: 1.4;
          transition: background .12s ease, color .12s ease;
        }
        .bs-nav-link:hover { background: var(--bs-hover); color: var(--bs-text); }
        .bs-nav-link.active { color: var(--bs-text); background: var(--bs-hover); }

        .bs-main {
          min-width: 0;
        }
        .bs-article-head { margin-bottom: 30px; }
        .bs-eyebrow {
          margin: 0 0 14px;
          color: var(--bs-accent);
          font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
        }
        .bs-title {
          margin: 0;
          color: var(--bs-text);
          font-size: clamp(28px, 3vw, 38px);
          line-height: 1.1;
          letter-spacing: -.025em;
        }
        .bs-lead {
          margin: 14px 0 0;
          color: var(--bs-text-secondary);
          font-size: clamp(15px, 1.4vw, 17px);
          line-height: 1.55;
          max-width: 620px;
        }
        .bs-meta {
          margin: 18px 0 0;
          color: var(--bs-text-muted);
          font-size: 12px;
          letter-spacing: .005em;
        }
        .bs-copy {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 18px;
          padding: 5px 11px; border-radius: 999px;
          border: 1px solid var(--bs-border);
          background: var(--bs-surface);
          color: var(--bs-text-secondary);
          font: inherit; font-size: 11.5px; cursor: pointer;
          transition: background .12s, color .12s;
        }
        .bs-copy:hover { background: var(--bs-hover); color: var(--bs-text); }

        /* ── Right TOC ────────────────────────────────────────── */
        .bs-toc {
          position: sticky;
          top: 76px;
          max-height: calc(100dvh - 100px);
          overflow-y: auto;
        }
        .bs-toc-title {
          margin: 0 0 8px;
          color: var(--bs-text-muted);
          font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
        }
        .bs-toc-list { list-style: none; padding: 0; margin: 0; border-left: 1px solid var(--bs-border); }
        .bs-toc-link {
          display: block;
          padding: 6px 0 6px 12px;
          margin-left: -1px;
          border-left: 1.5px solid transparent;
          color: var(--bs-text-muted);
          text-decoration: none;
          font-size: 12px; line-height: 1.35;
          transition: color .12s ease, border-color .12s ease;
        }
        .bs-toc-link:hover { color: var(--bs-text); }
        .bs-toc-link.active { color: var(--bs-text); border-left-color: var(--bs-accent); }

        /* ── Footer prev/next ─────────────────────────────────── */
        .bs-footer-nav {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 64px;
          padding-top: 24px;
          border-top: 1px solid var(--bs-border);
        }
        .bs-footer-link {
          display: flex; flex-direction: column; gap: 4px;
          padding: 16px 18px;
          border: 1px solid var(--bs-border);
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: border-color .12s ease, background .12s ease;
        }
        .bs-footer-link:hover { border-color: var(--bs-border-strong); background: var(--bs-hover); }
        .bs-footer-link small { color: var(--bs-text-muted); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
        .bs-footer-link strong { color: var(--bs-text); font-size: 14px; font-weight: 500; }
        .bs-footer-link.next { text-align: right; align-items: flex-end; }
        .bs-footer-link.disabled { opacity: .35; pointer-events: none; }

        /* ── Mobile ───────────────────────────────────────────── */
        @media (max-width: 1100px) {
          .bs-layout { grid-template-columns: 220px minmax(0, 1fr); }
          .bs-toc { display: none; }
        }
        @media (max-width: 760px) {
          .bs-layout { grid-template-columns: 1fr; padding-top: 14px; }
          .bs-sidebar {
            position: relative;
            top: 0; max-height: none;
            display: ${navOpen ? 'block' : 'none'};
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid var(--bs-border);
            border-radius: 12px;
            background: var(--bs-surface);
          }
          .bs-menu-toggle { display: inline-flex; align-items: center; }
        }
      `}</style>

      <header className="bs-top">
        <Link href="/blog" className="bs-brand">
          festag
          <span className="bs-brand-tag">Blog</span>
        </Link>
        <nav className="bs-top-nav">
          <Link href="/blog" className={`bs-top-link${pathname === '/blog' ? ' active' : ''}`}>Alle Beiträge</Link>
          <Link href="/" className="bs-top-link">Zur App</Link>
        </nav>
        <button
          type="button"
          className="bs-menu-toggle"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(v => !v)}
        >
          {navOpen ? 'Menü schließen' : 'Beiträge'}
        </button>
      </header>

      <div className="bs-layout">
        <aside className="bs-sidebar" aria-label="Beiträge">
          {BLOG_SECTIONS.map(section => (
            <div className="bs-section" key={section.id}>
              <p className="bs-section-head">{section.label}</p>
              {section.articles.map(a => {
                const href = `/blog/${a.slug}`
                const active = pathname === href
                return (
                  <Link
                    key={a.slug}
                    href={href}
                    className={`bs-nav-link${active ? ' active' : ''}`}
                  >
                    {a.title}
                  </Link>
                )
              })}
            </div>
          ))}
        </aside>

        <main className="bs-main">
          <header className="bs-article-head">
            {article.eyebrow && <p className="bs-eyebrow">{article.eyebrow}</p>}
            <h1 className="bs-title">{article.title}</h1>
            {article.description && <p className="bs-lead">{article.description}</p>}
            <p className="bs-meta">
              {new Date(article.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              {typeof article.readingMinutes === 'number' ? ` · ${article.readingMinutes} min Lesezeit` : ''}
              {article.audience && article.audience.length > 0 ? ` · für ${article.audience.join(', ')}` : ''}
            </p>
            <button
              type="button"
              className="bs-copy"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href).catch(() => null)
                }
              }}
            >
              ⧉ Link kopieren
            </button>
          </header>

          {children}

          <nav className="bs-footer-nav" aria-label="Beitragsnavigation">
            {prev ? (
              <Link className="bs-footer-link" href={`/blog/${prev.slug}`}>
                <small>← Vorheriger Beitrag</small>
                <strong>{prev.title}</strong>
              </Link>
            ) : <span className="bs-footer-link disabled" />}
            {next ? (
              <Link className="bs-footer-link next" href={`/blog/${next.slug}`}>
                <small>Nächster Beitrag →</small>
                <strong>{next.title}</strong>
              </Link>
            ) : <span className="bs-footer-link disabled" />}
          </nav>
        </main>

        {tocItems && tocItems.length > 0 && (
          <aside className="bs-toc" aria-label="Inhaltsverzeichnis">
            <p className="bs-toc-title">In diesem Beitrag</p>
            <ul className="bs-toc-list">
              {tocItems.map(item => (
                <li key={item.id}>
                  <a className={`bs-toc-link${activeId === item.id ? ' active' : ''}`} href={`#${item.id}`}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  )
}
