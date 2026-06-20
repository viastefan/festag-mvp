'use client'

/** Shown when pages render Festag preview fixtures instead of live API data. */
export default function DemoPreviewBanner({ note }: { note?: string }) {
  return (
    <div className="demo-preview-banner" role="status">
      <span className="demo-preview-banner-label">Beispielansicht</span>
      <span className="demo-preview-banner-text">
        {note || 'So sieht Festag aus, sobald Projekte und Signale verbunden sind — nach Anmeldung echte Daten.'}
      </span>
      <style jsx>{`
        .demo-preview-banner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 12px;
          margin-bottom: 16px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
          background: color-mix(in srgb, var(--accent) 6%, var(--surface));
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--text-secondary);
        }
        .demo-preview-banner-label {
          padding: 2px 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          color: var(--text);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .demo-preview-banner-text { flex: 1; min-width: 200px; }
      `}</style>
    </div>
  )
}
