'use client'

import EnterReturnIcon from '@/components/auth/master-onboarding/EnterReturnIcon'

/** Small “Weiter” + Mac return — same glyph as auth / Cursor. */
export default function ContinueHint({
  className = 'mob-ready-hint is-ready',
  show = true,
}: {
  className?: string
  show?: boolean
}) {
  if (!show) return null
  return (
    <p className={className} aria-live="polite">
      <span>Weiter</span>
      <span className="mob-enter-ico" aria-hidden>
        <EnterReturnIcon size={13} />
      </span>
    </p>
  )
}
