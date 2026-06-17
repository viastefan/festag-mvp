'use client'

import type { ReactNode } from 'react'
import { CODEX_ORB_CSS } from '@/components/mobile/codex-mobile-styles'

type Props = {
  ariaLabel: string
  onClick?: () => void
  disabled?: boolean
  dark?: boolean
  children: ReactNode
}

export default function CodexOrbButton({ ariaLabel, onClick, disabled, dark, children }: Props) {
  return (
    <>
      <style>{CODEX_ORB_CSS}</style>
      <button
        type="button"
        className={`cx-orb${dark ? ' cx-orb--dark' : ''}`}
        aria-label={ariaLabel}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    </>
  )
}
