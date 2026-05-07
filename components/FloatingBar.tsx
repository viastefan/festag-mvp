'use client'

export default function FloatingBar({
  copilotOpen,
  onToggleCopilot,
}: {
  copilotOpen: boolean
  onToggleCopilot: () => void
}) {
  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <>
      <style>{`
        .fbar-wrap {
          position: fixed;
          bottom: 20px;
          left: calc(256px + 32px);
          right: 28px;
          z-index: 90;
          pointer-events: none;
          display: flex;
          justify-content: center;
        }
        .fbar {
          pointer-events: all;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 5px 8px;
          background: var(--sidebar-bg);
          backdrop-filter: blur(32px) saturate(180%);
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          border: 1px solid var(--sidebar-border);
          border-radius: 999px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.10), 0 8px 32px rgba(0,0,0,0.08);
        }
        [data-theme="dark"] .fbar {
          box-shadow: 0 2px 12px rgba(0,0,0,0.40), 0 8px 32px rgba(0,0,0,0.30);
        }
        .fbar-search {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px 4px 9px;
          background: transparent;
          border: none; border-radius: 999px;
          cursor: text; fontFamily: inherit;
          color: var(--text-muted); font-size: 12.5px; font-weight: 500;
          transition: color .1s;
          white-space: nowrap;
        }
        .fbar-search:hover { color: var(--text); }
        .fbar-divider { width: 1px; height: 14px; background: var(--border); flex-shrink: 0; margin: 0 2px; }
        .fbar-copilot {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          background: transparent; border: none; border-radius: 999px;
          cursor: pointer; font-family: inherit;
          color: var(--text-muted); font-size: 12.5px; font-weight: 600;
          transition: color .1s, background .1s;
          white-space: nowrap;
        }
        .fbar-copilot:hover { color: var(--text); }
        .fbar-copilot.active { color: var(--text); }
        @media(max-width:768px) {
          .fbar-wrap { left: 16px; right: 16px; bottom: calc(90px + var(--safe-bottom)); }
        }
      `}</style>
      <div className="fbar-wrap">
        <div className="fbar">
          <button className="fbar-search" onClick={openPalette} aria-label="Suche öffnen">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span>Suchen</span>
            <span style={{
              padding: '1px 5px', borderRadius: 4,
              fontSize: 9.5, fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            }}>⌘K</span>
          </button>

          <div className="fbar-divider" />

          <button
            className={`fbar-copilot${copilotOpen ? ' active' : ''}`}
            onClick={onToggleCopilot}
            aria-label="Copilot öffnen"
          >
            <span style={{ fontSize: 11, lineHeight: 1 }}>✦</span>
            Copilot
          </button>
        </div>
      </div>
    </>
  )
}
