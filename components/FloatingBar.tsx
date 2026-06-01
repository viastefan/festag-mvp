'use client'

export default function FloatingBar({
  copilotOpen,
  onToggleCopilot,
}: {
  copilotOpen: boolean
  onToggleCopilot: () => void
}) {
  return (
    <>
      <style>{`
        .fbar-wrap {
          position: fixed;
          bottom: 14px;
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
          gap: 12px;
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
        }
        .fbar-copilot {
          display: flex; align-items: center; gap: 6px;
          padding: 0;
          background: transparent; border: none; border-radius: 7px;
          cursor: pointer; font-family: inherit;
          color: var(--text-secondary); font-size: 12.5px; font-weight: 600;
          white-space: nowrap;
          transition: background .1s, color .1s;
        }
        .fbar-copilot:hover { color: var(--text); }
        .fbar-copilot.active {
          color: var(--text);
        }
        .fbar-icon {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          background: transparent;
        }
        .fbar-icon:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        @media(max-width:768px) {
          .fbar-wrap { display:none; }
        }
      `}</style>
      <div className="fbar-wrap">
        <div className="fbar">
          <button
            className={`fbar-copilot${copilotOpen ? ' active' : ''}`}
            onClick={onToggleCopilot}
            aria-label="Copilot öffnen (⌘.)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4Z" />
            </svg>
            Ask Veyra
          </button>
          <button className="fbar-icon" type="button" aria-label="Verlauf">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
