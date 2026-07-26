'use client'

/**
 * Top sidebar switcher — workspace + team hub (calm, Linear-style).
 *
 * Why the workspace sits at the top (and not "your account"): the top-left
 * slot is the WORKSPACE you're operating in, not you personally. The square
 * glyph carries the colour you pick for yourself (profiles.avatar_color), so
 * the sidebar and the project breadcrumb read as one identity. Inside, the
 * team roster makes the placement earn its spot — you can see who else is in
 * the workspace — and "you" appear as a member near the bottom, with sign-out.
 *
 * Square glyph = workspace/org. Round avatar = a person. That distinction is
 * the whole point: the top is the room, you are one of the people in it.
 *
 * Everything heavy (theme, fonts, billing, support) lives in /settings — the
 * dropdown stays short on purpose.
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CaretRight, DownloadSimple, GearSix, PuzzlePiece, SignOut, UserPlus } from '@phosphor-icons/react'

type TeamMember = {
  id: string
  name: string
  color: string
  avatarUrl: string | null
}

type SidebarProfileFooterProps = {
  avatarColor: string
  avatarUrl: string | null
  displayName: string
  /** Workspace name shown on the top switcher trigger (Linear-style).
      Falls back to displayName when not provided. */
  workspaceName?: string
  email: string
  initials: string
  isClient: boolean
  /** Workspace roster — owner first, then members. Drives the team strip. */
  members?: TeamMember[]
  // Kept for backward-compat with the Sidebar caller — unused in the new
  // minimal dropdown. Profile colour now lives in /settings (Profil).
  onAvatarColorChange?: (color: string) => void | Promise<void>
  onLogout: () => void | Promise<void>
  plan: string
}

function planLabel(plan: string) {
  if (plan === 'starter') return 'Starter'
  if (plan === 'pro') return 'Pro'
  if (plan === 'enterprise') return 'Enterprise'
  return null
}

