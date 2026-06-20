'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CaretRight, DownloadSimple, GearSix, SignOut, UserPlus,
} from '@phosphor-icons/react'
import WorkspaceSymbol from '@/components/WorkspaceSymbol'
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
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useEffect(() => {
    function place() {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      const popW = 248
      const left = Math.max(12, Math.min(r.left, window.innerWidth - popW - 12))
      setPos({
        left,
        top: Math.min(window.innerHeight - 24, r.bottom + 8),
      })
    }
    if (open) place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef])

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

  const menu = open && typeof document !== 'undefined' ? createPortal(
    <>
      <div className="pwp-backdrop" aria-hidden onClick={close} />
      <div
        className="pwp-pop"
        style={{ left: pos.left, top: pos.top }}
        role="menu"
        aria-label="Workspace"
      >
        <Link href="/settings/appearance" className="pwp-ws" onClick={close}>
          <WorkspaceSymbol variant={wsPrefs.variant} scheme={wsPrefs.scheme} seed={wsPrefs.seed} size={28} />
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
      </div>
    </>,
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
  .pwp-wrap { position: relative; min-width: 0; flex: 1; }
  .pwp-backdrop {
    position: fixed; inset: 0; z-index: 119990;
    background: transparent;
  }
  .pwp-pop {
    position: fixed; z-index: 120000;
    width: 248px; max-width: calc(100vw - 24px);
    padding: 6px;
    border-radius: 14px;
    background: var(--portal-card, #fff);
    border: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, rgba(60,60,67,.12)) 90%, transparent);
    box-shadow:
      0 18px 44px -16px rgba(15, 23, 42, 0.18),
      0 4px 12px rgba(15, 23, 42, 0.06);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: pwpIn .16s cubic-bezier(.16, 1, .3, 1) both;
  }
  @keyframes pwpIn {
    from { opacity: 0; transform: translateY(4px) scale(.985); }
    to { opacity: 1; transform: none; }
  }
  [data-theme="dark"] .pwp-pop,
  [data-theme="classic-dark"] .pwp-pop {
    background: #141416;
    border-color: rgba(255,255,255,.1);
    box-shadow: 0 18px 44px -16px rgba(0,0,0,.55);
  }
  .pwp-ws {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px 9px;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: background .12s ease;
  }
  .pwp-ws:hover { background: var(--portal-row-hover, rgba(242,242,247,.6)); }
  .pwp-ws-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .pwp-ws-name {
    font-size: 14px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--portal-text, #1c1c1e);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwp-ws-meta {
    font-size: 11px; font-weight: 400; letter-spacing: 0;
    color: var(--portal-muted, #8e8e93);
  }
  .pwp-team {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 10px;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: background .12s ease;
  }
  .pwp-team:hover { background: var(--portal-row-hover, rgba(242,242,247,.6)); }
  .pwp-team-avatars { display: inline-flex; flex-shrink: 0; padding-left: 2px; }
  .pwp-team-av {
    width: 22px; height: 22px; border-radius: 50%;
    margin-left: -6px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 500;
    border: 2px solid var(--portal-card, #fff);
    box-sizing: border-box; overflow: hidden;
  }
  .pwp-team-av:first-child { margin-left: 0; }
  .pwp-team-av img { width: 100%; height: 100%; object-fit: cover; }
  .pwp-team-more { background: var(--portal-pill-bg, #f2f2f7); color: var(--portal-muted, #8e8e93); }
  .pwp-team-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .pwp-team-label {
    font-size: 12.5px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--portal-text, #1c1c1e);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwp-team-sub {
    font-size: 11px; font-weight: 400;
    color: var(--portal-muted, #8e8e93);
  }
  .pwp-team svg { flex-shrink: 0; color: var(--portal-muted, #8e8e93); opacity: .55; }
  .pwp-divider {
    height: 1px; margin: 4px 6px;
    background: color-mix(in srgb, var(--portal-btn-outline-border, rgba(60,60,67,.12)) 80%, transparent);
  }
  .pwp-row {
    display: flex; align-items: center; gap: 10px;
    width: 100%; min-height: 34px;
    padding: 7px 10px;
    border: 0; border-radius: 10px;
    background: transparent;
    font: inherit; font-size: 13px; font-weight: 400 !important;
    letter-spacing: -0.01em;
    color: var(--portal-text, #1c1c1e);
    text-decoration: none;
    cursor: pointer;
    text-align: left;
    box-sizing: border-box;
    transition: background .12s ease;
  }
  .pwp-row > span { flex: 1; }
  .pwp-row svg { flex-shrink: 0; color: var(--portal-muted, #8e8e93); }
  .pwp-row:hover { background: var(--portal-row-hover, rgba(242,242,247,.6)); }
  .pwp-you {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 10px 8px;
  }
  .pwp-you-av {
    width: 26px; height: 26px; border-radius: 50%;
    object-fit: cover;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 500;
    flex-shrink: 0;
  }
  .pwp-you-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .pwp-you-name {
    font-size: 12.5px; font-weight: 400; letter-spacing: -0.01em;
    color: var(--portal-text, #1c1c1e);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwp-you-email {
    font-size: 11px; font-weight: 400;
    color: var(--portal-muted, #8e8e93);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
`
