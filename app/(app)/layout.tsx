'use client'

import { usePathname } from 'next/navigation'
import ClientAppShell from '@/components/ClientAppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullHeight = pathname === '/messages'
    || pathname === '/tasks'
    || pathname === '/reports'
    || pathname === '/ai'
    || pathname === '/dashboard'
    || pathname === '/members'
    || pathname.startsWith('/project/')
    || pathname.startsWith('/docs')

  // Neue schmale Rail-Sidebar liefern die Seiten künftig selbst.
  // /projects ist die erste Seite mit dem neuen Layout.
  const usesOwnShell = pathname === '/dashboard'
    || pathname === '/projects'
    || pathname.startsWith('/decisions')
  if (usesOwnShell) return <>{children}</>

  return <ClientAppShell isFullHeight={isFullHeight} scrollId="app-main-scroll">{children}</ClientAppShell>
}
