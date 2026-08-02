'use client'

import EnterReturnIcon from '@/components/auth/master-onboarding/EnterReturnIcon'

/** White Weiter CTA — hidden until `show`, then appears under the stage. */
export default function ContinueHint({
  className = 'mob-continue-btn',
  show = true,
  label = 'Weiter',
  onContinue,
}: {
  className?: string
  show?: boolean
  label?: string
  onContinue?: () => void
}) {
  if (!show) return null
  return (
    <button
      type="button"
      className={className}
      onClick={() => onContinue?.()}
    >
      <span className="mob-continue-btn-label">{label}</span>
      <span className="mob-enter-ico" aria-hidden>
        <EnterReturnIcon size={14} />
      </span>
    </button>
  )
}