export default function SidebarProfileFooter({
  avatarColor,
  avatarUrl,
  displayName,
  workspaceName,
  email,
  initials,
  members = [],
  onLogout,
  plan,
}: SidebarProfileFooterProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function place() {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      setPos({
        left: Math.max(16, r.left),
        top:  Math.min(window.innerHeight - 24, r.bottom + 8),
      })
    }
    if (open) place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const currentPlanLabel = planLabel(plan)

  const wsLabel = (workspaceName && workspaceName.trim()) || (displayName && displayName.trim()) || 'Festag'
  const triggerName = wsLabel.length > 14 ? `${wsLabel.slice(0, 14)}…` : wsLabel

  const memberCount = members.length
  const hasTeam = memberCount > 1
  const teamLabel = hasTeam
    ? `Team, ${memberCount} ${memberCount === 1 ? 'Mitglied' : 'Mitglieder'}`
    : 'Nur du im Workspace'
  const teamHref = hasTeam ? '/members' : '/invite'
  const teamSub = hasTeam ? 'Team ansehen' : 'Mitglieder einladen'

  const wsMeta = currentPlanLabel ? `${currentPlanLabel} · Workspace` : 'Workspace'

  const closeAndGo = () => setOpen(false)

  const menu = (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 119990 }} onClick={() => setOpen(false)} />
      <div className="spf-pop" style={{ position: 'fixed', left: pos.left, top: pos.top }}>
        {/* ── Workspace identity ── (symbol customization lives in
            Settings → Erscheinung now; the popover just shows identity to
            avoid the overflow the inline grid caused). */}
        <Link
          href="/settings/appearance"
          className="spf-ws spf-ws-button"
          onClick={closeAndGo}
          title="Erscheinung in den Einstellungen"
        >
          <div className="spf-ws-text">
            <div className="spf-ws-name">{wsLabel}</div>
            <div className="spf-ws-meta">{wsMeta}</div>
          </div>
        </Link>


        {/* ── Team strip — who else is in this workspace ── */}
        <Link href={teamHref} className="spf-team" onClick={closeAndGo}>
          <div className="spf-team-text">
            <div className="spf-team-label">{teamLabel}</div>
            <div className="spf-team-sub">{teamSub}</div>
          </div>
          <CaretRight size={13} weight="bold" color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.5 }} />
        </Link>

        <div className="spf-divider" />

        <Link href="/settings" className="spf-row" onClick={closeAndGo}>
          <GearSix size={16} weight="regular" color="var(--text-muted)" />
          <span>Einstellungen</span>
          <span className="spf-kbd">⌘,</span>
        </Link>
        <Link href="/invite" className="spf-row" onClick={closeAndGo}>
          <UserPlus size={16} weight="regular" color="var(--text-muted)" />
          <span>Mitglieder einladen</span>
        </Link>
        <Link href="/download" className="spf-row" onClick={closeAndGo}>
          <DownloadSimple size={16} weight="regular" color="var(--text-muted)" />
          <span>Desktop-App laden</span>
        </Link>
        <Link href="/settings/apps" className="spf-row" onClick={closeAndGo}>
          <PuzzlePiece size={16} weight="regular" color="var(--text-muted)" />
          <span>Chrome-Erweiterung</span>
        </Link>

        <div className="spf-divider" />

        {/* ── You, as a member of this workspace ── */}
        <div className="spf-you">
          <div className="spf-you-text">
            <div className="spf-you-name">{displayName || 'Festag-Konto'}</div>
            <div className="spf-you-email">{email}</div>
          </div>
        </div>

        <button className="spf-row" type="button" onClick={onLogout}>
          <SignOut size={16} weight="regular" color="var(--text-muted)" />
          <span>Abmelden</span>
        </button>
      </div>
    </>
  )

  return (
    <div
      ref={ref}
      style={{
        width: '100%', minWidth: 0, position: 'relative',
        display: 'flex', alignItems: 'center', gap: 4, zIndex: 40,
      }}
    >
      {open && typeof document !== 'undefined' && createPortal(menu, document.body)}

      <button
        className="spf-trigger"
        type="button"
        onClick={() => setOpen(o => !o)}
        title={wsLabel}
        style={{
          width: '100%', minWidth: 0,
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '4px 8px 4px 4px', borderRadius: 10,
          background: open ? 'var(--surface-2)' : 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background .1s', justifyContent: 'flex-start',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ flex: '1 1 auto', minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{
            fontSize: 13, fontWeight: 400, color: 'var(--nav-on-text, var(--text))', letterSpacing: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {triggerName}
          </span>
        </span>

        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, opacity: .55 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <style>{`
        @keyframes spf-pop-in {
          from { opacity: 0; transform: translateY(4px) scale(.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .spf-pop {
          width: 244px; max-width: min(244px, calc(100vw - 32px));
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 14px 36px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.08);
          z-index: 120000;
          padding: 6px;
          animation: spf-pop-in .14s ease-out both;
        }

        /* Workspace identity header */
        .spf-ws {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px 9px;
        }
        .spf-ws-button {
          width: 100%;
          background: transparent; border: 0; cursor: pointer;
          text-align: left;
          border-radius: 10px;
          transition: background .14s;
        }
        .spf-ws-button:hover { background: var(--surface-2); }
        .spf-ws-button:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--text) 40%, transparent);
          outline-offset: 2px;
        }
        .spf-ws-picker {
          margin: 0 6px 8px;
          padding: 8px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          animation: spfPickerIn .18s cubic-bezier(.16,1,.3,1) both;
        }        @keyframes spfPickerIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .spf-ws-glyph {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 600; letter-spacing: .01em;
          flex-shrink: 0;
        }
        .spf-ws-text { min-width: 0; line-height: 1.3; }
        .spf-ws-name {
          font-size: 13.5px; font-weight: 600; color: var(--text);
          letter-spacing: .02em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .spf-ws-meta {
          font-size: 11.5px; font-weight: 400; color: var(--text-muted);
          letter-spacing: .02em;
        }

        /* Team strip */
        .spf-team {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 10px;
          border-radius: 8px;
          text-decoration: none;
          transition: background .08s;
        }
        .spf-team:hover { background: var(--surface-2); }
        .spf-team:focus { outline: none; }
        .spf-team:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
        .spf-team-avatars { display: inline-flex; flex-shrink: 0; padding-left: 2px; }
        .spf-team-av {
          width: 22px; height: 22px; border-radius: 50%;
          margin-left: -6px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 600; letter-spacing: .01em;
          border: 2px solid var(--surface);
          box-sizing: border-box; overflow: hidden;
        }
        .spf-team-av:first-child { margin-left: 0; }
        .spf-team-av img { width: 100%; height: 100%; object-fit: cover; }
        .spf-team-more {
          background: var(--surface-2); color: var(--text-muted);
        }
        .spf-team-text { flex: 1; min-width: 0; line-height: 1.3; }
        .spf-team-label {
          font-size: 12.5px; font-weight: 500; color: var(--text);
          letter-spacing: .02em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .spf-team-sub {
          font-size: 11px; font-weight: 400; color: var(--text-muted);
          letter-spacing: .02em;
        }

        .spf-divider {
          height: 1px; background: var(--border);
          margin: 4px 6px;
        }

        .spf-row {
          display: flex; align-items: center; gap: 10px;
          width: 100%;
          padding: 7px 10px;
          border: none; background: transparent;
          font-family: inherit;
          font-size: 12.5px; font-weight: 500;
          letter-spacing: .02em;
          color: var(--text);
          text-decoration: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          min-height: 30px;
          box-sizing: border-box;
          transition: background .08s;
        }
        .spf-row > span:first-of-type { flex: 1; }
        .spf-row:hover { background: var(--surface-2); }
        .spf-row:focus { outline: none; }
        .spf-row:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        .spf-kbd {
          flex-shrink: 0;
          color: var(--text-muted);
          font-size: 10.5px;
          letter-spacing: .02em;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }

        /* You — a member of this workspace */
        .spf-you {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 10px 8px;
        }
        .spf-you-av {
          width: 26px; height: 26px; border-radius: 50%;
          object-fit: cover;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 500; letter-spacing: .02em;
          flex-shrink: 0;
        }
        .spf-you-text { min-width: 0; line-height: 1.3; }
        .spf-you-name {
          font-size: 12.5px; font-weight: 500; color: var(--text);
          letter-spacing: .02em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .spf-you-email {
          font-size: 11px; font-weight: 400; color: var(--text-muted);
          letter-spacing: .02em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .spf-trigger:focus { outline: none; }
        .spf-trigger:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
