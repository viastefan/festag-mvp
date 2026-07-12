'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Broadcast, FileText, Package, UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { portalNavShortcutDisplayLabel, portalNavShortcutKeys } from '@/lib/portal-nav-shortcuts'
import { portalHardNavigate } from '@/lib/portal-hard-nav'

const PORTAL_ICON_WEIGHT = 'light' as const
const NAV_ICON = 15

type MenuItem = {
  href: string
  label: string
  icon: Icon
}

const MENU_ITEMS: MenuItem[] = [
  { href: '/documents', label: 'Dokumente', icon: FileText },
  { href: '/teams', label: 'Team', icon: UsersThree },
  { href: '/deliverables', label: 'Lieferungen', icon: Package },
  { href: '/activity', label: 'Aktivität', icon: Broadcast },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  trigger: ReactNode
  railCollapsed?: boolean
  inline?: boolean
}

function ShortcutHint({ href }: { href: string }) {
  const keys = portalNavShortcutKeys(href)
  if (!keys?.length) return null
  return (
    <span className="pwn-shortcut" aria-hidden>
      {keys.map((key, i) => (
        <kbd key={`${key}-${i}`} className="pwn-kbd">{key}</kbd>
      ))}
    </span>
  )
}

export default function PortalWorkspaceNavMenu({
  open,
  onOpenChange,
  anchorRef,
  trigger,
  railCollapsed = false,
  inline = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ left: 0, top: 0, width: 220 })
  const isMobile = useFestagMobile()
  const router = useRouter()
  const pathname = usePathname() || ''

  useEffect(() => {
    function place() {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      const popW = railCollapsed ? 240 : Math.max(220, r.width + 10)
      const left = railCollapsed
        ? Math.min(r.right + 10, window.innerWidth - popW - 12)
        : Math.max(12, Math.min(r.left - 4, window.innerWidth - popW - 12))
      setPos({
        left,
        top: Math.min(window.innerHeight - 24, r.top + 6),
        width: popW,
      })
    }
    if (!open || isMobile) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef, railCollapsed, isMobile])

  useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onOpenChange(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('click', onDown, true)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('click', onDown, true)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, onOpenChange, anchorRef])

  const close = () => onOpenChange(false)

  function navigate(href: string) {
    close()
    if (portalHardNavigate(pathname, href)) return
    router.push(href)
  }

  const menuBody = (
    <div className="pwn-list" role="group">
      {MENU_ITEMS.map(item => {
        const IconComp = item.icon ?? Broadcast
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const shortcut = portalNavShortcutDisplayLabel(item.href)
        return (
          <button
            key={item.href}
            type="button"
            className={`pwn-item${active ? ' is-active' : ''}`}
            role="menuitem"
            title={shortcut ? `${item.label} (${shortcut})` : item.label}
            onClick={() => navigate(item.href)}
          >
            <span className="pwn-icon">
              <IconComp size={NAV_ICON} weight={PORTAL_ICON_WEIGHT} />
            </span>
            <span className="pwn-label">{item.label}</span>
            <ShortcutHint href={item.href} />
          </button>
        )
      })}
    </div>
  )

  const menu = open && typeof document !== 'undefined' ? createPortal(
    isMobile ? (
      <div className="festag-popup-mobile-host">
        <button type="button" className="festag-popup-backdrop" aria-label="Schließen" onClick={close} />
        <div
          ref={popRef}
          className="pwn-pop festag-popup-surface festag-popup-mobile-sheet"
          role="menu"
          aria-label="Workspace"
        >
          <FestagPopupDragHandle onDismiss={close} />
          {menuBody}
        </div>
      </div>
    ) : (
      <div
        ref={popRef}
        className="pwn-pop festag-popup-surface festag-anchor-popover"
        style={{ left: pos.left, top: pos.top, width: pos.width }}
        role="menu"
        aria-label="Workspace"
      >
        {menuBody}
      </div>
    ),
    document.body,
  ) : null

  return (
    <div ref={wrapRef} className={`pwn-wrap${inline ? ' pwn-wrap--inline' : ''}`}>
      {trigger}
      {menu}
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
  .pwn-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 100%;
  }
  .pwn-wrap--inline {
    width: auto;
    flex-shrink: 0;
  }
  .pwn-pop {
    position: fixed;
    z-index: 120000;
    width: 220px;
    max-width: calc(100vw - 24px);
    padding: 6px;
    border-radius: 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.06),
      0 16px 40px -12px rgba(15, 23, 42, 0.28);
    animation: pwnIn .16s cubic-bezier(.16, 1, .3, 1) both;
  }
  [data-theme="dark"] .pwn-pop,
  [data-theme="classic-dark"] .pwn-pop {
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.45),
      0 16px 40px -12px rgba(0, 0, 0, 0.62);
  }
  .pwn-pop.festag-popup-mobile-sheet {
    width: 100%;
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    animation: none;
    z-index: auto;
  }
  @keyframes pwnIn {
    from { opacity: 0; transform: translateY(6px) scale(0.985); }
    to { opacity: 1; transform: none; }
  }
  .pwn-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .pwn-item {
    width: 100%;
    display: grid;
    grid-template-columns: var(--portal-nav-icon-size, 15px) minmax(0, 1fr) max-content;
    gap: 10px;
    align-items: center;
    min-height: var(--portal-nav-row-height, 32px);
    padding: 0 10px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--portal-nav-item, #3F3F3F);
    font-family: inherit;
    font-size: var(--portal-nav-size, 14.5px);
    font-weight: 400;
    letter-spacing: var(--portal-nav-tracking, 0.018em);
    text-align: left;
    cursor: pointer;
    transition: color .12s ease, background .12s ease;
  }
  .pwn-item:hover:not(.active) {
    color: var(--portal-nav-item-hover, #525252);
    background: var(--portal-row-hover, rgba(0, 0, 0, 0.035));
  }
  .pwn-item.is-active {
    color: var(--portal-nav-item-active, #3F3F3F);
    font-weight: 400;
    background: var(--portal-nav-active-bg, transparent);
  }
  [data-theme="dark"] .pwn-item:hover,
  [data-theme="classic-dark"] .pwn-item:hover {
    background: var(--portal-row-hover, rgba(255, 255, 255, 0.06));
  }
  .pwn-icon {
    width: var(--portal-nav-icon-size, 15px);
    height: var(--portal-nav-icon-size, 15px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: inherit;
  }
  .pwn-label {
    min-width: 0;
    font-size: inherit;
    font-weight: inherit;
    letter-spacing: inherit;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: inherit;
  }
  .pwn-shortcut {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1;
    color: #3F3F3F;
    white-space: nowrap;
  }
  .pwn-kbd {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 5px;
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 90%, transparent);
    background: color-mix(in srgb, var(--portal-row-hover, #f1f3f5) 80%, transparent);
    color: #3F3F3F;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 400;
    font-style: normal;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-variant-numeric: tabular-nums;
  }
  [data-theme="dark"] .pwn-item,
  [data-theme="classic-dark"] .pwn-item {
    color: var(--portal-nav-item, #8E8E93);
  }
  [data-theme="dark"] .pwn-item:hover:not(.active),
  [data-theme="classic-dark"] .pwn-item:hover:not(.active) {
    color: var(--portal-nav-item-hover, #FFFFFF);
  }
  [data-theme="dark"] .pwn-item.is-active,
  [data-theme="classic-dark"] .pwn-item.is-active {
    color: var(--portal-nav-item-active, #FFFFFF);
  }
  [data-theme="dark"] .pwn-shortcut,
  [data-theme="classic-dark"] .pwn-shortcut {
    color: inherit;
  }
  [data-theme="dark"] .pwn-kbd,
  [data-theme="classic-dark"] .pwn-kbd {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.08);
    color: var(--portal-soft, #c7c7cc);
  }
`
