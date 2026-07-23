'use client'

import { usePathname } from 'next/navigation'
import AuthLandingPage from '@/components/auth/AuthLandingPage'

/**
 * Persistent shell for /login ↔ /register.
 * Layout stays mounted so mode switches (and browser back) never remount
 * the auth chrome — only `mode` updates for an instant soft handoff.
 */
export default function AuthLandingShell() {
  const pathname = usePathname() || '/login'
  const mode = pathname === '/register' || pathname.startsWith('/register/')
    ? 'signup'
    : 'login'
  return <AuthLandingPage mode={mode} />
}
