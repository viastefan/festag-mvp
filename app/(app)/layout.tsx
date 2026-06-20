'use client'

import { usePathname } from 'next/navigation'
import ClientAppShell from '@/components/ClientAppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullHeight = pathname === '/tasks'
    || pathname === '/reports'
    || pathname === '/ai'
    || pathname === '/dashboard'
    || pathname === '/members'
    || pathname.startsWith('/project/')
    || pathname.startsWith('/docs')

  // Portal-Shell (PortalSidebar) liefern /projects und /decisions über eigenes layout.tsx.
  const usesOwnShell = pathname === '/projects'
    || pathname.startsWith('/decisions')
    || pathname.startsWith('/issues')
    || pathname === '/messages'
  if (usesOwnShell) return <>{children}</>

  return <ClientAppShell isFullHeight={isFullHeight} scrollId="app-main-scroll">{children}</ClientAppShell>
}
