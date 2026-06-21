'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function DevError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dev board route crashed', error)
  }, [error])

  return (
    <main className="dev-error-page">
      <section className="dev-error-card">
        <p className="dev-error-kicker">Festag Execution Panel</p>
        <h1>Das Dev Board wurde abgefangen.</h1>
        <p>
          Eine Datenabfrage oder Browser-Funktion hat gerade einen Fehler ausgelöst. Der Workspace bleibt erreichbar, du kannst die Ansicht neu laden oder direkt zu den Tasks wechseln.
        </p>
        {(error?.message || error?.digest) && (
          <details className="dev-error-details">
            <summary>Technische Details</summary>
            <pre>{error.message}{error.digest ? `\n\ndigest: ${error.digest}` : ''}{error.stack ? `\n\n${error.stack}` : ''}</pre>
          </details>
        )}
        <div className="dev-error-actions">
          <button type="button" onClick={reset}>Erneut laden</button>
          <Link href="/dev/tasks">Zu Dev Tasks</Link>
        </div>
      </section>

      <style jsx>{`
        .dev-error-page {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: var(--bg, #0e0f0f);
          color: var(--text, #f4f4f0);
          font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, BlinkMacSystemFont, sans-serif);
        }
        .dev-error-card {
          width: min(520px, 100%);
          border-radius: 12px;
          padding: 24px;
          background: var(--surface, #151617);
          box-shadow: 0 24px 80px rgba(0, 0, 0, .22);
        }
        .dev-error-kicker {
          margin: 0 0 12px;
          color: var(--text-muted, #8d96aa);
          font-size: 12px;
          letter-spacing: .08em;
          text-transform: uppercase;
          font-weight: 500;
        }
        h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.16;
          letter-spacing: -.03em;
          font-weight: 500;
        }
        p {
          margin: 14px 0 0;
          color: var(--text-secondary, #aab1c1);
          font-size: 14px;
          line-height: 1.62;
          font-weight: 500;
        }
        .dev-error-details {
          margin-top: 16px;
          border: 1px solid var(--border, rgba(255,255,255,.1));
          border-radius: 8px;
          background: var(--surface-2, #1d1f22);
          padding: 8px 12px;
        }
        .dev-error-details summary {
          cursor: pointer;
          font-size: 12px;
          color: var(--text-muted, #8d96aa);
          font-weight: 500;
        }
        .dev-error-details pre {
          margin: 10px 0 2px;
          max-height: 220px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 11.5px;
          line-height: 1.5;
          color: var(--text-secondary, #b8bdc8);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        .dev-error-actions {
          margin-top: 22px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        button,
        a {
          height: 40px;
          border: 0;
          border-radius: 8px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text, #f4f4f0);
          background: var(--surface-2, #1d1f22);
          text-decoration: none;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(0, 0, 0, .16);
        }
      `}</style>
    </main>
  )
}
