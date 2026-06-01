'use client'
import { useEffect } from 'react'

/**
 * Header bar.
 *
 * Suche → öffnet Cmd+K Command Palette (CommandPalette.tsx).
 * Keine eigene Search-Logik mehr im Header — das wäre Doppellogik.
 * Veyra-Hinweis: per `veyra: …` Prefix in der Palette.
 */
export default function AppHeader({
  copilotOpen,
  onToggleCopilot,
}: {
  copilotOpen: boolean
  onToggleCopilot: () => void
}) {
  // ⌘K wird global im CommandPalette gehandhabt — wir triggern hier nur per Click.
  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <>
      <style>{`
        @media(max-width:768px){
          .ah-search { display:none !important; }
          .ah-cp-label { display:none !important; }
        }
        .ah-search-trigger {
          width:100%; height:40px;
          padding:'0 38px 0 30px';
          background: var(--surface-2);
          border:1px solid var(--border);
          border-radius:16px;
          font-size:13px; color: var(--text-muted);
          font-family: inherit; font-weight: 500;
          cursor: text;
          display: flex; align-items: center;
          padding-left: 30px; padding-right: 8px;
          position: relative;
          transition: border-color .12s, background .12s;
        }
        .ah-search-trigger:hover { border-color: var(--border-strong); background: var(--hover); }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 28px', borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 96%, transparent)', position: 'sticky', top: 0, zIndex: 50,
        height: 64, flexShrink: 0,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}>
        <div style={{ flex: 1 }} />

        {/* Search trigger — öffnet das Command Palette */}
        <div className="ah-search" style={{ position: 'relative', width: 280 }}>
          <button
            type="button"
            onClick={openPalette}
            className="ah-search-trigger"
            aria-label="Suche & Befehle öffnen (Cmd+K)"
          >
            <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>Suchen oder „veyra: …"</span>
            <span style={{
              padding:'2px 6px', borderRadius:8,
              fontSize:10, fontWeight:600, color:'var(--text-muted)',
              background:'var(--surface-2)', border:'1px solid var(--border)',
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              letterSpacing: '.04em',
            }}>⌘K</span>
          </button>
        </div>

        {/* Copilot toggle */}
        <button
          onClick={onToggleCopilot}
          className="tap-scale"
          style={{ height:40, padding:'0 15px', background: copilotOpen ? 'var(--accent)' : 'var(--card)', color: copilotOpen ? 'var(--accent-text)' : 'var(--text-secondary)', border:`1px solid ${copilotOpen ? 'transparent' : 'var(--border)'}`, borderRadius:16, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7, transition:'all .15s' }}>
          <span style={{ fontSize:14, lineHeight:1 }}>✦</span>
          <span className="ah-cp-label">Copilot</span>
        </button>

      </header>
    </>
  )
}
