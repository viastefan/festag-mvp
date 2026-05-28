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
    || pathname.startsWith('/project/')
    || pathname.startsWith('/docs')

  return <ClientAppShell isFullHeight={isFullHeight} scrollId="app-main-scroll">{children}</ClientAppShell>
}
