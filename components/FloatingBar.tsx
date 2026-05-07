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
          bottom: 18px;
          right: 22px;
          z-index: 90;
          display: flex;
          justify-content: flex-end;
          pointer-events: none;
        }
        .fbar {
          pointer-events: all;
          display: inline-flex;
          align-items: center;
          gap: 0;
          padding: 4px 5px;
          background: var(--sidebar-bg);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid var(--sidebar-border);
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.06);
        }
        [data-theme="dark"] .fbar {
          box-shadow: 0 1px 4px rgba(0,0,0,0.30), 0 4px 14px rgba(0,0,0,0.25);
        }
        .fbar-search {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 9px 4px 9px;
          background: transparent;
          border: none; border-radius: 999px;
          cursor: text; font-family: inherit;
          color: var(--text-muted); font-size: 12px; font-weight: 500;
          white-space: nowrap;
        }
        .fbar-search:hover { color: var(--text); background: var(--surface-2); }
        .fbar-divider { width: 1px; height: 12px; background: var(--border); flex-shrink: 0; margin: 0 2px; }
        .fbar-copilot {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          background: transparent; border: none; border-radius: 999px;
          cursor: pointer; font-family: inherit;
          color: var(--text-muted); font-size: 12px; font-weight: 600;
          white-space: nowrap;
        }
        .fbar-copilot:hover { color: var(--text); background: var(--surface-2); }
        .fbar-copilot.active { color: var(--text); background: var(--surface-2); }
        @media(max-width:768px) {
          .fbar-wrap { left: 16px; right: 16px; bottom: calc(90px + var(--safe-bottom)); justify-content: center; }
        }
      `}</style>
      <div className="fbar-wrap">
        <div className="fbar">
          <button className="fbar-search" onClick={openPalette} aria-label="Suche öffnen (⌘K)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span style={{
              padding: '0px 5px', borderRadius: 3,
              fontSize: 9, fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              letterSpacing: '.02em',
            }}>⌘K</span>
          </button>

          <div className="fbar-divider" />

          <button
            className={`fbar-copilot${copilotOpen ? ' active' : ''}`}
            onClick={onToggleCopilot}
            aria-label="Copilot öffnen (⌘.)"
          >
            <span style={{ fontSize: 10, lineHeight: 1, opacity: .8 }}>✦</span>
            Copilot
          </button>
        </div>
      </div>
    </>
  )
}
