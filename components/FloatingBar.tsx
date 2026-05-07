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
          right: 24px;
          z-index: 7090;
          display: flex;
          justify-content: flex-end;
          pointer-events: none;
          animation: fbarReveal .24s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes fbarReveal {
          from { opacity: 0; transform: translateY(12px) scale(.985); }
          to { opacity: 1; transform: none; }
        }
        .fbar {
          pointer-events: all;
          display: inline-flex;
          align-items: center;
          gap: 0;
          padding: 5px 6px;
          background: color-mix(in srgb, var(--sidebar-bg) 86%, transparent);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid var(--sidebar-border);
          border-radius: 14px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.10), 0 10px 28px rgba(0,0,0,0.10);
          transition: box-shadow .16s ease, transform .16s ease;
        }
        [data-theme="dark"] .fbar {
          box-shadow: 0 4px 14px rgba(0,0,0,0.42), 0 12px 30px rgba(0,0,0,0.34);
        }
        [data-theme="read"] .fbar {
          box-shadow: 0 6px 18px rgba(28,25,20,0.11), 0 12px 28px rgba(28,25,20,0.10);
        }
        .fbar:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.12), 0 14px 34px rgba(0,0,0,0.12);
        }
        .fbar-search {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px 6px 10px;
          background: transparent;
          border: none; border-radius: 7px;
          cursor: text; font-family: inherit;
          color: var(--text-muted); font-size: 12.5px; font-weight: 500;
          white-space: nowrap;
          transition: background .1s, color .1s;
        }
        .fbar-search:hover { color: var(--text); background: var(--surface-2); }
        .fbar-divider { width: 1px; height: 14px; background: var(--border); flex-shrink: 0; margin: 0 2px; }
        .fbar-copilot {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: transparent; border: none; border-radius: 7px;
          cursor: pointer; font-family: inherit;
          color: var(--text-muted); font-size: 12.5px; font-weight: 600;
          white-space: nowrap;
          transition: background .1s, color .1s;
        }
        .fbar-copilot:hover { color: var(--text); background: var(--surface-2); }
        .fbar-copilot.active {
          color: var(--text);
          background: color-mix(in srgb, var(--surface-2) 90%, transparent);
          box-shadow: inset 0 0 0 1px var(--border);
        }
        @media(max-width:768px) {
          .fbar-wrap { left: 16px; right: 16px; bottom: calc(88px + var(--safe-bottom)); justify-content: center; }
        }
        [data-theme="read"] .fbar-copilot {
          color: #4f4536;
        }
        [data-theme="read"] .fbar-copilot.active {
          color: #1f1b15;
          background: color-mix(in srgb, var(--surface-2) 76%, #d9cfb6 24%);
          box-shadow: inset 0 0 0 1px rgba(38,33,24,0.16);
        }
      `}</style>
      <div className="fbar-wrap">
        <div className="fbar">
          <button className="fbar-search" onClick={openPalette} aria-label="Suche öffnen (⌘K)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            Suchen
            <span style={{
              padding: '1px 5px', borderRadius: 4,
              fontSize: 10, fontWeight: 600,
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
            <span style={{ fontSize: 11, lineHeight: 1, opacity: .85 }}>✦</span>
            Tagro Copilot
          </button>
        </div>
      </div>
    </>
  )
}
