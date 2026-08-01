'use client'

import { useEffect, useRef } from 'react'

type Options = {
  /** When false, Enter does nothing. */
  enabled: boolean
  onSubmit: () => void
}

/**
 * Desktop OS feel: Enter anywhere in the current form triggers the primary CTA.
 * Textarea: Enter submits; Shift+Enter inserts a newline.
 * OTP fields handle Enter themselves — skipped here to avoid double-submit.
 */
export function useAuthEnterSubmit({ enabled, onSubmit }: Options) {
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.isComposing) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const target = e.target as HTMLElement | null
      if (!target) return

      /* Native button / link activation — don't double-fire. */
      if (target.closest('button, a, [role="menuitem"], [role="option"]')) return

      /* OTP owns its own Enter → onComplete path. */
      if (target.closest('.al-otp, .al-otp-pill, [data-auth-otp]')) return

      if (target.tagName === 'TEXTAREA') {
        if (e.shiftKey) return
        e.preventDefault()
        onSubmitRef.current()
        return
      }

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.getAttribute('contenteditable') === 'true'
      ) {
        e.preventDefault()
        onSubmitRef.current()
        return
      }

      /* Focus on non-interactive chrome (labels, copy) — still continue. */
      if (target.closest('.al-root, .al-signin, .al-signin-stack, .onb-command-bar')) {
        e.preventDefault()
        onSubmitRef.current()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
