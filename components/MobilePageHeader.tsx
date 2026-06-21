'use client'

/**
 * MobilePageHeader — Codex-style mobile chrome.
 * Two floating shadow orbs (menu + more), large title below — no stroke capsule.
 */

import { useState } from 'react'
import { DotsThree, List } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import CodexOrbButton from '@/components/mobile/CodexOrbButton'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

export type MobileMenuItem = {
  id: string
  label: string
  icon?: React.ElementType
  onClick?: () => void
  href?: string
  destructive?: boolean
}

export type MobilePageHeaderProps = {
  title: ReactNode
  primaryIcon?: React.ElementType
  primaryLabel?: string
  onPrimary?: () => void
  menuItems?: MobileMenuItem[]
  tabs?: ReactNode
  showNav?: boolean
}

export default function MobilePageHeader({
  title,
  primaryIcon: PrimaryIcon,
  primaryLabel = 'Aktion',
  onPrimary,
  menuItems = [],
  tabs,
  showNav = true,
}: MobilePageHeaderProps) {
  const [navOpen, setNavOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="mph">
      <style>{CODEX_ORB_CSS}</style>

      <div className="mph-top">
        {showNav ? (
          <CodexOrbButton ariaLabel="Menü" onClick={() => setNavOpen(true)}>
            <List size={20} weight="regular" />
          </CodexOrbButton>
        ) : (
          <span className="mph-spacer" aria-hidden />
        )}

        {menuItems.length > 0 || PrimaryIcon ? (
          <CodexOrbButton ariaLabel="Mehr" onClick={() => setMenuOpen(v => !v)}>
            <DotsThree size={22} weight="bold" />
          </CodexOrbButton>
        ) : (
          <span className="mph-spacer" aria-hidden />
        )}
      </div>

      <h1 className="mph-title">{title}</h1>
      {tabs ? <div className="mph-tabs">{tabs}</div> : null}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      {menuOpen && (menuItems.length > 0 || PrimaryIcon) && (
        <>
          <button type="button" className="mph-backdrop" aria-label="Schließen" onClick={() => setMenuOpen(false)} />
          <div className="mph-menu" role="menu">
            {PrimaryIcon && onPrimary ? (
              <button
                type="button"
                className="mph-menu-item"
                onClick={() => { setMenuOpen(false); onPrimary() }}
              >
                <PrimaryIcon size={16} weight="regular" />
                <span>{primaryLabel}</span>
              </button>
            ) : null}
            {menuItems.map(item => {
              const Icon = item.icon
              const onClick = () => { setMenuOpen(false); item.onClick?.() }
              const content = (
                <>
                  {Icon ? <Icon size={16} weight="regular" /> : null}
                  <span>{item.label}</span>
                </>
              )
              return item.href
                ? (
                  <a
                    key={item.id}
                    href={item.href}
                    className={`mph-menu-item${item.destructive ? ' is-destructive' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {content}
                  </a>
                )
                : (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={`mph-menu-item${item.destructive ? ' is-destructive' : ''}`}
                    onClick={onClick}
                  >
                    {content}
                  </button>
                )
            })}
          </div>
        </>
      )}

      <style jsx>{`
        .mph { display: none; }
        @media (max-width: 768px) {
          .mph {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 0;
            padding:
              calc(8px + env(safe-area-inset-top, 0px))
              20px 12px;
          }
          .mph-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
          }
          .mph-spacer { width: 44px; height: 44px; flex-shrink: 0; }
          .mph-title {
            margin: 0;
            font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
            font-size: 34px;
            font-weight: 500;
            line-height: 1.08;
            letter-spacing: -0.025em;
            color: var(--text, #0f0f10);
          }
          .mph-tabs { margin-top: 14px; }
        }
        .mph-backdrop {
          position: fixed; inset: 0; z-index: 89;
          background: transparent; border: 0; padding: 0; cursor: default;
        }
        .mph-menu {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 56px);
          right: 20px;
          z-index: 90;
          min-width: 200px;
          padding: 6px;
          background: var(--surface, #fff);
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
          animation: mphIn .14s cubic-bezier(.16, 1, .3, 1) both;
        }
        @keyframes mphIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mph-menu-item {
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          min-height: 44px;
          padding: 0 14px;
          border: 0; border-radius: 14px;
          background: transparent;
          color: var(--text, #111);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px; font-weight: 400;
          text-align: left; text-decoration: none;
          cursor: pointer;
        }
        .mph-menu-item:hover,
        .mph-menu-item:active {
          background: color-mix(in srgb, var(--surface-2, #f1f3f5) 80%, transparent);
        }
        .mph-menu-item.is-destructive { color: #e11d48; }
      `}</style>
    </header>
  )
}
