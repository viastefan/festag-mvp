'use client'

/**
 * WorkspaceSymbolPicker — compact two-row picker for the workspace mark.
 *
 * Row 1: variants (cell / cluster / map / signal / artifact / orbit / grid /
 *        pixel). Click swaps the visual family.
 * Row 2: colour schemes (mint / indigo / graphite / lime / sand / rose /
 *        cyan / mono). Click swaps the duet.
 *
 * Selection updates immediately and is persisted via saveSymbol(). Live
 * preview at 40px sits left so the user sees the result before committing.
 */

import WorkspaceSymbol, { SYMBOL_SCHEMES, SYMBOL_VARIANTS, type SymbolScheme, type SymbolVariant } from '@/components/WorkspaceSymbol'
import { saveSymbol, type WorkspaceSymbolPrefs } from '@/lib/workspace-symbol'

type Props = {
  workspaceKey: string
  prefs: WorkspaceSymbolPrefs
  onChange: (next: WorkspaceSymbolPrefs) => void
}

export default function WorkspaceSymbolPicker({ workspaceKey, prefs, onChange }: Props) {
  function set(next: Partial<WorkspaceSymbolPrefs>) {
    const merged: WorkspaceSymbolPrefs = { ...prefs, ...next }
    onChange(merged)
    saveSymbol(workspaceKey, merged)
  }

  return (
    <div className="wsp" role="group" aria-label="Workspace-Symbol anpassen">
      <div className="wsp-head">
        <WorkspaceSymbol variant={prefs.variant} scheme={prefs.scheme} seed={prefs.seed} size={40} />
        <div className="wsp-head-text">
          <strong>Symbol</strong>
          <span>Form + Farbduett. Wird sofort im Sidebar übernommen.</span>
        </div>
      </div>

      <p className="wsp-label">Form</p>
      <div className="wsp-row">
        {SYMBOL_VARIANTS.map((v: SymbolVariant) => {
          const active = prefs.variant === v
          return (
            <button
              key={v}
              type="button"
              className={`wsp-cell${active ? ' is-active' : ''}`}
              aria-pressed={active}
              aria-label={v}
              title={v}
              onClick={() => set({ variant: v })}
            >
              <WorkspaceSymbol variant={v} scheme={prefs.scheme} seed={prefs.seed} size={24} />
            </button>
          )
        })}
      </div>

      <p className="wsp-label">Farbe</p>
      <div className="wsp-row">
        {SYMBOL_SCHEMES.map((s: SymbolScheme) => {
          const active = prefs.scheme === s
          return (
            <button
              key={s}
              type="button"
              className={`wsp-cell${active ? ' is-active' : ''}`}
              aria-pressed={active}
              aria-label={s}
              title={s}
              onClick={() => set({ scheme: s })}
            >
              <WorkspaceSymbol variant={prefs.variant} scheme={s} seed={prefs.seed} size={24} />
            </button>
          )
        })}
      </div>

      <style>{`
        .wsp { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px 2px; }
        .wsp-head {
          display: flex; align-items: center; gap: 10px;
          padding: 4px 0 6px;
        }
        .wsp-head-text { display: flex; flex-direction: column; line-height: 1.25; }
        .wsp-head-text strong { font-size: 12.5px; font-weight: 600; color: var(--text); letter-spacing: -.002em; }
        .wsp-head-text span { font-size: 11px; color: var(--text-muted); }
        .wsp-label {
          margin: 4px 0 0; font-size: 10px; font-weight: 600;
          letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-muted);
        }
        .wsp-row {
          display: grid; gap: 4px;
          grid-template-columns: repeat(8, 1fr);
        }
        .wsp-cell {
          width: 100%; aspect-ratio: 1;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 7px; background: transparent;
          padding: 2px; cursor: pointer;
          transition: background .12s, transform .12s, outline-color .12s;
          outline: 1.5px solid transparent;
          outline-offset: 1px;
        }
        .wsp-cell:hover { background: var(--surface-2); }
        .wsp-cell.is-active {
          outline-color: color-mix(in srgb, var(--text) 60%, transparent);
        }
        .wsp-cell:active { transform: scale(.96); }
      `}</style>
    </div>
  )
}
