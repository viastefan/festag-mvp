'use client'

import PortalAppShell, { PORTAL_APP_SHELL_CSS } from '@/components/PortalAppShell'

export const DECISIONS_SHELL_CSS = PORTAL_APP_SHELL_CSS

export default function DecisionsShell({ children }: { children: React.ReactNode }) {
  return <PortalAppShell>{children}</PortalAppShell>
}
