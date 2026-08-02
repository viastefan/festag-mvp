'use client'

import EnterReturnIcon from '@/components/auth/master-onboarding/EnterReturnIcon'

/**
 * White Weiter CTA — always mounted (Login email pattern).
 * Idle: quiet transparent + muted ink. Ready: white plate.
 * Pass `show={false}` only when the whole control must leave the layout.
 * Pass `disabled={false}` with `ready={false}` when idle look must stay clickable (e.g. Überspringen).
 */
export default function ContinueHint({
  className = 'mob-continue-btn',
  show = true,
  ready = true,
  disabled,
  label = 'Weiter',
  onContinue,
}: {
  className?: string
  show?: boolean
  /** When false, button stays visible but muted (Login Weiter idle). */
  ready?: boolean
  /** Defaults to `!ready`. Set false to keep idle look clickable. */
  disabled?: boolean
  label?: string
  onContinue?: () => void
}) {
  if (!show) return null
  const isDisabled = disabled ?? !ready
  return (
    <button
      type="button"
      className={`${className}${ready ? ' is-ready' : ' is-idle'}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={() => {
        if (isDisabled) return
        onContinue?.()
      }}
    >
      <span className="mob-continue-btn-label">{label}</span>
      <span className="mob-enter-ico" aria-hidden>
        <EnterReturnIcon size={14} />
      </span>
    </button>
  )
}
