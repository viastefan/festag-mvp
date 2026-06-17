'use client'

/**
 * MobilePageHeader — 1:1 with the Linear "My issues" mobile header.
 *
 * Layout (mobile ≤768px):
 *
 *   My issues                              ┌────────┐
 *                                          │  ✎  ⋯  │   ← single white capsule
 *                                          └────────┘
 *
 *   Assigned │ ▽    Created   Subscribed   ← optional tabs row
 *
 * Title: very large (32px), weight 700, dark.
 * Right action pill: ONE pill, 56% rounded ends, holding the primary
 * action icon + a ⋯ More icon. Hairline border, soft shadow.
 *
 * Desktop is untouched — this component renders nothing above 768px so
 * each page's existing desktop chrome (PageHeader, AppPageHeader, etc.)
 * stays in charge there.
 */

import { useState } from 'react'
import { DotsThree } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

// Phosphor's Icon type has a heavier generic signature than the props we
// actually pass; React.ElementType keeps the call sites simple without
// losing type safety at the usage site.
type Glyph = React.ElementType

export type MobileMenuItem = {
  id: string
  label: string
  icon?: Glyph
  onClick?: () => void
  href?: string
  destructive?: boolean
}

export type MobilePageHeaderProps = {
  /** The page title — Linear-style, large + bold. */
  title: ReactNode
  /** Optional primary action icon button inside the right capsule
   *  (e.g. "Edit" pencil). When omitted, the capsule only shows ⋯. */
  primaryIcon?: Glyph
  primaryLabel?: string
  onPrimary?: () => void
  /** Items shown when the ⋯ menu is opened. When empty, the dots become
   *  a static visual marker (still rendered for symmetry). */
  menuItems?: MobileMenuItem[]
  /** Optional tabs row underneath (Assigned/Created/Subscribed style). */
  tabs?: ReactNode
}

export default function MobilePageHeader({
  title, primaryIcon: PrimaryIcon, primaryLabel = 'Aktion', onPrimary,
  menuItems = [], tabs,
}: MobilePageHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="mph">
      <h1 className="mph-title">{title}</h1>

      {/* Single capsule on the right — exactly the Linear pattern. */}
      <div className="mph-capsule">
        {PrimaryIcon ? (
          <button
            type="button"
            className="mph-icon-btn"
            aria-label={primaryLabel}
            title={primaryLabel}
            onClick={onPrimary}
          >
            <PrimaryIcon size={20} weight="regular" />
          </button>
        ) : null}
        {menuItems.length > 0 ? (
          <button
            type="button"
            className="mph-icon-btn"
            aria-label="Mehr"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            <DotsThree size={22} weight="bold" />
          </button>
        ) : (
          <span className="mph-icon-btn mph-icon-btn--static" aria-hidden>
            <DotsThree size={22} weight="bold" />
          </span>
        )}
      </div>

      {tabs ? <div className="mph-tabs">{tabs}</div> : null}

      {/* Action menu (anchored to the capsule). */}
      {menuOpen && menuItems.length > 0 ? (
        <>
          <button
            type="button"
            className="mph-menu-backdrop"
            aria-label="Schließen"
            onClick={() => setMenuOpen(false)}
          />
          <div className="mph-menu" role="menu">
            {menuItems.map(item => {
              const Icon = item.icon
              const onClick = () => { setMenuOpen(false); item.onClick?.() }
              const content = (
                <>
                  {Icon ? <span className="mph-menu-ico"><Icon size={16} weight="regular" /></span> : null}
                  <span className="mph-menu-label">{item.label}</span>
                </>
              )
              return item.href
                ? <a key={item.id} href={item.href} className={`mph-menu-item${item.destructive ? ' is-destructive' : ''}`} onClick={() => setMenuOpen(false)}>{content}</a>
                : <button key={item.id} type="button" role="menuitem" className={`mph-menu-item${item.destructive ? ' is-destructive' : ''}`} onClick={onClick}>{content}</button>
            })}
          </div>
        </>
      ) : null}

      <style jsx>{`
        .mph { display: none; }
        @media (max-width: 768px) {
          .mph {
            position: relative;
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-rows: auto;
            align-items: center;
            gap: 12px;
            padding: 14px 18px 8px;
          }
          .mph-title {
            margin: 0;
            grid-column: 1;
            font-size: 30px;
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: -.02em;
            color: var(--text, #111);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .mph-tabs {
            grid-column: 1 / -1;
            margin-top: 6px;
          }
        }

        /* The right-side single white capsule. */
        .mph-capsule {
          grid-column: 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          padding: 0;
          gap: 0;
          font-size: 13px;
          color: rgba(141, 141, 150, 1);
          background: #fff;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(15,23,42,.06);
        }
        :global([data-theme="dark"]) .mph-capsule,
        :global([data-theme="classic-dark"]) .mph-capsule {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.10);
          box-shadow: none;
        }
        .mph-icon-btn {
          width: 40px; height: 40px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent;
          color: rgba(141, 141, 150, 1);
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: background .12s ease;
        }
        .mph-icon-btn:hover,
        .mph-icon-btn:active {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
        }
        :global([data-theme="dark"]) .mph-icon-btn,
        :global([data-theme="classic-dark"]) .mph-icon-btn { color: #F4F4F4; }
        :global([data-theme="dark"]) .mph-icon-btn:hover,
        :global([data-theme="classic-dark"]) .mph-icon-btn:hover {
          background: rgba(255,255,255,0.06);
        }
        .mph-icon-btn--static { cursor: default; }
        .mph-icon-btn--static:hover { background: transparent; }

        /* Anchored menu under the capsule. */
        .mph-menu-backdrop {
          position: fixed; inset: 0;
          background: transparent;
          border: 0; padding: 0; cursor: default;
          z-index: 89;
        }
        .mph-menu {
          position: absolute;
          top: calc(100% - 4px);
          right: 18px;
          z-index: 90;
          min-width: 200px;
          padding: 6px;
          background: var(--surface, #fff);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 14px;
          box-shadow: 0 18px 40px -20px rgba(15,23,42,.32);
          animation: mphIn .14s cubic-bezier(.16,1,.3,1) both;
        }
        :global([data-theme="dark"]) .mph-menu,
        :global([data-theme="classic-dark"]) .mph-menu {
          background: #1C1C1E;
          border-color: rgba(255,255,255,0.08);
          box-shadow: 0 18px 40px -20px rgba(0,0,0,.7);
        }
        @keyframes mphIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .mph-menu-item {
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          background: transparent;
          color: var(--text, #111);
          border: 0; border-radius: 8px;
          padding: 9px 10px;
          font: inherit; font-size: 14px; font-weight: 500;
          text-align: left; text-decoration: none;
          cursor: pointer;
          transition: background .12s ease;
        }
        .mph-menu-item:hover,
        .mph-menu-item:active { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        :global([data-theme="dark"]) .mph-menu-item,
        :global([data-theme="classic-dark"]) .mph-menu-item { color: #F4F4F4; }
        :global([data-theme="dark"]) .mph-menu-item:hover,
        :global([data-theme="classic-dark"]) .mph-menu-item:hover { background: rgba(255,255,255,0.06); }
        .mph-menu-item.is-destructive { color: #E11D48; }
        .mph-menu-ico { display: inline-flex; color: inherit; opacity: .82; }
        .mph-menu-label { flex: 1 1 auto; }
      `}</style>
    </header>
  )
}
