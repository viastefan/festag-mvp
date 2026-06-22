'use client'

import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavShortcutActive } from '@/hooks/useNavShortcutActive'
import { portalNavShortcutKeys } from '@/lib/portal-nav-shortcuts'

type Props = {
  labelByHref: Record<string, string>
  collapsed?: boolean
}

export default function PortalNavShortcutTip({ labelByHref, collapsed }: Props) {
  const activeHref = useNavShortcutActive()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!activeHref || collapsed) {
      setPos(null)
      return
    }

    function measure() {
      const el = document.querySelector(`[data-portal-nav-href="${CSS.escape(activeHref!)}"]`)
      if (!el) {
        setPos(null)
        return
      }
      const r = el.getBoundingClientRect()
      setPos({ top: r.top + r.height / 2, left: r.right + 10 })
    }

    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [activeHref, collapsed])

  if (!activeHref || collapsed || !pos || typeof document === 'undefined') return null

  const keys = portalNavShortcutKeys(activeHref)
  if (!keys) return null

  const label = labelByHref[activeHref] || activeHref

  return createPortal(
    <>
      <style>{`
        .pns-tip {
          position: fixed;
          z-index: 2147482000;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 80%, transparent);
          background: var(--festag-black-popup, var(--portal-card, #fff));
          color: var(--portal-text, #0f0f10);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.018em;
          white-space: nowrap;
          pointer-events: none;
          box-shadow:
            0 0 0 1px rgba(0,0,0,.04),
            0 8px 24px -8px rgba(0,0,0,.18);
          animation: pns-tip-in .14s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .pns-tip,
        [data-theme="classic-dark"] .pns-tip {
          border-color: rgba(255,255,255,.1);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.04),
            0 12px 32px -10px rgba(0,0,0,.55);
        }
        .pns-tip-label { color: var(--portal-muted, #6e717e); }
        .pns-tip-keys { display: inline-flex; align-items: center; gap: 4px; }
        .pns-tip-key {
          min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 5px;
          border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 90%, transparent);
          background: color-mix(in srgb, var(--portal-row-hover, #f1f3f5) 80%, transparent);
          color: var(--portal-soft, #8f93a4);
          font-size: 10px; font-weight: 500;
          display: inline-flex; align-items: center; justify-content: center;
          font-variant-numeric: tabular-nums;
        }
        [data-theme="dark"] .pns-tip-key,
        [data-theme="classic-dark"] .pns-tip-key {
          border-color: rgba(255,255,255,.12);
          background: rgba(255,255,255,.08);
          color: var(--portal-soft, #c7c7cc);
        }
        .pns-tip-then { font-size: 11px; color: var(--portal-muted, #8e8e93); }
        @keyframes pns-tip-in {
          from { opacity: 0; transform: translateY(calc(-50% + 3px)); }
          to { opacity: 1; transform: translateY(-50%); }
        }
      `}</style>
      <div
        className="pns-tip"
        style={{ top: pos.top, left: pos.left }}
        role="tooltip"
        aria-hidden
      >
        <span className="pns-tip-label">Zu {label}</span>
        <span className="pns-tip-keys">
          {keys.map((k, i) => (
            <span key={k}>
              {i > 0 ? <span className="pns-tip-then"> dann </span> : null}
              <span className="pns-tip-key">{k}</span>
            </span>
          ))}
        </span>
      </div>
    </>,
    document.body,
  )
}
