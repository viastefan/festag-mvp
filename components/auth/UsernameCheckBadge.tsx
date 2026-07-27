'use client'

import { Check, X } from '@phosphor-icons/react'

type Status = 'checking' | 'available' | 'taken'

/**
 * Inline confirmation next to workspace/username — quiet, no candy badges.
 * Spinner / check / X only, so the form stack never shifts.
 */
export default function UsernameCheckBadge({
  status,
  title,
}: {
  status: Status
  title?: string
}) {
  const label =
    title ||
    (status === 'checking'
      ? 'Wird geprüft…'
      : status === 'available'
        ? 'Verfügbar'
        : 'Bereits vergeben')

  return (
    <span
      className={`uc-badge uc-badge--${status}`}
      title={label}
      role="status"
      aria-label={label}
    >
      <style>{UC_BADGE_CSS}</style>
      {status === 'checking' ? (
        <span className="uc-badge-spinner" />
      ) : status === 'available' ? (
        <Check key="ok" className="uc-badge-icon" size={14} weight="bold" />
      ) : (
        <X key="bad" className="uc-badge-icon" size={13} weight="regular" />
      )}
    </span>
  )
}

const UC_BADGE_CSS = `
  .uc-badge {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    pointer-events: none;
    flex-shrink: 0;
    z-index: 2;
    background: transparent;
  }
  .uc-badge-spinner {
    width: 13px;
    height: 13px;
    border-radius: 999px;
    border: 1.5px solid rgba(136, 145, 160, 0.22);
    border-top-color: #8891a0;
    animation: ucBadgeSpin 0.7s linear infinite;
  }
  .uc-badge-icon {
    display: block;
    animation: ucBadgeIn 0.22s ease-out both;
  }
  /* Available — soft green ink, whisper wash (no loud sticker). */
  .uc-badge--available {
    background: rgba(46, 155, 82, 0.10);
    color: #2E9B52;
  }
  /* Taken — no pink disc. Quiet rose X with hairline only. */
  .uc-badge--taken {
    background: transparent;
    color: #A65B56;
    box-shadow: inset 0 0 0 1px rgba(166, 91, 86, 0.28);
  }
  .al-root[data-theme="dark"] .uc-badge-spinner,
  .dl-root[data-theme="dark"] .uc-badge-spinner {
    border-color: rgba(245, 245, 247, 0.16);
    border-top-color: rgba(245, 245, 247, 0.58);
  }
  .al-root[data-theme="dark"] .uc-badge--available,
  .dl-root[data-theme="dark"] .uc-badge--available {
    background: rgba(46, 155, 82, 0.14);
    color: #3dba66;
  }
  .al-root[data-theme="dark"] .uc-badge--taken,
  .dl-root[data-theme="dark"] .uc-badge--taken {
    background: transparent;
    color: #D86060;
    box-shadow: inset 0 0 0 1px rgba(216, 96, 96, 0.32);
  }
  @keyframes ucBadgeSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes ucBadgeIn {
    from { opacity: 0; transform: scale(0.86); }
    to { opacity: 1; transform: scale(1); }
  }
`
