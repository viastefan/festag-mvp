'use client'

import { Check, X } from '@phosphor-icons/react'

type Status = 'checking' | 'available' | 'taken'

/**
 * Mobile-only inline confirmation badge next to the workspace/username field.
 * No text — an animated loading ring while checking, then a green check
 * (available) or red X (taken), both with a small pop-in motion.
 */
export default function UsernameCheckBadge({ status }: { status: Status }) {
  return (
    <span className={`uc-badge uc-badge--${status}`} aria-hidden="true">
      <style>{UC_BADGE_CSS}</style>
      {status === 'checking' ? (
        <span className="uc-badge-spinner" />
      ) : status === 'available' ? (
        <Check key="ok" className="uc-badge-icon" size={15} weight="bold" />
      ) : (
        <X key="bad" className="uc-badge-icon" size={15} weight="bold" />
      )}
    </span>
  )
}

const UC_BADGE_CSS = `
  .uc-badge {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    pointer-events: none;
    flex-shrink: 0;
  }
  .uc-badge-spinner {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    border: 2px solid rgba(136, 145, 160, 0.28);
    border-top-color: #8891a0;
    animation: ucBadgeSpin 0.7s linear infinite;
  }
  .uc-badge-icon {
    animation: ucBadgePop 0.32s cubic-bezier(.34,1.56,.64,1) both;
  }
  .uc-badge--available {
    background: rgba(61, 186, 102, 0.14);
    color: #2fa653;
  }
  .uc-badge--taken {
    background: rgba(217, 58, 42, 0.12);
    color: #d93a2a;
  }
  .al-root[data-theme="dark"] .uc-badge-spinner {
    border-color: rgba(245, 245, 247, 0.18);
    border-top-color: rgba(245, 245, 247, 0.65);
  }
  .al-root[data-theme="dark"] .uc-badge--available {
    background: rgba(61, 186, 102, 0.18);
    color: #3dba66;
  }
  .al-root[data-theme="dark"] .uc-badge--taken {
    background: rgba(255, 105, 97, 0.16);
    color: #ff6961;
  }
  @keyframes ucBadgeSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes ucBadgePop {
    0% { opacity: 0; transform: scale(0.4); }
    60% { opacity: 1; transform: scale(1.12); }
    100% { opacity: 1; transform: scale(1); }
  }
`
