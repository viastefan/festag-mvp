'use client'

import FestagAppShell from '@/components/app-shell/FestagAppShell'

/**
 * Product chrome is Festag OS (FestagAppShell).
 * Legacy PortalAppShell / ClientAppShell are retired from the live product UI —
 * backend APIs and page data modules remain; routes render inside the new shell.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <FestagAppShell>{children}</FestagAppShell>
}
