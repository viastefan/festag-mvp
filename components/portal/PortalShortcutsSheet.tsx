'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import PortalShortcutsOverview from '@/components/portal/PortalShortcutsOverview'

export default function PortalShortcutsSheet() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onShow() { setOpen(true) }
    window.addEventListener('show-shortcuts', onShow)
    return () => window.removeEventListener('show-shortcuts', onShow)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <>
      <style>{`
        .pss-backdrop {
          position: fixed; inset: 0; z-index: 2147483000;
          background: var(--modal-backdrop, rgba(0,0,0,.48));
          backdrop-filter: blur(var(--modal-backdrop-blur, 14px));
          -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 14px));
          animation: pss-in .14s ease both;
        }
        .pss-sheet {
          position: fixed; left: 50%; top: 50%; z-index: 2147483001;
          transform: translate(-50%, -50%);
          width: min(560px, calc(100vw - 32px));
          max-height: min(82dvh, 720px);
          overflow: auto;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--festag-black-popup, var(--surface));
          color: var(--text);
          padding: 22px 22px 18px;
          box-shadow: 0 40px 96px -28px rgba(0,0,0,.55);
          animation: pss-up .22s cubic-bezier(.16,1,.3,1) both;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        .pss-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: 16px;
        }
        .pss-title {
          margin: 0;
          font-size: 22px; font-weight: 400; letter-spacing: -.02em;
        }
        .pss-sub {
          margin: 4px 0 0;
          font-size: 14px; line-height: 1.45; color: var(--text-secondary);
        }
        .pss-close {
          width: 32px; height: 32px; border-radius: 999px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
        }
        @keyframes pss-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pss-up { from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) } to { opacity: 1; transform: translate(-50%, -50%) } }
        @media (max-width: 640px) {
          .pss-sheet {
            top: auto; bottom: 0; left: 0; right: 0;
            transform: none; width: 100%; max-height: 88dvh;
            border-radius: 18px 18px 0 0;
            animation: pss-sheet .28s cubic-bezier(.16,1,.3,1) both;
          }
          @keyframes pss-sheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
        }
      `}</style>
      <button type="button" className="pss-backdrop" aria-label="Schließen" onClick={() => setOpen(false)} />
      <div className="pss-sheet" role="dialog" aria-modal="true" aria-label="Tastenkürzel">
        <div className="pss-head">
          <div>
            <h2 className="pss-title">Tastenkürzel</h2>
            <p className="pss-sub">G dann Buchstabe · ⌘K Palette · ⌘, Einstellungen</p>
          </div>
          <button type="button" className="pss-close" aria-label="Schließen" onClick={() => setOpen(false)}>
            <X size={14} weight="regular" />
          </button>
        </div>
        <PortalShortcutsOverview scope="sidebar" />
      </div>
    </>
  )
}
