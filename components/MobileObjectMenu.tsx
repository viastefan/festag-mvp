'use client'

/**
 * MobileObjectMenu — the mobile top-right 3-dot action menu.
 *
 * Per the Tagro Context System spec: a subtle floating ⋯ button in the top-right
 * (mobile only), opening a clean context-aware action sheet. Actions are
 * context-specific (Neue Aufgabe / Neue Entscheidung / Neues Dokument / Status
 * ändern / Archivieren / …). Never duplicates "Mit Tagro bearbeiten" — that
 * stays the right button in the bottom floating bar.
 *
 * Caller passes a flat array of items: `{ label, icon?, onClick, destructive? }`.
 * Items with `destructive: true` are pushed to the bottom and visually separated.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DotsThree, X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export type ObjectMenuItem = {
  label: string
  icon?: ReactNode
  onClick: () => void
  /** Greyed-out, ignored on click. Use sparingly — usually hide instead. */
  disabled?: boolean
  /** Pushes the item to the bottom with a separator + red tint. */
  destructive?: boolean
}

export default function MobileObjectMenu({ title, items }: { title?: string; items: ObjectMenuItem[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const regular = items.filter(i => !i.destructive)
  const destructive = items.filter(i => i.destructive)

  const sheet = open ? (
    <div className="mom-layer" role="dialog" aria-modal="true" aria-label={title || 'Aktionen'}>
      <div className="mom-backdrop" onClick={() => setOpen(false)} aria-hidden />
      <div className="mom-sheet" role="menu">
        <div className="mom-grabber" aria-hidden />
        {title && <p className="mom-title">{title}</p>}
        <div className="mom-list">
          {regular.map((it, i) => (
            <button
              key={`${it.label}-${i}`}
              type="button"
              role="menuitem"
              className="mom-item"
              disabled={it.disabled}
              onClick={() => { if (it.disabled) return; setOpen(false); it.onClick() }}
            >
              {it.icon && <span className="mom-ico" aria-hidden>{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
        {destructive.length > 0 && (
          <>
            <div className="mom-sep" aria-hidden />
            <div className="mom-list">
              {destructive.map((it, i) => (
                <button
                  key={`d-${it.label}-${i}`}
                  type="button"
                  role="menuitem"
                  className="mom-item is-danger"
                  disabled={it.disabled}
                  onClick={() => { if (it.disabled) return; setOpen(false); it.onClick() }}
                >
                  {it.icon && <span className="mom-ico" aria-hidden>{it.icon}</span>}
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <button type="button" className="mom-cancel" onClick={() => setOpen(false)}>Schließen</button>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        className="mom-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Aktionen"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X size={17} weight="regular" /> : <DotsThree size={20} weight="bold" />}
      </button>

      {typeof document !== 'undefined' && sheet ? createPortal(sheet, document.body) : null}

      <style jsx>{`
        .mom-trigger {
          display: none;
        }
        @media (max-width: 768px) {
          .mom-trigger {
            display: inline-flex;
            position: fixed;
            top: calc(env(safe-area-inset-top, 0px) + 14px);
            right: calc(env(safe-area-inset-right, 0px) + 14px);
            z-index: 130;
            width: 40px; height: 40px;
            align-items: center; justify-content: center;
            border: 0; border-radius: 999px;
            background: rgba(255,255,255,0.06);
            color: var(--text, #F4F4F4);
            backdrop-filter: blur(14px) saturate(140%);
            -webkit-backdrop-filter: blur(14px) saturate(140%);
            box-shadow: 0 6px 18px -8px rgba(0,0,0,0.45);
            cursor: pointer;
            transition: background .14s ease, transform .14s ease;
          }
          :global([data-theme="light"]) .mom-trigger,
          :global([data-theme="read"]) .mom-trigger {
            background: rgba(255,255,255,0.86);
            color: #111;
            box-shadow: 0 1px 0 rgba(0,0,0,0.05), 0 12px 28px -16px rgba(15,23,42,0.18);
          }
        }
        .mom-trigger:active { transform: scale(.95); }
      `}</style>

      <style jsx global>{`
        .mom-layer {
          position: fixed; inset: 0; z-index: 13500;
          display: flex; align-items: flex-end; justify-content: center;
          animation: momIn .18s ease both;
        }
        .mom-backdrop {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px) saturate(140%);
          -webkit-backdrop-filter: blur(6px) saturate(140%);
        }
        .mom-sheet {
          position: relative;
          width: 100%; max-width: 480px;
          padding: 6px 14px max(20px, env(safe-area-inset-bottom, 0px));
          background: #0D0D0D;
          color: var(--text, #F4F4F4);
          border-top-left-radius: 22px;
          border-top-right-radius: 22px;
          box-shadow: 0 -24px 60px -20px rgba(0,0,0,0.6);
          animation: momUp .28s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="light"] .mom-sheet,
        [data-theme="read"] .mom-sheet {
          background: #FFFFFF;
          color: #111;
        }
        .mom-grabber {
          width: 44px; height: 4px; border-radius: 999px;
          background: rgba(255,255,255,0.18);
          margin: 6px auto 10px;
        }
        [data-theme="light"] .mom-grabber,
        [data-theme="read"] .mom-grabber { background: rgba(0,0,0,0.16); }
        .mom-title {
          margin: 0 6px 6px;
          font-size: 11px; font-weight: 500; letter-spacing: .08em;
          text-transform: uppercase; color: var(--text-muted, #737373);
        }
        .mom-list { display: flex; flex-direction: column; }
        .mom-item {
          display: flex; align-items: center; gap: 12px;
          width: 100%; min-height: 50px;
          padding: 0 8px;
          border: 0; background: transparent;
          color: inherit; font: inherit; font-size: 15px; font-weight: 500;
          text-align: left; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: background .12s ease;
        }
        .mom-item:active { background: rgba(255,255,255,0.06); }
        [data-theme="light"] .mom-item:active,
        [data-theme="read"] .mom-item:active { background: rgba(0,0,0,0.05); }
        .mom-item:disabled { opacity: .42; cursor: not-allowed; }
        .mom-item.is-danger { color: #EF4444; }
        .mom-ico {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; color: var(--text-muted, #737373);
        }
        .mom-item.is-danger .mom-ico { color: #EF4444; }
        .mom-sep {
          height: 1px; background: rgba(255,255,255,0.06);
          margin: 6px 0;
        }
        [data-theme="light"] .mom-sep,
        [data-theme="read"] .mom-sep { background: rgba(0,0,0,0.07); }
        .mom-cancel {
          width: 100%; min-height: 50px;
          margin-top: 8px;
          border: 0; border-radius: 14px;
          background: rgba(255,255,255,0.06);
          color: inherit; font: inherit; font-size: 14px; font-weight: 500;
          cursor: pointer;
          transition: background .12s ease;
        }
        [data-theme="light"] .mom-cancel,
        [data-theme="read"] .mom-cancel { background: rgba(0,0,0,0.05); }
        .mom-cancel:active { background: rgba(255,255,255,0.10); }
        @keyframes momIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes momUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  )
}
