'use client'

/**
 * Profile footer dropdown — Linear-style minimal.
 *
 * The popup is intentionally short (account header + 4 actions). Everything
 * that used to live here — theme picker, font picker, profile colour, news
 * links, billing, support, etc. — has moved into /settings (sub-routes) so
 * the dropdown stays calm and predictable.
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DownloadSimple, GearSix, SignOut, UserPlus } from '@phosphor-icons/react'

import { avatarTextColor } from '@/lib/avatar'

type SidebarProfileFooterProps = {
  avatarColor: string
  avatarUrl: string | null
  displayName: string
  email: string
  initials: string
  isClient: boolean
  // Kept for backward-compat with the Sidebar caller — unused in the new
  // minimal dropdown. Profile colour now lives in /settings (Profil).
  onAvatarColorChange?: (color: string) => void | Promise<void>
  onLogout: () => void | Promise<void>
  plan: string
}

function planLabel(plan: string) {
  if (plan === 'starter') return 'Starter'
  if (plan === 'pro') return 'Pro'
  if (plan === 'enterprise') return 'Ent.'
  return null
}

export default function SidebarProfileFooter({
  avatarColor,
  avatarUrl,
  displayName,
  email,
  initials,
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
  const avatarFg = avatarTextColor(avatarColor)
  const triggerName = displayName.length > 10 ? `${displayName.slice(0, 8)}...` : displayName

  const closeAndGo = () => setOpen(false)

  const menu = (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 119990 }} onClick={() => setOpen(false)} />
      <div className="spf-pop" style={{ position: 'fixed', left: pos.left, top: pos.top }}>
        <div className="spf-account">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="spf-account-av" />
          ) : (
            <div className="spf-account-av" style={{ background: avatarColor, color: avatarFg }}>
              {initials}
            </div>
          )}
          <div className="spf-account-text">
            <div className="spf-account-name">{displayName || 'Festag-Konto'}</div>
            <div className="spf-account-email">{email}</div>
          </div>
        </div>

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

        <div className="spf-divider" />

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
        flex: '1 1 0', minWidth: 0, position: 'relative',
        display: 'flex', alignItems: 'center', gap: 4, zIndex: 40,
      }}
    >
      {open && typeof document !== 'undefined' && createPortal(menu, document.body)}

      <button
        className="spf-trigger"
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          flex: '1 1 auto', minWidth: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '5px 8px 5px 5px', borderRadius: 8,
          background: open ? 'var(--surface-2)' : 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background .1s', justifyContent: 'flex-start',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--surface-2)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            style={{
              width: 24, height: 24, borderRadius: '50%', objectFit: 'cover',
              border: `2px solid ${avatarColor}`, flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9.5, fontWeight: 700, color: avatarFg,
            flexShrink: 0, letterSpacing: '.02em',
          }}>
            {initials}
          </div>
        )}

        <span style={{ flex: '1 1 auto', minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{
            fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {triggerName}
          </span>
          {currentPlanLabel && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', flexShrink: 0 }}>
                {currentPlanLabel}
              </span>
            </>
          )}
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
          width: 196px; max-width: min(196px, calc(100vw - 32px));
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 14px 36px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.08);
          z-index: 120000;
          padding: 6px;
          animation: spf-pop-in .14s ease-out both;
        }
        .spf-account {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px 10px;
        }
        .spf-account-av {
          width: 32px; height: 32px; border-radius: 50%;
          object-fit: cover;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; letter-spacing: .02em;
          flex-shrink: 0;
        }
        .spf-account-text { min-width: 0; line-height: 1.3; }
        .spf-account-name {
          font-size: 13px; font-weight: 600; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .spf-account-email {
          font-size: 11.5px; font-weight: 400; color: var(--text-muted);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
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
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
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
