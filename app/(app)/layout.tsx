'use client'

import { usePathname } from 'next/navigation'
import ClientAppShell from '@/components/ClientAppShell'
import PortalAppShell from '@/components/PortalAppShell'
import { isPortalShellRoute } from '@/lib/portal/shell-routes'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const portalRoute = isPortalShellRoute(pathname)

  const isFullHeight = pathname === '/tasks'
    || pathname === '/reports'
    || pathname === '/ai'
    || pathname === '/dashboard'
    || pathname === '/members'
    || pathname.startsWith('/project/')
    || pathname.startsWith('/docs')

  if (portalRoute) {
    return <PortalAppShell>{children}</PortalAppShell>
  }

  return (
    <ClientAppShell isFullHeight={isFullHeight} scrollId="app-main-scroll">
      {children}
    </ClientAppShell>
  )
}
