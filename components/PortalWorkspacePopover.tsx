'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CaretRight, DownloadSimple, GearSix, SignOut, UserPlus,
} from '@phosphor-icons/react'
import WorkspaceSymbol from '@/components/WorkspaceSymbol'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { avatarTextColor } from '@/lib/avatar'
import type { WorkspaceSymbolPrefs } from '@/lib/workspace-symbol'

type TeamMember = {
  id: string
  name: string
  color: string
  avatarUrl: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  workspaceLabel: string
  workspaceMeta: string
  wsPrefs: WorkspaceSymbolPrefs
  displayName: string
  email: string
  initials: string
  avatarColor: string
  avatarUrl: string | null
  members?: TeamMember[]
  onLogout: () => void | Promise<void>
  trigger: ReactNode
  /** Sidebar rail collapsed — anchor popover to the right of the mark. */
  railCollapsed?: boolean
}

function firstLetter(s: string) {
  const t = (s || '').trim()
  return (t.charAt(0) || 'F').toUpperCase()
}

export default function PortalWorkspacePopover({
  open,
  onOpenChange,
  anchorRef,
  workspaceLabel,
  workspaceMeta,
  wsPrefs,
  displayName,
  email,
  initials,
  avatarColor,
  avatarUrl,
  members = [],
  onLogout,
  trigger,
  railCollapsed = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const isMobile = useFestagMobile()

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
      if (anchorRef.current?.contains(t)) return
      onOpenChange(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, onOpenChange, anchorRef])

  const close = () => onOpenChange(false)
  const avatarFg = avatarTextColor(avatarColor)
  const memberCount = members.length
  const hasTeam = memberCount > 1
  const shownMembers = members.slice(0, 4)
  const overflow = Math.max(0, memberCount - shownMembers.length)
  const teamLabel = hasTeam
    ? `Team · ${memberCount} ${memberCount === 1 ? 'Mitglied' : 'Mitglieder'}`
    : 'Nur du im Workspace'
  const teamHref = hasTeam ? '/members' : '/invite'
  const teamSub = hasTeam ? 'Team ansehen' : 'Mitglieder einladen'

  const menuBody = (
    <>
      <Link href="/settings/appearance" className="pwp-ws" onClick={close}>
        <span className="pwp-ws-mark">
          <WorkspaceSymbol variant={wsPrefs.variant} scheme={wsPrefs.scheme} seed={wsPrefs.seed} size={28} />
        </span>
        <div className="pwp-ws-text">
          <span className="pwp-ws-name">{workspaceLabel}</span>
          <span className="pwp-ws-meta">{workspaceMeta}</span>
        </div>
      </Link>

      <Link href={teamHref} className="pwp-team" onClick={close}>
        <div className="pwp-team-avatars">
          {shownMembers.length > 0 ? (
            shownMembers.map((m, i) => (
              <span
                key={m.id}
                className="pwp-team-av"
                style={{ background: m.color, color: avatarTextColor(m.color), zIndex: 10 - i }}
                title={m.name}
              >
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : firstLetter(m.name)}
              </span>
            ))
          ) : (
            <span className="pwp-team-av" style={{ background: avatarColor, color: avatarFg }}>
              {firstLetter(displayName || email)}
            </span>
          )}
          {overflow > 0 ? <span className="pwp-team-av pwp-team-more">+{overflow}</span> : null}
        </div>
        <div className="pwp-team-copy">
          <span className="pwp-team-label">{teamLabel}</span>
          <span className="pwp-team-sub">{teamSub}</span>
        </div>
        <CaretRight size={13} weight="regular" aria-hidden />
      </Link>

      <div className="pwp-divider" />

      <Link href="/settings" className="pwp-row" onClick={close}>
        <GearSix size={16} weight="regular" />
        <span>Einstellungen</span>
      </Link>
      <Link href="/invite" className="pwp-row" onClick={close}>
        <UserPlus size={16} weight="regular" />
        <span>Mitglieder einladen</span>
      </Link>
      <Link href="/download" className="pwp-row" onClick={close}>
        <DownloadSimple size={16} weight="regular" />
        <span>Desktop-App laden</span>
      </Link>

      <div className="pwp-divider" />

      <div className="pwp-you">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="pwp-you-av" />
        ) : (
          <div className="pwp-you-av" style={{ background: avatarColor, color: avatarFg }}>
            {initials}
          </div>
        )}
        <div className="pwp-you-copy">
          <span className="pwp-you-name">{displayName || 'Festag-Konto'}</span>
          <span className="pwp-you-email">{email}</span>
        </div>
      </div>

      <button type="button" className="pwp-row" onClick={() => { void onLogout(); close() }}>
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
  .pwp-ws-mark {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    overflow: hidden;
  }
  .pwp-ws-mark > span,
  .pwp-ws-mark svg {
    border-radius: 6px !important;
  }
  @keyframes pwpIn {
    from { opacity: 0; transform: translateY(4px) scale(.985); }
    to { opacity: 1; transform: none; }
  }
  .pwp-ws {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px 9px;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: background .12s ease;
  }
  .pwp-ws:hover { background: var(--fp-hover); }
  .pwp-ws-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .pwp-ws-name {
    font-size: 14px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--fp-text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwp-ws-meta {
    font-size: 11px; font-weight: 400; letter-spacing: 0;
    color: var(--fp-muted);
  }
  .pwp-team {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 10px;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: background .12s ease;
  }
  .pwp-team:hover { background: var(--fp-hover); }
  .pwp-team-avatars { display: inline-flex; flex-shrink: 0; padding-left: 2px; }
  .pwp-team-av {
    width: 22px; height: 22px; border-radius: 50%;
    margin-left: -6px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 500;
    border: 2px solid var(--fp-bg);
    box-sizing: border-box; overflow: hidden;
  }
  .pwp-team-av:first-child { margin-left: 0; }
  .pwp-team-av img { width: 100%; height: 100%; object-fit: cover; }
  .pwp-team-more { background: var(--fp-pill); color: var(--fp-muted); }
  .pwp-team-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .pwp-team-label {
    font-size: 12.5px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--fp-text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwp-team-sub {
    font-size: 11px; font-weight: 400;
    color: var(--fp-muted);
  }
  .pwp-team svg { flex-shrink: 0; color: var(--fp-muted); opacity: .7; }
  .pwp-divider {
    height: 1px; margin: 4px 6px;
    background: var(--fp-divider);
  }
  .pwp-row {
    display: flex; align-items: center; gap: 10px;
    width: 100%; min-height: 34px;
    padding: 7px 10px;
    border: 0; border-radius: 8px;
    background: transparent;
    font: inherit; font-size: 13px; font-weight: 400 !important;
    letter-spacing: -0.01em;
    color: var(--fp-text);
    text-decoration: none;
    cursor: pointer;
    text-align: left;
    box-sizing: border-box;
    transition: background .12s ease, color .12s ease;
  }
  .pwp-row > span { flex: 1; }
  .pwp-row svg { flex-shrink: 0; color: var(--fp-muted); }
  .pwp-row:hover {
    background: var(--fp-hover);
    color: var(--fp-text);
  }
  .pwp-row:hover svg { color: var(--fp-muted); }
  .pwp-you {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 10px 8px;
  }
  .pwp-you-av {
    width: 26px; height: 26px; border-radius: 6px;
    object-fit: cover;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 500;
    flex-shrink: 0;
  }
  .pwp-you-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .pwp-you-name {
    font-size: 12.5px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--fp-text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwp-you-email {
    font-size: 11px; font-weight: 400;
    color: var(--fp-muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
`
