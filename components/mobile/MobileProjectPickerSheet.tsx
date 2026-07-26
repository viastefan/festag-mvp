'use client'

import { X } from '@phosphor-icons/react'

export type ProjectPickerMode = 'status' | 'tagro'

export type ProjectPickerItem = {
  id: string
  title: string
  color?: string | null
  status?: string | null
}

type Props = {
  mode: ProjectPickerMode | null
  projects: ProjectPickerItem[]
  loading?: boolean
  onClose: () => void
  onPickStatus: (projectId: string | null) => void
  onPickTagro: (projectId: string | null, title: string) => void
}

export default function MobileProjectPickerSheet({
  mode,
  projects,
  loading = false,
  onClose,
  onPickStatus,
  onPickTagro,
}: Props) {
  if (!mode) return null

  const sheetTitle = mode === 'status' ? 'Statusbericht abrufen' : 'Mit Tagro bearbeiten'
  const hint = mode === 'status'
    ? 'Für welches Projekt soll Tagro den Statusbericht erstellen?'
    : 'Womit soll Tagro arbeiten?'

  return (
    <div className="mpp-wrap" role="dialog" aria-modal="true" aria-label={sheetTitle}>
      <button type="button" className="mpp-backdrop" aria-label="Schließen" onClick={onClose} />
      <div className="mpp-sheet">
        <div className="mpp-grip" aria-hidden />
        <div className="mpp-head">
          <h2>{sheetTitle}</h2>
          <button type="button" className="mpp-x" onClick={onClose} aria-label="Schließen">
            <X size={16} />
          </button>
        </div>

        <p className="mpp-hint">{hint}</p>

        <button
          type="button"
          className="mpp-pick mpp-pick-all"
          onClick={() => mode === 'status' ? onPickStatus(null) : onPickTagro(null, 'Alle Projekte')}
        >
          <span className="mpp-dot mpp-dot-all" />
          <span className="mpp-main">
            <strong>Gesamtbericht</strong>
            <small>Alle Projekte zusammengefasst</small>
          </span>
        </button>

        <div className="mpp-list">
          {loading && <p className="mpp-empty">Lade Projekte …</p>}
          {!loading && projects.length === 0 && <p className="mpp-empty">Noch keine Projekte.</p>}
          {!loading && projects.map(p => (
            <button
              key={p.id}
              type="button"
              className="mpp-pick"
              onClick={() => mode === 'status' ? onPickStatus(p.id) : onPickTagro(p.id, p.title)}
            >
              <span className="mpp-dot" style={{ background: p.color || 'var(--text-muted, #90959F)' }} />
              <span className="mpp-main">
                <strong>{p.title}</strong>
                {p.status && <small>{p.status}</small>}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .mpp-wrap {
          position: fixed;
          inset: 0;
          z-index: 16050;
          display: flex;
          align-items: flex-end;
        }
        .mpp-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          background: var(--modal-backdrop, rgba(245, 245, 247, 0.72));
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          cursor: default;
        }
        .mpp-sheet {
          position: relative;
          width: 100%;
          background: #FFFFFF;
          color: #111111;
          border-radius: 24px 24px 0 0;
          padding: 8px 16px calc(20px + env(safe-area-inset-bottom, 0px));
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 -20px 60px -20px rgba(0, 0, 0, 0.4);
          animation: mppUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        :global([data-theme="dark"]) .mpp-sheet,
        :global([data-theme="classic-dark"]) .mpp-sheet {
          background: var(--festag-black-popup, #121214);
          color: #f4f4f4;
        }
        @keyframes mppUp {
          from { transform: translateY(24px); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
        }
        .mpp-grip {
          width: 36px;
          height: 4px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.14);
          margin: 4px auto 12px;
        }
        :global([data-theme="dark"]) .mpp-grip,
        :global([data-theme="classic-dark"]) .mpp-grip {
          background: rgba(255, 255, 255, 0.18);
        }
        .mpp-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .mpp-head h2 {
          margin: 0;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 19px;
          font-weight: 500;
          letter-spacing: -0.012em;
        }
        .mpp-x {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.05);
          color: #555;
          cursor: pointer;
        }
        :global([data-theme="dark"]) .mpp-x,
        :global([data-theme="classic-dark"]) .mpp-x {
          background: rgba(255, 255, 255, 0.06);
          color: #a3a3a3;
        }
        .mpp-hint {
          margin: 2px 4px 16px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          color: #555;
        }
        :global([data-theme="dark"]) .mpp-hint,
        :global([data-theme="classic-dark"]) .mpp-hint {
          color: #a3a3a3;
        }
        .mpp-pick {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          border: 0;
          border-radius: 16px;
          background: transparent;
          color: inherit;
          text-align: left;
          font: inherit;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .mpp-pick:active { background: rgba(0, 0, 0, 0.04); }
        :global([data-theme="dark"]) .mpp-pick:active,
        :global([data-theme="classic-dark"]) .mpp-pick:active {
          background: rgba(255, 255, 255, 0.05);
        }
        .mpp-pick-all {
          background: rgba(91, 100, 125, 0.08);
          margin-bottom: 8px;
        }
        :global([data-theme="dark"]) .mpp-pick-all,
        :global([data-theme="classic-dark"]) .mpp-pick-all {
          background: rgba(91, 100, 125, 0.18);
        }
        .mpp-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .mpp-dot-all { background: #5b647d; }
        .mpp-main {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .mpp-main strong {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.005em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mpp-main small {
          font-size: 12.5px;
          color: #777;
          margin-top: 2px;
          text-transform: capitalize;
        }
        :global([data-theme="dark"]) .mpp-main small,
        :global([data-theme="classic-dark"]) .mpp-main small {
          color: #888;
        }
        .mpp-list { display: flex; flex-direction: column; }
        .mpp-empty {
          margin: 0;
          padding: 24px 0;
          text-align: center;
          font-size: 13.5px;
          color: #888;
        }
      `}</style>
    </div>
  )
}
