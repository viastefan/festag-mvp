'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Festag app route crashed', error)
  }, [error])

  return (
    <main className="page-content" style={{ maxWidth: 760 }}>
      <section className="app-error-shell">
        <style>{`
          .app-error-shell {
            margin: clamp(28px, 8vh, 76px) auto;
            padding: clamp(22px, 4vw, 34px);
            border-radius: 12px;
            background: var(--surface);
            box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 18px 46px rgba(15,23,42,.08);
            color: var(--text);
          }
          [data-theme="dark"] .app-error-shell,
          [data-theme="classic-dark"] .app-error-shell {
            box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 18px 46px rgba(0,0,0,.24);
          }
          .app-error-kicker {
            margin: 0 0 10px;
            color: var(--text-muted);
            font-size: 11px;
            letter-spacing: .14em;
            text-transform: uppercase;
          }
          .app-error-title {
            margin: 0;
            font-size: clamp(22px, 3vw, 30px);
            line-height: 1.12;
            letter-spacing: -.02em;
            font-weight: 500;
          }
          .app-error-copy {
            margin: 14px 0 0;
            max-width: 560px;
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.55;
            font-weight: 500;
          }
          .app-error-actions {
            margin-top: 22px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .app-error-action {
            height: 38px;
            padding: 0 15px;
            border: 0;
            border-radius: 8px;
            background: #fff;
            color: var(--text);
            box-shadow: 0 1px 2px rgba(15,23,42,.08), 0 8px 22px rgba(15,23,42,.09);
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            font: inherit;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
          }
          [data-theme="dark"] .app-error-action,
          [data-theme="classic-dark"] .app-error-action {
            background: color-mix(in srgb, var(--surface) 88%, #fff 8%);
            box-shadow: 0 1px 2px rgba(0,0,0,.28), 0 8px 22px rgba(0,0,0,.22);
          }
        `}</style>
        <p className="app-error-kicker">Festag</p>
        <h1 className="app-error-title">Diese Ansicht konnte gerade nicht sauber geladen werden.</h1>
        <p className="app-error-copy">
          Die App ist nicht abgestuerzt, aber eine Ansicht hat unerwartete Daten bekommen. Versuche es erneut oder springe zur aktuellen Lage.
        </p>
        <div className="app-error-actions">
          <button className="app-error-action" type="button" onClick={reset}>Erneut laden</button>
          <Link className="app-error-action" href="/dashboard">Zu Aktuelles</Link>
        </div>
      </section>
    </main>
  )
}
