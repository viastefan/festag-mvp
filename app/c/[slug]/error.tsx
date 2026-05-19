'use client'

import { useEffect } from 'react'

export default function ClientPortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Client portal route crashed', error)
  }, [error])

  return (
    <main className="cp-error-page">
      <style>{`
        .cp-error-page {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #FCFCFD;
          color: #202532;
          font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, BlinkMacSystemFont, sans-serif);
        }
        .cp-error-box {
          width: min(480px, 100%);
          padding: 28px;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(15,23,42,.05), 0 18px 48px rgba(15,23,42,.08);
        }
        .cp-error-box p {
          margin: 0;
          color: #6B7280;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 500;
        }
        .cp-error-box h1 {
          margin: 10px 0 12px;
          font-size: 24px;
          line-height: 1.16;
          letter-spacing: -.02em;
          font-weight: 500;
        }
        .cp-error-box button {
          margin-top: 18px;
          height: 38px;
          padding: 0 15px;
          border: 0;
          border-radius: 8px;
          background: #202532;
          color: #fff;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        @media (prefers-color-scheme: dark) {
          .cp-error-page { background: #0E0F0F; color: #F2F2EE; }
          .cp-error-box { background: #151617; box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 18px 48px rgba(0,0,0,.28); }
          .cp-error-box p { color: #A8B0C2; }
          .cp-error-box button { background: #F2F2EE; color: #111827; }
        }
      `}</style>
      <section className="cp-error-box">
        <p>Festag Kundenbereich</p>
        <h1>Diese Seite konnte gerade nicht geladen werden.</h1>
        <p>Der Link ist erreichbar, aber eine Ansicht hat unerwartete Daten bekommen. Bitte lade die Seite noch einmal.</p>
        <button type="button" onClick={reset}>Erneut laden</button>
      </section>
    </main>
  )
}
