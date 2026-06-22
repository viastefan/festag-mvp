'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CaretRight, DownloadSimple, GearSix, SignOut, UserPlus,
} from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { portalHardNavigate } from '@/lib/portal-hard-nav'

type TeamMember = {
  id: string
  name: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  displayName: string
  email: string
  members?: TeamMember[]
  onLogout: () => void | Promise<void>
  trigger: ReactNode
  /** Sidebar rail collapsed — anchor popover to the right of the mark. */
  railCollapsed?: boolean
}

export default function PortalWorkspacePopover({
  open,
  onOpenChange,
  anchorRef,
  displayName,
  email,
  members = [],
  onLogout,
  trigger,
  railCollapsed = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const isMobile = useFestagMobile()
  const router = useRouter()
  const pathname = usePathname() || ''

  useEffect(() => {
    function place() {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      const popW = 260
      const left = railCollapsed
        ? Math.min(r.right + 10, window.innerWidth - popW - 12)
        : Math.max(12, Math.min(r.left, window.innerWidth - popW - 12))
      setPos({
        left,
        top: Math.min(window.innerHeight - 24, r.bottom + (railCollapsed ? 6 : 12)),
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
  const memberCount = members.length
  const hasTeam = memberCount > 1
  const teamLabel = hasTeam
    ? `Team, ${memberCount} ${memberCount === 1 ? 'Mitglied' : 'Mitglieder'}`
    : 'Nur du im Workspace'
  const teamHref = hasTeam ? '/members' : '/invite'
  const teamSub = hasTeam ? 'Team ansehen' : 'Mitglieder einladen'

  function navigate(href: string) {
    close()
    if (portalHardNavigate(pathname, href)) return
    router.push(href)
  }

  function openDesktopSheet() {
    navigate('/download')
  }

  async function handleLogout() {
    close()
    await onLogout()
  }

  const menuBody = (
  <>
      <div className="pwp-list">
      <button type="button" className="pwp-team" role="menuitem" onClick={() => navigate(teamHref)}>
        <div className="pwp-team-copy">
          <span className="pwp-team-label">{teamLabel}</span>
          <span className="pwp-team-sub">{teamSub}</span>
        </div>
        <CaretRight size={13} weight="regular" aria-hidden />
      </button>

      <div className="pwp-divider" />

      <button type="button" className="pwp-row" role="menuitem" onClick={() => navigate('/settings')}>
        <GearSix size={16} weight="regular" />
        <span>Einstellungen</span>
      </button>
      <button type="button" className="pwp-row" role="menuitem" onClick={() => navigate('/invite')}>
        <UserPlus size={16} weight="regular" />
        <span>Mitglieder einladen</span>
      </button>
      <button type="button" className="pwp-row" role="menuitem" onClick={openDesktopSheet}>
        <DownloadSimple size={16} weight="regular" />
        <span>Desktop-App laden</span>
      </button>
      </div>

      <div className="pwp-divider" />

      <div className="pwp-you">
        <div className="pwp-you-copy">
          <span className="pwp-you-name">{displayName || 'Festag-Konto'}</span>
          <span className="pwp-you-email">{email}</span>
        </div>
      </div>

      <button type="button" className="pwp-row" role="menuitem" onClick={() => { void handleLogout() }}>
        <SignOut size={16} weight="regular" />
        <span>Abmelden</span>
      </button>
    </>
  )

  const menu = open && typeof document !== 'undefined' ? createPortal(
    isMobile ? (
      <div className="festag-popup-mobile-host">
        <button type="button" className="festag-popup-backdrop" aria-label="Schließen" onClick={close} />
        <div
          ref={popRef}
          className="pwp-pop festag-popup-surface festag-popup-mobile-sheet"
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
        className="pwp-pop festag-popup-surface festag-anchor-popover"
        style={{ left: pos.left, top: pos.top }}
        role="menu"
        aria-label="Workspace"
      >
        {menuBody}
      </div>
    ),
    document.body,
  ) : null

  return (
    <div ref={wrapRef} className="pwp-wrap">
      {trigger}
      {menu}
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
  .pwp-wrap {
    position: relative;
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
  }
  .pwp-wrap .portal-nav-ws {
    min-width: 0;
  }
  .pwp-pop {
    position: fixed; z-index: 120000;
    width: 260px; max-width: calc(100vw - 24px);
    padding: 6px;
    border-radius: 16px;
    animation: pwpIn .16s cubic-bezier(.16, 1, .3, 1) both;
  }
  .pwp-pop.festag-popup-mobile-sheet {
    width: 100%;
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    animation: none;
    z-index: auto;
  }
  @keyframes pwpIn {
    from { opacity: 0; transform: translateY(4px) scale(.985); }
    to { opacity: 1; transform: none; }
  }
  .pwp-list { display: flex; flex-direction: column; gap: 2px; }
  .pwp-divider {
    height: 1px; margin: 6px 8px;
    background: var(--border, rgba(0,0,0,.08));
  }
  .pwp-team {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 8px 10px;
    border: 0; background: transparent;
    border-radius: 10px; cursor: pointer;
    font: inherit; text-align: left;
    color: var(--text, #1c1c1e);
    transition: background .12s ease;
  }
  .pwp-team:hover { background: var(--row-hover, rgba(0,0,0,.04)); }
  .pwp-team-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .pwp-team-label {
    font-size: 13px; font-weight: 600; line-height: 1.3;
    color: var(--text, #1c1c1e);
  }
  .pwp-team-sub {
    font-size: 12px; line-height: 1.35;
    color: var(--text-muted, #86868b);
  }
  .pwp-row {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 8px 10px;
    border: 0; background: transparent;
    border-radius: 10px; cursor: pointer;
    font: inherit; font-size: 13px; font-weight: 500;
    text-align: left; color: var(--text, #1c1c1e);
    transition: background .12s ease;
  }
  .pwp-row:hover { background: var(--row-hover, rgba(0,0,0,.04)); }
  .pwp-row svg { flex-shrink: 0; opacity: .72; }
  .pwp-you {
    padding: 8px 10px 4px;
  }
  .pwp-you-copy {
    display: flex; flex-direction: column; gap: 2px; min-width: 0;
  }
  .pwp-you-name {
    font-size: 13px; font-weight: 600; line-height: 1.3;
    color: var(--text, #1c1c1e);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwp-you-email {
    font-size: 12px; line-height: 1.35;
    color: var(--text-muted, #86868b);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
`
