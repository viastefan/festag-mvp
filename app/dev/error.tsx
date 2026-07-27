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
    console.error('Execution Panel route crashed', error)
  }, [error])

  return (
    <main className="dev-error-page">
      <section className="dev-error-card">
        <h1>Diese Ansicht konnte nicht geladen werden.</h1>
        <p>
          Eine Datenabfrage oder Browser-Funktion hat gerade einen Fehler ausgelöst. Der Workspace bleibt erreichbar — lade die Ansicht neu oder wechsle zu den Aufgaben.
        </p>
        {(error?.message || error?.digest) && (
          <details className="dev-error-details">
            <summary>Technische Details</summary>
            <pre>{error.message}{error.digest ? `\n\ndigest: ${error.digest}` : ''}{error.stack ? `\n\n${error.stack}` : ''}</pre>
          </details>
        )}
        <div className="dev-error-actions">
          <button type="button" onClick={reset}>Erneut laden</button>
          <Link href="/dev/tasks">Zu den Aufgaben</Link>
        </div>
      </section>

      <style jsx>{`
        .dev-error-page {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: var(--dv-canvas, #121212);
          color: var(--dv-text, rgba(245,245,247,0.92));
          font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, BlinkMacSystemFont, sans-serif);
        }
        .dev-error-card {
          width: min(520px, 100%);
          border-radius: 12px;
          padding: 24px;
          background: var(--dv-surface, #1c1c1c);
          border: 1px solid var(--dv-line, rgba(255,255,255,0.08));
        }
        h1 {
          margin: 0;
          font-size: 22px;
          line-height: 1.28;
          letter-spacing: -.02em;
          font-weight: 500;
        }
        p {
          margin: 14px 0 0;
          color: var(--dv-text-2, rgba(245,245,247,0.55));
          font-size: 14.5px;
          line-height: 1.62;
          font-weight: 400;
        }
        .dev-error-details {
          margin-top: 16px;
          border: 1px solid var(--dv-line, rgba(255,255,255,.1));
          border-radius: 8px;
          background: var(--dv-canvas, #121212);
          padding: 8px 12px;
        }
        .dev-error-details summary {
          cursor: pointer;
          font-size: 12px;
          color: var(--dv-text-3, rgba(245,245,247,0.42));
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
          color: var(--dv-text-2, rgba(245,245,247,0.55));
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
          border: 1px solid var(--dv-line, rgba(255,255,255,0.08));
          border-radius: 8px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--dv-text, rgba(245,245,247,0.88));
          background: var(--dv-surface-2, #232323);
          text-decoration: none;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        button:hover,
        a:hover {
          background: var(--dv-hover, #2a2a2a);
        }
      `}</style>
    </main>
  )
}
