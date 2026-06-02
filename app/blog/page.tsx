'use client'

/**
 * /blog — Index/Listing. Reuses BlogShell's top bar + sidebar styling
 * by rendering its own minimal version so the index can also link out
 * to every article visible in the docs nav.
 */

import Link from 'next/link'
import { BLOG_SECTIONS } from '@/lib/blog'

export default function BlogIndexPage() {
  return (
    <div className="bi-root">
      <style>{`
        .bi-root {
          min-height: 100dvh;
          background: var(--bi-bg, #FCFCFD);
          color: var(--bi-text, #1A1F2C);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-weight: 500;
          letter-spacing: .012em;
          --bi-bg: #FCFCFD;
          --bi-surface: #ffffff;
          --bi-text: #1A1F2C;
          --bi-text-secondary: #4E5567;
          --bi-text-muted: #8A93A4;
          --bi-border: rgba(15, 23, 42, 0.08);
          --bi-accent: #5B647D;
          --bi-hover: rgba(15, 23, 42, 0.04);
        }
        [data-theme="dark"] .bi-root,
        [data-theme="classic-dark"] .bi-root {
          --bi-bg: #0A0F18;
          --bi-surface: #11161F;
          --bi-text: #E8EBF1;
          --bi-text-secondary: #A8B0BD;
          --bi-text-muted: #6B7488;
          --bi-border: rgba(255, 255, 255, 0.07);
          --bi-hover: rgba(255, 255, 255, 0.04);
        }
        [data-theme="read"] .bi-root {
          --bi-bg: #F7F4EC;
          --bi-surface: #FFFDF7;
          --bi-text: #1C1914;
          --bi-text-secondary: #4E493F;
          --bi-text-muted: #8D8678;
          --bi-border: rgba(38, 33, 24, 0.10);
        }

        .bi-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px clamp(20px, 4vw, 56px);
          border-bottom: 1px solid var(--bi-border);
        }
        .bi-brand {
          display: inline-flex; align-items: center; gap: 9px;
          color: var(--bi-text); text-decoration: none;
          font-size: 14.5px; letter-spacing: -.005em;
        }
        .bi-brand-tag {
          padding: 2px 8px; border-radius: 999px;
          border: 1px solid var(--bi-border);
          color: var(--bi-text-secondary);
          font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
        }
        .bi-back {
          padding: 6px 14px; border-radius: 999px;
          color: var(--bi-text-secondary); text-decoration: none;
          font-size: 13px;
        }
        .bi-back:hover { background: var(--bi-hover); color: var(--bi-text); }

        .bi-hero {
          padding: 64px clamp(20px, 4vw, 56px) 30px;
          max-width: 920px;
        }
        .bi-hero h1 {
          margin: 0;
          color: var(--bi-text);
          font-size: clamp(36px, 4.5vw, 56px);
          line-height: 1.05;
          letter-spacing: -.03em;
        }
        .bi-hero p {
          margin: 18px 0 0;
          color: var(--bi-text-secondary);
          font-size: clamp(16px, 1.6vw, 18px);
          line-height: 1.55;
          max-width: 640px;
        }

        .bi-sections {
          padding: 30px clamp(20px, 4vw, 56px) 100px;
          max-width: 1180px;
        }
        .bi-section {
          margin-top: 60px;
        }
        .bi-section h2 {
          margin: 0 0 22px;
          color: var(--bi-text);
          font-size: 13.5px;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .bi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .bi-card {
          display: flex; flex-direction: column; gap: 6px;
          padding: 22px 22px 24px;
          border: 1px solid var(--bi-border);
          border-radius: 14px;
          background: var(--bi-surface);
          color: inherit;
          text-decoration: none;
          transition: transform .12s ease, border-color .12s ease, box-shadow .12s ease;
        }
        .bi-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--bi-accent) 22%, var(--bi-border));
        }
        .bi-card-eye {
          color: var(--bi-accent);
          font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
        }
        .bi-card-title {
          margin: 0;
          color: var(--bi-text);
          font-size: 18px; line-height: 1.25;
          letter-spacing: -.01em;
        }
        .bi-card-desc {
          margin: 4px 0 8px;
          color: var(--bi-text-secondary);
          font-size: 13.5px; line-height: 1.5;
        }
        .bi-card-meta {
          margin: auto 0 0;
          color: var(--bi-text-muted);
          font-size: 11.5px;
        }
      `}</style>

      <header className="bi-top">
        <Link href="/blog" className="bi-brand">
          festag
          <span className="bi-brand-tag">Blog</span>
        </Link>
        <Link href="/" className="bi-back">Zur App →</Link>
      </header>

      <section className="bi-hero">
        <h1>Festag, in Ruhe erklärt.</h1>
        <p>
          Produktarchitektur, operative Praxis und das, was Tagro hinter jedem Statusbericht macht. Jeder Beitrag ist eine in sich geschlossene Erklärung — mit Diagrammen, ohne Hype.
        </p>
      </section>

      <div className="bi-sections">
        {BLOG_SECTIONS.map(section => (
          <section className="bi-section" key={section.id}>
            <h2>{section.label}</h2>
            <div className="bi-grid">
              {section.articles.map(article => (
                <Link key={article.slug} href={`/blog/${article.slug}`} className="bi-card">
                  {article.eyebrow && <span className="bi-card-eye">{article.eyebrow}</span>}
                  <h3 className="bi-card-title">{article.title}</h3>
                  {article.description && <p className="bi-card-desc">{article.description}</p>}
                  <p className="bi-card-meta">
                    {new Date(article.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {typeof article.readingMinutes === 'number' ? ` · ${article.readingMinutes} min` : ''}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
