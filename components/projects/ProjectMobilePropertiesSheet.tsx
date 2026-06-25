'use client'

import Link from 'next/link'
import { X } from '@phosphor-icons/react'

export type ProjectPropertyRow = {
  key: string
  value: React.ReactNode
  href?: string
  onClick?: () => void
}

type Props = {
  open: boolean
  onClose: () => void
  title: string
  controlLabel: string
  controlReason: string
  controlColor: string
  rows: ProjectPropertyRow[]
}

export default function ProjectMobilePropertiesSheet({
  open,
  onClose,
  title,
  controlLabel,
  controlReason,
  controlColor,
  rows,
}: Props) {
  if (!open) return null

  return (
    <>
      <button type="button" className="pmp-backdrop" aria-label="Schließen" onClick={onClose} />
      <div className="pmp-sheet" role="dialog" aria-label="Projekteigenschaften">
        <div className="pmp-grip" aria-hidden />
        <header className="pmp-head">
          <h2>{title}</h2>
          <button type="button" className="pmp-close" onClick={onClose} aria-label="Schließen">
            <X size={16} />
          </button>
        </header>

        <div className="pmp-control">
          <span className="pmp-dot" style={{ background: controlColor }} aria-hidden />
          <div>
            <strong>{controlLabel}</strong>
            <p>{controlReason}</p>
          </div>
        </div>

        <div className="pmp-rows">
          {rows.map(row => {
            const inner = (
              <>
                <span className="pmp-key">{row.key}</span>
                <span className="pmp-val">{row.value}</span>
              </>
            )
            if (row.href) {
              return (
                <Link key={row.key} href={row.href} className="pmp-row" onClick={onClose}>
                  {inner}
                </Link>
              )
            }
            if (row.onClick) {
              return (
                <button key={row.key} type="button" className="pmp-row" onClick={() => { row.onClick?.(); onClose() }}>
                  {inner}
                </button>
              )
            }
            return <div key={row.key} className="pmp-row static">{inner}</div>
          })}
        </div>
      </div>

      <style jsx>{`
        .pmp-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          border: 0;
          padding: 0;
          background: var(--modal-backdrop, rgba(245, 245, 247, 0.72));
          backdrop-filter: none;
          cursor: default;
        }
        .pmp-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 81;
          max-height: min(78vh, 640px);
          overflow-y: auto;
          border-radius: 20px 20px 0 0;
          background: var(--festag-black-popup, var(--portal-card, #fff));
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px));
          animation: pmp-up .22s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes pmp-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: none; }
        }
        .pmp-grip {
          width: 36px;
          height: 4px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--text-muted) 45%, transparent);
          margin: 4px auto 12px;
        }
        .pmp-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .pmp-head h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
          color: var(--text);
        }
        .pmp-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 0;
          background: color-mix(in srgb, var(--surface-2) 80%, transparent);
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .pmp-control {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 12px 14px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          margin-bottom: 12px;
        }
        .pmp-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .pmp-control strong { display: block; font-size: 14px; color: var(--text); margin-bottom: 3px; }
        .pmp-control p { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--text-muted); }
        .pmp-rows { display: flex; flex-direction: column; }
        .pmp-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          padding: 12px 2px;
          border: 0;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
          background: transparent;
          text-align: left;
          text-decoration: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
        }
        .pmp-row.static { cursor: default; }
        .pmp-row:last-child { border-bottom: 0; }
        .pmp-key { font-size: 12px; color: var(--text-muted); }
        .pmp-val { font-size: 13px; font-weight: 500; color: var(--text); text-align: right; }
      `}</style>
    </>
  )
}
