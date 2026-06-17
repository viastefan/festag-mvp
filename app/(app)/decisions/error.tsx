'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DecisionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Festag decisions route crashed', error)
  }, [error])

  return (
    <div className="decisions-error">
      <style>{`
        .decisions-error {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          text-align: center;
        }
        .decisions-error-card {
          max-width: 520px;
          padding: 28px 32px;
          border-radius: 12px;
          background: var(--portal-card, #fff);
          border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 65%, transparent);
          color: var(--portal-text, #0f0f10);
        }
        .decisions-error-kicker {
          margin: 0 0 10px;
          color: var(--portal-muted, #6e717e);
          font-size: 11px;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .decisions-error-title {
          margin: 0;
          font-size: 22px;
          line-height: 1.2;
          font-weight: 500;
        }
        .decisions-error-copy {
          margin: 12px 0 0;
          color: var(--portal-muted, #6e717e);
          font-size: 14px;
          line-height: 1.5;
        }
        .decisions-error-actions {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }
        .decisions-error-btn {
          height: 38px;
          padding: 0 15px;
          border: 0;
          border-radius: 8px;
          background: #fff;
          color: var(--portal-text, #0f0f10);
          box-shadow: 0 1px 2px rgba(15,23,42,.08);
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
      `}</style>
      <div className="decisions-error-card">
        <p className="decisions-error-kicker">Entscheidungen</p>
        <h1 className="decisions-error-title">Diese Ansicht konnte gerade nicht geladen werden.</h1>
        <p className="decisions-error-copy">
          Versuche es erneut oder springe zur Statusabfrage.
        </p>
        <div className="decisions-error-actions">
          <button className="decisions-error-btn" type="button" onClick={reset}>Erneut laden</button>
          <Link className="decisions-error-btn" href="/dashboard">Zu Aktuelles</Link>
        </div>
      </div>
    </div>
  )
}
