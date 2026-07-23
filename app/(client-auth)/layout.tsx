import type { ReactNode } from 'react'
import AuthLandingShell from '@/components/auth/AuthLandingShell'

/**
 * Shared layout for client login + register.
 * Shell stays mounted across sibling navigations so history back works
 * and mode switches stay instant (no boot spinner remount).
 */
export default function ClientAuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthLandingShell />
      {children}
    </>
  )
}
