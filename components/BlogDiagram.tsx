'use client'

/**
 * BlogDiagram — calm, theme-aware ASCII diagram card.
 *
 * Designed to look like a small inline figure inside docs:
 *   • monospace preformatted text inside a soft surface
 *   • optional kicker (e.g. "Grafik 03 · Datenfluss")
 *   • optional caption beneath
 *
 * Use it for system flows, dataflows, role visibility, lifecycle
 * diagrams. Keeps the body copy short — the diagram does the explaining.
 */

import type { CSSProperties } from 'react'

export default function BlogDiagram({
  kicker,
  title,
  caption,
  variant = 'default',
  children,
}: {
  kicker?: string
  title?: string
  caption?: string
  variant?: 'default' | 'light' | 'accent'
  children: string
}) {
  return (
    <figure className={`bd-figure bd-${variant}`}>
      {(kicker || title) && (
        <figcaption className="bd-head">
          {kicker && <span className="bd-kicker">{kicker}</span>}
          {title && <span className="bd-title">{title}</span>}
        </figcaption>
      )}
      <pre className="bd-pre" aria-label={title ?? kicker ?? 'Diagramm'}>{children}</pre>
      {caption && <p className="bd-caption">{caption}</p>}

      <style jsx>{`
        .bd-figure {
          margin: 28px 0;
          padding: 18px 20px 16px;
          border: 1px solid var(--bs-border, rgba(15,23,42,.08));
          border-radius: 14px;
          background: var(--bs-surface, #ffffff);
          overflow: hidden;
        }
        .bd-light {
          background: color-mix(in srgb, var(--bs-surface, #fff) 92%, transparent);
        }
        .bd-accent {
          background: color-mix(in srgb, var(--bs-accent, #5B647D) 6%, var(--bs-surface, #fff));
          border-color: color-mix(in srgb, var(--bs-accent, #5B647D) 22%, var(--bs-border, rgba(15,23,42,.08)));
        }
        .bd-head {
          display: flex; align-items: baseline; gap: 14px;
          margin-bottom: 12px;
        }
        .bd-kicker {
          color: var(--bs-accent, #5B647D);
          font-size: 10.5px;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .bd-title {
          color: var(--bs-text-secondary, #4E5567);
          font-size: 12.5px;
        }
        .bd-pre {
          margin: 0;
          padding: 12px 0 4px;
          font-family: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.6;
          color: var(--bs-text-secondary, #4E5567);
          white-space: pre;
          overflow-x: auto;
          letter-spacing: 0;
        }
        .bd-caption {
          margin: 12px 0 0;
          color: var(--bs-text-muted, #8A93A4);
          font-size: 11.5px;
          line-height: 1.5;
          letter-spacing: .005em;
        }
        @media (max-width: 540px) {
          .bd-pre { font-size: 10.5px; line-height: 1.55; }
        }
      `}</style>
    </figure>
  )
}
